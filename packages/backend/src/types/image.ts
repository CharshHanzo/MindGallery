// 后端内部使用的图片相关类型定义
// 基于Prisma模型，包含完整数据库字段

import type { Image } from '@prisma/client';

// 数据库图片模型扩展，包含关联数据
export interface ImageWithAlbums extends Image {
  albums: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
  }>;
}

// 后端存储配置选项
export interface StorageConfig {
  type: 'local' | 'minio';
  minio?: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSSL: boolean;
  };
  uploadDir?: string;
}

// 图片处理选项
export interface ImageProcessingOptions {
  thumbnailSize: { width: number; height: number };
  maxFileSize: number;
  allowedMimeTypes: string[];
  generateThumbnail: boolean;
}

// 图片存储结果
export interface ImageStorageResult {
  objectKey: string;
  thumbnailKey: string;
  url: string;
  thumbnailUrl: string;
  storageType: 'local' | 'minio';
  bucketName?: string;
}

// 批量操作结果
export interface BatchOperationResult {
  successCount: number;
  failedCount: number;
  failedIds: string[];
}

// 图片查询条件（后端内部使用）
export interface ImageQueryConditions {
  tags?: string[];
  albumId?: string;
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: 'uploadTime' | 'takenTime' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

// 图片服务接口
export interface ImageService {
  uploadImage(file: Buffer, filename: string, mimeType: string, metadata?: Partial<Image>): Promise<ImageWithAlbums>;
  uploadImages(files: Array<{ buffer: Buffer; filename: string; mimeType: string }>): Promise<ImageWithAlbums[]>;
  getImageById(id: string): Promise<ImageWithAlbums | null>;
  getImages(conditions: ImageQueryConditions): Promise<{ images: ImageWithAlbums[]; total: number }>;
  updateImage(id: string, data: Partial<Image>, albumIds?: string[]): Promise<ImageWithAlbums | null>;
  batchUpdateImages(imageIds: string[], data: Partial<Image>, albumIds?: string[]): Promise<BatchOperationResult>;
  deleteImage(id: string): Promise<boolean>;
  batchDeleteImages(imageIds: string[]): Promise<BatchOperationResult>;
  addImagesToAlbum(imageIds: string[], albumId: string): Promise<BatchOperationResult>;
  removeImagesFromAlbum(imageIds: string[], albumId: string): Promise<BatchOperationResult>;
}

// 相册服务接口
export interface AlbumService {
  createAlbum(name: string, description?: string): Promise<any>;
  getAlbumById(id: string): Promise<(any & { images: Image[] }) | null>;
  getAlbums(): Promise<any[]>;
  updateAlbum(id: string, data: Partial<any>): Promise<any | null>;
  deleteAlbum(id: string): Promise<boolean>;
  getAlbumImages(albumId: string, offset?: number, limit?: number): Promise<{ images: Image[]; total: number }>;
}
