// 标签相关API接口
import { universalApi } from '../unified-client'

// Detect environment
const isElectron = !!window.electronAPI;

/**
 * 获取标签列表
 */
export const getTagList = async () => {
  if (isElectron) {
    const tags = await universalApi.backend.call('tags:list');
    // 包装成前端期望的格式
    return {
      success: true,
      message: 'ok',
      data: tags
    };
  }

  const response = await fetch('/api/tags')

  if (!response.ok) {
    throw new Error(`获取标签列表失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 创建新标签
 */
export const createTag = async (tagName: string) => {
  if (isElectron) {
    return await universalApi.backend.call('tags:create', { name: tagName });
  }

  const response = await fetch('/api/tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: tagName }),
  })

  if (!response.ok) {
    throw new Error(`创建标签失败: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 删除标签
 */
export const deleteTag = async (tagId: string) => {
  if (isElectron) {
    return await universalApi.backend.call('tags:delete', { id: tagId });
  }

  const response = await fetch(`/api/tags/${tagId}`, {
    method: 'DELETE',
  })

  const data = await response.json()

  // 如果响应成功，直接返回数据
  if (response.ok) {
    return data
  }

  // 如果响应失败，仍然返回数据，让调用者处理
  return data
}

/**
 * 更新标签
 */
export const updateTag = async (tagId: string, newName: string) => {
  if (isElectron) {
    return await universalApi.backend.call('tags:update', { id: tagId, name: newName });
  }

  const response = await fetch(`/api/tags/${tagId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  })

  if (!response.ok) {
    throw new Error(`更新标签失败: ${response.statusText}`)
  }

  return response.json()
}
