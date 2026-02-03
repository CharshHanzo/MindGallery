<template>
  <div class="gallery-controls-demo">
    <!-- 页面标题 -->
    <h1 class="page-title">Gallery Controls Demo</h1>
    <p class="page-description">测试排序、标签筛选和多选操作组件的组合使用</p>

    <!-- 控制区域 -->
    <div class="controls-container">
      <!-- 顶部控制栏 -->
      <div class="top-controls">
        <!-- 排序控制 -->
        <SortControl v-model="sortOrder" @sort-change="handleSortChange" />

        <!-- 标签筛选 -->
        <TagFilter
          v-model="selectedTags"
          :available-tags="availableTags"
          :loading="loadingTags"
          @tag-change="handleTagChange"
        />
      </div>

      <!-- 多选操作工具栏 -->
      <SelectionToolbar
        :selection-mode="selectionMode"
        :selected-ids="selectedIds"
        :selected-count="selectedIds.length"
        @batch-delete="handleBatchDelete"
        @batch-favorite="handleBatchFavorite"
        @show-add-to-album="showAddToAlbumDialog = true"
        @cancel-selection="toggleSelectionMode"
      >
        <!-- 自定义操作按钮 -->
        <template #actions>
          <el-button type="primary" @click="handleCustomAction">
            自定义操作
          </el-button>
        </template>
      </SelectionToolbar>
    </div>

    <!-- 图片列表模拟 -->
    <div class="image-grid-demo">
      <div class="image-grid-demo__header">
        <h2>图片列表（模拟）</h2>
        <div class="image-grid-demo__actions">
          <el-button @click="toggleSelectionMode">
            {{ selectionMode ? '退出选择' : '进入选择模式' }}
          </el-button>
        </div>
      </div>

      <!-- 模拟图片项 -->
      <div class="image-grid-demo__items">
        <div
          v-for="image in mockImages"
          :key="image.id"
          class="image-grid-demo__item"
          :class="{ selected: selectedIds.includes(image.id) }"
          @click="handleImageClick(image)"
        >
          <div class="image-grid-demo__item-content">
            <div class="image-grid-demo__item-image">
              {{ image.filename.charAt(0).toUpperCase() }}
            </div>
            <div class="image-grid-demo__item-info">
              <div class="image-grid-demo__item-name">{{ image.filename }}</div>
              <div class="image-grid-demo__item-date">{{ image.uploadTime }}</div>
            </div>
          </div>
          <div
            v-if="selectionMode"
            class="image-grid-demo__item-checkbox"
          >
            <el-checkbox
              v-model="image.selected"
              @change="handleImageSelection(image.id, image.selected)"
            />
          </div>
        </div>
      </div>
    </div>

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
              v-for="album in mockAlbums"
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
          <el-button type="primary" @click="handleAddToAlbum">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import SortControl from '@/components/gallery-controls/SortControl.vue'
import TagFilter from '@/components/gallery-controls/TagFilter.vue'
import SelectionToolbar from '@/components/gallery-controls/SelectionToolbar.vue'
import type { TagInfo } from '@mindgallery/shared/src/types/api'

// 模拟数据
const mockImages = ref([
  { id: '1', filename: 'photo1.jpg', uploadTime: '2024-01-01', selected: false },
  { id: '2', filename: 'photo2.jpg', uploadTime: '2024-01-02', selected: false },
  { id: '3', filename: 'photo3.jpg', uploadTime: '2024-01-03', selected: false },
  { id: '4', filename: 'photo4.jpg', uploadTime: '2024-01-04', selected: false },
  { id: '5', filename: 'photo5.jpg', uploadTime: '2024-01-05', selected: false },
])

const mockTags = ref<TagInfo[]>([
  { id: '1', name: '旅行', count: 10 },
  { id: '2', name: '家庭', count: 8 },
  { id: '3', name: '朋友', count: 5 },
  { id: '4', name: '工作', count: 3 },
  { id: '5', name: '风景', count: 12 },
])

const mockAlbums = ref([
  { id: '1', name: '旅行相册', imageCount: 20 },
  { id: '2', name: '家庭聚会', imageCount: 15 },
  { id: '3', name: '朋友聚会', imageCount: 8 },
])

