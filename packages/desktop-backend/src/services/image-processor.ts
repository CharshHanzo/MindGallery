import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs-extra';

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  exif?: any;
  hash: string;
}

export class ImageProcessor {
  
  async processImage(filePath: string): Promise<ImageMetadata> {
    const buffer = await fs.readFile(filePath);
    const hash = this.generateHash(buffer);
    
    const metadata = await sharp(buffer).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      exif: metadata.exif, // Basic EXIF, usually needs parsing
      hash
    };
  }

  async generateThumbnail(filePath: string, width: number = 200): Promise<Buffer> {
    return sharp(filePath)
      .resize(width)
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  private generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

export const imageProcessor = new ImageProcessor();
