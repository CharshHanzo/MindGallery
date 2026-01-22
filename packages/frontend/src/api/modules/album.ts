// 相册相关API接口
import type {
  AlbumsListResponse,
  CreateAlbumResponse,
  AlbumDetailResponse,
  CreateAlbumRequest,
  AlbumImageResponse,
  AlbumImageRequest
} from '@mindgallery/shared'

/**
 * 获取相册列表
 */
export const getAlbumList = async (): Promise<AlbumsListResponse> => {
  const response = await fetch('/api/albums')

  if (!response.ok) {
    throw new Error(`获取相册列表失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 创建新相册
 */
export const createAlbum = async (data: CreateAlbumRequest): Promise<CreateAlbumResponse> => {
  const response = await fetch('/api/albums', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`创建相册失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 获取相册详情
 */
export const getAlbumDetail = async (albumId: string): Promise<AlbumDetailResponse> => {
  const response = await fetch(`/api/albums/${albumId}`)

  if (!response.ok) {
    throw new Error(`获取相册详情失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 更新相册
 */
export const updateAlbum = async (albumId: string, data: CreateAlbumRequest): Promise<CreateAlbumResponse> => {
  const response = await fetch(`/api/albums/${albumId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`更新相册失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 删除相册
 */
export const deleteAlbum = async (albumId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`/api/albums/${albumId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`删除相册失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 添加图片到相册
 */
export const addImagesToAlbum = async (albumId: string, imageIds: string[]): Promise<AlbumImageResponse> => {
  const body: AlbumImageRequest = { imageIds }
  const response = await fetch(`/api/albums/${albumId}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let errorMessage = response.statusText
    try {
      const errorData = await response.json()
      if (errorData && errorData.details) {
        errorMessage = errorData.details
      } else if (errorData && errorData.error) {
        errorMessage = errorData.error
      }
    } catch (e) {
      // ignore json parse error
    }
    throw new Error(`添加图片到相册失败: ${errorMessage}`)
  }

  return response.json()
}

/**
 * 从相册移除图片
 */
export const removeImagesFromAlbum = async (albumId: string, imageIds: string[]): Promise<AlbumImageResponse> => {
  const body: AlbumImageRequest = { imageIds }
  const response = await fetch(`/api/albums/${albumId}/images`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`从相册移除图片失败: ${response.statusText}`)
  }

  return response.json()
}
