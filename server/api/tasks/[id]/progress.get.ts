import { getTaskById } from '../../../database/tasks'
import type { ProgressData } from '../../../types'

function getUserIdFromHeader(event: any): string | null {
  const userId = getHeader(event, 'x-user-id')
  return userId || null
}

export default defineEventHandler(async (event) => {
  const userId = getUserIdFromHeader(event)
  const taskId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: '请先创建用户'
    })
  }

  if (!taskId) {
    throw createError({
      statusCode: 400,
      message: '任务 ID 不能为空'
    })
  }

  const task = getTaskById(taskId)

  if (!task) {
    throw createError({
      statusCode: 404,
      message: '任务不存在'
    })
  }

  if (task.user_id !== userId) {
    throw createError({
      statusCode: 403,
      message: '无权访问该任务'
    })
  }

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'Transfer-Encoding', 'chunked')

  const sendProgress = (controller: any, data: ProgressData) => {
    controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
  }

  const stream = new ReadableStream({
    start(controller) {
      let lastStatus = task.status
      let lastDownloaded = task.downloaded
      let lastFilesize = task.filesize
      let lastSpeed = task.speed

      const checkInterval = setInterval(() => {
        const currentTask = getTaskById(taskId)

        if (!currentTask) {
          const doneData: ProgressData = { type: 'done', status: 'failed' }
          sendProgress(controller, doneData)
          clearInterval(checkInterval)
          controller.close()
          return
        }

        if (
          currentTask.status !== lastStatus ||
          currentTask.downloaded !== lastDownloaded ||
          currentTask.filesize !== lastFilesize ||
          currentTask.speed !== lastSpeed
        ) {
          lastStatus = currentTask.status
          lastDownloaded = currentTask.downloaded
          lastFilesize = currentTask.filesize
          lastSpeed = currentTask.speed

          const percent = currentTask.filesize > 0
            ? Math.floor((currentTask.downloaded / currentTask.filesize) * 100)
            : 0

          const progressData: ProgressData = {
            type: 'progress',
            status: currentTask.status,
            downloaded: currentTask.downloaded,
            filesize: currentTask.filesize,
            speed: currentTask.speed,
            percent
          }

          sendProgress(controller, progressData)
        }

        if (currentTask.status === 'completed' || currentTask.status === 'failed') {
          const doneData: ProgressData = {
            type: 'done',
            status: currentTask.status,
            downloaded: currentTask.downloaded,
            filesize: currentTask.filesize,
            percent: currentTask.filesize > 0
              ? Math.floor((currentTask.downloaded / currentTask.filesize) * 100)
              : 0
          }
          sendProgress(controller, doneData)
          clearInterval(checkInterval)
          controller.close()
        }
      }, 500)

      event.node.req.on('close', () => {
        clearInterval(checkInterval)
        controller.close()
      })
    }
  })

  return stream
})
