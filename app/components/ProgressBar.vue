<script setup lang="ts">
defineProps<{
  percent: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
}>()
</script>

<template>
  <div class="progress-bar">
    <div
      class="progress-fill"
      :class="`fill-${status}`"
      :style="{ width: `${Math.min(100, Math.max(0, percent))}%` }"
    />
  </div>
</template>
