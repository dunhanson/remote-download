import { Queue } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null
let downloadQueue: Queue | null = null

function getConnection(): Redis {
  if (connection) return connection

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  })

  return connection
}

export function getDownloadQueue(): Queue {
  if (downloadQueue) return downloadQueue

  const conn = getConnection()
  downloadQueue = new Queue('download', { connection: conn })

  return downloadQueue
}

export function addDownloadJob(taskId: string): void {
  const queue = getDownloadQueue()
  queue.add('download', { taskId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}

export async function closeQueue(): Promise<void> {
  if (downloadQueue) {
    await downloadQueue.close()
    downloadQueue = null
  }
  if (connection) {
    connection.disconnect()
    connection = null
  }
}
