import { createHash } from 'crypto'
import { getUserDownloadKey } from '../database/users'
import type { DownloadSignature } from '../types'

export function generateDownloadSignature(userId: string, expiresInSeconds: number = 3600): DownloadSignature {
  const downloadKey = getUserDownloadKey(userId)
  if (!downloadKey) {
    throw new Error('User download key not found')
  }

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  const stringToSign = `${userId}&${downloadKey}&${expiresAt}`
  const signature = createHash('md5').update(stringToSign).digest('hex')

  return { expiresAt, signature }
}

export function verifyDownloadSignature(
  userId: string,
  params: { signature: string; expires: string }
): boolean {
  const { signature, expires } = params
  const expiresAt = parseInt(expires, 10)

  if (isNaN(expiresAt)) {
    return false
  }

  if (Math.floor(Date.now() / 1000) > expiresAt) {
    return false
  }

  const downloadKey = getUserDownloadKey(userId)
  if (!downloadKey) {
    return false
  }

  const stringToSign = `${userId}&${downloadKey}&${expires}`
  const expectedSignature = createHash('md5').update(stringToSign).digest('hex')

  return signature === expectedSignature
}
