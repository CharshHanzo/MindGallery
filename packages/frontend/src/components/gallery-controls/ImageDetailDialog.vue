<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="80%"
    top="5vh"
    destroy-on-close
    class="image-detail-dialog"
    @close="handleClose"
  >
    <div class="detail-container" v-if="image">
      <!-- 左侧：大图展示 -->
      <div class="detail-image-wrapper">
        <el-image
          :src="image.url"
          :alt="image.filename"
          fit="contain"
          class="detail-image"
          :preview-src-list="[image.url]"
        />
      </div>

      <!-- 右侧：编辑表单 -->
      <div class="detail-form-wrapper">
        <el-form :model="formData" label-position="top" :disabled="!editable">
          <!-- 文件名 -->
          <el-form-item label="图片名称">
            <el-input
              v-model="formData.filename"
              placeholder="请输入图片名称"
              :disabled="!editable"
            />
          </el-form-item>

          <!-- 描述 -->
          <el-form-item label="描述">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="4"
              placeholder="请输入图片描述"
              :disabled="!editable"
            />
          </el-form-item>

          <!-- 标签 -->
          <el-form-item label="标签" v-if="availableTags && availableTags.length > 0">
            <el-select
              v-model="formData.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入标签"
              style="width: 100%"
              :disabled="!editable"
            >
              <el-option
                v-for="tag in availableTags"
                :key="tag.id"
                :label="tag.name"
                :value="tag.name"
              />
            </el-select>
          </el-form-item>

          <!-- 相册 -->
          <el-form-item label="相册" v-if="availableAlbums && availableAlbums.length > 0">
            <el-select
              v-model="formData.albumIds"
              multiple
              filterable
              placeholder="请选择相册"
              style="width: 100%"
              :disabled="!editable"
            >
              <el-option
                v-for="album in availableAlbums"
                :key="album.id"
                :label="album.name"
                :value="album.id"
              />
            </el-select>
          </el-form-item>

          <!-- 元信息 -->
          <div class="form-meta-info">
            <p><strong>文件大小：</strong>{{ formatFileSize(image.fileSize) }}</p>
            <p><strong>上传时间：</strong>{{ new Date(image.uploadTime).toLocaleString() }}</p>
            <p v-if="image.width"><strong>分辨率：</strong>{{ image.width }} x {{ image.height }}</p>
          </div>
        </el-form>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <span class="dialog-footer">
        <!-- 左侧操作 -->
        <div class="left-actions" v-if="showLeftActions">
          <!-- 在文件夹中打开 -->
          <el-button
            v-if="showOpenInFolder"
            type="primary"
            @click="handleOpenInFolder"
            :icon="Folder"
          >
            在文件夹中打开
          </el-button>

          <!-- 删除图片 -->
          <el-button
            v-if="showDelete"
            type="danger"
            @click="handleDelete"
            :icon="Delete"
          >
            删除图片
          </el-button>

          <!-- 自定义左侧操作插槽 -->
          <slot name="left-actions"></slot>
        </div>

        <!-- 右侧操作 -->
        <div class="right-actions">
          <!-- 自定义右侧操作插槽 -->
          <slot name="right-actions"></slot>

          <!-- 取消按钮 -->
          <el-button @click="handleCancel">
            取消
          </el-button>

          <!-- 保存按钮 -->
          <el-button
            v-if="showSave && editable"
            type="primary"
            @click="handleSave"
            :loading="loading"
          >
            保存修改
          </el-button>
        </div>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, useSlots } from 'vue'
import { Folder, Delete } from '@element-plus/icons-vue'
import type { ImageInfo, TagInfo, AlbumInfo } from '@mindgallery/shared/src/types/api'

/**
 * 图片详情对话框组件
 * 支持查看和编辑模式，可配置操作按钮
 */

/**
 * 组件的Props接口
 */
interface ImageDetailDialogProps {
  // 对话框可见性
  visible: boolean
  // 图片信息
  image: ImageInfo | null
  // 操作模式：查看或编辑
  mode?: 'view' | 'edit'
  // 是否可编辑
  editable?: boolean
  // 可用标签列表
  availableTags?: TagInfo[]
  // 可用相册列表
  availableAlbums?: AlbumInfo[]
  // 加载状态
  loading?: boolean
  // 操作按钮配置
  showOpenInFolder?: boolean
  showDelete?: boolean
  showSave?: boolean
}

/**
 * 组件的Emits接口
 */
interface ImageDetailDialogEmits {
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'save', image: ImageInfo, formData: any): void
  (e: 'delete', image: ImageInfo): void
  (e: 'open-in-folder', image: ImageInfo): void
}

// 声明组件的Props
const props = withDefaults(defineProps<ImageDetailDialogProps>(), {
  visible: false,
  image: null,
  mode: 'edit',
  editable: true,
  availableTags: () => [],
  availableAlbums: () => [],
  loading: false,
  showOpenInFolder: true,
  showDelete: true,
  showSave: true
})

// 声明组件的Emits
const emit = defineEmits<ImageDetailDialogEmits>()

// 获取插槽
const slots = useSlots()

// 对话框可见性（内部状态）
const dialogVisible = ref(props.visible)

// 编辑表单数据
const formData = ref({
  filename: '',
  description: '',
  tags: [] as string[],
  albumIds: [] as string[]
})

// 计算属性
const dialogTitle = computed(() => {
  return props.mode === 'view' ? '图片详情' : '编辑图片信息'
})

const showLeftActions = computed(() => {
  return props.showOpenInFolder || props.showDelete || !!slots['left-actions']
})

// 事件处理辅助函数
const handleOpenInFolder = () => {
  if (props.image) {
    emit('open-in-folder', props.image)
  }
}

const handleDelete = () => {
  if (props.image) {
    emit('delete', props.image)
  }
}

// 监听外部visible变化
watch(
  () => props.visible,
  (newValue) => {
    dialogVisible.value = newValue
  }
)

// 监听图片变化，更新表单数据
watch(
  () => props.image,
  (newImage) => {
    if (newImage) {
      formData.value = {
        filename: newImage.filename,
        description: newImage.description || '',
        tags: newImage.tags ? [...newImage.tags] : [],
        albumIds: newImage.albums ? newImage.albums.map(album => album.id) : []
      }
    }
  },
  { immediate: true }
)

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleCancel = () => {
  emit('update:visible', false)
  emit('close')
}

const handleSave = () => {
  if (props.image) {
    emit('save', props.image, formData.value)
  }
}

// 工具函数：格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped lang="scss">
.image-detail-dialog {
  .detail-container {
    display: flex;
    gap: 24px;
    max-height: 70vh;
    overflow: hidden;

    @media (max-width: 1024px) {
      flex-direction: column;
      max-height: none;
    }

    .detail-image-wrapper {
      flex: 1;
      min-width: 300px;
      max-width: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      @media (max-width: 1024px) {
        max-width: 100%;
        max-height: 40vh;
      }

      .detail-image {
        max-height: 60vh;
        max-width: 100%;

        @media (max-width: 1024px) {
          max-height: 35vh;
        }
      }
    }

    .detail-form-wrapper {
      flex: 1;
      min-width: 300px;
      max-width: 50%;
      overflow-y: auto;

      @media (max-width: 1024px) {
        max-width: 100%;
      }

      .form-meta-info {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--el-border-color);
        font-size: 14px;
        color: var(--el-text-color-secondary);

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

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .left-actions,
    .right-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      @media (max-width: 768px) {
        justify-content: center;
      }
    }

    .left-actions {
      flex-wrap: wrap;
    }
  }
}
</style>
