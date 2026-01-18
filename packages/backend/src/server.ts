import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import path from 'path'
import { uploadRoutes } from './routes/upload.js'

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      }
    }
  }
})

async function setup() {
  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true
  })

  // 文件上传支持
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 10 // 最多10个文件
    }
  })

  // 静态文件服务（用于本地存储的图片访问）
  await fastify.register(staticPlugin, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false // 重要：避免与其他插件冲突
  })

  // 注册上传路由
  await fastify.register(uploadRoutes)

  // 根路由
  fastify.get('/', async () => {
    return {
      message: 'MindGallery API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/health',
        detailedHealth: 'GET /api/health/detailed',
        upload: 'POST /api/upload',
        images: 'GET /api/images',
        imageDetail: 'GET /api/images/:id',
        deleteImage: 'DELETE /api/images/:id'
      }
    }
  })

  // 启动服务器
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 服务器运行在 http://localhost:${port}`)
    console.log(`📁 存储类型: ${process.env.STORAGE_TYPE || 'local'}`)
    console.log(`🗄️  数据库: ${process.env.DATABASE_URL?.split('@')[1] || 'localhost:5432'}`)
    console.log(`🤖 AI服务: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`)
  } catch (err) {
    console.error('启动失败:', err)
    process.exit(1)
  }
}

setup()