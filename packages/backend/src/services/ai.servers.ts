import axios from 'axios'
import { config } from '../lib/config'
import { clipService } from './clip.service'

export interface AIImageAnalysis {
  description: string
  tags: string[]
  vector?: number[]
}

export class AIService {
  private readonly baseUrl: string
  private readonly model: string

  constructor() {
    this.baseUrl = config.ollama.url
    this.model = config.ollama.model
  }

  // 分析图片内容
  async analyzeImage(imageBuffer: Buffer): Promise<AIImageAnalysis> {
    let description = '图片分析失败'
    let tags: string[] = ['未分析']
    let vector: number[] = []

    // 1. 获取文本描述 (Ollama)
    try {
      const base64Image = imageBuffer.toString('base64')
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: '详细描述这张图片的内容，包括主要物体、场景、颜色、氛围等',
        images: [base64Image],
        stream: false
      })

      description = response.data.response
      tags = this.extractTags(description)
    } catch (error) {
      console.error('AI分析(Ollama)失败:', error)
    }

    // 2. 获取图片向量 (CLIP)
    try {
      vector = await clipService.encodeImage(imageBuffer)
    } catch (error) {
      console.error('AI向量化(CLIP)失败:', error)
    }

    return {
      description,
      tags,
      ...(vector.length > 0 ? { vector } : {})
    }
  }

  // 从描述中提取标签
  private extractTags(description: string): string[] {
    const tags: string[] = []
    
    // 简单关键词匹配（后续可以用更复杂的NLP）
    const keywords = [
      '人', '人物', '人脸', '肖像',
      '动物', '猫', '狗', '鸟', '鱼',
      '自然', '风景', '山', '水', '天空', '云', '树', '花',
      '建筑', '房子', '城市', '街道',
      '室内', '房间', '家具', '桌子', '椅子', '沙发',
      '食物', '水果', '蔬菜', '饮料',
      '车辆', '汽车', '自行车',
      '白天', '夜晚', '晴天', '雨天',
      '工作', '学习', '娱乐', '运动'
    ]
    
    keywords.forEach(keyword => {
      if (description.includes(keyword)) {
        tags.push(keyword)
      }
    })
    
    // 限制标签数量
    return tags.slice(0, 10)
  }

  // 生成文本向量（用于搜索）
  async generateTextVector(text: string): Promise<number[]> {
    // 使用 CLIP 服务替代 Ollama
    return await clipService.encodeText(text)
  }
}

// 单例实例
export const aiService = new AIService()
