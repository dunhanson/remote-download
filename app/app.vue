<script setup lang="ts">
const { toasts, removeToast } = useToast()
</script>

<template>
  <div>
    <NuxtPage />

    <!-- Toast 容器 -->
    <div class="toast-container">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        @close="removeToast(toast.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
