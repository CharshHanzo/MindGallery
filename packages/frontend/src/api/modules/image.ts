// 图片相关API接口
import type {
  UploadImageResponse,
  BatchUploadImageResponse,
  ImagesListResponse,
  ImageDetailResponse,
  DeleteImageResponse,
  BatchOperationResponse,
  UpdateImageRequest
} from '@mindgallery/shared/src/types/api'
import { universalApi } from '../unified-client'

// Detect environment
const isElectron = !!window.electronAPI;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
};

const mapLocalToImageInfo = (item: {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  createdAt: number;
  width?: number;
  height?: number;
  format?: string;
  tags?: string[];
  title?: string;
  description?: string;
}) => {
  const normalizedPath = item.filePath.replace(/\\/g, '/');
  const url = `file:///${normalizedPath}`;
  return {
    id: item.id,
    filename: item.fileName,
    url,
    thumbnailUrl: url,
    fileSize: item.fileSize,
    uploadTime: new Date(item.createdAt).toISOString(),
    tags: item.tags || [],
    title: item.title,
    description: item.description,
    width: item.width,
    height: item.height,
    takenTime: undefined,
    albums: []
  };
};

/**
 * 上传单张图片
 */
export const uploadSingleImage = async (formData: FormData): Promise<UploadImageResponse> => {
  if (isElectron) {
    const file = formData.get('files') as File;
    if (!file) {
      throw new Error('未选择文件');
    }
    const filePath = (file as any).path;
    if (filePath) {
      const result = await universalApi.backend.call('images:import-files', {
        filePaths: [filePath]
      });
      const info = mapLocalToImageInfo(result[0]);
      return {
        success: true,
        message: 'ok',
        data: info
      };
    } else {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const image = await universalApi.backend.call('images:upload-buffer', {
        base64,
        fileName: file.name
      });
      const info = mapLocalToImageInfo(image);
      return {
        success: true,
        message: 'ok',
        data: info
      };
    }
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`上传失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 批量上传图片
 */
export const uploadMultipleImages = async (formData: FormData): Promise<BatchUploadImageResponse> => {
  if (isElectron) {
    const files = formData.getAll('files') as File[];
    const filePaths = files.map(f => (f as any).path).filter(Boolean);

    if (filePaths.length === 0) {
      throw new Error('No valid file paths found for upload');
    }

    const result = await universalApi.backend.call('images:import-files', { filePaths }) as Array<{
      id: string; filePath: string; fileName: string; fileSize: number; createdAt: number; width?: number; height?: number; format?: string;
    }>;
    const data = result.map(mapLocalToImageInfo);
    return {
      success: true,
      message: 'ok',
      data,
      count: data.length
    };
  }

  const response = await fetch('/api/upload/batch', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`批量上传失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 获取图片列表
 */
export const getImageList = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<ImagesListResponse> => {
  if (isElectron) {
    const limit = params?.limit || 50;
    const offset = ((params?.page || 1) - 1) * limit;

    // Vector text search when search is provided
    if (params?.search && params.search.trim().length > 0) {
      const items = await universalApi.backend.call('images:get', { text: params.search.trim(), limit }) as Array<{
        id: string;
        filePath: string;
        fileName: string;
        fileSize: number;
        createdAt: number;
        updatedAt: number;
        width?: number;
        height?: number;
        format?: string;
        metadata?: Record<string, any>;
        tags?: string[];
        title?: string;
        description?: string;
      }>;
      const data = items.map(item => {
        const normalizedPath = item.filePath.replace(/\\/g, '/');
        const url = `file:///${normalizedPath}`;
        return {
          id: item.id,
          filename: item.fileName,
          url,
          thumbnailUrl: url,
          fileSize: item.fileSize,
          uploadTime: new Date(item.createdAt).toISOString(),
          tags: item.tags || [],
          title: item.title,
          description: item.description,
          width: item.width,
          height: item.height,
          takenTime: undefined,
          albums: []
        };
      });
      return {
        success: true,
        message: 'ok',
        data,
        count: data.length,
        total: data.length,
        page: 1,
        limit
      };
    }

    // 确保传递普通对象，避免Electron IPC克隆错误
    const listParams: any = {
      limit,
      offset,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
      tags: params?.tags ? [...params.tags] : undefined
    };

    const result = await universalApi.backend.call('images:list', listParams) as {
      items: Array<{
        id: string;
        filePath: string;
        fileName: string;
        fileSize: number;
        createdAt: number;
        updatedAt: number;
        width?: number;
        height?: number;
        format?: string;
        metadata?: Record<string, any>;
        tags?: string[];
        title?: string;
        description?: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };

    const data = result.items.map(item => {
  const normalizedPath = item.filePath.replace(/\\/g, '/');
  const url = `file:///${normalizedPath}`;
  return {
    id: item.id,
    filename: item.fileName,
    url,
    thumbnailUrl: url,
    filePath: item.filePath, // 添加原始文件路径
    fileSize: item.fileSize,
    uploadTime: new Date(item.createdAt).toISOString(),
    tags: item.tags || [],
    title: item.title,
    description: item.description,
    width: item.width,
    height: item.height,
    takenTime: undefined,
    albums: []
  };
});

    return {
      success: true,
      message: 'ok',
      data,
      count: data.length,
      total: result.total,
      page: result.page,
      limit: result.limit
    };
  }

  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.search) queryParams.append('search', params.search)
  if (params?.tags && params.tags.length > 0) queryParams.append('tags', params.tags.join(','))
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

  const response = await fetch(`/api/images?${queryParams}`)

  if (!response.ok) {
    throw new Error(`获取图片列表失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 获取图片详情
 */
export const getImageDetail = async (imageId: string): Promise<ImageDetailResponse> => {
  if (isElectron) {
    const item = await universalApi.backend.call('images:get', { id: imageId }) as {
      id: string; filePath: string; fileName: string; fileSize: number; createdAt: number; width?: number; height?: number; format?: string;
    };
    const data = mapLocalToImageInfo(item);
    return {
      success: true,
      message: 'ok',
      data
    };
  }

  const response = await fetch(`/api/images/${imageId}`)

  if (!response.ok) {
    throw new Error(`获取图片详情失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 删除图片
 */
export const deleteImage = async (imageId: string): Promise<DeleteImageResponse> => {
  if (isElectron) {
    await universalApi.backend.call('images:delete', { imageIds: [imageId] });
    return { success: true } as unknown as DeleteImageResponse;
  }

  const response = await fetch(`/api/images/${imageId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`删除图片失败: ${response.statusText}`)
  }

  return response.json()
}

export const deleteImages = async (imageIds: string[]): Promise<BatchOperationResponse> => {
  if (isElectron) {
    await universalApi.backend.call('images:delete', { imageIds });
    return {
      success: true,
      message: 'deleted',
      data: { deletedCount: imageIds.length, imageIds }
    } as BatchOperationResponse;
  }
  const response = await fetch(`/api/images/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageIds })
  });
  if (!response.ok) {
    throw new Error(`批量删除失败: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 更新图片信息
 */
export const updateImageInfo = async (imageId: string, data: UpdateImageRequest): Promise<ImageDetailResponse> => {
  if (isElectron) {
    console.log('开始更新图片信息:', { id: imageId, data });
    // 将数据转换为普通对象，避免Electron IPC克隆错误
    const plainData = {
      ...data,
      tags: data.tags ? [...data.tags] : undefined,
      albumIds: data.albumIds ? [...data.albumIds] : undefined
    };
    const result = await universalApi.backend.call('images:update', { id: imageId, data: plainData });
    console.log('更新图片信息原始结果:', result);
    // 后端直接返回图片对象，需要包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: result
    } as ImageDetailResponse;
  }

  const response = await fetch(`/api/images/${imageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`更新图片信息失败: ${response.statusText}`)
  }

  return response.json()
}

export const importFolder = async (folderPath: string): Promise<BatchUploadImageResponse> => {
  if (isElectron) {
    const result = await universalApi.backend.call('images:import-folder', { folderPath });

    // 根据是否有跳过的图片来决定显示哪种成功消息
    const skippedCount = result.processed - result.newlyAdded;
    let message: string;

    if (skippedCount > 0) {
      message = `成功导入 ${result.newlyAdded} 张图片，跳过 ${skippedCount} 张重复图片`;
    } else {
      message = `成功导入 ${result.newlyAdded} 张图片`;
    }

    return {
      success: result.success,
      data: [], // Import folder returns stats, not image list currently. We might need to adjust or refetch.
      message
    } as unknown as BatchUploadImageResponse;
  }
  throw new Error('Folder import is only supported in Electron mode');
}

/**
 * 统一上传图片函数，根据文件数量自动选择调用单张还是批量上传接口
 * @param files 要上传的文件列表
 * @param additionalData 额外的表单数据
 */
export const uploadImages = async (files: File[], additionalData?: Record<string, any>): Promise<UploadImageResponse | BatchUploadImageResponse> => {
  // 创建FormData
  const formData = new FormData()

  // 添加文件到FormData
  files.forEach(file => {
    formData.append('files', file)
  })

  // 添加额外的表单数据
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      // 正确处理不同类型的值
      if (Array.isArray(value)) {
        // 对于数组，使用JSON.stringify转换
        formData.append(key, JSON.stringify(value))
      } else if (typeof value === 'object' && value !== null) {
        // 对于对象，使用JSON.stringify转换
        formData.append(key, JSON.stringify(value))
      } else if (value !== undefined && value !== null) {
        // 对于基本类型，直接添加
        formData.append(key, String(value))
      }
    })
  }

  // 根据文件数量选择调用哪个接口
  if (files.length === 1) {
    // 单张上传
    return uploadSingleImage(formData)
  } else {
    // 批量上传
    return uploadMultipleImages(formData)
  }
}
