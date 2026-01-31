<template>
  <div class="albums-view">
    <!-- 主内容区 -->
    <main id="main-container">
      <div class="scroll-content">
        <!-- 标题栏 -->
        <div class="title-bar">
          <h1 class="page-title">我的相册</h1>
          <el-button type="primary" :icon="Plus" @click="showCreateAlbumDialog = true">创建相册</el-button>
        </div>

        <div class="title-divider"></div>

        <!-- 相册列表 -->
        <div v-loading="loading" class="albums-content">
          <div v-if="albums.length > 0" class="albums-grid">
            <div
              v-for="album in albums"
              :key="album.id"
              class="album-card"
              @click="viewAlbum(album)"
            >
              <div class="album-cover">
                <div class="album-cover-placeholder">
                  <el-icon class="album-icon"><Collection /></el-icon>
                  <span>{{ album.name }}</span>
                </div>
              </div>
              <div class="album-info">
                <div class="album-name">{{ album.name }}</div>
                <div class="album-meta">
                  <span>{{ album.imageCount }} 张照片</span>
                </div>
              </div>
              <div class="album-actions" @click.stop>
                <el-button
                  type="primary"
                  circle
                  size="small"
                  :icon="Edit"
                  @click="editAlbum(album)"
                  title="编辑相册"
                />
                <el-button
                  type="danger"
                  circle
                  size="small"
                  :icon="Delete"
                  @click="deleteAlbum(album)"
                  title="删除相册"
                />
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <el-empty v-else description="暂无相册" />
        </div>
      </div>

      <!-- 创建相册对话框 -->
      <el-dialog
        v-model="showCreateAlbumDialog"
        title="创建相册"
        width="400px"
        destroy-on-close
      >
        <el-form :model="albumForm" label-width="80px">
          <el-form-item label="相册名称">
            <el-input v-model="albumForm.name" placeholder="请输入相册名称" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="albumForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入相册描述"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showCreateAlbumDialog = false">取消</el-button>
            <el-button type="primary" @click="handleCreateAlbum" :loading="saving">创建</el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 编辑相册对话框 -->
      <el-dialog
        v-model="showEditAlbumDialog"
        title="编辑相册"
        width="400px"
        destroy-on-close
      >
        <el-form :model="albumForm" label-width="80px">
          <el-form-item label="相册名称">
            <el-input v-model="albumForm.name" placeholder="请输入相册名称" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="albumForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入相册描述"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showEditAlbumDialog = false">取消</el-button>
            <el-button type="primary" @click="updateAlbum" :loading="saving">保存</el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 相册详情对话框 -->
      <el-dialog
        v-model="showAlbumDetailDialog"
        :title="currentAlbum?.name || '相册详情'"
        width="80%"
        top="5vh"
        destroy-on-close
      >
        <div v-if="currentAlbum" class="album-detail">
          <div class="album-detail-header">
            <div class="album-detail-info">
              <h2>{{ currentAlbum.name }}</h2>
              <p v-if="currentAlbum.description">{{ currentAlbum.description }}</p>
              <p>{{ currentAlbum.imageCount }} 张照片</p>
            </div>
            <div class="album-detail-actions">
              <el-button type="primary" :icon="Plus" @click="showAddImagesDialog = true">添加照片</el-button>
            </div>
          </div>

          <!-- 相册中的图片 -->
          <div class="album-images">
            <div v-if="currentAlbumImages.length > 0" class="images-grid">
              <div
                v-for="image in currentAlbumImages"
                :key="image.id"
                class="image-card"
              >
                <el-image
                  :src="image.thumbnailUrl || image.url"
                  fit="cover"
                  class="grid-image"
                />
                <div class="image-actions" @click.stop>
                  <el-button
                    type="danger"
                    circle
                    size="small"
                    :icon="Delete"
                    @click="removeImageFromAlbum(image)"
                    title="从相册中移除"
                  />
                </div>
              </div>
            </div>
            <el-empty v-else description="相册中暂无照片" />
          </div>
        </div>
      </el-dialog>

      <!-- 添加图片到相册对话框 -->
      <el-dialog
        v-model="showAddImagesDialog"
        title="添加照片到相册"
        width="80%"
        top="5vh"
        destroy-on-close
      >
        <div class="add-images-dialog">
          <div class="search-bar">
            <el-input
              v-model="imageSearchQuery"
              placeholder="搜索照片"
              clearable
              @input="searchImages"
            >
              <template #prefix>
                <el-icon class="el-input__icon"><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="images-selection" v-loading="loadingImages">
            <div v-if="availableImages.length > 0" class="images-grid">
              <div
                v-for="image in availableImages"
                :key="image.id"
                class="image-card"
                :class="{ selected: selectedImageIds.has(image.id) }"
                @click="toggleImageSelection(image.id)"
              >
                <el-image
                  :src="image.thumbnailUrl || image.url"
                  fit="cover"
                  class="grid-image"
                />
                <div class="select-overlay">
                  <el-icon class="check-icon"><Check /></el-icon>
                </div>
              </div>
            </div>
            <el-empty v-else description="未找到照片" />
          </div>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showAddImagesDialog = false">取消</el-button>
            <el-button type="primary" @click="addImagesToAlbum" :loading="saving">添加 {{ selectedImageIds.size }} 张照片</el-button>
          </span>
        </template>
      </el-dialog>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { Collection, Plus, Edit, Delete, Check, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AlbumInfo, ImageInfo } from '@mindgallery/shared/src/types/api'
