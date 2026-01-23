import { config } from '@mindgallery/config'

export class ClipService {
  private readonly baseUrl: string

  // Use 127.0.0.1 explicitly to avoid IPv6 resolution issues with Node.js
  constructor(baseUrl: string = 'http://127.0.0.1:5001') {
    this.baseUrl = baseUrl
  }

  // Generate vector for image
  async encodeImage(imageBuffer: Buffer, filename: string = 'image.jpg'): Promise<number[]> {
    try {
      console.log(`🔌 Calling CLIP service for image: ${filename}, size: ${imageBuffer.length} bytes`)
      const formData = new FormData()
      // Cast buffer to any to avoid TS issues with BlobPart compatibility
      const blob = new Blob([imageBuffer as any])
      formData.append('file', blob, filename)

      const response = await fetch(`${this.baseUrl}/encode-image`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ CLIP Service Error Status: ${response.status} ${response.statusText}`)
        console.error(`❌ CLIP Service Error Body: ${errorText}`)
        throw new Error(`CLIP Service Error: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json() as { vector: number[] }
      console.log(`✅ CLIP service returned vector of length: ${data.vector?.length}`)
      return data.vector
    } catch (error) {
      console.error('❌ CLIP Encode Image Exception:', error)
      return []
    }
  }

  // Generate vector for text
  async encodeText(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/encode-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`CLIP Service Error: ${response.statusText}`)
      }

      const data = await response.json() as { vector: number[] }
      return data.vector
    } catch (error) {
      console.error('CLIP Encode Text Failed:', error)
      return []
    }
  }

  // Calculate similarity
  async calculateSimilarity(imageBuffer: Buffer, text: string): Promise<number> {
    try {
      const formData = new FormData()
      const blob = new Blob([imageBuffer as any])
      formData.append('file', blob, 'image.jpg')
      formData.append('text', text)

      const response = await fetch(`${this.baseUrl}/similarity`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`CLIP Service Error: ${response.statusText}`)
      }

      const data = await response.json() as { similarity: number }
      return data.similarity
    } catch (error) {
      console.error('CLIP Similarity Failed:', error)
      return 0
    }
  }
}

export const clipService = new ClipService()
