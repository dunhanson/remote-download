<script setup lang="ts">
const { initUser, userId } = useUser()
const { initTheme } = useTheme()
const { tasks, fetchTasks, createTasks, deleteTask, retryTask, connectProgress, disconnectAll } = useTasks()

// 页面加载时初始化
onMounted(async () => {
  initTheme()
  await initUser()
  if (userId.value) {
    await fetchTasks(userId.value)
    // 连接正在下载任务的进度监控
    tasks.value
      .filter(t => t.status === 'downloading' || t.status === 'pending')
      .forEach(t => connectProgress(t.id, userId.value!))
  }
})

// 页面卸载时断开所有连接
onUnmounted(() => {
  disconnectAll()
})

// 提交新的下载任务
const handleSubmit = async (urls: string[]) => {
  if (!userId.value) {
    alert('用户未初始化')
    return
  }
  try {
    const newTasks = await createTasks(userId.value, urls)
    // 连接新任务的进度监控
    newTasks.forEach(t => connectProgress(t.id, userId.value!))
  } catch (e) {
    console.error('创建任务失败:', e)
    alert('创建任务失败，请检查后端服务是否运行')
  }
}

// 删除任务
const handleDelete = async (taskId: string) => {
  if (!userId.value) return
  if (!confirm('确定要删除这个任务吗？')) return
  try {
    disconnectAll()
    await deleteTask(userId.value, taskId)
  } catch (e) {
    console.error('删除任务失败:', e)
    alert('删除任务失败')
  }
}

// 重试任务
const handleRetry = async (taskId: string) => {
  if (!userId.value) return
  try {
    await retryTask(userId.value, taskId)
    connectProgress(taskId, userId.value!)
  } catch (e) {
    console.error('重试任务失败:', e)
    alert('重试任务失败')
  }
}
</script>

<template>
  <div>
    <ThemeToggle />

    <div class="container">
      <header class="header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          文件离线下载
        </h1>
        <p>输入链接，将文件高速缓存至云端，随时取用。</p>
      </header>

      <UrlInput @submit="handleSubmit" />

      <TaskList
        :tasks="tasks"
        @delete="handleDelete"
        @retry="handleRetry"
      />
    </div>
  </div>
</template>