import { getAlbumList, createAlbum, updateAlbum as updateAlbumApi, deleteAlbum as deleteAlbumApi, addImagesToAlbum as addImagesToAlbumApi, removeImagesFromAlbum } from '@/api/modules/album'
import { getImageList } from '@/api/modules/image'
import { universalApi } from '@/api'

// 状态
const loading = ref(false)
const saving = ref(false)
const loadingImages = ref(false)
const albums = ref<AlbumInfo[]>([])
const currentAlbum = ref<AlbumInfo | null>(null)
const currentAlbumImages = ref<ImageInfo[]>([])
const availableImages = ref<ImageInfo[]>([])
const selectedImageIds = ref<Set<string>>(new Set())
const imageSearchQuery = ref('')

// 对话框状态
const showCreateAlbumDialog = ref(false)
const showEditAlbumDialog = ref(false)
const showAlbumDetailDialog = ref(false)
const showAddImagesDialog = ref(false)

// 表单数据
const albumForm = reactive({
  name: '',
  description: ''
})

// 当前编辑的相册ID
const editingAlbumId = ref<string>('')

// 初始化
onMounted(async () => {
  await fetchAlbums()
})

// 获取相册列表
const fetchAlbums = async () => {
  loading.value = true
  try {
    console.log('开始获取相册列表')
    const response = await getAlbumList()
    console.log('获取相册列表响应:', response)
    if (response.success) {
      console.log('相册列表数据:', response.data)
      albums.value = response.data
      console.log('相册列表更新完成，共', albums.value.length, '个相册')
    } else {
      console.error('获取相册列表失败:', response.message)
      ElMessage.error('获取相册列表失败: ' + response.message)
    }
  } catch (error) {
    console.error('获取相册列表失败:', error)
    ElMessage.error('获取相册列表失败')
  } finally {
    loading.value = false
  }
}

// 创建相册
const handleCreateAlbum = async () => {
  if (!albumForm.name.trim()) {
    ElMessage.warning('请输入相册名称')
    return
  }

  saving.value = true
  try {
    console.log('开始创建相册:', { name: albumForm.name, description: albumForm.description })
    const response = await createAlbum({ name: albumForm.name, description: albumForm.description })
    console.log('创建相册响应:', response)
    if (response.success) {
      ElMessage.success('相册创建成功')
      showCreateAlbumDialog.value = false
      console.log('开始刷新相册列表')
      await fetchAlbums()
      console.log('相册列表刷新完成')
      // 重置表单
      albumForm.name = ''
      albumForm.description = ''
    } else {
      console.error('创建相册失败:', response.message)
      ElMessage.error('创建相册失败: ' + response.message)
    }
  } catch (error) {
    console.error('创建相册失败:', error)
    ElMessage.error('创建相册失败')
  } finally {
    saving.value = false
  }
}

// 编辑相册
const editAlbum = (album: AlbumInfo) => {
  editingAlbumId.value = album.id
  albumForm.name = album.name
  albumForm.description = album.description || ''
  showEditAlbumDialog.value = true
}

// 更新相册
const updateAlbum = async () => {
  if (!albumForm.name.trim()) {
    ElMessage.warning('请输入相册名称')
    return
  }

  saving.value = true
  try {
    const response = await updateAlbumApi(editingAlbumId.value, { name: albumForm.name, description: albumForm.description })
    if (response.success) {
      ElMessage.success('相册更新成功')
      showEditAlbumDialog.value = false
      await fetchAlbums()
      // 重置表单
      albumForm.name = ''
      albumForm.description = ''
      editingAlbumId.value = ''
    }
  } catch (error) {
    console.error('更新相册失败:', error)
    ElMessage.error('更新相册失败')
  } finally {
    saving.value = false
  }
}

