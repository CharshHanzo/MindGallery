// 相册相关API契约（前后端共享）

// 相册基本信息
export interface AlbumInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  imageCount: number;
}

// 相册详情信息
export interface AlbumDetail extends AlbumInfo {
  images: Array<{
    id: string;
    filename: string;
    url: string;
    thumbnailUrl: string;
    filePath?: string;
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
  }>;
}

// 相册列表响应
export interface AlbumsListResponse {
  success: boolean;
  message: string;
  data: AlbumInfo[];
}

// 相册详情响应
export interface AlbumDetailResponse {
  success: boolean;
  message: string;
  data: AlbumDetail;
}

// 创建相册请求
export interface CreateAlbumRequest {
  name: string;
  description?: string;
}

// 创建相册响应
export interface CreateAlbumResponse {
  success: boolean;
  message: string;
  data: AlbumInfo;
}

// 相册图片操作请求
export interface AlbumImageRequest {
  imageIds: string[];
}

// 相册图片操作响应
export interface AlbumImageResponse {
  success: boolean;
  message: string;
  data: {
    addedCount?: number;
    removedCount?: number;
    albumId: string;
  };
}
