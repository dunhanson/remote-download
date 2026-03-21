/**
 * useTasks - 任务状态管理
 * 管理下载任务列表、进度监控、任务操作
 * 无后端时使用前端模拟
 */

export type TaskStatus = 'pending' | 'downloading' | 'completed' | 'failed'

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

// 生成唯一ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

// 从URL提取文件名
const getFileName = (url: string): string => {
  try {
    const pathname = new URL(url).pathname
    const filename = pathname.split('/').pop() || '未知文件'
    return decodeURIComponent(filename)
  } catch {
    return '未知文件'
  }
}

export function useTasks() {
  const tasks = useState<Task[]>('tasks', () => [])
  const isLoading = useState<boolean>('tasksLoading', () => false)
  const error = useState<string | null>('tasksError', () => null)

  // 模拟下载的定时器
  const downloadIntervals = new Map<string, ReturnType<typeof setInterval>>()

  /**
   * 开始模拟下载
   */
  const startMockDownload = (task: Task) => {
    if (downloadIntervals.has(task.id)) return
    if (task.status !== 'pending' && task.status !== 'downloading') return

    // 设置文件大小（如果还没有）
    if (!task.filesize || task.filesize === 0) {
      task.filesize = Math.floor(Math.random() * 500 * 1024 * 1024) + 50 * 1024 * 1024 // 50MB - 550MB
    }

    // 开始下载
    task.status = 'downloading'
    const fileSize = task.filesize
    const baseSpeed = (Math.random() * 15 + 5) * 1024 * 1024 // 5-20 MB/s
    let downloaded = task.downloaded || 0

    const interval = setInterval(() => {
      const currentTask = tasks.value.find(t => t.id === task.id)
      if (!currentTask || currentTask.status !== 'downloading') {
        clearInterval(interval)
        downloadIntervals.delete(task.id)
        return
      }

      // 随机速度波动
      const speed = baseSpeed * (0.8 + Math.random() * 0.4)
      downloaded += speed * 0.5 // 0.5秒间隔

      if (downloaded >= fileSize) {
        downloaded = fileSize
        currentTask.downloaded = fileSize
        currentTask.percent = 100
        currentTask.status = 'completed'
        currentTask.speed = 0
        currentTask.completedAt = Date.now()
        currentTask.downloadUrl = `https://download.example.com/${currentTask.id}_${encodeURIComponent(currentTask.filename)}`
        clearInterval(interval)
        downloadIntervals.delete(task.id)
      } else {
        currentTask.downloaded = Math.floor(downloaded)
        currentTask.percent = Math.floor((downloaded / fileSize) * 100)
        currentTask.speed = Math.floor(speed)
      }
    }, 500)

    downloadIntervals.set(task.id, interval)
  }

  /**
   * 获取任务列表（前端模拟）
   */
  const fetchTasks = async (_userId: string) => {
    isLoading.value = true
    error.value = null
    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300))

      // 从 localStorage 恢复任务
      const stored = localStorage.getItem('tasks')
      if (stored) {
        try {
          tasks.value = JSON.parse(stored)
          // 重新启动正在下载的任务
          tasks.value.forEach(task => {
            if (task.status === 'downloading' || task.status === 'pending') {
              // 如果任务开始于较早时间，认为它已完成或失败
              const elapsed = Date.now() - task.updatedAt
              if (elapsed > 60000) { // 超过1分钟
                task.status = 'failed'
                task.errorMessage = '连接超时'
                task.percent = 0
                task.downloaded = 0
              }
            }
          })
        } catch {
          tasks.value = []
        }
      }
    } catch (e) {
      error.value = '获取任务列表失败'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存任务到 localStorage
   */
  const saveTasks = () => {
    if (import.meta.client) {
      localStorage.setItem('tasks', JSON.stringify(tasks.value))
    }
  }

  /**
   * 创建任务（前端模拟）
   */
  const createTasks = async (_userId: string, urls: string[]) => {
    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200))

      const newTasks: Task[] = urls.map(url => ({
        id: generateId(),
        sourceUrl: url,
        filename: getFileName(url),
        filesize: 0,
        downloaded: 0,
        status: 'pending' as TaskStatus,
        speed: 0,
        percent: 0,
        errorMessage: '',
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))

      // 随机让一个任务失败作为演示
      if (newTasks.length > 0 && Math.random() > 0.6) {
        const failIndex = Math.floor(Math.random() * newTasks.length)
        newTasks[failIndex].status = 'failed'
        newTasks[failIndex].errorMessage = '连接超时'
      }

      // 添加到列表开头
      tasks.value = [...newTasks, ...tasks.value]
      saveTasks()

      // 启动模拟下载（对于 pending 状态的任务）
      newTasks.forEach(task => {
        if (task.status === 'pending') {
          // 延迟一点启动，模拟入队
          setTimeout(() => startMockDownload(task), 500)
        }
      })

      return newTasks
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  /**
   * 删除任务（前端模拟）
   */
  const deleteTask = async (_userId: string, taskId: string) => {
    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 150))

      // 停止模拟下载
      const interval = downloadIntervals.get(taskId)
      if (interval) {
        clearInterval(interval)
        downloadIntervals.delete(taskId)
      }

      tasks.value = tasks.value.filter(t => t.id !== taskId)
      saveTasks()
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  /**
   * 重试任务（前端模拟）
   */
  const retryTask = async (_userId: string, taskId: string) => {
    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200))

      const task = tasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = 'pending'
        task.downloaded = 0
        task.percent = 0
        task.errorMessage = ''
        task.filesize = Math.floor(Math.random() * 500 * 1024 * 1024) + 50 * 1024 * 1024
        task.updatedAt = Date.now()
        saveTasks()
        setTimeout(() => startMockDownload(task), 300)
      }

      return task
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  /**
   * 连接进度监控（前端模拟 - 直接读取任务状态）
   */
  const connectProgress = (_taskId: string, _userId: string) => {
    // 前端模拟模式下，进度通过 setInterval 在 createTasks 中已经更新
    // 这里不需要额外的 SSE 连接
  }

  /**
   * 断开进度连接
   */
  const disconnectProgress = (taskId: string) => {
    const interval = downloadIntervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      downloadIntervals.delete(taskId)
    }
  }

  /**
   * 断开所有连接
   */
  const disconnectAll = () => {
    downloadIntervals.forEach(interval => clearInterval(interval))
    downloadIntervals.clear()
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
