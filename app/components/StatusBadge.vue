<script setup lang="ts">
defineProps<{
  status: 'pending' | 'downloading' | 'completed' | 'failed'
}>()

const statusLabels: Record<string, string> = {
  pending: '挂起中',
  downloading: '下载中',
  completed: '已完成',
  failed: '失败'
}

const statusIcons: Record<string, string> = {
  pending: 'clock',
  downloading: 'arrow-down',
  completed: 'check-circle',
  failed: 'alert-triangle'
}
</script>

<template>
  <span class="task-status" :class="`status-${status}`">
    <!-- Clock icon for pending -->
    <svg v-if="status === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
    <!-- Arrow down icon for downloading -->
    <svg v-else-if="status === 'downloading'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
    <!-- Check circle icon for completed -->
    <svg v-else-if="status === 'completed'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
    <!-- Alert triangle icon for failed -->
    <svg v-else-if="status === 'failed'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    {{ statusLabels[status] }}
  </span>
</template>
