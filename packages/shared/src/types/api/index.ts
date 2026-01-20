// 标签相关类型
export type { TagInfo, TagsListResponse } from './tag'

// 图片相关类型
export type {
  ImageInfo,
  ImageListItem,
  UploadImageResponse,
  BatchUploadImageResponse,
  UpdateImageRequest,
  BatchUpdateImagesRequest,
  BatchOperationResponse,
  ImageDetailResponse,
  ImageQueryParams,
  ImagesListResponse,
  DeleteImageResponse
} from './image'

// 相册相关类型
export type {
  AlbumInfo,
  AlbumDetail,
  AlbumsListResponse,
  AlbumDetailResponse,
  CreateAlbumRequest,
  CreateAlbumResponse,
  AlbumImageRequest,
  AlbumImageResponse
} from './album'

// 搜索相关类型
export type {
  SearchImagesRequest,
  SearchImagesResponse,
  SearchSuggestionsRequest,
  SearchSuggestionsResponse
} from './search'

