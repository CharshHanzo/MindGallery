// 图片相关API契约（前后端共享）

// 图片基本信息（API响应使用）
export interface ImageInfo {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  fileSize: number;
  uploadTime: string;
  tags: string[];
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  takenTime?: string;
  albums: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: string;
  }>;
}

// 图片列表项（简化版，用于列表展示）
export interface ImageListItem {
  id: string;
  filename: string;
  thumbnailUrl: string;
  title?: string;
  tags: string[];
  uploadTime: string;
  albums: Array<{
    id: string;
    name: string;
  }>;
}

// 单张图片上传响应
export interface UploadImageResponse {
  success: boolean;
  message: string;
  data: ImageInfo;
}

// 批量图片上传响应
export interface BatchUploadImageResponse {
  success: boolean;
  message: string;
  data: ImageInfo[];
  count: number;
  failedFiles?: Array<{
    filename: string;
    error: string;
  }>;
}

// 单张图片更新请求
export interface UpdateImageRequest {
  title?: string;
  description?: string;
  tags?: string[];
  albumIds?: string[];
}

// 批量图片更新请求
export interface BatchUpdateImagesRequest {
  imageIds: string[];
  updateData: {
    title?: string;
    description?: string;
    tags?: string[];
    albumIds?: string[];
  };
}

// 批量操作响应
export interface BatchOperationResponse {
  success: boolean;
  message: string;
  data: {
    updatedCount?: number;
    deletedCount?: number;
    addedCount?: number;
    removedCount?: number;
    imageIds?: string[];
    failedIds?: string[];
    albumId?: string;
  };
}

// 图片详情响应
export interface ImageDetailResponse {
  success: boolean;
  message: string;
  data: ImageInfo;
}

// 图片查询参数
export interface ImageQueryParams {
  page?: number;
  limit?: number;
  tags?: string[];
  albumId?: string;
  search?: string;
  sortBy?: 'uploadTime' | 'takenTime' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

// 图片列表响应
export interface ImagesListResponse {
  success: boolean;
  message: string;
  data: ImageInfo[];
  count: number;
  total: number;
  page: number;
  limit: number;
}

// 图片删除响应
export interface DeleteImageResponse {
  success: boolean;
  message: string;
}
