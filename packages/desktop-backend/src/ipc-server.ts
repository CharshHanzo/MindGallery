import { SqliteClient } from './database/sqlite-client';
import { fileManager } from './services/file-manager';
import { imageProcessor } from './services/image-processor';
import { vectorService } from './services/vector-service';
import { IpcRequest, IpcResponse, LocalImage, ListOptions } from './types';

export class IpcServer {
  private db: SqliteClient;

  constructor(dbPath: string) {
    this.db = new SqliteClient(dbPath);
    this.init();
  }

  private init() {
    // Listen for messages from parent process (Electron)
    process.on('message', async (message: IpcRequest) => {
      if (!message || !message.id) return;

      try {
        const result = await this.handleRequest(message);
        this.sendResponse({ id: message.id, result });
      } catch (error: any) {
        this.sendResponse({ id: message.id, error: error.message });
      }
    });

    // Notify ready
    if (process.send) {
      process.send({ type: 'ready' });
    }
  }

  private sendResponse(response: IpcResponse) {
    if (process.send) {
      process.send(response);
    }
  }

  private sendEvent(event: string, payload: any) {
    if (process.send) {
      process.send({ type: 'event', event, payload });
    }
  }

  private async handleRequest(req: IpcRequest): Promise<any> {
    const { method, params } = req;

    switch (method) {
      // --- Image Management ---
      case 'images:import-folder':
        return this.importFolder(params.folderPath);
      
      case 'images:list':
        return this.db.getImages(params as ListOptions);
      
      case 'images:search':
        if (params.vector) {
          return this.db.searchByVector(params.vector, params.limit);
        }
        // Fallback or text search if implemented
        return [];

      case 'images:delete':
        return this.db.deleteImages(params.imageIds);

      // --- System ---
      case 'system:get-info':
        return {
          platform: process.platform,
          arch: process.arch,
          version: '1.0.0',
          ...this.db.getStats()
        };

      // --- AI ---
      case 'ai:analyze-image':
        return vectorService.analyzeImage(params.imagePath);

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private async importFolder(folderPath: string) {
    const files = await fileManager.scanDirectory(folderPath);
    let imported = 0;
    let failed = 0;
    const errors: any[] = [];

    this.sendEvent('import:progress', { current: 0, total: files.length, currentPath: '' });

    for (const filePath of files) {
      try {
        // Check if exists
        const existing = this.db.getImageByPath(filePath);
        if (existing) {
          imported++; // Skip but count as processed/imported
          continue;
        }

        const stats = await fileManager.getFileStats(filePath);
        const metadata = await imageProcessor.processImage(filePath);

        // Add to DB
        const image = this.db.addImage({
          filePath,
          fileName: filePath.split(/[/\\]/).pop() || '',
          fileSize: stats.size,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          metadata: { ...metadata, hash: metadata.hash }
        });

        // Async: Generate embedding
        // We don't await this to speed up import, or we do await if we want strict consistency
        // For now, let's await to ensure DB consistency
        const embedding = await vectorService.generateEmbedding(filePath);
        if (embedding.length > 0) {
          this.db.addVector(image.id, embedding);
        }

        imported++;
      } catch (e: any) {
        failed++;
        errors.push({ path: filePath, error: e.message });
      }

      // Throttle progress updates
      if (imported % 5 === 0) {
        this.sendEvent('import:progress', { 
          current: imported + failed, 
          total: files.length, 
          currentPath: filePath 
        });
      }
    }

    this.sendEvent('import:complete', { count: imported, duration: 0 });

    return {
      success: true,
      total: files.length,
      imported,
      failed,
      errors
    };
  }
}
