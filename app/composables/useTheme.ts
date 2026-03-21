/**
 * useTheme - 主题状态管理
 * 管理亮色/暗色主题切换，支持 localStorage 持久化和系统偏好检测
 */

export type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  const applyTheme = (newTheme: Theme) => {
    theme.value = newTheme
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', newTheme)
      localStorage.setItem('theme', newTheme)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(newTheme)
  }

  const initTheme = () => {
    if (!import.meta.client) return

    const savedTheme = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme) {
      applyTheme(savedTheme)
    } else if (prefersDark) {
      applyTheme('dark')
    } else {
      applyTheme('light')
    }
  }

  return {
    theme: readonly(theme),
    applyTheme,
    toggleTheme,
    initTheme
  }
}
