import type { Album, Image, ImageAlbum } from '@prisma/client';

// 包含图片计数的相册类型 (列表页用)
export interface AlbumWithCount extends Album {
  _count: {
    imageAlbums: number;
  };
}

// 包含图片关联的相册类型
export interface AlbumWithRelations extends Album {
  imageAlbums: (ImageAlbum & {
    image: Image;
  })[];
}

// 包含完整信息的相册类型（详情页用）
export interface AlbumDetailed extends Album {
  imageAlbums: (ImageAlbum & {
    image: Image;
  })[];
  _count: {
    imageAlbums: number;
  };
}

// 相册查询条件
export interface AlbumQueryConditions {
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}
