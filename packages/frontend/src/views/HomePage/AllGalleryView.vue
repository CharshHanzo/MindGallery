<template>
  <div class="all-gallery-view">
    <!-- 顶部筛选栏 -->
    <div class="filter-bar">
      <div class="left-filters">
        <!-- 搜索框 -->
        <el-input
          v-model="searchQuery"
          placeholder="搜索图片描述或文件名"
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 标签筛选 -->
        <el-select
          v-model="selectedTags"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="筛选标签"
          class="tag-select"
          @change="handleTagChange"
          clearable
        >
          <el-option
            v-for="tag in availableTags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.name"
          >
            <span style="float: left">{{ tag.name }}</span>
            <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
              {{ tag.count }}
            </span>
          </el-option>
        </el-select>
      </div>

      <div class="right-filters">
        <!-- 排序 -->
        <el-select v-model="sortBy" class="sort-select" @change="handleSortChange">
          <el-option label="上传时间" value="uploadTime" />
          <el-option label="文件名" value="filename" />
          <el-option label="文件大小" value="fileSize" />
        </el-select>

        <el-radio-group v-model="sortOrder" @change="handleSortChange" class="sort-order">
          <el-radio-button value="desc">
            <el-icon><SortDown /></el-icon>
          </el-radio-button>
          <el-radio-button value="asc">
            <el-icon><SortUp /></el-icon>
          </el-radio-button>
        </el-radio-group>

        <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
        <el-button type="warning" plain @click="toggleSelectionMode">
          {{ selectionMode ? '退出批量' : '批量操作' }}
        </el-button>
        <el-button
          v-if="selectionMode"
          type="danger"
          :disabled="selectedCount === 0"
          @click="deleteSelected"
        >
          删除已选 ({{ selectedCount }})
        </el-button>
        <el-button v-if="selectionMode" @click="selectAll">全选</el-button>
        <el-button v-if="selectionMode" @click="clearSelection">清空</el-button>
      </div>
    </div>

    <!-- 图片列表 -->
    <div v-loading="loading" class="gallery-content">
      <div v-if="images.length > 0" class="image-grid">
        <div
          v-for="(image, index) in images"
          :key="image.id"
          class="image-item"
          :class="{ selected: isSelected(image.id) && selectionMode }"
          @click="selectionMode ? toggleSelect(image.id) : previewImage(index)"
        >
          <el-image
            :src="image.thumbnailUrl || image.url"
            :alt="image.filename"
            fit="cover"
            class="gallery-image"
          >
            <template #placeholder>
              <div class="image-placeholder">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </template>
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>

          <div class="select-checkbox" v-if="selectionMode" @click.stop>
            <el-checkbox :model-value="isSelected(image.id)" @change="toggleSelect(image.id)" />
          </div>

          <div class="image-actions" @click.stop>
            <el-button
              type="danger"
              circle
              size="small"
              :icon="Delete"
              @click="handleDelete(image)"
              title="删除图片"
            />
          </div>

          <!-- 悬停显示信息 -->
          <div class="image-overlay">
            <div class="image-info">
              <div class="image-name">{{ image.filename }}</div>
              <div class="image-meta">
                <span>{{ formatFileSize(image.fileSize) }}</span>
                <span v-if="image.tags && image.tags.length > 0">
                  <el-tag size="small" type="info" effect="dark" class="count-tag">
                    {{ image.tags.length }} 标签
                  </el-tag>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-else description="暂无图片" />
    </div>

    <!-- 分页 -->
    <div class="pagination-container" v-if="total > 0">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="limit"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 图片大图预览和编辑模态框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="图片详情"
      width="80%"
      top="5vh"
      destroy-on-close
      class="image-detail-dialog"
    >
      <div class="detail-container" v-if="currentImage">
        <!-- 左侧：大图展示 -->
        <div class="detail-image-wrapper">
          <el-image
            :src="currentImage.url"
            :alt="currentImage.filename"
            fit="contain"
            class="detail-image"
            :preview-src-list="[currentImage.url]"
          />
        </div>

        <!-- 右侧：编辑表单 -->
        <div class="detail-form-wrapper">
          <el-form :model="editingForm" label-position="top">
            <el-form-item label="图片名称">
              <el-input v-model="editingForm.filename" placeholder="请输入图片名称" />
            </el-form-item>

            <el-form-item label="描述">
              <el-input
                v-model="editingForm.description"
                type="textarea"
                rows="4"
                placeholder="请输入图片描述"
              />
            </el-form-item>

            <el-form-item label="标签">
              <el-select
                v-model="editingForm.tags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="请选择或输入标签"
                style="width: 100%"
              >
                <el-option
                  v-for="tag in availableTags"
                  :key="tag.id"
                  :label="tag.name"
                  :value="tag.name"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="相册">
              <el-select
                v-model="editingForm.albumIds"
                multiple
                filterable
                placeholder="请选择相册"
                style="width: 100%"
              >
                <el-option
                  v-for="album in availableAlbums"
                  :key="album.id"
                  :label="album.name"
                  :value="album.id"
                />
              </el-select>
            </el-form-item>

            <div class="form-meta-info">
              <p><strong>文件大小：</strong>{{ formatFileSize(currentImage.fileSize) }}</p>
              <p><strong>上传时间：</strong>{{ new Date(currentImage.uploadTime).toLocaleString() }}</p>
              <p v-if="currentImage.width"><strong>分辨率：</strong>{{ currentImage.width }} x {{ currentImage.height }}</p>
            </div>
          </el-form>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <div class="left-actions">
            <el-button type="primary" @click="openInFolderFromDialog" :icon="Folder">在文件夹中打开</el-button>
            <el-button type="danger" @click="handleDeleteFromDialog" :icon="Delete">删除图片</el-button>
          </div>
          <div class="right-actions">
            <el-button @click="detailDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveImageInfo" :loading="saving">保存修改</el-button>
          </div>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { Search, SortUp, SortDown, Picture, Loading, Delete, Folder } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ImageInfo, TagInfo, AlbumInfo } from '@mindgallery/shared/src/types/api'
