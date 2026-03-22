import { getTaskById, deleteTask, taskToClientTask } from '../../database/tasks'

function getUserIdFromHeader(event: any): string | null {
  const userId = getHeader(event, 'x-user-id')
  return userId || null
}

export default defineEventHandler({
  async get(event) {
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

    return {
      success: true,
      data: taskToClientTask(task)
    }
  },

  async delete(event) {
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
        message: '无权删除该任务'
      })
    }

    deleteTask(taskId)

    return {
      success: true,
      data: null
    }
  }
})
