<template>
  <div class="image-grid">
    <!-- 图片列表 -->
    <div v-loading="loading" class="gallery-content">
      <div class="gallery-scroll-container">
        <div v-if="images.length > 0" class="photo-grid" id="photo-grid">
          <div
            v-for="(image, index) in images"
            :key="image.id"
            class="photo-card"
            :class="{ selected: isSelected(image.id) && selectionMode }"
            @click="selectionMode ? toggleSelect(image.id) : handleImageClick(image, index)"
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
              <el-icon class="check-icon"><Check /></el-icon>
            </div>

            <div class="image-actions" @click.stop>
              <slot name="image-actions" :image="image">
                <!-- Default actions -->
                <el-button
                  :type="isFavorite(image) ? 'warning' : 'default'"
                  circle
                  size="small"
                  :icon="Star"
                  @click="handleFavorite(image)"
                  :title="isFavorite(image) ? '取消收藏' : '收藏图片'"
                />
                <el-button
                  type="danger"
                  circle
                  size="small"
                  :icon="Delete"
                  @click="handleDelete(image)"
                  title="删除图片"
                />
              </slot>
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

    <div class="foot-container">
      <!-- 底部操作工具栏 -->
      <div class="bottom-toolbar" v-if="selectionMode">
        <div class="toolbar-content">
          <div class="toolbar-actions">
            <slot name="toolbar-actions">
              <!-- Default toolbar actions -->
              <el-button type="primary" plain @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</el-button>
              <el-button type="primary" plain :icon="CollectionTag" @click="$emit('show-add-to-album')">添加到相册</el-button>
              <el-button type="primary" plain :icon="Star" @click="handleBatchFavorite">收藏</el-button>
              <el-button type="danger" :icon="Delete" @click="deleteSelected">删除</el-button>
            </slot>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container" v-if="total > 0">
        <el-pagination
          v-model:current-page="localPage"
          v-model:page-size="localLimit"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Picture, Loading, Delete, Check, CollectionTag, Star } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ImageInfo } from '@mindgallery/shared/src/types/api'

// Props
const props = defineProps({
  images: {
    type: Array as () => ImageInfo[],
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  total: {
    type: Number,
    default: 0
  },
  page: {
    type: Number,
    default: 1
  },
  limit: {
    type: Number,
    default: 50
  },
  selectionMode: {
    type: Boolean,
    default: false
  },
  showDefaultActions: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits([
  'image-click',
  'selection-change',
  'page-change',
  'size-change',
  'delete-image',
  'batch-delete',
  'favorite-image',
  'batch-favorite',
  'show-add-to-album'
])

// Local state
const selectedIds = ref<Set<string>>(new Set())
const localPage = ref(props.page)
const localLimit = ref(props.limit)

// Watch for props changes
watch(() => props.page, (newPage) => {
  localPage.value = newPage
})

watch(() => props.limit, (newLimit) => {
  localLimit.value = newLimit
})

// Computed properties
const isSelected = (id: string) => selectedIds.value.has(id)

const isAllSelected = computed(() => {
  return props.images.length > 0 && selectedIds.value.size === props.images.length
})

// Methods
const handleImageClick = (image: ImageInfo, index: number) => {
  emit('image-click', image, index)
}

const toggleSelect = (id: string) => {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selectedIds.value = newSet
  emit('selection-change', Array.from(newSet))
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(props.images.map(image => image.id))
  }
  emit('selection-change', Array.from(selectedIds.value))
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
    emit('batch-delete', Array.from(selectedIds.value))
    selectedIds.value = new Set()
  } catch {
    // 取消删除
  }
}

const handleDelete = (image: ImageInfo) => {
  emit('delete-image', image)
}

const isFavorite = (image: ImageInfo): boolean => {
  return image.albums?.some(album => album.name === '个人收藏') || false
}

const handleFavorite = (image: ImageInfo) => {
  emit('favorite-image', image)
}

const handleBatchFavorite = () => {
  if (selectedIds.value.size === 0) return
  emit('batch-favorite', Array.from(selectedIds.value))
}

const handleSizeChange = (val: number) => {
  localLimit.value = val
  emit('size-change', val)
}

const handlePageChange = (val: number) => {
  localPage.value = val
  emit('page-change', val)
}

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

.image-grid {
  width: 100%;
}

/* --- 图片列表滚动容器 --- */
.gallery-scroll-container {
  max-height: calc(100vh - 280px);
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
  background: #409EFF;
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

.foot-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

/* --- 分页 --- */
.pagination-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  flex-shrink: 0;
  z-index: 10;
}

/* --- 底部操作工具栏 --- */
.bottom-toolbar {
  display: inline-flex;
  align-items: center;
  justify-content: space-around;
  position: relative;
  background-color: white;
  transform: translateY(30%);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  animation: slideUp 0.2s ease-out;
  border-radius: 12px;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(20);
  }
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 20px;

}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;

  .el-button {
    font-size: 11px;
    font-weight: 500;
    padding: 8px 16px;
    background: transparent !important;

    .el-icon {
      margin-right: 4px;
    }

    &.el-button--primary {
      color: #007aff;
      border-color: #007aff;

      .el-icon {
        color: #007aff;
      }

      &:hover {
        background: rgba(0, 122, 255, 0.1) !important;
      }
    }

    &.el-button--danger {
      color: #ff3b30;
      border-color: #ff3b30;

      .el-icon {
        color: #ff3b30;
      }

      &:hover {
        background: rgba(255, 59, 48, 0.1) !important;
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar-content {
    padding: 12px 20px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-actions {
    justify-content: space-around;
  }

  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

/* 调整图片网格的最大高度 */
.gallery-scroll-container {
  max-height: calc(100vh - 280px);
}
</style>