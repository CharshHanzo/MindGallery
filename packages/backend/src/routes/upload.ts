import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../lib/db'
import { minioClient, ensureBucket } from '../lib/minio'
import { config } from '../lib/config'
import sharp from 'sharp'
import type { 
  UploadImageResponse, 
  BatchUploadImageResponse, 
  ImageInfo,
  ImagesListResponse,
  ImageDetailResponse,
  BatchOperationResponse
} from '@mindgallery/shared/src/types/api'

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
            
            // 获取文件和其他表单数据
            let fileData = null
            let fileBuffer: Buffer | null = null
            const formData: Record<string, any> = {};
            
            // 使用正确的方式处理单文件上传
            console.log('📋 开始处理请求 parts...')
            let hasProcessedFile = false;
            
            // 限制parts处理时间，防止无限等待
            const partsIterator = req.parts();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Parts processing timeout')), 30000);
            });
            
            try {
                // 使用Promise.race来防止无限等待
                while (true) {
                    const partResult = await Promise.race([partsIterator.next(), timeoutPromise]) as IteratorResult<any>;
                    
                    // 检查迭代器是否结束
                    if (partResult.done) {
                        break;
                    }
                    
                    const part = partResult.value;
                    
                    console.log('📋 处理 part:')
                    console.log('   - type:', part.type, ' (类型:', typeof part.type, ')')
                    console.log('   - fieldname:', part.fieldname, ' (类型:', typeof part.fieldname, ')')
                    
                    // 检查是否是文件类型的 part
                    if (part.type === 'file') {
                        // 对于文件类型，获取文件名和 mimetype
                        const filePart = part as any
                        console.log('   - filename:', filePart.filename, ' (类型:', typeof filePart.filename, ')')
                        console.log('   - mimetype:', filePart.mimetype, ' (类型:', typeof filePart.mimetype, ')')
                        console.log('   - fieldname:', filePart.fieldname, ' (类型:', typeof filePart.fieldname, ')')
                        console.log('📋 这是一个文件 part')
                        fileData = filePart
                        fileBuffer = await filePart.toBuffer()
                        hasProcessedFile = true;
                        // 找到文件后，继续处理其他字段（如tags、description等）
                    } else if (part.type === 'field') {
                        // 对于普通字段，获取字段名和值
                        const fieldPart = part as any
                        console.log('   - value:', fieldPart.value, ' (类型:', typeof fieldPart.value, ')')
                        console.log('📋 这是一个字段 part')
                        
                        // 解析JSON格式的值
                        try {
                            formData[fieldPart.fieldname] = JSON.parse(fieldPart.value);
                            console.log('📋 解析JSON字段成功:', fieldPart.fieldname, '->', formData[fieldPart.fieldname]);
                        } catch (e) {
                            // 如果不是JSON，直接保存为字符串
                            formData[fieldPart.fieldname] = fieldPart.value;
                            console.log('📋 直接保存字段:', fieldPart.fieldname, '->', formData[fieldPart.fieldname]);
                        }
                    }
                }
            } catch (e) {
                console.error('📋 处理 parts 时出错:', e);
                // 如果已经处理了文件，继续执行
                if (!hasProcessedFile) {
                    throw e;
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
            // const fileBuffer = await fileData.toBuffer() // 已在循环中读取
            if (!fileBuffer) {
                return res.code(500).send({ error: 'File buffer is missing' })
            }

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
            // 确保tagsArray是数组
            let tagsArray: string[] = [];
            if (formData.tags) {
                if (Array.isArray(formData.tags)) {
                    tagsArray = formData.tags;
                } else if (typeof formData.tags === 'string') {
                    try {
                        // 尝试解析JSON字符串
                        const parsedTags = JSON.parse(formData.tags);
                        if (Array.isArray(parsedTags)) {
                            tagsArray = parsedTags;
                        }
                    } catch (e) {
                        console.error('解析tags失败:', e);
                        tagsArray = [];
                    }
                }
            }
            
            // 保存图片
            const image = await prisma.image.create({
                data: {
                    filename: fileData.filename,
                    objectKey: objectKey,
                    storageType: storageType,
                    bucketName: bucketName,
                    fileSize: fileBuffer.length,
                    mimeType: fileData.mimetype,
                    tags: tagsArray,
                    description: formData.description || null
                }
            })
            
            // 处理标签关联和计数
            if (tagsArray.length > 0) {
                // 获取所有标签记录，不存在则创建
                const tagRecords = await Promise.all(
                    tagsArray.map(async (tagName: string) => {
                        // 查找或创建标签
                        return await prisma.tag.upsert({
                            where: { name: tagName },
                            update: {
                                count: { increment: 1 } // 增加计数
                            },
                            create: {
                                name: tagName,
                                count: 1 // 初始计数为1
                            }
                        });
                    })
                );
                
                // 创建ImageTag关联
                await Promise.all(
                    tagRecords.map(tag => 
                        prisma.imageTag.create({
                            data: {
                                imageId: image.id,
                                tagId: tag.id
                            }
                        })
                    )
                );
            }

            // 构建响应数据
            const { url, thumbnailUrl } = buildImageUrls(image);

            // 转换为前端需要的格式
            const imageInfo: ImageInfo = {
                id: image.id,
                filename: image.filename,
                url,
                thumbnailUrl,
                fileSize: image.fileSize,
                uploadTime: image.uploadTime.toISOString(),
                tags: image.tags,
                ...(image.description && { description: image.description }),
                ...(image.width && { width: image.width }),
                ...(image.height && { height: image.height }),
                ...(image.takenTime && { takenTime: image.takenTime.toISOString() }),
                albums: []
            }

            const response: UploadImageResponse = {
                success: true,
                message: 'Image uploaded successfully',
                data: imageInfo
            }

            return response
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
            
            // 获取文件列表和其他表单数据
            let fileArray = []
            const formData: Record<string, any> = {};
            
            try {
                console.log('✅ 文件解析开始')
                
                // 使用正确的方式处理多文件上传
                console.log('📋 开始处理请求 parts...')
                
                // 限制parts处理时间，防止无限等待
                const partsIterator = req.parts();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Parts processing timeout')), 30000);
                });
                
                try {
                    // 使用Promise.race来防止无限等待
                    while (true) {
                        const partResult = await Promise.race([partsIterator.next(), timeoutPromise]) as IteratorResult<any>;
                    
                        // 检查迭代器是否结束
                        if (partResult.done) {
                            break;
                        }
                    
                        const part = partResult.value;
                        
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
                            const buffer = await filePart.toBuffer()
                            fileArray.push({ part: filePart, buffer })
                        } else if (part.type === 'field') {
                            // 对于普通字段，获取字段名和值
                            const fieldPart = part as any
                            console.log('   - value:', fieldPart.value, ' (类型:', typeof fieldPart.value, ')')
                            console.log('📋 这是一个字段 part')
                            
                            // 解析JSON格式的值
                            try {
                                formData[fieldPart.fieldname] = JSON.parse(fieldPart.value);
                                console.log('📋 解析JSON字段成功:', fieldPart.fieldname, '->', formData[fieldPart.fieldname]);
                            } catch (e) {
                                // 如果不是JSON，直接保存为字符串
                                formData[fieldPart.fieldname] = fieldPart.value;
                                console.log('📋 直接保存字段:', fieldPart.fieldname, '->', formData[fieldPart.fieldname]);
                            }
                        }
                    }
                } catch (e) {
                    console.error('📋 处理 parts 时出错:', e);
                    // 如果已经处理了至少一个文件，继续执行
                    if (fileArray.length === 0) {
                        throw e;
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
            
            for (const fileItem of fileArray) {
                try {
                    const file = fileItem.part;
                    const fileBuffer = fileItem.buffer;
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
                    // const fileBuffer = await file.toBuffer() // 已在循环中读取
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
                    // 确保tagsArray是数组
                    let tagsArray: string[] = [];
                    if (formData.tags) {
                        if (Array.isArray(formData.tags)) {
                            tagsArray = formData.tags;
                        } else if (typeof formData.tags === 'string') {
                            try {
                                // 尝试解析JSON字符串
                                const parsedTags = JSON.parse(formData.tags);
                                if (Array.isArray(parsedTags)) {
                                    tagsArray = parsedTags;
                                }
                            } catch (e) {
                                console.error('解析tags失败:', e);
                                tagsArray = [];
                            }
                        }
                    }
                    
                    const image = await prisma.image.create({
                        data: {
                            filename: file.filename,
                            objectKey,
                            storageType,
                            bucketName,
                            fileSize: fileBuffer.length,
                            mimeType: file.mimetype,
                            tags: tagsArray,
                            description: formData.description || null
                        }
                    })
                    console.log(`✅ 数据库保存完成, 图片ID: ${image.id}`)
                    
                    // 处理标签关联和计数
                    if (tagsArray.length > 0) {
                        // 获取所有标签记录，不存在则创建
                        const tagRecords = await Promise.all(
                            tagsArray.map(async (tagName: string) => {
                                // 查找或创建标签
                                return await prisma.tag.upsert({
                                    where: { name: tagName },
                                    update: {
                                        count: { increment: 1 } // 增加计数
                                    },
                                    create: {
                                        name: tagName,
                                        count: 1 // 初始计数为1
                                    }
                                });
                            })
                        );
                        
                        // 创建ImageTag关联
                        await Promise.all(
                            tagRecords.map(tag => 
                                prisma.imageTag.create({
                                    data: {
                                        imageId: image.id,
                                        tagId: tag.id
                                    }
                                })
                            )
                        );
                    }

                    // 构建响应数据
                    const { url, thumbnailUrl } = buildImageUrls(image);
                    console.log(`🌐 图片URL: ${url}, 缩略图URL: ${thumbnailUrl}`)

                    // 转换为前端需要的格式
                    const imageInfo: ImageInfo = {
                        id: image.id,
                        filename: image.filename,
                        url,
                        thumbnailUrl,
                        fileSize: image.fileSize,
                        uploadTime: image.uploadTime.toISOString(),
                        tags: image.tags,
                        ...(image.description && { description: image.description }),
                        ...(image.width && { width: image.width }),
                        ...(image.height && { height: image.height }),
                        ...(image.takenTime && { takenTime: image.takenTime.toISOString() }),
                        albums: []
                    }

                    uploadedImages.push(imageInfo)
                    console.log(`✅ 文件处理完成: ${file.filename}`)
                } catch (fileError) {
                    console.error(`❌ 文件处理失败: ${fileItem.part.filename}`)
                    console.error('📋 文件处理错误:', fileError)
                    console.error('📋 文件处理错误栈:', fileError instanceof Error ? fileError.stack : 'No stack trace')
                    failedFiles.push({
                        filename: fileItem.part.filename,
                        error: fileError instanceof Error ? fileError.message : String(fileError),
                        stack: fileError instanceof Error ? fileError.stack : undefined
                    })
                }
            }

            console.log(`📊 上传结果: 成功 ${uploadedImages.length} 个, 失败 ${failedFiles.length} 个`)
            
            const response: BatchUploadImageResponse = {
                success: true,
                message: `${uploadedImages.length} out of ${fileArray.length} images uploaded successfully`,
                data: uploadedImages,
                count: uploadedImages.length,
                failedFiles
            }
            
            console.log('✅ 批量上传处理完成')
            return response
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
            
            // 相册功能暂未实现，移除相册筛选
            
            // 按搜索关键词筛选
            if (search) {
                whereClause.OR = [
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
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip: offset,
                take: limit
            })
            
            // 转换为前端需要的格式
            const imageInfos: ImageInfo[] = images.map((img: any) => {
                const { url, thumbnailUrl } = buildImageUrls(img);
                
                return {
                    id: img.id,
                    filename: img.filename,
                    url,
                    thumbnailUrl,
                    fileSize: img.fileSize,
                    uploadTime: img.uploadTime.toISOString(),
                    tags: img.tags,
                    ...(img.description && { description: img.description }),
                    ...(img.width && { width: img.width }),
                    ...(img.height && { height: img.height }),
                    ...(img.takenTime && { takenTime: img.takenTime.toISOString() }),
                    albums: [] // 相册功能暂未实现
                }
            })
            
            const response: ImagesListResponse = {
                success: true,
                message: 'Images retrieved successfully',
                data: imageInfos,
                count: imageInfos.length,
                total,
                page,
                limit
            }
            
            return response
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
                where: { id }
            })
            
            if (!image) {
                return res.code(404).send({ error: 'Image not found' })
            }

            const { url, thumbnailUrl } = buildImageUrls(image);
            
            // 转换为前端需要的格式
            const imageInfo: ImageInfo = {
                id: image.id,
                filename: image.filename,
                url,
                thumbnailUrl,
                fileSize: image.fileSize,
                uploadTime: image.uploadTime.toISOString(),
                tags: image.tags,
                ...(image.description && { description: image.description }),
                ...(image.width && { width: image.width }),
                ...(image.height && { height: image.height }),
                ...(image.takenTime && { takenTime: image.takenTime.toISOString() }),
                albums: [] // 相册功能暂未实现
            }
            
            const response: ImageDetailResponse = {
                success: true,
                message: 'Image retrieved successfully',
                data: imageInfo
            }
            
            return response
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
            
            if (updateData.description !== undefined) updateDataInput.description = updateData.description
            
            // 相册功能暂未实现，移除相册更新逻辑
            
            const updatedImage = await prisma.image.update({
                where: { id },
                data: updateDataInput
            })

            // 构建响应数据
            const { url, thumbnailUrl } = buildImageUrls(updatedImage);

            // 转换为前端需要的格式
            const imageInfo: ImageInfo = {
                id: updatedImage.id,
                filename: updatedImage.filename,
                url,
                thumbnailUrl,
                fileSize: updatedImage.fileSize,
                uploadTime: updatedImage.uploadTime.toISOString(),
                tags: updatedImage.tags,
                ...(updatedImage.description && { description: updatedImage.description }),
                ...(updatedImage.width && { width: updatedImage.width }),
                ...(updatedImage.height && { height: updatedImage.height }),
                ...(updatedImage.takenTime && { takenTime: updatedImage.takenTime.toISOString() }),
                albums: [] // 相册功能暂未实现
            }

            const response: ImageDetailResponse = {
                success: true,
                message: 'Image metadata updated successfully',
                data: imageInfo
            }

            return response
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

            const response: BatchOperationResponse = {
                success: true,
                message: 'Batch update completed',
                data: {
                    updatedCount: successCount,
                    failedIds
                }
            }
            
            return response
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

            const response: BatchOperationResponse = {
                success: true,
                message: 'Batch delete completed',
                data: {
                    deletedCount: successCount,
                    failedIds
                }
            }
            
            return response
        } catch (error) {
            console.log('batch delete error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 相册功能暂未实现
}
