export default defineAppConfig({
  title: '文件离线下载服务',
  download: {
    // 文件下载根目录（绝对路径）
    rootPath: '/data/downloads',
    // 存储在数据库中的相对路径（相对于 rootPath）
    relativePath: 'files',
    // 返回给客户端的下载链接前缀
    publicUrl: 'https://download.example.com'
  }
})
