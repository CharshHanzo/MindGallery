// 相册相关API接口
import type {
  AlbumsListResponse,
  CreateAlbumResponse,
  AlbumDetailResponse,
  CreateAlbumRequest,
  AlbumImageResponse,
  AlbumImageRequest
} from '@mindgallery/shared'
import { universalApi } from '../unified-client'

// Detect environment
const isElectron = !!window.electronAPI;

/**
 * 获取相册列表
 */
export const getAlbumList = async (): Promise<AlbumsListResponse> => {
  if (isElectron) {
    const result = await universalApi.backend.call('albums:list');
    console.log('获取相册列表原始结果:', result);
    // 后端直接返回相册数组，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: result
    } as AlbumsListResponse;
  }

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
  if (isElectron) {
    const result = await universalApi.backend.call('albums:create', data);
    console.log('创建相册原始结果:', result);
    // 后端直接返回相册对象，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: result
    } as CreateAlbumResponse;
  }

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
  if (isElectron) {
    const result = await universalApi.backend.call('albums:get', { id: albumId });
    console.log('获取相册详情原始结果:', result);
    // 后端直接返回相册对象，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: {
        ...result,
        images: [] // 后端可能不返回图片列表，需要补充
      }
    } as AlbumDetailResponse;
  }

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
  if (isElectron) {
    const result = await universalApi.backend.call('albums:update', { id: albumId, ...data });
    console.log('更新相册原始结果:', result);
    // 后端直接返回相册对象，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: result
    } as CreateAlbumResponse;
  }

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
  if (isElectron) {
    const result = await universalApi.backend.call('albums:delete', { id: albumId });
    console.log('删除相册原始结果:', result);
    // 后端返回的结果可能是{ success: true }，需要确保格式正确
    return {
      success: true,
      message: 'ok'
    };
  }

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
  if (isElectron) {
    const result = await universalApi.backend.call('albums:add-images', { albumId, imageIds });
    console.log('添加图片到相册原始结果:', result);
    // 后端返回的结果可能是{ success: true }，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: {
        addedCount: imageIds.length,
        albumId
      }
    } as AlbumImageResponse;
  }

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
  if (isElectron) {
    const result = await universalApi.backend.call('albums:remove-images', { albumId, imageIds });
    console.log('从相册移除图片原始结果:', result);
    // 后端返回的结果可能是{ success: true }，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: {
        removedCount: imageIds.length,
        albumId
      }
    } as AlbumImageResponse;
  }

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
