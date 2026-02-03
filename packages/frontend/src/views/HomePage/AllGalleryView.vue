<template>
  <div class="all-gallery-view">
    <!-- 主内容区 -->
    <main id="main-container" :class="{ selecting: selectionMode }">
      <div class="scroll-content">
        <!-- 页面头部 -->
        <div class="page-header">
          <div class="header-top">
            <h1 class="page-title">
              <span v-show="!selectionMode">所有照片</span>
              <span v-show="selectionMode">
                已选择 {{ selectedImageIds.length }} 张照片
              </span>
            </h1>
            <div class="header-actions">
              <div id="btn-add" style="color: var(--accent-blue); font-size: 20px; cursor: pointer; padding: 4px;" @click="router.push('/upload')">
                <el-icon><Plus /></el-icon>
              </div>
              <el-button class="text-btn" @click="toggleSelectionMode">
                {{ selectionMode ? '取消' : '选择' }}
              </el-button>
            </div>
          </div>
          <div class="header-controls">
            <!-- 搜索控制 -->
            <SearchControl
              v-model="searchQuery"
              @search="handleSearch"
            />
            <!-- 排序控制 -->
            <SortControl
              v-model="sortOrder"
              @sort-change="handleSortChange"
            />
          </div>
        </div>

        <div class="title-divider"></div>

        <!-- 标签筛选 -->
        <TagFilter
          v-model="selectedTags"
          :available-tags="availableTags"
          :loading="false"
          @tag-change="handleTagChange"
        />

        <!-- 多选操作工具栏 -->
        <SelectionToolbar
          :selection-mode="selectionMode"
          :selected-ids="selectedImageIds"
          :selected-count="selectedImageIds.length"
          @batch-delete="deleteSelected"
          @batch-favorite="handleBatchFavorite"
          @show-add-to-album="showAddToAlbumDialog = true"
          @cancel-selection="toggleSelectionMode"
        />

        <!-- 图片列表 -->
        <ImageGrid
          :images="images"
          :loading="loading"
          :total="total"
          :page="page"
          :limit="limit"
          :selection-mode="selectionMode"
          @image-click="previewImage"
          @selection-change="handleSelectionChange"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
          @delete-image="handleDelete"
          @batch-delete="deleteSelected"
          @favorite-image="handleFavorite"
          @batch-favorite="handleBatchFavorite"
          @show-add-to-album="showAddToAlbumDialog = true"
        />

      </div>



      <!-- 图片大图预览和编辑模态框 -->
      <ImageDetailDialog
        v-model:visible="detailDialogVisible"
        :image="currentImage"
        :mode="'edit'"
        :editable="true"
        :available-tags="availableTags"
        :available-albums="availableAlbums"
        :loading="saving"
        @save="handleSaveImage"
        @delete="handleDeleteFromDialog"
        @open-in-folder="openInFolderFromDialog"
        @close="handleDialogClose"
      />

      <!-- 添加到相册对话框 -->
      <el-dialog
        v-model="showAddToAlbumDialog"
        title="添加到相册"
        width="400px"
        destroy-on-close
      >
        <el-form label-width="80px">
          <el-form-item label="选择相册">
            <el-select
              v-model="selectedAlbumId"
              placeholder="请选择相册"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="album in availableAlbums"
                :key="album.id"
                :label="album.name"
                :value="album.id"
              >
                <span style="float: left">{{ album.name }}</span>
                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                  {{ album.imageCount }} 张
                </span>
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showAddToAlbumDialog = false">取消</el-button>
            <el-button type="primary" @click="handleAddToAlbum" :loading="saving">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, inject, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Picture, Loading, Delete, Folder, Check, CollectionTag, Star, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ImageInfo, TagInfo, AlbumInfo } from '@mindgallery/shared/src/types/api'
import { getImageList, updateImageInfo, deleteImage, deleteImages } from '@/api/modules/image'
import { getTagList } from '@/api/modules/tag'
import { getAlbumList, createAlbum, addImagesToAlbum, removeImagesFromAlbum } from '@/api/modules/album'
import { universalApi } from '@/api'
import ImageGrid from '@/components/image-grid/ImageGrid.vue'
import SortControl from '@/components/gallery-controls/SortControl.vue'
import TagFilter from '@/components/gallery-controls/TagFilter.vue'
import SelectionToolbar from '@/components/gallery-controls/SelectionToolbar.vue'
import ImageDetailDialog from '@/components/gallery-controls/ImageDetailDialog.vue'
import SearchControl from '@/components/gallery-controls/SearchControl.vue'

