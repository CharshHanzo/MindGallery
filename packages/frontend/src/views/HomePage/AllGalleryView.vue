<template>
  <div class="all-gallery-view">
    <!-- 主内容区 -->
    <main id="main-container" :class="{ selecting: selectionMode }">
      <div class="scroll-content">
        <!-- 标题栏 -->
        <div class="title-bar">
          <h1 class="page-title">所有照片</h1>
          <div class="sort-control" @click="toggleSortOrder">
            <i class="fa-solid" :class="sortOrder === 'desc' ? 'fa-arrow-down-short-wide' : 'fa-arrow-up-wide-short'"></i>
            <span>{{ sortOrder === 'desc' ? '最新在前' : '最早在前' }}</span>
          </div>
        </div>

        <div class="title-divider"></div>

        <!-- 标签筛选 -->
        <div class="tag-filter" v-if="availableTags.length > 0">
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

        <!-- 图片列表 -->
        <div v-loading="loading" class="gallery-content">
          <div class="gallery-scroll-container">
            <div v-if="images.length > 0" class="photo-grid" id="photo-grid">
              <div
                v-for="(image, index) in images"
                :key="image.id"
                class="photo-card"
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

                <div class="select-overlay" v-if="selectionMode">
                  <i class="fa-solid fa-check"></i>
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
      </div>

      <!-- 底部工具栏 -->
      <div class="bottom-toolbar" :class="{ active: selectionMode }">
        <div class="toolbar-item">
          <i class="fa-solid fa-share-from-square"></i>
          <span>共享</span>
        </div>
        <div class="toolbar-item">
          <i class="fa-solid fa-folder-plus"></i>
          <span>添加到</span>
        </div>
        <div class="toolbar-item">
          <i class="fa-solid fa-heart"></i>
          <span>收藏</span>
        </div>
        <div class="toolbar-item" style="color: var(--accent-red)" @click="deleteSelected">
          <i class="fa-solid fa-trash-can"></i>
          <span>删除</span>
        </div>
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
    </main>
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
:root {
  --sidebar-bg: rgba(246, 246, 246, 0.75);
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

/* --- 标题栏 --- */
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 12px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
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

/* --- 图片列表滚动容器 --- */
.gallery-scroll-container {
  max-height: calc(100vh - 240px);
  overflow-y: auto;
  padding-right: 8px;

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
}

/* --- 照片网格 --- */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.photo-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f5f5f7;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.3s ease;
}

.gallery-image {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.5s;
}

.photo-card:hover {
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

/* 选择态 */
.selecting .photo-card {
  transform: scale(0.92);
}

.select-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid white;
  background: rgba(0, 0, 0, 0.2);
  display: none;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  z-index: 10;
}

.selecting .select-overlay {
  display: flex;
}

.photo-card.selected .select-overlay {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
}

.image-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 10;
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

/* --- 底部工具栏 --- */
.bottom-toolbar {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 400px;
  height: 60px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid var(--border-color);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  transition: bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

.bottom-toolbar.active {
  bottom: 30px;
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--accent-blue);
  cursor: pointer;
  padding: 8px 16px;
}

.toolbar-item span {
  font-size: 11px;
  font-weight: 500;
}

/* --- 分页 --- */
.pagination-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  margin-top: 1rem;
  flex-shrink: 0;
}

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
</style>