// 状态
const sortOrder = ref<'asc' | 'desc'>('desc')
const selectedTags = ref<string[]>([])
const availableTags = ref<TagInfo[]>(mockTags.value)
const loadingTags = ref(false)
const selectionMode = ref(false)
const selectedIds = ref<string[]>([])
const showAddToAlbumDialog = ref(false)
const selectedAlbumId = ref('')

// 生命周期
onMounted(() => {
  // 模拟加载标签数据
  loadTags()
})

// 模拟加载标签数据
const loadTags = async () => {
  loadingTags.value = true
  // 模拟API调用延迟
  setTimeout(() => {
    availableTags.value = mockTags.value
    loadingTags.value = false
  }, 1000)
}

// 事件处理
const handleSortChange = (order: 'asc' | 'desc') => {
  console.log('Sort order changed:', order)
  ElMessage.info(`排序方式已更改为：${order === 'desc' ? '最新在前' : '最早在前'}`)
}

const handleTagChange = (tags: string[]) => {
  console.log('Selected tags changed:', tags)
  ElMessage.info(`已选择 ${tags.length} 个标签`)
}

const handleImageClick = (image: any) => {
  if (selectionMode.value) {
    image.selected = !image.selected
    handleImageSelection(image.id, image.selected)
  } else {
    ElMessage.info(`点击了图片：${image.filename}`)
  }
}

const handleImageSelection = (id: string, selected: boolean) => {
  if (selected) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter(item => item !== id)
  }
  console.log('Selected IDs:', selectedIds.value)
}

const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedIds.value = []
    mockImages.value.forEach(image => {
      image.selected = false
    })
  }
  console.log('Selection mode:', selectionMode.value)
}

const handleBatchDelete = (ids: string[]) => {
  console.log('Batch delete:', ids)
  ElMessage.warning(`批量删除 ${ids.length} 张图片`)
  // 模拟删除操作
  setTimeout(() => {
    mockImages.value = mockImages.value.filter(image => !ids.includes(image.id))
    selectedIds.value = []
    toggleSelectionMode()
    ElMessage.success('批量删除成功')
  }, 500)
}

const handleBatchFavorite = (ids: string[]) => {
  console.log('Batch favorite:', ids)
  ElMessage.success(`已收藏 ${ids.length} 张图片`)
  toggleSelectionMode()
}

const handleAddToAlbum = () => {
  if (!selectedAlbumId.value) {
    ElMessage.warning('请选择相册')
    return
  }
  console.log('Add to album:', selectedIds.value, selectedAlbumId.value)
  ElMessage.success(`已添加 ${selectedIds.value.length} 张图片到相册`)
  showAddToAlbumDialog.value = false
  toggleSelectionMode()
  selectedAlbumId.value = ''
}

const handleCustomAction = () => {
  console.log('Custom action:', selectedIds.value)
  ElMessage.info('执行了自定义操作')
}
</script>

<style scoped lang="scss">
.gallery-controls-demo {
  padding: 20px;

  .page-title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .page-description {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin-bottom: 24px;
  }

  .controls-container {
    margin-bottom: 24px;
  }

  .top-controls {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .image-grid-demo {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 16px;

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h2 {
        font-size: 18px;
        font-weight: 500;
      }
    }

    &__items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }

    &__item {
      position: relative;
      border: 1px solid var(--el-border-color);
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--el-color-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &.selected {
        border-color: var(--el-color-primary);
        background-color: rgba(0, 122, 255, 0.05);
      }

      &-content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      &-image {
        width: 100%;
        height: 100px;
        background-color: var(--el-color-primary-light-9);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 600;
        color: var(--el-color-primary);
        margin-bottom: 8px;
      }

      &-info {
        text-align: center;
        font-size: 12px;

        &-name {
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        &-date {
          color: var(--el-text-color-secondary);
        }
      }

      &-checkbox {
        position: absolute;
        top: 8px;
        left: 8px;
      }
    }
  }
}

@media (max-width: 768px) {
  .gallery-controls-demo {
    .top-controls {
      flex-direction: column;
      gap: 12px;
    }
  }
}
</style>