// 路由
const router = useRouter()

// 注入共享状态
interface SearchState {
  searchQuery: ReturnType<typeof ref<string>>
  selectionMode: ReturnType<typeof ref<boolean>>
  toggleSelectionMode: () => void
}

const searchState = inject<SearchState | undefined>('searchState')
const searchQuery = searchState?.searchQuery || ref('')
const selectionMode = searchState?.selectionMode || ref(false)

// 状态
const loading = ref(false)
const saving = ref(false)
const images = ref<ImageInfo[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(50)
const selectedTags = ref<string[]>([])
const sortBy = ref('uploadTime')
const sortOrder = ref<'asc' | 'desc'>('desc')
const availableTags = ref<TagInfo[]>([])
const availableAlbums = ref<AlbumInfo[]>([])

// 对话框状态
const showAddToAlbumDialog = ref(false)

// 相册选择状态
const selectedAlbumId = ref<string>('')

// 图片预览和编辑
const detailDialogVisible = ref(false)
const currentImage = ref<ImageInfo | null>(null)
const editingForm = reactive({
  filename: '',
  description: '',
  tags: [] as string[],
  albumIds: [] as string[]
})

// 防抖计时器
let debounceTimer: number | null = null

// 监听搜索参数变化
watch(searchQuery, (newQuery) => {
  if (newQuery !== undefined) {
    // 清除之前的防抖计时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // 设置新的防抖计时器，300ms 后执行搜索
    debounceTimer = window.setTimeout(() => {
      page.value = 1
      fetchImages()
    }, 300)
  }
}, { immediate: false })

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

// 获取或创建收藏相册
const getOrCreateFavoriteAlbum = async (): Promise<string> => {
  try {
    // 先获取相册列表
    const albumsResponse = await getAlbumList()
    if (!albumsResponse.success) {
      throw new Error('获取相册列表失败')
    }

    // 查找是否已存在收藏相册
    const favoriteAlbum = albumsResponse.data.find(album => album.name === '个人收藏')

    if (favoriteAlbum) {
      return favoriteAlbum.id
    }

    // 如果不存在，创建收藏相册
    const createResponse = await createAlbum({ name: '个人收藏', description: '用户收藏的图片' })
    if (!createResponse.success) {
      throw new Error('创建收藏相册失败')
    }

    // 更新相册列表
    await fetchAlbums()

    return createResponse.data.id
  } catch (error) {
    console.error('获取或创建收藏相册失败:', error)
    throw error
  }
}

// 事件处理
const handleTagChange = (tags: string[]) => {
  page.value = 1
  fetchImages()
}

const handleSortChange = () => {
  page.value = 1
  fetchImages()
}

const handleSearch = () => {
  page.value = 1
  fetchImages()
}

const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedImageIds.value = []
  }
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  handleSortChange()
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

const isElectron = !!(window as unknown as { electronAPI?: unknown }).electronAPI
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
    } catch {
      // 忽略单个失败，继续其他
    }
  })
  await Promise.all(tasks)
}
const revokeBlobUrls = () => {
  createdBlobUrls.value.forEach(u => URL.revokeObjectURL(u))
  createdBlobUrls.value = []
}

const deleteSelected = async (ids: string[]) => {
  if (ids.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 张图片吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await deleteImages(ids)
    images.value = images.value.filter(item => !ids.includes(item.id))
    total.value = Math.max(0, total.value - ids.length)
    ElMessage.success('批量删除成功')
    toggleSelectionMode()
    revokeBlobUrls()
    await fetchImages()
  } catch {
    // 忽略取消操作
  }
}

// 检查图片是否已收藏
const isFavorite = (image: ImageInfo): boolean => {
  return image.albums?.some(album => album.name === '个人收藏') || false
}

// 处理单个图片的收藏/取消收藏
const handleFavorite = async (image: ImageInfo) => {
  try {
    const favoriteAlbumId = await getOrCreateFavoriteAlbum()

    if (isFavorite(image)) {
      // 取消收藏
      await removeImagesFromAlbum(favoriteAlbumId, [image.id])
      ElMessage.success('已取消收藏')
    } else {
      // 添加收藏
      await addImagesToAlbum(favoriteAlbumId, [image.id])
      ElMessage.success('收藏成功')
    }

    // 刷新图片列表
    await fetchImages()
  } catch (error) {
    console.error('收藏操作失败:', error)
    ElMessage.error('收藏操作失败，请稍后重试')
  }
}

