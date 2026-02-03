<template>
  <div class="album-detail-view">
    <!-- 主内容区 -->
    <main id="main-container">
      <div class="scroll-content">
        <!-- 标题栏 -->
        <div class="title-bar">
          <div class="title-left">
            <el-button type="text" @click="goBack">
              <el-icon><ArrowLeft /></el-icon>
              <span>返回相册列表</span>
            </el-button>
            <h1 class="page-title">{{ currentAlbum?.name || '相册详情' }}</h1>
          </div>
          <div class="title-actions">
            <el-button type="primary" :icon="Plus" @click="showAddImagesDialog = true">添加图片</el-button>
          </div>
        </div>

        <div class="title-divider"></div>

        <!-- 相册详情信息 -->
        <div v-if="currentAlbum" class="album-detail-info">
          <div class="album-meta">
            <span>{{ currentAlbumImages.length }} 张照片</span>
            <span v-if="currentAlbum.description">{{ currentAlbum.description }}</span>
          </div>
        </div>

        <!-- 相册图片 -->
        <div v-loading="loadingImages" class="album-images">
          <ImageGrid
            v-if="currentAlbumImages.length > 0"
            :images="currentAlbumImages"
            :loading="loadingImages"
            :total="0"
            :selection-mode="false"
            @image-click="handleImageClick"
          >
            <template #image-actions="{ image }">
              <el-button
                type="danger"
                circle
                size="small"
                :icon="Delete"
                @click="removeImageFromAlbum(image)"
                title="从相册中移除"
              />
            </template>
          </ImageGrid>
          <el-empty v-else description="相册中暂无图片" />
        </div>

        <!-- 添加图片对话框 -->
        <el-dialog
          v-model="showAddImagesDialog"
          title="添加图片到相册"
          width="800px"
          class="add-images-dialog"
        >
          <div class="search-bar">
            <el-input
              v-model="imageSearchQuery"
              placeholder="搜索图片..."
              clearable
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
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="showAddImagesDialog = false">取消</el-button>
              <el-button type="primary" @click="addImagesToAlbum" :loading="saving">添加 {{ selectedImageIds.size }} 张照片</el-button>
            </span>
          </template>
        </el-dialog>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, Check, Search, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AlbumInfo, ImageInfo } from '@mindgallery/shared/src/types/api'
import { getAlbumDetail, addImagesToAlbum as addImagesToAlbumApi, removeImagesFromAlbum } from '@/api/modules/album'
import { getImageList } from '@/api/modules/image'
import ImageGrid from '@/components/image-grid/ImageGrid.vue'

// 路由
const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const saving = ref(false)
const loadingImages = ref(false)
const currentAlbum = ref<AlbumInfo | null>(null)
const currentAlbumImages = ref<ImageInfo[]>([])
const availableImages = ref<ImageInfo[]>([])
const selectedImageIds = ref<Set<string>>(new Set())
const imageSearchQuery = ref('')

// 对话框状态
const showAddImagesDialog = ref(false)

// 返回相册列表
const goBack = () => {
  router.push('/myAlbums')
}

// 初始化
onMounted(async () => {
  await fetchAlbumDetail()
})

// 获取相册详情
const fetchAlbumDetail = async () => {
  const albumId = route.params.albumId as string
  if (!albumId) {
    ElMessage.error('相册ID不存在')
    goBack()
    return
  }

  loadingImages.value = true
  try {
    const response = await getAlbumDetail(albumId)
    if (response.success) {
      currentAlbum.value = response.data
      currentAlbumImages.value = response.data.images || []
    } else {
      ElMessage.error('获取相册详情失败')
      goBack()
    }
  } catch (error) {
    console.error('获取相册详情失败:', error)
    ElMessage.error('获取相册详情失败')
    goBack()
  } finally {
    loadingImages.value = false
  }
}

// 处理图片点击
const handleImageClick = (image: ImageInfo, index: number) => {
  // 可以在这里添加图片预览逻辑
  console.log('Image clicked:', image)
}



// 从相册中移除图片
const removeImageFromAlbum = async (image: ImageInfo) => {
  if (!currentAlbum.value) return

  try {
    await removeImagesFromAlbum(currentAlbum.value.id, [image.id])
    ElMessage.success('图片已从相册中移除')
    // 刷新相册图片
    await fetchAlbumDetail()
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
      await fetchAlbumDetail()
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

.album-detail-view {
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
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.title-divider {
  height: 0.5px;
  background-color: var(--border-color);
  margin-bottom: 24px;
}

/* --- 相册详情信息 --- */
.album-detail-info {
  margin-bottom: 32px;
}

.album-meta {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  gap: 24px;
}

/* --- 相册图片 --- */
.album-images {
  margin-top: 24px;
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

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.image-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-card:hover {
  transform: scale(1.05);
}

.grid-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.select-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-card.selected .select-overlay {
  opacity: 1;
  background-color: rgba(0, 122, 255, 0.6);
}

.check-icon {
  color: white;
  font-size: 24px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .scroll-content {
    padding: 10px 20px 100px;
  }

  .title-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .title-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .page-title {
    font-size: 24px;
  }

  .album-meta {
    flex-direction: column;
    gap: 8px;
  }

  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
