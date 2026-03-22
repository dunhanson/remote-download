import { getUserById, updateUserLastActive, userToUserInfo } from '../../database/users'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: '请先创建用户'
    })
  }

  const user = getUserById(userId)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  if (user.status === 'banned') {
    throw createError({
      statusCode: 403,
      message: '用户已被封禁'
    })
  }

  const ipAddress = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const userAgent = getHeader(event, 'user-agent') || 'unknown'

  updateUserLastActive(userId, ipAddress, userAgent)

  const updatedUser = getUserById(userId)

  return {
    success: true,
    data: userToUserInfo(updatedUser!)
  }
})
