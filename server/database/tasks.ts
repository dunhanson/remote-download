import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { Task, TaskStatus } from '../types'

export interface CreateTaskInput {
  userId: string
  sourceUrl: string
  filename: string
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const task: Task = {
    id: uuidv4(),
    user_id: input.userId,
    source_url: input.sourceUrl,
    filename: input.filename,
    filesize: 0,
    downloaded: 0,
    status: 'pending',
    speed: 0,
    error_message: null,
    retry_count: 0,
    max_retries: 3,
    local_path: null,
    created_at: now,
    updated_at: now,
    completed_at: null
  }

  const stmt = db.prepare(`
    INSERT INTO tasks (id, user_id, source_url, filename, filesize, downloaded, status, speed, error_message, retry_count, max_retries, local_path, created_at, updated_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    task.id,
    task.user_id,
    task.source_url,
    task.filename,
    task.filesize,
    task.downloaded,
    task.status,
    task.speed,
    task.error_message,
    task.retry_count,
    task.max_retries,
    task.local_path,
    task.created_at,
    task.updated_at,
    task.completed_at
  )

  return task
}

export function getTaskById(taskId: string): Task | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return stmt.get(taskId) as Task | undefined
}

export function getTasksByUserId(userId: string, limit: number = 10): Task[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
  return stmt.all(userId, limit) as Task[]
}

export function updateTaskProgress(taskId: string, downloaded: number, filesize: number, speed: number): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    UPDATE tasks SET downloaded = ?, filesize = ?, speed = ?, updated_at = ?
    WHERE id = ?
  `)

  stmt.run(downloaded, filesize, speed, now, taskId)
}

export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  errorMessage?: string,
  localPath?: string
): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  let completedAt: number | null = null
  if (status === 'completed' || status === 'failed') {
    completedAt = now
  }

  const stmt = db.prepare(`
    UPDATE tasks SET status = ?, error_message = ?, local_path = ?, completed_at = ?, updated_at = ?
    WHERE id = ?
  `)

  stmt.run(status, errorMessage || null, localPath || null, completedAt, now, taskId)
}

export function updateTaskFilesize(taskId: string, filesize: number): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare('UPDATE tasks SET filesize = ?, updated_at = ? WHERE id = ?')
  stmt.run(filesize, now, taskId)
}

export function resetTaskForRetry(taskId: string): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    UPDATE tasks SET status = 'pending', downloaded = 0, filesize = 0, speed = 0, error_message = NULL, updated_at = ?
    WHERE id = ?
  `)

  stmt.run(now, taskId)
}

export function incrementRetryCount(taskId: string): number {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare('UPDATE tasks SET retry_count = retry_count + 1, updated_at = ? WHERE id = ?')
  stmt.run(now, taskId)

  const task = getTaskById(taskId)
  return task?.retry_count || 0
}

export function deleteTask(taskId: string): boolean {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  const result = stmt.run(taskId)
  return result.changes > 0
}

export function taskToClientTask(task: Task) {
  return {
    id: task.id,
    sourceUrl: task.source_url,
    filename: task.filename,
    filesize: task.filesize,
    downloaded: task.downloaded,
    status: task.status,
    speed: task.speed,
    percent: task.filesize > 0 ? Math.floor((task.downloaded / task.filesize) * 100) : 0,
    errorMessage: task.error_message,
    retryCount: task.retry_count,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    completedAt: task.completed_at
  }
}
