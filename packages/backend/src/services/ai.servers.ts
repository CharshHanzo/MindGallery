import { clipService } from './clip.service'

export interface AIImageAnalysis {
  description: string
  tags: string[]
  vector?: number[]
}

export class AIService {
  // 分析图片内容
  async analyzeImage(imageBuffer: Buffer): Promise<AIImageAnalysis> {
    let description = 'AI分析已禁用'
    let tags: string[] = []
    let vector: number[] = []

    // 1. 获取图片向量 (CLIP)
    // 这是核心功能，必须保留用于以图搜图
    try {
      vector = await clipService.encodeImage(imageBuffer)
    } catch (error) {
      console.error('AI向量化(CLIP)失败:', error)
    }

    // 2. 使用 CLIP 进行 Zero-shot 分类（可选）
    /*
    if (vector.length > 0) {
       // TODO: 实现 CLIP Zero-shot 标签分类
       // tags = await clipService.predictTags(vector)
    }
    */

    return {
      description,
      tags,
      ...(vector.length > 0 ? { vector } : {})
    }
  }

  // 生成文本向量（用于搜索）
  async generateTextVector(text: string): Promise<number[]> {
    return await clipService.encodeText(text)
  }
}

// 单例实例
export const aiService = new AIService()
