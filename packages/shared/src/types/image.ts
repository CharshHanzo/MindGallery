// 基础图片信息（存储相关）
export interface ImageStorageInfo {
  objectKey: string;
  storageType: 'local' | 'minio' | 's3';
  bucketName?: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
}

// AI分析结果
export interface AIAnalysis {
  description: string;
  tags: string[];
  categories?: string[];
  colors?: string[];
  vector?: number[];
  analyzedAt: Date;
}

// 用户元数据
export interface UserMetadata {
  title?: string;
  description?: string;
  customTags: string[];
  rating?: number;
  favorite: boolean;
  albumIds: string[];
  notes?: string;
}

// 完整图片类型
export interface ImageData {
  id: string;
  userId: string;
  
  storage: ImageStorageInfo;
  metadata: {
    ai: AIAnalysis;
    user: UserMetadata;
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  urls: {
    thumbnail: string;
    preview: string;
    original: string;
    download: string;
  };
  
  status: {
    upload: 'pending' | 'uploading' | 'completed' | 'failed';
    analysis: 'pending' | 'analyzing' | 'completed' | 'failed' | 'skipped';
  };
}

// API 请求/响应类型
export interface UploadImageRequest {
  file: File;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateImageRequest {
  title?: string;
  description?: string;
  tags?: string[];
  rating?: number;
  favorite?: boolean;
}

export interface SearchImagesRequest {
  query?: string;
  tags?: string[];
  categories?: string[];
  startDate?: string;
  endDate?: string;
  ratingMin?: number;
  favorite?: boolean;
  sortBy?: 'recent' | 'oldest' | 'rating' | 'views';
  page?: number;
  limit?: number;
}

export interface ImageResponse {
  success: boolean;
  data: {
    image: ImageData;
    urls: {
      thumbnail: string;
      preview: string;
      original: string;
      download: string;
    };
  };
}

export interface ImagesListResponse {
  success: boolean;
  data: {
    images: ImageData[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}