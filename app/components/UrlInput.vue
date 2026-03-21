<script setup lang="ts">
const emit = defineEmits<{
  submit: [urls: string[]]
}>()

const urlInput = ref('')
const isSubmitting = ref(false)

const submitUrls = async () => {
  const raw = urlInput.value.trim()
  if (!raw) return

  // 解析多行URL
  const urls = raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => {
      try {
        new URL(line)
        return true
      } catch {
        return false
      }
    })

  if (urls.length === 0) {
    alert('请输入有效的 URL')
    return
  }

  isSubmitting.value = true
  try {
    emit('submit', urls)
    urlInput.value = ''
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="card">
    <h2 class="form-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      添加新的下载任务
    </h2>
    <textarea
      v-model="urlInput"
      class="url-input"
      placeholder="粘贴文件 URL（支持多个，每行一个）&#10;例如:&#10;https://example.com/big-file.zip&#10;https://example.com/document.pdf"
      @keydown.ctrl.enter="submitUrls"
      @keydown.meta.enter="submitUrls"
    />
    <button class="submit-btn" :disabled="isSubmitting" @click="submitUrls">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {{ isSubmitting ? '提交中...' : '立即提交' }}
    </button>
  </section>
</template>