import { getImageList, updateImageInfo, deleteImage, deleteImages } from '@/api/modules/image'
import { getTagList } from '@/api/modules/tag'
import { getAlbumList } from '@/api/modules/album'
import { universalApi } from '@/api'

// 状态
const loading = ref(false)
const saving = ref(false)
const images = ref<ImageInfo[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(50)
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const sortBy = ref('uploadTime')
const sortOrder = ref<'asc' | 'desc'>('desc')
const availableTags = ref<TagInfo[]>([])
const availableAlbums = ref<AlbumInfo[]>([])

// 图片预览和编辑
const detailDialogVisible = ref(false)
const currentImage = ref<ImageInfo | null>(null)
const editingForm = reactive({
  filename: '',
  description: '',
  tags: [] as string[],
  albumIds: [] as string[]
})

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchImages(),
    fetchTags(),
    fetchAlbums()
  ])
})

// 获取图片列表
const fetchImages = async () => {
  loading.value = true
  try {
    // 清理旧的 blob URL
    revokeBlobUrls()
    const response = await getImageList({
      page: page.value,
      limit: limit.value,
      search: searchQuery.value,
      tags: selectedTags.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })

    if (response.success) {
      images.value = response.data
      total.value = response.total || 0
      if (isElectron) {
        await buildBlobUrlsForImages()
      }
    }
  } catch (error) {
    console.error('获取图片列表失败:', error)
    ElMessage.error('获取图片列表失败')
  } finally {
    loading.value = false
  }
}

// 获取标签列表
const fetchTags = async () => {
  try {
    const response = await getTagList()
    if (response.success) {
      availableTags.value = response.data
    }
  } catch (error) {
    console.error('获取标签列表失败:', error)
  }
}

// 获取相册列表
const fetchAlbums = async () => {
  try {
    const response = await getAlbumList()
    if (response.success) {
      availableAlbums.value = response.data
    }
  } catch (error) {
    console.error('获取相册列表失败:', error)
  }
}

// 事件处理
const handleSearch = () => {
  page.value = 1
  fetchImages()
}

const handleTagChange = () => {
  page.value = 1
  fetchImages()
}

