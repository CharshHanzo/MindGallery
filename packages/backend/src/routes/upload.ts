import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { pipeline } from 'stream/promises'
import { prisma } from '../lib/db'
import { minioClient, ensureBucket } from '../lib/minio'
import { config } from '../lib/config'

// 请求参数类型定义
interface ImageParams {
    id: string
}

export async function uploadRoutes(fastify: FastifyInstance) {
    // 确保MinIO存储桶存在
    if (config.storage.type === 'minio') {
        await ensureBucket()
    } else {
        // 创建本地上传目录
        const uploadDir = path.join(process.cwd(), 'uploads')
        await fs.mkdir(uploadDir,{recursive:true})
    }
    
    // 健康检查 - 简单状态
    fastify.get('/api/health', async () => {
        return { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'MindGallery API'
        }
    })

    // 详细环境检查 - 验证所有服务连接
    fastify.get('/api/health/detailed', async () => {
        const checks = {
            database: { status: 'unknown', message: '' },
            minio: { status: 'unknown', message: '' },
            ollama: { status: 'unknown', message: '' }
        }

        // 检查数据库连接
        try {
            await prisma.$queryRaw`SELECT 1`
            checks.database = { status: 'ok', message: 'Database connection successful' }
        } catch (error) {
            checks.database = { status: 'error', message: `Database connection failed: ${error}` }
        }

        // 检查MinIO连接
        if (config.storage.type === 'minio') {
            try {
                await minioClient.bucketExists(config.storage.minio.bucket)
                checks.minio = { status: 'ok', message: 'MinIO connection successful' }
            } catch (error) {
                checks.minio = { status: 'error', message: `MinIO connection failed: ${error}` }
            }
        } else {
            checks.minio = { status: 'skipped', message: 'Using local storage' }
        }

        // 检查Ollama连接
        try {
            const response = await fetch(`${config.ollama.url}/api/tags`)
            if (response.ok) {
                checks.ollama = { status: 'ok', message: 'Ollama connection successful' }
            } else {
                checks.ollama = { status: 'error', message: `Ollama API returned ${response.status}` }
            }
        } catch (error) {
            checks.ollama = { status: 'error', message: `Ollama connection failed: ${error}` }
        }

        // 计算整体状态
        const allOk = Object.values(checks).every(check => check.status === 'ok' || check.status === 'skipped')
        
        return {
            status: allOk ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            checks
        }
    })
    
    // 图片上传接口
    fastify.post('/api/upload',async (req,res) => {
        try {
            const data = await req.file()
            if(!data) {
                return res.code(400).send({error:'No file uploaded'})
            }

            // 验证文件类型
            if(!data.mimetype?.startsWith('image')) {
                return res.code(400).send({error:'Invalid file type'})
            }

            // 检查文件大小（最大10MB）
            const maxSize = 10 * 1024 *1024 //10MB
            const fileBuffer = await data.toBuffer()
            if(fileBuffer.length > maxSize) {
                return res.code(400).send({error:'File size exceeds max limit(10MB)'})
            }

            // 生成随机唯一文件名
            const fileExt = path.extname(data.filename)
            const objectKey = `${randomUUID()}${fileExt}`
            
            let imageUrl: string
            let storageType: string
            let bucketName: string | null = null
            
            if (config.storage.type === 'minio') {
                // 使用MinIO存储
                storageType = 'minio'
                bucketName = config.storage.minio.bucket
                
                // 上传到MinIO
                await minioClient.putObject(bucketName, objectKey, fileBuffer)
                
                // 生成MinIO访问URL（使用配置的公共访问地址）
                imageUrl = `http://${config.storage.minio.endpoint}:${config.storage.minio.port}/${bucketName}/${objectKey}`
            } else {
                // 使用本地存储
                storageType = 'local'
                const filePath = path.join(process.cwd(), 'uploads', objectKey)
                await fs.writeFile(filePath, fileBuffer)
                imageUrl = `/uploads/${objectKey}`
            }

            // 保存到数据库
            const image = await prisma.image.create({
                data:{
                    filename:data.filename,
                    objectKey:objectKey,
                    storageType:storageType,
                    bucketName:bucketName,
                    fileSize:fileBuffer.length,
                    mimeType:data.mimetype,
                    uploadTime:new Date(),
                    tags:[]
                }
            })
            return {
                success:true,
                message:'Image uploaded successfully',
                data: {
                    id:image.id,
                    filename:image.filename,
                    url:imageUrl,
                    size: image.fileSize,
                    uploadTime:image.uploadTime,
                    storageType:storageType
                }
            }
        } catch (error) {
            console.log('upload error',error)
            return res.code(500).send({error:'Internal server error',details: String(error)})
        }
    })

    // 获取图片列表
    fastify.get('/api/images',async (req,res) => {
        try {
            const images = await prisma.image.findMany({
                orderBy:{uploadTime:'desc'},
                take:50
            })

            // 添加访问URL
            const imageWithUrl = images.map(img => {
                let url: string
                if (img.storageType === 'minio' && img.bucketName) {
                     // MinIO存储的URL（使用配置的公共访问地址）
                     url = `http://${config.storage.minio.endpoint}:${config.storage.minio.port}/${img.bucketName}/${img.objectKey}`
                 } else {
                     // 本地存储的URL
                     url = `/uploads/${img.objectKey}`
                 }
                
                return {
                    ...img,
                    url,
                    uploadTime:img.uploadTime.toISOString()
                }
            })

            return {
                success:true,
                message:'Images retrieved successfully',
                data:imageWithUrl,
                count:imageWithUrl.length
            }
        } catch (error) {
            console.log('get images error',error)
            return res.code(500).send({error:'Internal server error',details: String(error)})
        }
    })

    // 获取单张照片详情
    fastify.get<{ Params: ImageParams }>('/api/images/:id',async (req: FastifyRequest<{ Params: ImageParams }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const image = await prisma.image.findUnique({
                where:{id}
            })
            if(!image) {
                return res.code(404).send({error:'Image not found'})
            }

            let url: string
            if (image.storageType === 'minio' && image.bucketName) {
                // MinIO存储的URL（使用配置的公共访问地址）
                url = `http://${config.storage.minio.endpoint}:${config.storage.minio.port}/${image.bucketName}/${image.objectKey}`
            } else {
                // 本地存储的URL
                url = `/uploads/${image.objectKey}`
            }
            
            return {
                success:true,
                message:'Image retrieved successfully',
                data: {
                    ...image,
                    url,
                    uploadTime:image.uploadTime.toISOString()
                }
            }
        } catch (error) {
            console.log('get image error',error)
            return res.code(500).send({error:'Internal server error',details: String(error)})
        }
    })

    // 删除图片
    fastify.delete<{ Params: ImageParams }>('/api/images/:id',async (req: FastifyRequest<{ Params: ImageParams }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            // 查找图片记录
            const image = await prisma.image.findUnique({
                where:{id}
            })
            if(!image) {
                return res.code(404).send({error:'Image not found'})
            }
            // 删除存储的文件
            if (image.storageType === 'minio' && image.bucketName) {
                // 删除MinIO中的文件
                await minioClient.removeObject(image.bucketName, image.objectKey)
            } else {
                // 删除本地文件
                const filePath = path.join(process.cwd(), 'uploads', image.objectKey)
                await fs.unlink(filePath).catch(()=>{
                    console.log(`File ${filePath} Don't Exist`)
                })
            }

            // 删除数据库记录
            await prisma.image.delete({
                where:{id}
            })

            return {
                success:true,
                message:'Image deleted successfully',
            }
        } catch (error) {
            console.log('delete image error',error)
            return res.code(500).send({error:'Internal server error',details: String(error)})
        }
    })
}