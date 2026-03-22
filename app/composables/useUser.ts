export interface UserInfo {
  id: string
  createdAt: number
  lastActiveAt: number
  loginCount: number
}

const generateUserId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  return timestamp + randomPart
}

export function useUser() {
  const userId = useState<string | null>('userId', () => null)
  const user = useState<UserInfo | null>('user', () => null)
  const isLoading = useState<boolean>('userLoading', () => false)

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (userId.value) {
      headers['X-User-Id'] = userId.value
    }
    return headers
  }

  const initUser = async () => {
    if (!import.meta.client) return

    isLoading.value = true
    try {
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId) {
        userId.value = storedUserId
        
        try {
          const response = await $fetch<{ success: boolean; data: UserInfo }>('/api/user/info', {
            headers: getAuthHeaders()
          })
          if (response.success && response.data) {
            user.value = response.data
            localStorage.setItem('userCreatedAt', response.data.createdAt.toString())
            localStorage.setItem('userLoginCount', response.data.loginCount.toString())
          }
        } catch {
          const createdAt = parseInt(localStorage.getItem('userCreatedAt') || '0') || Math.floor(Date.now() / 1000)
          const loginCount = parseInt(localStorage.getItem('userLoginCount') || '1')
          user.value = {
            id: storedUserId,
            createdAt,
            lastActiveAt: Math.floor(Date.now() / 1000),
            loginCount
          }
        }
        return
      }

      const response = await $fetch<{ success: boolean; data: UserInfo }>('/api/user/create')
      if (response.success && response.data) {
        userId.value = response.data.id
        user.value = response.data
        localStorage.setItem('userId', response.data.id)
        localStorage.setItem('userCreatedAt', response.data.createdAt.toString())
        localStorage.setItem('userLoginCount', response.data.loginCount.toString())
      }
    } catch (error) {
      console.error('Failed to initialize user:', error)
      const newUserId = generateUserId()
      userId.value = newUserId
      localStorage.setItem('userId', newUserId)
      const now = Math.floor(Date.now() / 1000)
      localStorage.setItem('userCreatedAt', now.toString())
      localStorage.setItem('userLoginCount', '1')
      user.value = {
        id: newUserId,
        createdAt: now,
        lastActiveAt: now,
        loginCount: 1
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    userId: readonly(userId),
    user: readonly(user),
    isLoading: readonly(isLoading),
    initUser,
    getAuthHeaders
  }
}