const handleSortChange = () => {
  page.value = 1
  fetchImages()
}

const handleSizeChange = (val: number) => {
  limit.value = val
  page.value = 1
  fetchImages()
}

const handlePageChange = (val: number) => {
  page.value = val
  fetchImages()
}

const isElectron = !!(window as any).electronAPI
const createdBlobUrls = ref<string[]>([])
const extToMime: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
}
const urlToWindowsPath = (fileUrl: string) => {
  // 处理 file:/// 格式的URL
  const withoutScheme = fileUrl.replace(/^file:\/\//, '')
  const decoded = decodeURI(withoutScheme)

  // 如果是Windows绝对路径（如 file:///E:/path/to/image.jpg）
  // 转换后应该是 E:\\path\\to\\image.jpg
  if (decoded.match(/^[a-zA-Z]:\//)) {
    // 直接转换斜杠为反斜杠，保留盘符
    const winPath = decoded.replace(/\//g, '\\')
    return winPath
  }

  // 如果是Unix风格的绝对路径（如 file:///path/to/image.jpg）
  if (decoded.startsWith('/')) {
    // 移除开头的斜杠，然后转换
    const winPath = decoded.replace(/^\//, '').replace(/\//g, '\\')
    return winPath
  }

  // 其他情况直接转换
  const winPath = decoded.replace(/\//g, '\\')
  return winPath
}
const buildBlobUrlsForImages = async () => {
  const tasks = images.value.map(async (img, idx) => {
    try {
      const winPath = urlToWindowsPath(img.url)
      const buffer = await universalApi.readFileBuffer(winPath)
      const ext = (img.filename.split('.').pop() || '').toLowerCase()
      const mime = extToMime['.' + ext] || 'image/*'
      const blob = new Blob([buffer as any], { type: mime })
      const blobUrl = URL.createObjectURL(blob)
      createdBlobUrls.value.push(blobUrl)
      images.value[idx] = { ...img, url: blobUrl, thumbnailUrl: blobUrl }
    } catch (e) {
      // 忽略单个失败，继续其他
    }
  })
  await Promise.all(tasks)
}
const revokeBlobUrls = () => {
  createdBlobUrls.value.forEach(u => URL.revokeObjectURL(u))
  createdBlobUrls.value = []
}

const selectionMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const selectedCount = computed(() => selectedIds.value.size)
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  selectedIds.value = new Set()
}
const isSelected = (id: string) => selectedIds.value.has(id)
const toggleSelect = (id: string) => {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}
const selectAll = () => {
  selectedIds.value = new Set(images.value.map(i => i.id))
}
const clearSelection = () => {
  selectedIds.value = new Set()
}
const deleteSelected = async () => {
  if (selectedIds.value.size === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.size} 张图片吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const ids = Array.from(selectedIds.value)
    await deleteImages(ids)
    images.value = images.value.filter(item => !selectedIds.value.has(item.id))
    total.value = Math.max(0, total.value - ids.length)
    ElMessage.success('批量删除成功')
    toggleSelectionMode()
    revokeBlobUrls()
    await fetchImages()
  } catch (e) {}
}

// 预览图片
const previewImage = (index: number) => {
  const img = images.value[index]
  currentImage.value = img

  // 初始化表单数据
  editingForm.filename = img.filename
  editingForm.description = img.description || ''
  editingForm.tags = img.tags ? [...img.tags] : []
  editingForm.albumIds = img.albums ? img.albums.map(album => album.id) : []

  detailDialogVisible.value = true
}

const saveImageInfo = async () => {
  if (!currentImage.value) return

  saving.value = true
  try {
    const response = await updateImageInfo(currentImage.value.id, {
      filename: editingForm.filename,
      description: editingForm.description,
      tags: editingForm.tags,
      albumIds: editingForm.albumIds
    })

    if (response.success) {
      ElMessage.success('保存成功')
      detailDialogVisible.value = false
      // 更新列表中的数据
      const index = images.value.findIndex(img => img.id === currentImage.value?.id)
      if (index !== -1) {
        images.value[index] = { ...images.value[index], ...response.data }
      }
      // 刷新标签列表，因为可能有新标签创建
      fetchTags()
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 删除图片逻辑
const handleDelete = (image: ImageInfo) => {
  ElMessageBox.confirm(
    `确定要删除图片 "${image.filename}" 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await deleteImage(image.id)
      ElMessage.success('删除成功')
      // 从列表中移除
      images.value = images.value.filter(item => item.id !== image.id)
      total.value--
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

const handleDeleteFromDialog = () => {
  if (!currentImage.value) return

  ElMessageBox.confirm(
    `确定要删除图片 "${currentImage.value.filename}" 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await deleteImage(currentImage.value!.id)
      ElMessage.success('删除成功')
      // 关闭对话框
      detailDialogVisible.value = false
      // 从列表中移除
      images.value = images.value.filter(item => item.id !== currentImage.value!.id)
      total.value--
      currentImage.value = null
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 在模态框中打开文件夹
const openInFolderFromDialog = async () => {
  if (!currentImage.value) return

  await openInFolder(currentImage.value)
}

// 在文件夹中打开图片
const openInFolder = async (image: ImageInfo) => {
  if (!isElectron) {
    ElMessage.error('此功能仅在桌面应用中可用')
    return
  }

  try {
    // 检查是否是 blob URL
    if (image.url.startsWith('blob:')) {
      // 检查是否有原始文件路径
      if ((image as any).filePath) {
        await universalApi.openFileManager((image as any).filePath)
      } else {
        // 如果没有原始路径，显示错误信息
        ElMessage.error('无法打开该文件，请刷新页面后重试')
        return
      }
    } else {
      // 如果是 file:// URL，直接使用
      const winPath = urlToWindowsPath(image.url)
      await universalApi.openFileManager(winPath)
    }
  } catch (error) {
    console.error('打开文件夹失败:', error)
    ElMessage.error('打开文件夹失败，请检查文件是否存在')
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/variables.scss' as *;

.all-gallery-view {
  padding: 1.5rem;
  height: 100vh;
  background-color: #f5f7fa;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 2rem;
  }
}

.filter-bar {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .left-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    flex: 1;

    .search-input {
      width: 100%;
      @media (min-width: 768px) {
        width: 300px;
      }
    }

    .tag-select {
      width: 100%;
      @media (min-width: 768px) {
        width: 240px;
      }
    }
  }

  .right-filters {
    display: flex;
    gap: 1rem;
    align-items: center;

    .sort-select {
      width: 120px;
    }
  }
}

.gallery-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 4px; /* 防止阴影被裁剪 */
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  background-color: white;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);

    .image-overlay {
      opacity: 1;
    }

    .image-actions {
      opacity: 1;
    }

    .gallery-image {
      transform: scale(1.05);
    }
  }

  .gallery-image {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform 0.5s;
  }

  .image-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 10;
  }
  .select-checkbox {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 11;
    background: rgba(255,255,255,0.85);
    border-radius: 4px;
    padding: 2px 6px;
  }

.image-item.selected {
  outline: 2px solid #409EFF;
}

  .image-placeholder, .image-error {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f2f5;
    color: #909399;
    font-size: 24px;
  }

  .image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    padding: 2rem 1rem 1rem;
    opacity: 0;
    transition: opacity 0.3s;
    color: white;

    .image-info {
      .image-name {
        font-weight: 500;
        margin-bottom: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .image-meta {
        font-size: 0.75rem;
        opacity: 0.8;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-top: 1rem;
  flex-shrink: 0;
}

.image-detail-dialog {
  .detail-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 70vh;

    @media (min-width: 768px) {
      flex-direction: row;
    }

    .detail-image-wrapper {
      flex: 2;
      background-color: #f5f7fa;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;

      .detail-image {
        width: 100%;
        height: 100%;
        max-height: 100%;
      }
    }

    .detail-form-wrapper {
      flex: 1;
      padding: 0 10px;
      overflow-y: auto;

      .form-meta-info {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        color: #606266;
        font-size: 13px;

        p {
          margin-bottom: 8px;
        }
      }
    }
  }

  .dialog-footer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