// 处理批量收藏
const handleBatchFavorite = async (ids: string[]) => {
  if (ids.length === 0) return

  try {
    const favoriteAlbumId = await getOrCreateFavoriteAlbum()

    await addImagesToAlbum(favoriteAlbumId, ids)
    ElMessage.success(`已成功收藏 ${ids.length} 张图片`)

    // 刷新图片列表
    await fetchImages()
    toggleSelectionMode()
  } catch (error) {
    console.error('批量收藏失败:', error)
    ElMessage.error('批量收藏失败，请稍后重试')
  }
}

// 处理添加到相册
const handleAddToAlbum = async () => {
  if (selectedImageIds.value.length === 0) return
  if (!selectedAlbumId.value) {
    ElMessage.warning('请选择相册')
    return
  }

  try {
    const imageIds = selectedImageIds.value
    await addImagesToAlbum(selectedAlbumId.value, imageIds)
    ElMessage.success(`已成功添加 ${imageIds.length} 张图片到相册`)

    // 刷新图片列表
    await fetchImages()
    showAddToAlbumDialog.value = false
    toggleSelectionMode()
    // 重置选择
    selectedAlbumId.value = ''
  } catch (error) {
    console.error('添加到相册失败:', error)
    ElMessage.error('添加到相册失败，请稍后重试')
  }
}

// 预览图片
const previewImage = (image: ImageInfo, index: number) => {
  currentImage.value = image
  detailDialogVisible.value = true
}

// 处理保存图片信息
const handleSaveImage = async (image: ImageInfo, formData: any) => {
  if (!image) return
  saving.value = true
  try {
    const response = await updateImageInfo(image.id, {
      filename: formData.filename,
      description: formData.description,
      tags: formData.tags,
      albumIds: formData.albumIds
    })

    if (response.success) {
      ElMessage.success('保存成功')
      detailDialogVisible.value = false
      // 更新列表中的数据
      const index = images.value.findIndex(img => img.id === image.id)
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

// 处理对话框关闭
const handleDialogClose = () => {
  // 对话框关闭时的清理逻辑
  console.log('Dialog closed')
}

// 存储选中的图片ID
const selectedImageIds = ref<string[]>([])

// 处理选择变化
const handleSelectionChange = (ids: string[]) => {
  selectedImageIds.value = ids
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

const handleDeleteFromDialog = (image: ImageInfo) => {
  if (!image) return

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
      // 关闭对话框
      detailDialogVisible.value = false
      // 从列表中移除
      images.value = images.value.filter(item => item.id !== image.id)
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
const openInFolderFromDialog = async (image: ImageInfo) => {
  if (!image) return

  await openInFolder(image)
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
      if ((image as { filePath?: string }).filePath) {
        await universalApi.openFileManager((image as { filePath: string }).filePath)
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
:root {
  --sidebar-bg: rgb(246, 246, 246);
  --main-bg: #ffffff;
  --accent-blue: #007aff;
  --accent-red: #ff3b30;
  --text-primary: #1d1d1f;
  --text-secondary: #86868b;
  --border-color: rgba(0, 0, 0, 0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

.all-gallery-view {
  background-color: var(--main-bg);
  color: var(--text-primary);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* --- 主内容区 --- */
main {
  flex: 1;
  background-color: var(--main-bg);
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}

.scroll-content {
  flex: 1;
  padding: 10px 40px 100px;
}

/* --- 页面头部 --- */
.page-header {
  margin-bottom: 20px;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;

    .text-btn {
      background: none;
      border: none;
      color: var(--accent-blue);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;

      &:hover {
        background-color: rgba(0, 122, 255, 0.1);
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    .header-top {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .header-controls {
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .page-title {
      font-size: 24px;
    }
  }
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--accent-blue);
  cursor: pointer;
  padding: 6px 0;
}

.title-divider {
  height: 0.5px;
  background-color: var(--border-color);
  margin-bottom: 24px;
}



/* --- 标签筛选 --- */
.tag-filter {
  margin-bottom: 24px;
}

/* --- 图片网格样式已移至 ImageGrid 组件 --- */


/* --- 图片详情对话框 --- */
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

/* 调整主内容区的底部边距 */
.scroll-content {
  padding-bottom: 60px;
}

</style>
