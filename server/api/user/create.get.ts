import { createUser, userToUserInfo } from '../../database/users'

export default defineEventHandler(async (event) => {
  const ipAddress = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const userAgent = getHeader(event, 'user-agent') || 'unknown'

  const user = createUser(ipAddress, userAgent)

  return {
    success: true,
    data: userToUserInfo(user)
  }
})
