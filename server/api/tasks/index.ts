import { getTasksByUserId, createTask, taskToClientTask } from '../../database/tasks'
import { addDownloadJob } from '../../services/download'
import type { Task } from '../../types'

function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || '未知文件'
    return decodeURIComponent(filename)
  } catch {
    return '未知文件'
  }
}

function getUserIdFromHeader(event: any): string | null {
  const userId = getHeader(event, 'x-user-id')
  return userId || null
}

export default defineEventHandler({
  async get(event) {
    const userId = getUserIdFromHeader(event)

    if (!userId) {
      throw createError({
        statusCode: 401,
        message: '请先创建用户'
      })
    }

    const tasks = getTasksByUserId(userId)

    return {
      success: true,
      data: {
        tasks: tasks.map(taskToClientTask)
      }
    }
  },

  async post(event) {
    const userId = getUserIdFromHeader(event)

    if (!userId) {
      throw createError({
        statusCode: 401,
        message: '请先创建用户'
      })
    }

    const body = await readBody<{ urls: string[] }>(event)

    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      throw createError({
        statusCode: 400,
        message: '请提供有效的 URL 列表'
      })
    }

    const createdTasks: Task[] = []

    for (const url of body.urls) {
      const filename = extractFilenameFromUrl(url)
      const task = createTask({
        userId,
        sourceUrl: url,
        filename
      })
      createdTasks.push(task)

      addDownloadJob(task.id)
    }

    return {
      success: true,
      data: {
        tasks: createdTasks.map(taskToClientTask)
      }
    }
  }
})
