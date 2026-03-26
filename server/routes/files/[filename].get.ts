import { createReadStream, existsSync } from 'fs'
import { join, basename } from 'path'
import { getTaskById } from '../../database/tasks'
import { verifyDownloadSignature } from '../../utils/signature'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  const query = getQuery(event)

  if (!filename) {
    throw createError({
      statusCode: 400,
      message: '文件名不能为空'
    })
  }

  const { signature, expires, userId: urlUserId } = query as {
    signature?: string
    expires?: string
    userId?: string
  }

  if (!signature || !expires || !urlUserId) {
    throw createError({
      statusCode: 400,
      message: '缺少签名参数'
    })
  }

  const isValid = verifyDownloadSignature(urlUserId as string, {
    signature: signature as string,
    expires: expires as string
  })

  if (!isValid) {
    throw createError({
      statusCode: 403,
      message: '签名验证失败或链接已过期'
    })
  }

  const parts = filename.split('_')
  if (parts.length < 2) {
    throw createError({
      statusCode: 400,
      message: '无效的文件名格式'
    })
  }

  const taskId = parts[0]
  const originalFilename = parts.slice(1).join('_')

  const task = getTaskById(taskId)

  if (!task) {
    throw createError({
      statusCode: 404,
      message: '任务不存在'
    })
  }

  if (task.user_id !== urlUserId) {
    throw createError({
      statusCode: 403,
      message: '无权访问该文件'
    })
  }

  if (task.status !== 'completed') {
    throw createError({
      statusCode: 400,
      message: '任务尚未完成'
    })
  }

  if (task.filename !== originalFilename) {
    throw createError({
      statusCode: 400,
      message: '文件名不匹配'
    })
  }

  const config = useRuntimeConfig()
  // 优先使用环境变量，然后是配置，最后是默认路径
  const rootPath = process.env.DOWNLOAD_ROOT_PATH
    || (config.public.downloadRootPath as string)
    || join(process.cwd(), 'storage', 'downloads')
  const relativePath = process.env.DOWNLOAD_RELATIVE_PATH
    || (config.public.downloadRelativePath as string)
    || 'files'
  // 文件保存格式为 {taskId}_{originalFilename}，直接使用 filename 参数
  const filePath = join(rootPath, relativePath, filename)

  if (!existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      message: '文件不存在'
    })
  }

  const fileSize = task.filesize
  const fileStream = createReadStream(filePath)
  const originalName = basename(filePath)

  setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`)
  setHeader(event, 'Content-Length', fileSize.toString())
  setHeader(event, 'Accept-Ranges', 'bytes')

  const range = getHeader(event, 'range')
  if (range) {
    const rangeParts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(rangeParts[0], 10)
    const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    setHeader(event, 'Content-Range', `bytes ${start}-${end}/${fileSize}`)
    setHeader(event, 'Content-Length', chunkSize.toString())
    setResponseStatus(event, 206)

    const chunkStream = createReadStream(filePath, { start, end })
    return sendStream(event, chunkStream)
  }

  return sendStream(event, fileStream)
})