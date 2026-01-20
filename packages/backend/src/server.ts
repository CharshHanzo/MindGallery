import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import path from 'path'
import { uploadRoutes } from './routes/upload.js'
import { config } from './lib/config.js'

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
    origin: config.server.corsOrigin,
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

  // 全局错误处理中间件
  fastify.setErrorHandler((error, request, reply) => {
    console.error('Global error handler caught error:', error)
    console.error('Error stack:', (error as Error).stack)
    reply.code(500).send({ 
      error: 'Internal server error', 
      details: (error as Error).message,
      stack: (error as Error).stack 
    })
  })

  // 启动服务器
  try {
    await fastify.listen({ port: config.server.port, host: '0.0.0.0' })
    console.log(`🚀 服务器运行在 http://localhost:${config.server.port}`)
    console.log(`📁 存储类型: ${config.storage.type}`)
    console.log(`🗄️  数据库: ${config.database.host}:${config.database.port}`)
    console.log(`🤖 AI服务: ${config.ollama.url}`)
  } catch (err) {
    console.error('启动失败:', err)
    process.exit(1)
  }
}

setup()