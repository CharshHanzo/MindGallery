import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

interface UploadResult {
  success: boolean;
  filePath: string;
  error?: string;
  data?: any;
}

interface BatchUploadResult {
  success: boolean;
  processed: number;
  total: number;
  results: UploadResult[];
}

export class HttpUploader {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // Determine mime type (basic implementation)
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.heic': 'image/heic',
      '.heif': 'image/heif'
    };
    return map[ext] || 'application/octet-stream';
  }

  async uploadFile(filePath: string): Promise<UploadResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, filePath, error: 'File not found' };
      }

      const form = new FormData();
      const fileName = path.basename(filePath);
      
      // Add file stream
      form.append('files', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: this.getMimeType(filePath)
      });

      // Use the batch endpoint for consistency, or single if preferred
      // Assuming /api/upload handles single file under 'files' key correctly 
      // or we use the specific single upload endpoint
      const response = await axios.post(`${this.baseUrl}/api/upload`, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return {
        success: true,
        filePath,
        data: response.data
      };

    } catch (error: any) {
      console.error(`Upload failed for ${filePath}:`, error.message);
      return {
        success: false,
        filePath,
        error: error.message
      };
    }
  }

  async uploadFiles(filePaths: string[], onProgress?: (current: number, total: number) => void): Promise<BatchUploadResult> {
    const results: UploadResult[] = [];
    let processed = 0;
    const total = filePaths.length;

    // Use a concurrency limit (e.g., 3 concurrent uploads)
    const CONCURRENCY = 3;
    
    for (let i = 0; i < total; i += CONCURRENCY) {
      const chunk = filePaths.slice(i, i + CONCURRENCY);
      
      const chunkPromises = chunk.map(async (filePath) => {
        const result = await this.uploadFile(filePath);
        processed++;
        if (onProgress) onProgress(processed, total);
        return result;
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount === total,
      processed,
      total,
      results
    };
  }
}

export const httpUploader = new HttpUploader();
