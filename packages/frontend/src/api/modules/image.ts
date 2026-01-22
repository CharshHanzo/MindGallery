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

/**
 * 上传单张图片
 */
export const uploadSingleImage = async (formData: FormData): Promise<UploadImageResponse> => {
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
export const getImageList = async (params?: { page?: number; limit?: number }): Promise<ImagesListResponse> => {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())

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
  const response = await fetch(`/api/images/${imageId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`删除图片失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 更新图片信息
 */
export const updateImageInfo = async (imageId: string, data: UpdateImageRequest): Promise<ImageDetailResponse> => {
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
