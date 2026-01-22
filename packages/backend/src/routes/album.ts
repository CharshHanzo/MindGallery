import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/db'
import { config } from '../lib/config'
import type { 
    AlbumInfo, 
    AlbumsListResponse, 
    CreateAlbumRequest, 
    CreateAlbumResponse,
    AlbumDetailResponse,
    AlbumImageRequest,
    AlbumImageResponse
} from '@mindgallery/shared'
import type { AlbumWithCount, AlbumDetailed } from '../types/album'

// 构建图片URL (复用upload.ts中的逻辑)
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

export async function albumRoutes(fastify: FastifyInstance) {
    // 获取相册列表
    fastify.get('/api/albums', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const albums = await prisma.album.findMany({
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    _count: {
                        select: { imageAlbums: true }
                    }
                }
            })
            
            const albumInfos: AlbumInfo[] = albums.map(album => ({
                id: album.id,
                name: album.name,
                ...(album.description ? { description: album.description } : {}),
                createdAt: album.createdAt.toISOString(),
                imageCount: album._count.imageAlbums
            }))
            
            const response: AlbumsListResponse = {
                success: true,
                message: 'Albums retrieved successfully',
                data: albumInfos
            }
            
            return response
        } catch (error) {
            console.error('get albums error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 创建相册
    fastify.post('/api/albums', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { name, description } = req.body as CreateAlbumRequest
            
            if (!name || name.trim() === '') {
                return res.code(400).send({ error: 'Album name is required' })
            }
            
            const album = await prisma.album.create({
                data: {
                    name: name.trim(),
                    description: description || null
                }
            })
            
            const albumInfo: AlbumInfo = {
                id: album.id,
                name: album.name,
                ...(album.description ? { description: album.description } : {}),
                createdAt: album.createdAt.toISOString(),
                imageCount: 0
            }
            
            const response: CreateAlbumResponse = {
                success: true,
                message: 'Album created successfully',
                data: albumInfo
            }
            
            return response
        } catch (error) {
            console.error('create album error', error)
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
                            image: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    },
                    _count: {
                        select: { imageAlbums: true }
                    }
                }
            }) as unknown as AlbumDetailed | null
            
            if (!album) {
                return res.code(404).send({ error: 'Album not found' })
            }
            
            const images = album.imageAlbums.map(ia => {
                const img = ia.image
                const { url, thumbnailUrl } = buildImageUrls(img)
                return {
                    id: img.id,
                    filename: img.filename,
                    url,
                    thumbnailUrl,
                    fileSize: img.fileSize,
                    uploadTime: img.uploadTime.toISOString(),
                    ...(img.description ? { title: img.description } : {}),
                    tags: img.tags
                }
            })
            
            const albumDetail = {
                id: album.id,
                name: album.name,
                ...(album.description ? { description: album.description } : {}),
                createdAt: album.createdAt.toISOString(),
                imageCount: album._count.imageAlbums,
                images
            }
            
            const response: AlbumDetailResponse = {
                success: true,
                message: 'Album details retrieved successfully',
                data: albumDetail
            }
            
            return response
        } catch (error) {
            console.error('get album details error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 更新相册信息
    fastify.put<{ Params: { id: string } }>('/api/albums/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const { name, description } = req.body as CreateAlbumRequest
            
            if (!name || name.trim() === '') {
                return res.code(400).send({ error: 'Album name is required' })
            }
            
            const album = await prisma.album.update({
                where: { id },
                data: {
                    name: name.trim(),
                    description: description || null
                },
                include: {
                    _count: {
                        select: { imageAlbums: true }
                    }
                }
            }) as unknown as AlbumWithCount
            
            const albumInfo: AlbumInfo = {
                id: album.id,
                name: album.name,
                ...(album.description ? { description: album.description } : {}),
                createdAt: album.createdAt.toISOString(),
                imageCount: album._count.imageAlbums
            }
            
            const response: CreateAlbumResponse = {
                success: true,
                message: 'Album updated successfully',
                data: albumInfo
            }
            
            return response
        } catch (error) {
            console.error('update album error', error)
            // Handle record not found
            if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
                 return res.code(404).send({ error: 'Album not found' })
            }
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 删除相册
    fastify.delete<{ Params: { id: string } }>('/api/albums/:id', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            
            await prisma.album.delete({
                where: { id }
            })
            
            return {
                success: true,
                message: 'Album deleted successfully'
            }
        } catch (error) {
            console.error('delete album error', error)
            if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
                 return res.code(404).send({ error: 'Album not found' })
            }
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 向相册添加图片
    fastify.post<{ Params: { id: string } }>('/api/albums/:id/images', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const { imageIds } = req.body as AlbumImageRequest
            
            if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
                return res.code(400).send({ error: 'No image IDs provided' })
            }
            
            // 验证相册是否存在
            const album = await prisma.album.findUnique({ where: { id } })
            if (!album) {
                return res.code(404).send({ error: 'Album not found' })
            }
            
            // 批量添加图片到相册
            let addedCount = 0
            
            await prisma.$transaction(
                imageIds.map(imageId => 
                    prisma.imageAlbum.upsert({
                        where: {
                            imageId_albumId: {
                                imageId,
                                albumId: id
                            }
                        },
                        create: {
                            imageId,
                            albumId: id
                        },
                        update: {}
                    })
                )
            )
            
            addedCount = imageIds.length // 简化处理，实际上可能有重复
            
            const response: AlbumImageResponse = {
                success: true,
                message: 'Images added to album successfully',
                data: {
                    albumId: id,
                    addedCount
                }
            }
            
            return response
        } catch (error) {
            console.error('add images to album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })

    // 从相册移除图片
    fastify.delete<{ Params: { id: string } }>('/api/albums/:id/images', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
        try {
            const { id } = req.params
            const { imageIds } = req.body as AlbumImageRequest
            
            if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
                return res.code(400).send({ error: 'No image IDs provided' })
            }
            
            const result = await prisma.imageAlbum.deleteMany({
                where: {
                    albumId: id,
                    imageId: {
                        in: imageIds
                    }
                }
            })
            
            const response: AlbumImageResponse = {
                success: true,
                message: 'Images removed from album successfully',
                data: {
                    albumId: id,
                    removedCount: result.count
                }
            }
            
            return response
        } catch (error) {
            console.error('remove images from album error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })
}
