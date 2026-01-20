// 相册相关API接口

/**
 * 获取相册列表
 */
export const getAlbumList = async () => {
  const response = await fetch('/api/albums')

  if (!response.ok) {
    throw new Error(`获取相册列表失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 创建新相册
 */
export const createAlbum = async (albumName: string) => {
  const response = await fetch('/api/albums', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: albumName }),
  })

  if (!response.ok) {
    throw new Error(`创建相册失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 获取相册详情
 */
export const getAlbumDetail = async (albumId: string) => {
  const response = await fetch(`/api/albums/${albumId}`)

  if (!response.ok) {
    throw new Error(`获取相册详情失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 更新相册
 */
export const updateAlbum = async (albumId: string, data: { name?: string; description?: string }) => {
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
export const deleteAlbum = async (albumId: string) => {
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
export const addImagesToAlbum = async (albumId: string, imageIds: string[]) => {
  const response = await fetch(`/api/albums/${albumId}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageIds }),
  })

  if (!response.ok) {
    throw new Error(`添加图片到相册失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 从相册移除图片
 */
export const removeImagesFromAlbum = async (albumId: string, imageIds: string[]) => {
  const response = await fetch(`/api/albums/${albumId}/images`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageIds }),
  })

  if (!response.ok) {
    throw new Error(`从相册移除图片失败: ${response.statusText}`)
  }

  return response.json()
}
