import { Queue, Worker, Job } from 'bullmq'
import axios from 'axios'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { pipeline } from 'stream/promises'
import { getTaskById, updateTaskStatus, updateTaskProgress, updateTaskFilesize, incrementRetryCount, resetTaskForRetry } from '../database/tasks'
import type { ProgressData } from '../types'
import http from 'http'
import https from 'https'

let downloadQueue: Queue | null = null
let downloadWorker: Worker | null = null

const PROGRESS_THROTTLE_MS = 500

function getConnectionConfig() {
  const queueDriver = process.env.QUEUE_DRIVER || 'memory'
  
  if (queueDriver === 'memory') {
    return null
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null
  }
}

export function getDownloadQueue(): Queue | null {
  if (downloadQueue) return downloadQueue

  const connection = getConnectionConfig()
  if (!connection) return null

  downloadQueue = new Queue('download', { connection })

  return downloadQueue
}

export function addDownloadJob(taskId: string): void {
  const queue = getDownloadQueue()
  
  if (!queue) {
    console.log(`[Memory Queue] Job added: ${taskId}`)
    startMemoryDownload(taskId).catch(err => {
      console.error(`[Memory Queue] Unexpected error: ${err.message}`)
    })
    return
  }

  queue.add('download', { taskId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}

async function startMemoryDownload(taskId: string): Promise<void> {
  const task = getTaskById(taskId)
  if (!task) {
    console.error(`Task ${taskId} not found`)
    return
  }

  const destPath = getDownloadPath(task.filename)
  console.log(`[Memory Download] Starting: ${task.source_url} -> ${destPath}`)

  try {
    await downloadFile(taskId, task.source_url, destPath)
    console.log(`[Memory Download] Completed: ${taskId}`)
  } catch (error: any) {
    console.error(`[Memory Download] Failed: ${taskId}`, error.message)
    const currentTask = getTaskById(taskId)
    if (currentTask && currentTask.retry_count < currentTask.max_retries) {
      incrementRetryCount(taskId)
      setTimeout(() => startMemoryDownload(taskId), 2000)
    }
  }
}

function getDownloadPath(filename: string): string {
  const config = useRuntimeConfig()
  const rootPath = process.env.DOWNLOAD_ROOT_PATH 
    || (config.public.downloadRootPath as string) 
    || join(process.cwd(), 'storage', 'downloads')
  const relativePath = process.env.DOWNLOAD_RELATIVE_PATH 
    || (config.public.downloadRelativePath as string) 
    || 'files'
  const dir = join(rootPath, relativePath)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  return join(dir, filename)
}

async function downloadFile(taskId: string, sourceUrl: string, destPath: string): Promise<void> {
  const task = getTaskById(taskId)
  if (!task) throw new Error('Task not found')

  updateTaskStatus(taskId, 'downloading')

  console.log(`[Download] Starting HEAD request: ${sourceUrl}`)

  const headResponse = await axios({
    method: 'head',
    url: sourceUrl,
    timeout: 30000
  })

  const filesize = parseInt(headResponse.headers['content-length'] || '0', 10)
  if (filesize > 0) {
    updateTaskFilesize(taskId, filesize)
  }

  console.log(`[Download] Starting download: ${sourceUrl} -> ${destPath}, filesize: ${filesize}`)

  return new Promise((resolve, reject) => {
    const protocol = sourceUrl.startsWith('https') ? https : http
    let downloaded = 0

    const req = protocol.get(sourceUrl, { timeout: 300000 }, (response) => {
      const writeStream = createWriteStream(destPath)
      let lastProgressTime = Date.now()
      let lastDownloaded = 0

      response.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        writeStream.write(chunk)

        const now = Date.now()
        const elapsed = now - lastProgressTime

        if (elapsed >= PROGRESS_THROTTLE_MS) {
          const speed = Math.floor((downloaded - lastDownloaded) / (elapsed / 1000))
          updateTaskProgress(taskId, downloaded, filesize, speed)
          lastProgressTime = now
          lastDownloaded = downloaded
        }
      })

      response.on('end', () => {
        console.log(`[Download] Response end event, downloaded: ${downloaded}`)
      })

      response.on('close', () => {
        console.log(`[Download] Response closed, downloaded: ${downloaded}`)
      })

      writeStream.on('finish', () => {
        console.log(`[Download] Write finished, downloaded: ${downloaded}`)
        updateTaskProgress(taskId, downloaded, filesize, 0)
        updateTaskStatus(taskId, 'completed', undefined, destPath)
        resolve()
      })

      response.on('error', (err) => {
        console.error(`[Download] Response error: ${err.message}`)
        writeStream.end()
        updateTaskStatus(taskId, 'failed', err.message)
        reject(err)
      })

      writeStream.on('error', (err) => {
        console.error(`[Download] Write error: ${err.message}`)
        updateTaskStatus(taskId, 'failed', err.message)
        reject(err)
      })
    })

    req.on('error', (err) => {
      console.error(`[Download] Request error: ${err.message}`)
      updateTaskStatus(taskId, 'failed', err.message)
      reject(err)
    })

    req.on('timeout', () => {
      console.error(`[Download] Request timeout`)
      req.destroy()
      updateTaskStatus(taskId, 'failed', 'Request timeout')
      reject(new Error('Request timeout'))
    })
  })
}

export function startWorker(): void {
  if (downloadWorker) return

  const connection = getConnectionConfig()
  if (!connection) {
    console.log('[Worker] Running in memory mode, no BullMQ worker needed')
    return
  }

  downloadWorker = new Worker('download', async (job: Job) => {
    const { taskId } = job.data

    const task = getTaskById(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    const destPath = getDownloadPath(task.filename)

    try {
      await downloadFile(taskId, task.source_url, destPath)
    } catch (error: any) {
      const currentTask = getTaskById(taskId)
      if (currentTask && currentTask.retry_count < currentTask.max_retries) {
        incrementRetryCount(taskId)
        throw error
      }
      throw error
    }
  }, { connection })

  downloadWorker.on('completed', (job) => {
    console.log(`Download job ${job.id} completed`)
  })

  downloadWorker.on('failed', (job, err) => {
    console.error(`Download job ${job?.id} failed:`, err.message)
  })
}

export function stopWorker(): void {
  if (downloadWorker) {
    downloadWorker.close()
    downloadWorker = null
  }
}

export async function closeQueue(): Promise<void> {
  if (downloadQueue) {
    await downloadQueue.close()
    downloadQueue = null
  }
}
