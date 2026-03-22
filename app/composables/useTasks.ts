import type { TaskStatus } from '~/../../server/types'

export interface Task {
  id: string
  sourceUrl: string
  filename: string
  filesize: number
  downloaded: number
  status: TaskStatus
  speed: number
  percent: number
  errorMessage?: string
  retryCount: number
  createdAt: number
  updatedAt: number
  completedAt?: number
  downloadUrl?: string
}

interface TaskListResponse {
  tasks: Task[]
}

interface CreateTaskResponse {
  tasks: Task[]
}

export function useTasks() {
  const tasks = useState<Task[]>('tasks', () => [])
  const isLoading = useState<boolean>('tasksLoading', () => false)
  const error = useState<string | null>('tasksError', () => null)
  const eventSources = new Map<string, EventSource>()

  const getAuthHeaders = () => {
    const userId = useState<string | null>('userId')
    const headers: Record<string, string> = {}
    if (userId.value) {
      headers['X-User-Id'] = userId.value
    }
    return headers
  }

  const fetchTasks = async (userId: string) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ success: boolean; data: TaskListResponse }>('/api/tasks', {
        headers: getAuthHeaders()
      })
      if (response.success && response.data) {
        tasks.value = response.data.tasks
      }
    } catch (e) {
      error.value = '获取任务列表失败'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  const createTasks = async (userId: string, urls: string[]) => {
    try {
      const response = await $fetch<{ success: boolean; data: CreateTaskResponse }>('/api/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: { urls }
      })
      
      if (response.success && response.data) {
        tasks.value = [...response.data.tasks, ...tasks.value]
        return response.data.tasks
      }
      throw new Error('创建任务失败')
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  const deleteTask = async (userId: string, taskId: string) => {
    try {
      await $fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      tasks.value = tasks.value.filter(t => t.id !== taskId)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  const retryTask = async (userId: string, taskId: string) => {
    try {
      await $fetch(`/api/tasks/${taskId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      
      const task = tasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = 'pending'
        task.downloaded = 0
        task.percent = 0
        task.errorMessage = ''
      }
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  const connectProgress = (taskId: string, _userId: string) => {
    if (eventSources.has(taskId)) return
    
    const eventSource = new EventSource(`/api/tasks/${taskId}/progress`, {
      withCredentials: true
    })

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      
      const task = tasks.value.find(t => t.id === taskId)
      if (!task) return

      if (data.type === 'done') {
        task.status = data.status
        task.downloaded = data.downloaded || task.downloaded
        task.filesize = data.filesize || task.filesize
        task.percent = data.percent || task.percent
        task.speed = 0
        if (data.status === 'completed') {
          task.completedAt = Date.now()
        }
        eventSource.close()
        eventSources.delete(taskId)
      } else {
        task.status = data.status
        task.downloaded = data.downloaded
        task.filesize = data.filesize
        task.speed = data.speed
        task.percent = data.percent
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      eventSources.delete(taskId)
      setTimeout(() => {
        if (tasks.value.find(t => t.id === taskId && (t.status === 'downloading' || t.status === 'pending'))) {
          connectProgress(taskId, _userId)
        }
      }, 3000)
    }

    eventSources.set(taskId, eventSource)
  }

  const disconnectProgress = (taskId: string) => {
    const eventSource = eventSources.get(taskId)
    if (eventSource) {
      eventSource.close()
      eventSources.delete(taskId)
    }
  }

  const disconnectAll = () => {
    eventSources.forEach(eventSource => eventSource.close())
    eventSources.clear()
  }

  return {
    tasks: readonly(tasks),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchTasks,
    createTasks,
    deleteTask,
    retryTask,
    connectProgress,
    disconnectProgress,
    disconnectAll
  }
}