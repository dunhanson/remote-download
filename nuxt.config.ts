// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  future: {
    compatibilityId: '4'
  },

  srcDir: 'app/',

  serverDir: './server',

  app: {
    head: {
      title: '文件离线下载服务',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '输入链接，将文件高速缓存至云端，随时取用。' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: '/api',
      downloadRootPath: '/data/downloads',
      downloadRelativePath: 'files',
      publicUrl: 'https://download.example.com'
    }
  }
})
