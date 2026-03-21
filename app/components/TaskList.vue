<script setup lang="ts">
import type { Task } from '~/composables/useTasks'

const props = defineProps<{
  tasks: Task[]
}>()

const emit = defineEmits<{
  delete: [taskId: string]
  retry: [taskId: string]
}>()

// 默认显示的任务数量
const DISPLAY_COUNT = 3

const isExpanded = ref(false)
const displayedCount = computed(() => {
  if (props.tasks.length === 0) return 0
  return isExpanded.value ? props.tasks.length : Math.min(DISPLAY_COUNT, props.tasks.length)
})
const visibleTasks = computed(() => props.tasks.slice(0, displayedCount.value))
const hasMore = computed(() => props.tasks.length > DISPLAY_COUNT)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <section class="card">
    <div class="task-list-header">
      <h2 class="task-list-title">任务列表</h2>
      <span class="task-count">显示 {{ displayedCount }}/{{ tasks.length }} 个任务</span>
    </div>

    <!-- 空状态 -->
    <div v-if="tasks.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <p>暂无下载任务，添加一个开始吧</p>
    </div>

    <!-- 任务列表 -->
    <template v-else>
      <TaskItem
        v-for="task in visibleTasks"
        :key="task.id"
        :task="task"
        @delete="emit('delete', $event)"
        @retry="emit('retry', $event)"
      />

      <!-- 加载更多按钮 -->
      <div v-if="hasMore" class="load-more">
        <button class="load-more-btn" :class="{ expanded: isExpanded }" @click="toggleExpand">
          <svg v-if="!isExpanded" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {{ isExpanded ? '收起' : '查看更多' }}
        </button>
      </div>
    </template>
  </section>
</template>
