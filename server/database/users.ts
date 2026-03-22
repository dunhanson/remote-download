import { createHash, randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { UserInfo } from '../types'

export interface User {
  id: string
  download_key: string
  ip_address: string | null
  user_agent: string | null
  created_at: number
  last_active_at: number
  login_count: number
  status: string
}

function generateUserId(): string {
  return createHash('md5').update(uuidv4()).digest('hex')
}

function generateDownloadKey(): string {
  return randomBytes(32).toString('hex')
}

export function createUser(ipAddress?: string, userAgent?: string): User {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const user: User = {
    id: generateUserId(),
    download_key: generateDownloadKey(),
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    created_at: now,
    last_active_at: now,
    login_count: 1,
    status: 'active'
  }

  const stmt = db.prepare(`
    INSERT INTO users (id, download_key, ip_address, user_agent, created_at, last_active_at, login_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    user.id,
    user.download_key,
    user.ip_address,
    user.user_agent,
    user.created_at,
    user.last_active_at,
    user.login_count,
    user.status
  )

  const logStmt = db.prepare(`
    INSERT INTO login_logs (user_id, ip_address, user_agent, created_at, event_type)
    VALUES (?, ?, ?, ?, ?)
  `)
  logStmt.run(user.id, user.ip_address, user.user_agent, now, 'create')

  return user
}

export function getUserById(userId: string): User | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(userId) as User | undefined
}

export function getUserDownloadKey(userId: string): string | undefined {
  const user = getUserById(userId)
  return user?.download_key
}

export function updateUserLastActive(userId: string, ipAddress?: string, userAgent?: string): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    UPDATE users SET last_active_at = ?, ip_address = COALESCE(?, ip_address), user_agent = COALESCE(?, user_agent), login_count = login_count + 1
    WHERE id = ?
  `)

  stmt.run(now, ipAddress, userAgent, userId)

  const logStmt = db.prepare(`
    INSERT INTO login_logs (user_id, ip_address, user_agent, created_at, event_type)
    VALUES (?, ?, ?, ?, ?)
  `)
  logStmt.run(userId, ipAddress, userAgent, now, 'login')
}

export function userToUserInfo(user: User): UserInfo {
  return {
    id: user.id,
    createdAt: user.created_at,
    lastActiveAt: user.last_active_at,
    loginCount: user.login_count
  }
}
