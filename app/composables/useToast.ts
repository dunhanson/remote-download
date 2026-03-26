export interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0

export function useToast() {
  const toasts = useState<ToastMessage[]>('toasts', () => [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastId
    toasts.value.push({ id, message, type })
  }

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts: readonly(toasts),
    showToast,
    removeToast
  }
}
