// 图片相关API契约（前后端共享）

// 图片基本信息（API响应使用）
export interface ImageInfo {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  fileSize: number;
  mimeType: string;
  uploadTime: Date;
  storageType: 'local' | 'minio';
  tags: string[];
}

// 上传图片请求
export interface UploadImageRequest {
  file: File;
  title?: string;
  description?: string;
  tags?: string[];
}

// 更新图片请求
export interface UpdateImageRequest {
  title?: string;
  description?: string;
  tags?: string[];
  rating?: number;
  favorite?: boolean;
}

// 图片详情响应
export interface ImageResponse {
  success: boolean;
  message: string;
  data: ImageInfo;
}

// 图片列表响应
export interface ImagesListResponse {
  success: boolean;
  message: string;
  data: {
    images: ImageInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}
