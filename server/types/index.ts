export interface UserInfo {
  id: string
  createdAt: number
  lastActiveAt: number
  loginCount: number
}

export type TaskStatus = 'pending' | 'downloading' | 'completed' | 'failed'

export interface Task {
  id: string
  user_id: string
  source_url: string
  filename: string
  filesize: number
  downloaded: number
  status: TaskStatus
  speed: number
  error_message: string | null
  retry_count: number
  max_retries: number
  local_path: string | null
  created_at: number
  updated_at: number
  completed_at: number | null
}

export interface DownloadSignature {
  expiresAt: number
  signature: string
}

export interface ProgressData {
  type: 'progress' | 'done'
  status?: TaskStatus
  downloaded?: number
  filesize?: number
  speed?: number
  percent?: number
}
