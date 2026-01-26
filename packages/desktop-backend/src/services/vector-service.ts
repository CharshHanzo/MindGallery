import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const CLIP_API_URL = process.env.CLIP_API_URL || 'http://127.0.0.1:5001';

export class VectorService {
  private clipUrl: string = CLIP_API_URL;

  async init() {
    try {
      console.log(`VectorService initialized. Using external CLIP service: ${this.clipUrl}`);
    } catch (e) {
      console.error('VectorService init failed:', e);
    }
  }

  async generateEmbedding(imagePath: string): Promise<number[]> {
    try {
      const vector = await this.requestClipVector(imagePath);
      return vector;
    } catch (e) {
      console.error('Embedding generation via CLIP service failed:', e);
      return [];
    }
  }

  async analyzeImage(imagePath: string) {
    return {
      tags: [],
      embedding: await this.generateEmbedding(imagePath),
      colors: []
    };
  }

  async generateTextEmbedding(text: string): Promise<number[]> {
    try {
      const vector = await this.requestTextVector(text);
      return vector;
    } catch (e) {
      console.error('Text embedding via CLIP service failed:', e);
      return [];
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.heic': 'image/heic',
      '.heif': 'image/heif'
    };
    return map[ext] || 'application/octet-stream';
  }

  private async requestClipVector(filePath: string): Promise<number[]> {
    const fileName = path.basename(filePath);
    const fileBuffer = await fs.promises.readFile(filePath);
    const mimeType = this.getMimeType(filePath);

    const boundary = '----MindGalleryBoundary' + Math.random().toString(16).slice(2);
    const CRLF = '\r\n';

    const preamble =
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
      `Content-Type: ${mimeType}${CRLF}${CRLF}`;

    const closing = `${CRLF}--${boundary}--${CRLF}`;

    const preambleBuffer = Buffer.from(preamble, 'utf8');
    const closingBuffer = Buffer.from(closing, 'utf8');
    const bodyBuffer = Buffer.concat([preambleBuffer, fileBuffer, closingBuffer]);

    const urlObj = new URL(`${this.clipUrl}/encode-image`);
    const isHttps = urlObj.protocol === 'https:';
    const options = {
      method: 'POST',
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port) : (isHttps ? 443 : 80),
      path: urlObj.pathname,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    };

    const client = isHttps ? https : http;

    return new Promise<number[]>((resolve, reject) => {
      const req = client.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            const json = JSON.parse(text);
            if (json && Array.isArray(json.vector)) {
              resolve(json.vector as number[]);
            } else {
              reject(new Error('Invalid response from CLIP service'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.write(bodyBuffer);
      req.end();
    });
  }

  private async requestTextVector(text: string): Promise<number[]> {
    const urlObj = new URL(`${this.clipUrl}/encode-text`);
    const isHttps = urlObj.protocol === 'https:';
    const payload = JSON.stringify({ text });

    const options = {
      method: 'POST',
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port) : (isHttps ? 443 : 80),
      path: urlObj.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload, 'utf8')
      }
    };

    const client = isHttps ? https : http;

    return new Promise<number[]>((resolve, reject) => {
      const req = client.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            const json = JSON.parse(text);
            if (json && Array.isArray(json.vector)) {
              resolve(json.vector as number[]);
            } else {
              reject(new Error('Invalid response from CLIP service'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }
}

export const vectorService = new VectorService();
