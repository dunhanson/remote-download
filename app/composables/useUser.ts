/**
 * useUser - 用户状态管理
 * 管理用户ID的创建和存储，无后端时使用前端模拟
 */

export interface User {
  id: string
  createdAt: number
  lastActiveAt: number
  loginCount: number
}

// 生成简单的用户ID
const generateUserId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  return timestamp + randomPart
}

export function useUser() {
  const userId = useState<string | null>('userId', () => null)
  const user = useState<User | null>('user', () => null)
  const isLoading = useState<boolean>('userLoading', () => false)

  /**
   * 初始化用户 - 检查 localStorage 或创建新用户
   */
  const initUser = async () => {
    if (!import.meta.client) return

    isLoading.value = true
    try {
      // 1. 检查 localStorage 中是否有 userId
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId) {
        userId.value = storedUserId
        user.value = {
          id: storedUserId,
          createdAt: parseInt(localStorage.getItem('userCreatedAt') || '0') || Math.floor(Date.now() / 1000),
          lastActiveAt: Math.floor(Date.now() / 1000),
          loginCount: parseInt(localStorage.getItem('userLoginCount') || '1')
        }
        return
      }

      // 2. 创建新用户（前端模拟）
      const newUserId = generateUserId()
      userId.value = newUserId
      localStorage.setItem('userId', newUserId)

      const now = Math.floor(Date.now() / 1000)
      user.value = {
        id: newUserId,
        createdAt: now,
        lastActiveAt: now,
        loginCount: 1
      }
      localStorage.setItem('userCreatedAt', now.toString())
      localStorage.setItem('userLoginCount', '1')
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取请求头（包含用户ID）
   */
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (userId.value) {
      headers['X-User-Id'] = userId.value
    }
    return headers
  }

  return {
    userId: readonly(userId),
    user: readonly(user),
    isLoading: readonly(isLoading),
    initUser,
    getAuthHeaders
  }
}
