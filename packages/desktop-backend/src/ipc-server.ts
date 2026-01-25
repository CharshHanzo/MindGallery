import { SqliteClient } from './database/sqlite-client';
import { fileManager } from './services/file-manager';
import { imageProcessor } from './services/image-processor';
import { vectorService } from './services/vector-service';
import { IpcRequest, IpcResponse, LocalImage, ListOptions } from './types';

export class IpcServer {
  private db: SqliteClient;

  constructor(dbPath: string) {
    this.db = new SqliteClient(dbPath);
  }

  async init() {
    await this.db.init();

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
        const listParams = params as ListOptions;
        const items = this.db.getImages(listParams);
        const stats = this.db.getStats();
        return {
          items,
          total: stats.totalImages,
          page: Math.floor((listParams.offset || 0) / (listParams.limit || 50)) + 1,
          limit: listParams.limit || 50,
          totalPages: Math.ceil(stats.totalImages / (listParams.limit || 50))
        };
      
      case 'images:get':
        if (params.vector) {
          return await this.db.searchByVector(params.vector, params.limit);
        }
        // Fallback or text search if implemented
        return [];

      case 'images:delete':
        return await this.db.deleteImages(params.imageIds);

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

      // --- Tags ---
      case 'tags:list':
        return this.db.getTags();
      case 'tags:create':
        return this.db.createTag(params.name);
      case 'tags:update':
        return this.db.updateTag(params.id, params.name);
      case 'tags:delete':
        return this.db.deleteTag(params.id);

      // --- Albums ---
      case 'albums:list':
        return this.db.getAlbums();
      case 'albums:create':
        return this.db.createAlbum(params.name, params.description);
      case 'albums:get':
        return this.db.getAlbumById(params.id);
      case 'albums:update':
        return this.db.updateAlbum(params.id, params.name, params.description);
      case 'albums:delete':
        return this.db.deleteAlbum(params.id);
      case 'albums:add-images':
        return this.db.addImagesToAlbum(params.albumId, params.imageIds);
      case 'albums:remove-images':
        return this.db.removeImagesFromAlbum(params.albumId, params.imageIds);

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
          await this.db.addVector(image.id, embedding);
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

  private async importFiles(filePaths: string[]) {
    const results: LocalImage[] = [];
    
    for (const filePath of filePaths) {
      try {
        // Check if exists
        const existing = this.db.getImageByPath(filePath);
        if (existing) {
          results.push(existing);
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
        const embedding = await vectorService.generateEmbedding(filePath);
        if (embedding.length > 0) {
          await this.db.addVector(image.id, embedding);
        }

        results.push(image);
      } catch (e: any) {
        console.error(`Failed to import file ${filePath}:`, e);
        // We might want to throw or return partial results. 
        // For now, let's just skip failed ones or handle error.
      }
    }

    return results;
  }
}
