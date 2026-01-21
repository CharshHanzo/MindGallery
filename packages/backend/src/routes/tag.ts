import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/db'
import type { TagInfo, TagsListResponse } from '@mindgallery/shared/src/types/api'

export async function tagRoutes(fastify: FastifyInstance) {
    // 获取所有标签
    fastify.get('/api/tags', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const tags = await prisma.tag.findMany({
                orderBy: {
                    count: 'desc'
                }
            })
            
            // 转换为前端需要的格式
            const tagInfos: TagInfo[] = tags.map(tag => ({
                id: tag.id,
                name: tag.name,
                count: tag.count
            }))
            
            const response: TagsListResponse = {
                success: true,
                message: 'Tags retrieved successfully',
                data: tagInfos
            }
            
            return response
        } catch (error) {
            console.log('get tags error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })
    
    // 创建或更新标签
    fastify.post('/api/tags', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { name, description } = req.body as { name: string; description?: string }
            
            if (!name || name.trim() === '') {
                return res.code(400).send({ error: 'Tag name is required' })
            }
            
            const tag = await prisma.tag.upsert({
                where: { name: name.trim() },
                update: {
                    description: description || null
                },
                create: {
                    name: name.trim(),
                    description: description || null,
                    count: 0
                }
            })
            
            // 转换为前端需要的格式
            const tagInfo: TagInfo = {
                id: tag.id,
                name: tag.name,
                count: tag.count
            }
            
            const response = {
                success: true,
                message: 'Tag created/updated successfully',
                data: tagInfo
            }
            
            return response
        } catch (error) {
            console.log('create/update tag error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })
    
    // 删除标签
    fastify.delete<{ Params: { name: string } }>('/api/tags/:name', async (req: FastifyRequest<{ Params: { name: string } }>, res: FastifyReply) => {
        try {
            const { name } = req.params
            
            // 删除标签，同时会自动删除imageTags关联
            await prisma.tag.delete({
                where: { name }
            })
            
            return {
                success: true,
                message: 'Tag deleted successfully'
            }
        } catch (error) {
            console.log('delete tag error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })
    
    // 批量更新标签
    fastify.put('/api/tags/batch', async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { tags } = req.body as { tags: { name: string; description?: string }[] }
            
            if (!tags || tags.length === 0) {
                return res.code(400).send({ error: 'No tags provided' })
            }
            
            const updatedTagInfos: TagInfo[] = []
            
            for (const tagData of tags) {
                if (!tagData.name || tagData.name.trim() === '') {
                    continue
                }
                
                const tag = await prisma.tag.upsert({
                    where: { name: tagData.name.trim() },
                    update: {
                        description: tagData.description || null
                    },
                    create: {
                        name: tagData.name.trim(),
                        description: tagData.description || null,
                        count: 0
                    }
                })
                
                // 转换为前端需要的格式
                const tagInfo: TagInfo = {
                    id: tag.id,
                    name: tag.name,
                    count: tag.count
                }
                
                updatedTagInfos.push(tagInfo)
            }
            
            const response = {
                success: true,
                message: 'Tags updated successfully',
                data: updatedTagInfos
            }
            
            return response
        } catch (error) {
            console.log('batch update tags error', error)
            return res.code(500).send({ error: 'Internal server error', details: String(error) })
        }
    })
}
