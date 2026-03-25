import { Queue } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null
let downloadQueue: Queue | null = null

function getConnection(): Redis | null {
  const queueDriver = process.env.QUEUE_DRIVER || 'memory'
  
  if (queueDriver === 'memory') {
    return null
  }

  if (connection) return connection

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    }
  })

  connection.on('error', () => {
    console.warn('Redis connection failed, falling back to memory queue')
  })

  return connection
}

export function getDownloadQueue(): Queue | null {
  const queueDriver = process.env.QUEUE_DRIVER || 'memory'
  
  if (queueDriver === 'memory') {
    return null
  }

  if (downloadQueue) return downloadQueue

  const conn = getConnection()
  if (!conn) return null
  
  downloadQueue = new Queue('download', { connection: conn })

  return downloadQueue
}

export function addDownloadJob(taskId: string): void {
  const queue = getDownloadQueue()
  
  if (!queue) {
    console.log(`[Memory Queue] Job added: ${taskId}`)
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
