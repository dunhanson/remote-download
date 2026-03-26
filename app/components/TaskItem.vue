<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  delete: [taskId: string]
  retry: [taskId: string]
}>()

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化下载速度
const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 复制下载链接
const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    alert('链接已复制')
  } catch {
    // Fallback
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('链接已复制')
  }
}

// 从URL中提取文件名
const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || '未知文件'
    return decodeURIComponent(filename)
  } catch {
    return '未知文件'
  }
}
</script>

<template>
  <article class="task-item">
    <header class="task-header">
      <div>
        <h3 class="task-name">{{ task.filename || getFileNameFromUrl(task.sourceUrl) }}</h3>
        <p class="task-url">{{ task.sourceUrl }}</p>
      </div>
      <StatusBadge :status="task.status" />
    </header>

    <div class="task-progress">
      <ProgressBar :percent="task.percent" :status="task.status" />
    </div>

    <div class="task-info">
      <div class="task-info-left">
        <span>{{ formatSize(task.downloaded) }} / {{ formatSize(task.filesize) }}</span>
        <span v-if="task.status === 'downloading'" class="speed-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {{ formatSpeed(task.speed) }}
        </span>
        <span v-if="task.status === 'failed' && task.errorMessage" style="color: #ef4444; font-weight: 500;">
          错误: {{ task.errorMessage }}
        </span>
      </div>
      <span>{{ task.percent }}%</span>
    </div>

    <!-- 下载完成，显示下载链接 -->
    <div v-if="task.status === 'completed' && task.downloadUrl" class="link-box">
      <input type="text" class="link-input" :value="task.downloadUrl" readonly />
      <button class="btn btn-light" @click="copyLink(task.downloadUrl!)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        复制
      </button>
      <a :href="task.downloadUrl" class="btn btn-primary" target="_blank">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        下载
      </a>
    </div>

    <!-- 操作按钮 -->
    <div class="task-actions">
      <button v-if="task.status === 'failed'" class="btn btn-primary" @click="emit('retry', task.id)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        重试
      </button>
      <button class="btn btn-danger" @click="emit('delete', task.id)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        删除
      </button>
    </div>
  </article>
</template>
