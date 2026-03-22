import { startWorker, stopWorker } from '../services/download'

export default defineNitroPlugin((nitroApp) => {
  console.log('Starting download worker...')
  
  try {
    startWorker()
    console.log('Download worker started successfully')
  } catch (error) {
    console.error('Failed to start download worker:', error)
  }

  nitroApp.hooks.hook('close', async () => {
    console.log('Stopping download worker...')
    stopWorker()
  })
})