// 删除相册
const deleteAlbum = (album: AlbumInfo) => {
  ElMessageBox.confirm(
    `确定要删除相册 "${album.name}" 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    saving.value = true
    try {
      const response = await deleteAlbumApi(album.id)
      if (response.success) {
        ElMessage.success('相册删除成功')
        await fetchAlbums()
      }
    } catch (error) {
      console.error('删除相册失败:', error)
      ElMessage.error('删除相册失败')
    } finally {
      saving.value = false
    }
  }).catch(() => {
    // 取消删除
  })
}

// 查看相册详情
const viewAlbum = async (album: AlbumInfo) => {
  currentAlbum.value = album
  // 获取相册中的图片
  await fetchAlbumImages(album.id)
  showAlbumDetailDialog.value = true
}

// 获取相册中的图片
const fetchAlbumImages = async (albumId: string) => {
  loadingImages.value = true
  try {
    // 这里应该调用专门的API获取相册中的图片
    // 暂时使用通用的图片列表API，后续需要后端提供专门的API
    const response = await getImageList()
    if (response.success) {
      // 过滤出属于当前相册的图片
      currentAlbumImages.value = response.data.filter(image =>
        image.albums?.some(album => album.id === albumId)
      )
    }
  } catch (error) {
    console.error('获取相册图片失败:', error)
    ElMessage.error('获取相册图片失败')
  } finally {
    loadingImages.value = false
  }
}

// 从相册中移除图片
const removeImageFromAlbum = async (image: ImageInfo) => {
  if (!currentAlbum.value) return

  try {
    await removeImagesFromAlbum(currentAlbum.value.id, [image.id])
    ElMessage.success('图片已从相册中移除')
    // 刷新相册图片
    await fetchAlbumImages(currentAlbum.value.id)
    // 刷新相册列表
    await fetchAlbums()
  } catch (error) {
    console.error('移除图片失败:', error)
    ElMessage.error('移除图片失败')
  }
}

// 显示添加图片对话框
const showAddImagesDialogToAlbum = () => {
  if (!currentAlbum.value) return

  selectedImageIds.value = new Set()
  imageSearchQuery.value = ''
  fetchAvailableImages()
  showAddImagesDialog.value = true
}

// 获取可用图片
const fetchAvailableImages = async () => {
  loadingImages.value = true
  try {
    const response = await getImageList()
    if (response.success) {
      availableImages.value = response.data
    }
  } catch (error) {
    console.error('获取图片列表失败:', error)
    ElMessage.error('获取图片列表失败')
  } finally {
    loadingImages.value = false
  }
}

// 搜索图片
const searchImages = async () => {
  loadingImages.value = true
  try {
    const response = await getImageList({ search: imageSearchQuery.value })
    if (response.success) {
      availableImages.value = response.data
    }
  } catch (error) {
    console.error('搜索图片失败:', error)
    ElMessage.error('搜索图片失败')
  } finally {
    loadingImages.value = false
  }
}

// 切换图片选择
const toggleImageSelection = (imageId: string) => {
  const newSet = new Set(selectedImageIds.value)
  if (newSet.has(imageId)) {
    newSet.delete(imageId)
  } else {
    newSet.add(imageId)
  }
  selectedImageIds.value = newSet
}

// 添加图片到相册
const addImagesToAlbum = async () => {
  if (!currentAlbum.value || selectedImageIds.value.size === 0) return

  saving.value = true
  try {
    const imageIds = Array.from(selectedImageIds.value)
    const response = await addImagesToAlbumApi(currentAlbum.value.id, imageIds)
    if (response.success) {
      ElMessage.success(`已成功添加 ${imageIds.length} 张照片到相册`)
      showAddImagesDialog.value = false
      // 刷新相册图片
      await fetchAlbumImages(currentAlbum.value.id)
      // 刷新相册列表
      await fetchAlbums()
      // 重置选择
      selectedImageIds.value = new Set()
    }
  } catch (error) {
    console.error('添加图片失败:', error)
    ElMessage.error('添加图片失败')
  } finally {
    saving.value = false
  }
}

// 监听搜索查询变化
watch(imageSearchQuery, (newQuery) => {
  if (newQuery.length > 0) {
    searchImages()
  } else {
    fetchAvailableImages()
  }
})
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

.albums-view {
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

.title-divider {
  height: 0.5px;
  background-color: var(--border-color);
  margin-bottom: 24px;
}

/* --- 相册列表 --- */
.albums-content {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.album-card {
  position: relative;
  background-color: #f5f5f7;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.album-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
}

.album-cover-image {
  width: 100%;
  height: 100%;
  transition: transform 0.5s;
}

.album-card:hover .album-cover-image {
  transform: scale(1.05);
}

.album-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #e5e5ea;
  color: #86868b;
}

.album-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.album-info {
  padding: 12px;
}

.album-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.album-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 10;
}

.album-card:hover .album-actions {
  opacity: 1;
}

/* --- 相册详情 --- */
.album-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.album-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.album-detail-info h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.album-detail-info p {
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.album-images {
  margin-top: 20px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.image-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f5f5f7;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-card:hover {
  transform: translateY(-2px);
}

.image-card.selected {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}

.grid-image {
  width: 100%;
  height: 100%;
  display: block;
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

.image-card:hover .select-overlay,
.image-card.selected .select-overlay {
  display: flex;
}

.image-card.selected .select-overlay {
  background: var(--accent-blue);
}

/* --- 添加图片对话框 --- */
.add-images-dialog {
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.search-bar {
  margin-bottom: 16px;
}

.images-selection {
  flex: 1;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .scroll-content {
    padding: 10px 20px 100px;
  }

  .albums-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
