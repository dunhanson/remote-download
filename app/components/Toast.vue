<script setup lang="ts">
const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'info'
}>()

const emit = defineEmits<{
  close: []
}>()

// 自动关闭
setTimeout(() => {
  emit('close')
}, 2000)
</script>

<template>
  <div class="toast" :class="`toast-${type || 'info'}`">
    <!-- 成功图标 -->
    <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <!-- 错误图标 -->
    <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round" />
    </svg>
    <!-- 信息图标 -->
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
    </svg>
    <span>{{ message }}</span>
  </div>
</template>
