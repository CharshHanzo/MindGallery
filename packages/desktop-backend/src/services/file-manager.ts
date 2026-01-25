import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export class FileManager {
  async scanDirectory(dirPath: string): Promise<string[]> {
    if (!await fs.pathExists(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    // Use glob to find image files
    // Patterns for common image formats
    const patterns = ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.webp', '**/*.bmp', '**/*.heic'];
    
    // Note: glob might be slow for huge directories. 
    // In a real app, we might use a streaming scanner or native recursive readdir.
    const files = await glob(patterns, {
      cwd: dirPath,
      absolute: true,
      nodir: true,
      nocase: true,
      ignore: ['**/node_modules/**', '**/.*'] // Ignore hidden files and node_modules
    });

    return files;
  }

  async getFileStats(filePath: string) {
    return fs.stat(filePath);
  }

  normalizePath(p: string): string {
    return path.normalize(p);
  }
}

export const fileManager = new FileManager();
