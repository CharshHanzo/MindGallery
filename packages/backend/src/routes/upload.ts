import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../lib/db'
import { minioClient, ensureBucket } from '../lib/minio'
import { config } from '../lib/config'
import sharp from 'sharp'

// 图片处理配置
const IMAGE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  THUMBNAIL_SIZE: { width: 300, height: 300 },
}

// 生成缩略图
async function generateThumbnail(fileBuffer: Buffer): Promise<Buffer> {
  return sharp(fileBuffer)
    .resize(IMAGE_CONFIG.THUMBNAIL_SIZE.width, IMAGE_CONFIG.THUMBNAIL_SIZE.height, {
      fit: sharp.fit.cover,
      withoutEnlargement: true,
    })
    .toBuffer()
}

// 构建图片URL
function buildImageUrls(img: any): { url: string; thumbnailUrl: string } {
  let url: string
  let thumbnailUrl: string
  
  if (img.storageType === 'minio' && img.bucketName && config.storage.minio) {
    const minioConfig = config.storage.minio as NonNullable<typeof config.storage.minio>;
    url = `http://${minioConfig.endpoint}:${minioConfig.port}/${img.bucketName}/${img.objectKey}`;
    thumbnailUrl = `http://${minioConfig.endpoint}:${minioConfig.port}/${img.bucketName}/${img.objectKey.replace(/(\.[^.]+)$/, '_thumbnail$1')}`;
  } else {
    url = `/uploads/${img.objectKey}`;
    thumbnailUrl = `/uploads/${img.objectKey.replace(/(\.[^.]+)$/, '_thumbnail$1')}`;
  }
  
  return { url, thumbnailUrl };
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
        if (config.storage.type === 'minio' && config.storage.minio) {
            try {
                const minioConfig = config.storage.minio as NonNullable<typeof config.storage.minio>;
                await minioClient.bucketExists(minioConfig.bucket)
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
    
    // 图片上传接口 - 单张
    fastify.post('/api/upload',async (req: FastifyRequest, res: FastifyReply) => {
        try {
            console.log('📤 收到单张上传请求')
            
            // 获取文件
            let fileData = null
            
            // 使用正确的方式处理单文件上传
            console.log('📋 开始处理请求 parts...')
            for await (const part of req.parts()) {
                console.log('📋 处理 part:')
                console.log('   - type:', part.type, ' (类型:', typeof part.type, ')')
                console.log('   - fieldname:', part.fieldname, ' (类型:', typeof part.fieldname, ')')
                
                // 检查是否是文件类型的 part
                if (part.type === 'file') {
                    // 对于文件类型，获取文件名和 mimetype
                    const filePart = part as any
                    console.log('   - filename:', filePart.filename, ' (类型:', typeof filePart.filename, ')')
                    console.log('   - mimetype:', filePart.mimetype, ' (类型:', typeof filePart.mimetype, ')')
                    console.log('📋 这是一个文件 part')
                    fileData = filePart
                    break
                }
            }
            
            if(!fileData) {
                return res.code(400).send({ error: 'No file uploaded' })
            }

            // 1. 验证文件类型
            console.log(`📋 文件实际MIME类型: ${fileData.mimetype}`)
            console.log(`📋 允许的MIME类型: ${IMAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`)
            
            // 处理 mimetype 可能是逗号分隔的列表的情况
            let actualMimetype = fileData.mimetype
            // 如果 mimetype 包含逗号，取第一个值作为实际的 mimetype
            if (fileData.mimetype.includes(',')) {
                actualMimetype = fileData.mimetype.split(',')[0].trim()
                console.log(`📋 修正后的实际MIME类型: ${actualMimetype}`)
            }
            
            if (!IMAGE_CONFIG.ALLOWED_MIME_TYPES.includes(actualMimetype)) {
                return res.code(400).send({ error: `Invalid file type. Only images are allowed. 实际类型: ${actualMimetype}` })
            }

            // 2. 检查文件大小
            const fileBuffer = await fileData.toBuffer()
            if (fileBuffer.length > IMAGE_CONFIG.MAX_SIZE) {
                return res.code(400).send({ error: `File size exceeds max limit (${IMAGE_CONFIG.MAX_SIZE / 1024 / 1024}MB)` })
            }

            // 3. 生成随机唯一文件名
            const fileExt = path.extname(fileData.filename)
            const objectKey = `${randomUUID()}${fileExt}`
            const thumbnailKey = `${objectKey.replace(fileExt, '')}_thumbnail${fileExt}`
            
            let storageType: string
            let bucketName: string | null = null
            
            // 4. 生成缩略图
            const thumbnailBuffer = await generateThumbnail(fileBuffer)

            if (config.storage.type === 'minio' && config.storage.minio) {
                // 使用MinIO存储
                storageType = 'minio'
                const minioConfig = config.storage.minio as NonNullable<typeof config.storage.minio>;
                bucketName = minioConfig.bucket
                
                // 上传原图和缩略图到MinIO
                await Promise.all([
                    minioClient.putObject(bucketName, objectKey, fileBuffer),
                    minioClient.putObject(bucketName, thumbnailKey, thumbnailBuffer)
                ])
            } else {
                // 使用本地存储
                storageType = 'local'
                const uploadDir = path.join(process.cwd(), 'uploads')
                
                // 保存原图和缩略图
                await Promise.all([
                    fs.writeFile(path.join(uploadDir, objectKey), fileBuffer),
                    fs.writeFile(path.join(uploadDir, thumbnailKey), thumbnailBuffer)
                ])
            }

            // 5. 保存到数据库
            const image = await prisma.image.create({
                data: {
                    filename: fileData.filename,
                    objectKey: objectKey,
                    storageType: storageType,
                    bucketName: bucketName,
                    fileSize: fileBuffer.length,
                    mimeType: fileData.mimetype,
                    tags: []
                }
            })

            // 构建响应数据
            const { url, thumbnailUrl } = buildImageUrls(image);

            return {
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    ...image,
                    url,
                    thumbnailUrl,
                    uploadTime: image.uploadTime.toISOString(),
                    albums: [],
                }
            }
        } catch (error) {
            console.error('❌ 单张上传请求处理失败:')
            console.error('📋 错误类型:', typeof error)
            console.error('📋 错误信息:', error)
            console.error('📋 错误栈:', error instanceof Error ? error.stack : 'No stack trace')
            return res.code(500).send({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
        }
    })

    // 批量图片上传
    fastify.post('/api/upload/batch', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            console.log('📤 收到批量上传请求')
            
            // 检查请求类型
            const contentType = req.headers['content-type']
            console.log(`📋 请求Content-Type: ${contentType}`)
            
            // 获取文件列表
            let fileArray = []
            
            try {
                console.log('✅ 文件解析开始')
                
                // 使用正确的方式处理多文件上传
            console.log('📋 开始处理请求 parts...')
            for await (const part of req.parts()) {
                console.log('📋 处理 part:')
                console.log('   - type:', part.type, ' (类型:', typeof part.type, ')')
                console.log('   - fieldname:', part.fieldname, ' (类型:', typeof part.fieldname, ')')
                
                // 检查是否是文件类型的 part
                if (part.type === 'file') {
                    // 对于文件类型，获取文件名和 mimetype
                    const filePart = part as any
                    console.log('   - filename:', filePart.filename, ' (类型:', typeof filePart.filename, ')')
                    console.log('   - mimetype:', filePart.mimetype, ' (类型:', typeof filePart.mimetype, ')')
                    console.log('📄 解析到文件:')
                    console.log('   - filename:', filePart.filename)
                    console.log('   - mimetype:', filePart.mimetype)
                    fileArray.push(filePart)
                }
            }
                
                console.log(`✅ 文件解析完成, 共 ${fileArray.length} 个文件`)
            } catch (filesError) {
                console.error('❌ 文件解析失败:', filesError)
                console.error('📋 文件解析错误栈:', filesError instanceof Error ? filesError.stack : 'No stack trace')
                throw filesError
            }
            
            if (fileArray.length === 0) {
                console.log('❌ 没有上传文件')
                return res.code(400).send({ error: 'No files uploaded' })
            }

            const uploadedImages = []
            const failedFiles = []
            
            for (const file of fileArray) {
                try {
                    console.log(`🔍 开始处理文件: ${file.filename}`)
                    
                    // 验证文件类型
                    console.log(`📋 文件实际MIME类型: ${file.mimetype}`)
                    console.log(`📋 允许的MIME类型: ${IMAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`)
                    
                    // 处理 mimetype 可能是逗号分隔的列表的情况
                    let actualMimetype = file.mimetype
                    // 如果 mimetype 包含逗号，取第一个值作为实际的 mimetype
                    if (file.mimetype.includes(',')) {
                        actualMimetype = file.mimetype.split(',')[0].trim()
                        console.log(`📋 修正后的实际MIME类型: ${actualMimetype}`)
                    }
                    
                    if (!IMAGE_CONFIG.ALLOWED_MIME_TYPES.includes(actualMimetype)) {
                        console.log(`❌ 文件类型不合法: ${file.filename} - ${actualMimetype}`)
                        failedFiles.push({
                            filename: file.filename,
                            error: `Invalid file type. Only images are allowed. 实际类型: ${actualMimetype}`
                        })
                        continue
                    }

                    // 读取文件缓冲区
                    console.log('📖 读取文件缓冲区...')
                    const fileBuffer = await file.toBuffer()
                    console.log(`✅ 文件缓冲区读取完成, 大小: ${fileBuffer.length} bytes`)
                    
                    // 验证文件大小
                    if (fileBuffer.length > IMAGE_CONFIG.MAX_SIZE) {
                        console.log(`❌ 文件大小超出限制: ${fileBuffer.length} > ${IMAGE_CONFIG.MAX_SIZE}`)
                        failedFiles.push({
                            filename: file.filename,
                            error: 'File size exceeds limit'
                        })
                        continue
                    }

                    // 生成文件名和缩略图
                    const fileExt = path.extname(file.filename)
                    const objectKey = `${randomUUID()}${fileExt}`
                    const thumbnailKey = `${objectKey.replace(fileExt, '')}_thumbnail${fileExt}`
                    
                    console.log(`📁 生成文件名: ${objectKey}, 缩略图: ${thumbnailKey}`)
                    
                    // 生成缩略图
                    console.log('🖼️ 生成缩略图...')
                    const thumbnailBuffer = await generateThumbnail(fileBuffer)
                    console.log(`✅ 缩略图生成完成, 大小: ${thumbnailBuffer.length} bytes`)
                    
                    let storageType: string
                    let bucketName: string | null = null
                    
                    // 存储文件
                    console.log(`💾 存储类型: ${config.storage.type}`)
                    
                    if (config.storage.type === 'minio' && config.storage.minio) {
                        // MinIO存储
                        storageType = 'minio'
                        const minioConfig = config.storage.minio as NonNullable<typeof config.storage.minio>;
                        bucketName = minioConfig.bucket
                        
                        console.log(`📦 使用MinIO存储, 存储桶: ${bucketName}`)
                        
                        await Promise.all([
                            minioClient.putObject(bucketName, objectKey, fileBuffer),
                            minioClient.putObject(bucketName, thumbnailKey, thumbnailBuffer)
                        ])
                        console.log('✅ MinIO存储完成')
                    } else {
                        // 本地存储
                        storageType = 'local'
                        const uploadDir = path.join(process.cwd(), 'uploads')
                        
                        console.log(`📂 使用本地存储, 目录: ${uploadDir}`)
                        
                        await Promise.all([
                            fs.writeFile(path.join(uploadDir, objectKey), fileBuffer),
                            fs.writeFile(path.join(uploadDir, thumbnailKey), thumbnailBuffer)
                        ])
                        console.log('✅ 本地存储完成')
                    }

                    // 保存到数据库
                    console.log('💾 保存到数据库...')
                    const image = await prisma.image.create({
                        data: {
                            filename: file.filename,
                            objectKey,
                            storageType,
                            bucketName,
                            fileSize: fileBuffer.length,
                            mimeType: file.mimetype,
                            tags: []
                        }
                    })
                    console.log(`✅ 数据库保存完成, 图片ID: ${image.id}`)

                    // 构建响应数据
                    const { url, thumbnailUrl } = buildImageUrls(image);
                    console.log(`🌐 图片URL: ${url}, 缩略图URL: ${thumbnailUrl}`)

                    uploadedImages.push({
                        ...image,
                        url,
                        thumbnailUrl,
                        uploadTime: image.uploadTime.toISOString(),
                        albums: [],
                    })
                    console.log(`✅ 文件处理完成: ${file.filename}`)
                } catch (fileError) {
                    console.error(`❌ 文件处理失败: ${file.filename}`)
                    console.error('📋 文件处理错误:', fileError)
                    console.error('📋 文件处理错误栈:', fileError instanceof Error ? fileError.stack : 'No stack trace')
                    failedFiles.push({
                        filename: file.filename,
                        error: fileError instanceof Error ? fileError.message : String(fileError),
                        stack: fileError instanceof Error ? fileError.stack : undefined
                    })
                }
            }

            console.log(`📊 上传结果: 成功 ${uploadedImages.length} 个, 失败 ${failedFiles.length} 个`)
            
            const result = {
                success: true,
                message: `${uploadedImages.length} out of ${fileArray.length} images uploaded successfully`,
                data: uploadedImages,
                count: uploadedImages.length,
                failedFiles
            }
            
            console.log('✅ 批量上传处理完成')
            return result
        } catch (error) {
            console.error('❌ 批量上传请求处理失败:')
            console.error('📋 错误类型:', typeof error)
            console.error('📋 错误信息:', error)
            console.error('📋 错误栈:', error instanceof Error ? error.stack : 'No stack trace')
            return res.code(500).send({ 
                error: 'Internal server error', 
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            })
        }
    })

    // 获取图片列表 - 支持筛选
    fastify.get('/api/images', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const queryParams = req.query as any
            
            // 解析查询参数
            const page = parseInt(queryParams.page || '1')
            const limit = parseInt(queryParams.limit || '50')
            const albumId = queryParams.albumId
            const search = queryParams.search
            const sortBy = queryParams.sortBy || 'uploadTime'
            const sortOrder = queryParams.sortOrder || 'desc'
            
            // 计算偏移量
            const offset = (page - 1) * limit
            
            // 构建查询条件
            const whereClause: any = {}
            
            // 按相册筛选
            if (albumId) {
                whereClause.imageAlbums = {
                    some: {
                        albumId
                    }
                }
            }
            
            // 按搜索关键词筛选
            if (search) {
                whereClause.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { filename: { contains: search, mode: 'insensitive' } }
                ]
            }
            
            // 查询图片总数
            const total = await prisma.image.count({
                where: whereClause
            })
            
            // 查询图片列表
            const images = await prisma.image.findMany({
                where: whereClause,
                include: {
                    imageAlbums: {
                        select: {
                            album: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    createdAt: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip: offset,
                take: limit
            })
            
            // 格式化响应
            const formattedImages = images.map((img: any) => {
                const { url, thumbnailUrl } = buildImageUrls(img);
                
                return {
                    ...img,
                    url,
                    thumbnailUrl,
                    uploadTime: img.uploadTime.toISOString(),
                    takenTime: img.takenTime?.toISOString(),
                    albums: img.imageAlbums.map((item: any) => ({
                        ...item.album,
                        createdAt: item.album.createdAt.toISOString()
                    }))
                }
            })
            
            return {
                success: true,
                message: 'Images retrieved successfully',
                data: formattedImages,
                count: formattedImages.length,
                total,
                page,
                limit
            }
        } catch (error) {
            console.log('get images error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 获取单张照片详情
    fastify.get<{ Params: { id: string } }>('/api/images/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const image = await prisma.image.findUnique({
                where: { id },
                include: {
                    imageAlbums: {
                        select: {
                            album: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    createdAt: true
                                }
                            }
                        }
                    }
                }
            })
            
            if (!image) {
                return res.code(404).send({ error: 'Image not found' })
            }

            const { url, thumbnailUrl } = buildImageUrls(image);
            
            return {
                success: true,
                message: 'Image retrieved successfully',
                data: {
                    ...image,
                    url,
                    thumbnailUrl,
                    uploadTime: image.uploadTime.toISOString(),
                    takenTime: image.takenTime?.toISOString(),
                    albums: image.imageAlbums.map((item: any) => ({
                        ...item.album,
                        createdAt: item.album.createdAt.toISOString()
                    }))
                }
            }
        } catch (error) {
            console.log('get image error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 单张图片更新
    fastify.put<{ Params: { id: string } }>('/api/images/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const updateData = req.body as {
                title?: string;
                description?: string;
                albumIds?: string[];
            }

            // 验证图片是否存在
            const existingImage = await prisma.image.findUnique({ where: { id } })
            if (!existingImage) {
                return res.code(404).send({ error: 'Image not found' })
            }
            
            // 更新图片元数据
            const updateDataInput: any = {}
            
            if (updateData.title !== undefined) updateDataInput.title = updateData.title
            if (updateData.description !== undefined) updateDataInput.description = updateData.description
            
            if (updateData.albumIds) {
                updateDataInput.imageAlbums = {
                    deleteMany: {},
                    create: updateData.albumIds.map(albumId => ({
                        album: { connect: { id: albumId } }
                    }))
                }
            }
            
            const updatedImage = await prisma.image.update({
                where: { id },
                data: updateDataInput,
                include: {
                    imageAlbums: {
                        select: {
                            album: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    createdAt: true
                                }
                            }
                        }
                    }
                }
            })

            // 构建响应数据
            const { url, thumbnailUrl } = buildImageUrls(updatedImage);

            return {
                success: true,
                message: 'Image metadata updated successfully',
                data: {
                    ...updatedImage,
                    url,
                    thumbnailUrl,
                    uploadTime: updatedImage.uploadTime.toISOString(),
                    takenTime: updatedImage.takenTime?.toISOString(),
                    albums: updatedImage.imageAlbums.map((item: any) => ({
                        ...item.album,
                        createdAt: item.album.createdAt.toISOString()
                    }))
                }
            }
        } catch (error) {
            console.log('update image error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 批量图片更新
    fastify.put('/api/images/batch', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { imageIds, updateData } = req.body as {
                imageIds: string[];
                updateData: {
                    title?: string;
                    description?: string;
                    albumIds?: string[];
                };
            }

            if (!imageIds || imageIds.length === 0) {
                return res.code(400).send({ error: 'No image IDs provided' })
            }

            let successCount = 0
            const failedIds: string[] = []

            // 批量更新每张图片
            for (const imageId of imageIds) {
                try {
                    // 获取图片当前标签
                    const existingImage = await prisma.image.findUnique({ where: { id: imageId } })
                    if (!existingImage) {
                        failedIds.push(imageId)
                        continue
                    }
                    
                    const updateDataInput: any = {}
                    
                    if (updateData.title !== undefined) updateDataInput.title = updateData.title
                    if (updateData.description !== undefined) updateDataInput.description = updateData.description
                    
                    if (updateData.albumIds) {
                        updateDataInput.imageAlbums = {
                            deleteMany: {},
                            create: updateData.albumIds.map(albumId => ({
                                album: { connect: { id: albumId } }
                            }))
                        }
                    }
                    
                    await prisma.image.update({
                        where: { id: imageId },
                        data: updateDataInput
                    })
                    
                    successCount++
                } catch (error) {
                    failedIds.push(imageId)
                }
            }

            return {
                success: true,
                message: 'Batch update completed',
                data: {
                    updatedCount: successCount,
                    failedCount: failedIds.length,
                    failedIds
                }
            }
        } catch (error) {
            console.log('batch update error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 删除图片
    fastify.delete<{ Params: { id: string } }>('/api/images/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            // 查找图片记录
            const image = await prisma.image.findUnique({
                where: { id }
            })
            if (!image) {
                return res.code(404).send({ error: 'Image not found' })
            }
            
            // 删除存储的文件和缩略图
            const fileExt = path.extname(image.objectKey)
            const thumbnailKey = `${image.objectKey.replace(fileExt, '')}_thumbnail${fileExt}`
            
            if (image.storageType === 'minio' && image.bucketName) {
                // 删除MinIO中的文件和缩略图
                await Promise.all([
                    minioClient.removeObject(image.bucketName, image.objectKey).catch(() => {}),
                    minioClient.removeObject(image.bucketName, thumbnailKey).catch(() => {})
                ])
            } else {
                // 删除本地文件和缩略图
                const uploadDir = path.join(process.cwd(), 'uploads')
                await Promise.all([
                    fs.unlink(path.join(uploadDir, image.objectKey)).catch(() => {}),
                    fs.unlink(path.join(uploadDir, thumbnailKey)).catch(() => {})
                ])
            }

            // 删除数据库记录（级联删除关联的相册关系）
            await prisma.image.delete({
                where: { id }
            })

            return {
                success: true,
                message: 'Image deleted successfully',
            }
        } catch (error) {
            console.log('delete image error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 批量删除图片
    fastify.delete('/api/images/batch', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { imageIds } = req.body as { imageIds: string[] }
            
            if (!imageIds || imageIds.length === 0) {
                return res.code(400).send({ error: 'No image IDs provided' })
            }

            let successCount = 0
            const failedIds: string[] = []

            // 批量删除每张图片
            for (const imageId of imageIds) {
                try {
                    // 查找图片记录
                    const image = await prisma.image.findUnique({
                        where: { id: imageId }
                    })
                    if (!image) {
                        failedIds.push(imageId)
                        continue
                    }
                    
                    // 删除存储的文件和缩略图
                    const fileExt = path.extname(image.objectKey)
                    const thumbnailKey = `${image.objectKey.replace(fileExt, '')}_thumbnail${fileExt}`
                    
                    if (image.storageType === 'minio' && image.bucketName) {
                        // 删除MinIO中的文件
                        await Promise.all([
                            minioClient.removeObject(image.bucketName, image.objectKey).catch(() => {}),
                            minioClient.removeObject(image.bucketName, thumbnailKey).catch(() => {})
                        ])
                    } else {
                        // 删除本地文件
                        const uploadDir = path.join(process.cwd(), 'uploads')
                        await Promise.all([
                            fs.unlink(path.join(uploadDir, image.objectKey)).catch(() => {}),
                            fs.unlink(path.join(uploadDir, thumbnailKey)).catch(() => {})
                        ])
                    }

                    // 删除数据库记录
                    await prisma.image.delete({
                        where: { id: imageId }
                    })
                    
                    successCount++
                } catch (error) {
                    failedIds.push(imageId)
                }
            }

            return {
                success: true,
                message: 'Batch delete completed',
                data: {
                    deletedCount: successCount,
                    failedCount: failedIds.length,
                    failedIds
                }
            }
        } catch (error) {
            console.log('batch delete error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 相册相关API
    
    // 创建相册
    fastify.post('/api/albums', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { name, description } = req.body as { name: string; description?: string }
            
            if (!name) {
                return res.code(400).send({ error: 'Album name is required' })
            }
            
            const albumData: any = { name }
            if (description !== undefined) albumData.description = description
            
            const album = await prisma.album.create({
                data: albumData
            })
            
            return {
                success: true,
                message: 'Album created successfully',
                data: {
                    ...album,
                    createdAt: album.createdAt.toISOString(),
                    imageCount: 0
                }
            }
        } catch (error) {
            console.log('create album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 获取相册列表
    fastify.get('/api/albums', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const albums = await prisma.album.findMany({
                include: {
                    imageAlbums: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
            
            const formattedAlbums = albums.map((album: any) => ({
                ...album,
                createdAt: album.createdAt.toISOString(),
                imageCount: album.imageAlbums.length
            }))
            
            return {
                success: true,
                message: 'Albums retrieved successfully',
                data: formattedAlbums
            }
        } catch (error) {
            console.log('get albums error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 获取相册详情
    fastify.get<{ Params: { id: string } }>('/api/albums/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const album = await prisma.album.findUnique({
                where: { id },
                include: {
                    imageAlbums: {
                        include: {
                            image: {
                                select: {
                                    id: true,
                                    filename: true,
                                    objectKey: true,
                                    storageType: true,
                                    bucketName: true,
                                    fileSize: true,
                                    mimeType: true,
                                    uploadTime: true,
                                    tags: true
                                }
                            }
                        }
                    }
                }
            })
            
            if (!album) {
                return res.code(404).send({ error: 'Album not found' })
            }
            
            // 格式化图片数据
            const formattedImages = album.imageAlbums.map((item: any) => {
                const { url, thumbnailUrl } = buildImageUrls(item.image);
                
                return {
                    ...item.image,
                    url,
                    thumbnailUrl,
                    uploadTime: item.image.uploadTime.toISOString()
                }
            })
            
            return {
                success: true,
                message: 'Album retrieved successfully',
                data: {
                    ...album,
                    createdAt: album.createdAt.toISOString(),
                    images: formattedImages,
                    imageCount: album.imageAlbums.length
                }
            }
        } catch (error) {
            console.log('get album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 添加图片到相册
    fastify.post<{ Params: { id: string } }>('/api/albums/:id/images', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id: albumId } = req.params
            const { imageIds } = req.body as { imageIds: string[] }
            
            if (!imageIds || imageIds.length === 0) {
                return res.code(400).send({ error: 'No image IDs provided' })
            }
            
            // 验证相册存在
            const album = await prisma.album.findUnique({ where: { id: albumId } })
            if (!album) {
                return res.code(404).send({ error: 'Album not found' })
            }
            
            // 批量添加关联
            let addedCount = 0
            for (const imageId of imageIds) {
                try {
                    // 验证图片存在
                    const image = await prisma.image.findUnique({ where: { id: imageId } })
                    if (image) {
                        // 添加关联（使用upsert避免重复）
                        await prisma.imageAlbum.upsert({
                            where: {
                                imageId_albumId: {
                                    imageId,
                                    albumId
                                }
                            },
                            create: {
                                imageId,
                                albumId
                            },
                            update: {}
                        })
                        addedCount++
                    }
                } catch (error) {
                    console.log(`Error adding image ${imageId} to album ${albumId}:`, error)
                }
            }
            
            return {
                success: true,
                message: 'Images added to album successfully',
                data: {
                    addedCount,
                    albumId
                }
            }
        } catch (error) {
            console.log('add images to album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 从相册移除图片
    fastify.delete<{ Params: { id: string; imageId: string } }>('/api/albums/:id/images/:imageId', async (req: FastifyRequest<{ Params: { id: string; imageId: string } }>, res: FastifyReply) => {
        try {
            const { id: albumId, imageId } = req.params
            
            // 验证相册存在
            const album = await prisma.album.findUnique({ where: { id: albumId } })
            if (!album) {
                return res.code(404).send({ error: 'Album not found' })
            }
            
            // 移除关联
            await prisma.imageAlbum.delete({
                where: {
                    imageId_albumId: {
                        imageId,
                        albumId
                    }
                }
            })
            
            return {
                success: true,
                message: 'Image removed from album successfully'
            }
        } catch (error) {
            console.log('remove image from album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 删除相册
    fastify.delete<{ Params: { id: string } }>('/api/albums/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            // 验证相册存在
            const album = await prisma.album.findUnique({ where: { id } })
            if (!album) {
                return res.code(404).send({ error: 'Album not found' })
            }
            
            // 删除相册（级联删除关联）
            await prisma.album.delete({
                where: { id }
            })
            
            return {
                success: true,
                message: 'Album deleted successfully'
            }
        } catch (error) {
            console.log('delete album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })
}
