// 标签相关API接口

/**
 * 获取标签列表
 */
export const getTagList = async () => {
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
  const response = await fetch(`/api/tags/${tagId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`删除标签失败: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * 更新标签
 */
export const updateTag = async (tagId: string, newName: string) => {
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