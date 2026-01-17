import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'

const fastify = Fastify({ logger: true })

// 注册插件
fastify.register(cors, { origin: true }) // 允许前端跨域
fastify.register(multipart)

// 测试路由
fastify.get('/api/test', async () => {
  return { message: '后端服务正常运行！' }
})

// 启动服务
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('🚀 后端服务运行在 http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()