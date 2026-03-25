import { Queue, Worker, Job } from 'bullmq'
import axios from 'axios'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { pipeline } from 'stream/promises'
import { getTaskById, updateTaskStatus, updateTaskProgress, updateTaskFilesize, incrementRetryCount, resetTaskForRetry } from '../database/tasks'
import type { ProgressData } from '../types'

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

  const headResponse = await axios({
    method: 'head',
    url: sourceUrl,
    timeout: 30000
  })

  const filesize = parseInt(headResponse.headers['content-length'] || '0', 10)
  if (filesize > 0) {
    updateTaskFilesize(taskId, filesize)
  }

  console.log(`[Download] Starting download: ${sourceUrl} -> ${destPath}`)

  const downloadResponse = await axios({
    method: 'get',
    url: sourceUrl,
    responseType: 'stream',
    timeout: 300000
  })

  console.log(`[Download] Response received`)

  const writeStream = createWriteStream(destPath)
  let downloaded = 0

  return new Promise((resolve, reject) => {
    downloadResponse.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length
      writeStream.write(chunk)
    })

    downloadResponse.data.on('end', () => {
      console.log(`[Download] Response stream ended, downloaded: ${downloaded}`)
      writeStream.end()
    })

    downloadResponse.data.on('error', (err) => {
      console.error(`[Download] Read error: ${err.message}`)
      writeStream.end()
      updateTaskStatus(taskId, 'failed', err.message)
      reject(err)
    })

    writeStream.on('finish', () => {
      console.log(`[Download] Write finished: ${downloaded} bytes`)
      updateTaskProgress(taskId, downloaded, filesize, 0)
      updateTaskStatus(taskId, 'completed', undefined, destPath)
      resolve()
    })

    writeStream.on('error', (err) => {
      console.error(`[Download] Write error: ${err.message}`)
      updateTaskStatus(taskId, 'failed', err.message)
      reject(err)
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
