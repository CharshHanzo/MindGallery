<template>
  <div class="upload-image-view">
    <div class="header">
      <el-page-header @back="goBack" title="返回" icon="arrow-left">
        <template #content>
          <span class="text-large font-600 mr-3"> 上传图片 </span>
        </template>

        <template #extra>
          <div>
            <el-button
              type="primary"
              @click="handleUpload"
              :loading="uploading"
              :disabled="previewImages.length === 0"
            >
              {{ uploading ? '上传中...' : '上传' }}
            </el-button>
          </div>
        </template>
      </el-page-header>
    </div>
    <div class="upload">
      <div class="upload-content">
        <el-upload
          ref="uploadRef"
          class="upload-demo"
          drag
          :auto-upload="false"
          :multiple="true"
          :file-list="fileList"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :before-upload="beforeUpload"
          :show-file-list="false"
          accept="image/*"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽图片到此处或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip" style="color: #666; font-size: 12px; margin-top: 8px;">
              支持 jpg、png、gif、webp 格式，单个文件不超过10MB
            </div>
          </template>
        </el-upload>
      </div>
      <div class="preview" v-if="previewImages.length > 0">
        <div class="preview-title">
          <span class="text-medium font-600">预览 ({{ previewImages.length }})</span>
        </div>
        <div class="preview-grid">
          <div
            v-for="(image, index) in previewImages"
            :key="index"
            class="preview-item"
            @click="openImageSettings(index)"
          >
            <img :src="image.url" :alt="image.name" />
            <div class="tag-badge" v-if="image.tags && image.tags.length > 0">
               <el-tag size="small" type="success" effect="dark">{{ image.tags.length }}</el-tag>
            </div>
            <div class="preview-info">
              <span class="file-name">{{ image.name }}</span>
              <span class="file-size">{{ formatFileSize(image.size) }}</span>
            </div>
            <el-button
              class="remove-btn"
              type="danger"
              size="small"
              :icon="Close"
              circle
              @click="removePreviewImage(index)"
            />
          </div>
        </div>
      </div>
      <div class="preview-placeholder" v-else>
        <el-icon class="placeholder-icon"><Picture /></el-icon>
        <span class="placeholder-text">📷 选择图片后预览区域将显示图片</span>
      </div>
    </div>

    <div class="metadata-container">
      <div class="label">
        <span class="text-large font-600 mr-3"> 标签 </span>

        <!-- 搜索和添加标签 -->
        <div class="tag-search-container">
          <el-autocomplete
            v-model="customTagInput"
            :fetch-suggestions="querySearch"
            placeholder="搜索或创建标签"
            class="tag-input"
            @select="handleSelectTag"
            @keyup.enter="handleInputConfirm"
            clearable
          >
            <template #default="{ item }">
              <div class="tag-suggestion-item">
                <span>{{ item.value }}</span>
                <span class="tag-count" v-if="item.count !== undefined">({{ item.count }})</span>
              </div>
            </template>
            <template #suffix>
              <el-icon class="cursor-pointer" @click="handleInputConfirm">
                <Plus />
              </el-icon>
            </template>
          </el-autocomplete>
        </div>

        <!-- 已选中的标签 -->
        <div class="selected-tags" v-if="selectedTags.length > 0">
          <div class="section-title">已选标签:</div>
          <div class="tags-wrapper">
            <el-tag
              v-for="tag in selectedTags"
              :key="tag"
              closable
              type="primary"
              effect="light"
              round
              @close="removeSelectedTag(tag)"
            >
              {{ tag }}
            </el-tag>
            <el-button type="primary" link size="small" @click="clearSelectedTags">清空</el-button>
          </div>
        </div>

        <!-- 推荐标签 (Top 20) -->
        <div class="recommended-tags" v-if="recommendedTags.length > 0">
          <div class="section-title">推荐标签:</div>
          <div class="tags-wrapper">
            <el-check-tag
              v-for="tag in recommendedTags"
              :key="tag.id"
              :checked="selectedTags.includes(tag.name)"
              @change="(checked: boolean) => onChangeTag(tag.name, checked)"
              class="recommend-tag-item"
            >
              {{ tag.name }}
            </el-check-tag>
          </div>
        </div>
      </div>

      <div class="album">
              <span class="text-large font-600 mr-3"> 照片集 </span>
              <br>
            <el-select v-model="selectedAlbums" placeholder="选择照片集" style="width: 240px" filterable multiple>
          <el-option
            v-for="item in albums"
            :key="item.value"
            :label="item.label"
            :value="item.value"

          />
          <template #footer>
            <el-button v-if="!isAdding" text bg size="small" @click="onAddOption">
                  新增照片集
                </el-button>
                <template v-else>
                  <el-input
                    v-model="optionName"
                    class="option-input"
                    placeholder="input option name"
                    size="small"
                  />
                  <el-button type="primary" size="small" @click="onConfirm">
                    新增
                  </el-button>
                  <el-button size="small" @click="clear">取消</el-button>
                </template>
              </template>
            </el-select>
          </div>
          <div class="description">
            <span class="text-large font-600 mr-3"> 描述 </span>
            <br>
            <el-input
              v-model="textarea"
              style="width: 50%"
              :autosize="{ minRows: 4}"
              type="textarea"
              placeholder="Please input"
              resize="none"

            />
          </div>
    </div>


    </div>

    <!-- 单张图片设置弹窗 -->
    <el-dialog
      v-model="imageSettingsVisible"
      title="图片设置"
      width="500px"
      append-to-body
    >
      <div v-if="currentImageIndex > -1 && previewImages[currentImageIndex]" class="image-settings-content">
        <div class="current-image-preview">
          <img :src="previewImages[currentImageIndex].url" :alt="previewImages[currentImageIndex].name" />
        </div>

        <div class="current-image-tags">
          <div class="section-title">单独设置标签:</div>
          <div class="tags-wrapper">
            <el-tag
              v-for="tag in currentImageTags"
              :key="tag"
              closable
              type="success"
              effect="light"
              round
              @close="removeCurrentImageTag(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>

          <el-autocomplete
            v-model="currentTagInput"
            :fetch-suggestions="querySearch"
            placeholder="为该图片添加标签"
            class="tag-input"
            @select="handleSelectCurrentTag"
            @keyup.enter="handleCurrentTagInputConfirm"
            clearable
          >
            <template #default="{ item }">
              <div class="tag-suggestion-item">
                <span>{{ item.value }}</span>
                <span class="tag-count" v-if="item.count !== undefined">({{ item.count }})</span>
              </div>
            </template>
            <template #suffix>
              <el-icon class="cursor-pointer" @click="handleCurrentTagInputConfirm">
                <Plus />
              </el-icon>
            </template>
          </el-autocomplete>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="imageSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveImageSettings">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import { Plus, Close, Picture, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'

import type { TagInfo, AlbumInfo } from '@mindgallery/shared/src/types/api'
import type { CheckboxValueType, UploadFile} from 'element-plus'
import { uploadImages } from '@/api'
import { getTagList,deleteTag,createTag } from '@/api/modules/tag'
import { getAlbumList, createAlbum, addImagesToAlbum } from '@/api/modules/album'
import type { BatchUploadImageResponse } from '@mindgallery/shared/src/types/api'

// 上传相关状态
const fileList = ref<UploadFile[]>([])
const previewImages = ref<Array<{url: string, name: string, size: number, file: File, tags: string[]}>>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadRef = ref()

// 单张图片设置相关
const imageSettingsVisible = ref(false)
const currentImageIndex = ref(-1)
const currentImageTags = ref<string[]>([])
const currentTagInput = ref('')

// 打开单张图片设置
const openImageSettings = (index: number) => {
  currentImageIndex.value = index
  // 复制当前图片的标签
  currentImageTags.value = [...previewImages.value[index].tags]
  currentTagInput.value = ''
  imageSettingsVisible.value = true
}

// 保存单张图片设置
const saveImageSettings = () => {
  if (currentImageIndex.value > -1) {
    previewImages.value[currentImageIndex.value].tags = [...currentImageTags.value]
    ElMessage.success('图片标签已更新')
  }
  imageSettingsVisible.value = false
}

// 单张图片标签输入确认
const handleCurrentTagInputConfirm = async () => {
  const tagName = currentTagInput.value.trim()
  if (!tagName) return

  if (currentImageTags.value.includes(tagName)) {
    currentTagInput.value = ''
    return
  }

  // 检查是否在库中，不在则创建
  const existingTag = availableTags.value.find(tag => tag.name === tagName)
  if (!existingTag) {
    await createNewTag(tagName)
  }

  currentImageTags.value.push(tagName)
  currentTagInput.value = ''
}

// 移除单张图片的标签
const removeCurrentImageTag = (tag: string) => {
  const index = currentImageTags.value.indexOf(tag)
  if (index > -1) {
    currentImageTags.value.splice(index, 1)
  }
}

// 单张图片标签选择
const handleSelectCurrentTag = (item: SuggestionItem) => {
  if (!currentImageTags.value.includes(item.value)) {
    currentImageTags.value.push(item.value)
  }
  currentTagInput.value = ''
}

const isAdding = ref(false)
const selectedAlbums = ref<string[]>([])
const optionName = ref('')
const albums = ref<Array<{value: string, label: string}>>([])
const textarea = ref('')

const onAddOption = () => {
  isAdding.value = true
}

const onConfirm = async () => {
  if (optionName.value) {
    try {
      // 调用创建相册接口
      const response = await createAlbum({ name: optionName.value })
      if (response.success) {
        // 添加到列表并选中
        albums.value.push({
          label: response.data.name,
          value: response.data.id,
        })
        selectedAlbums.value.push(response.data.id)
        ElMessage.success('相册创建成功')
      } else {
        ElMessage.error(response.message || '创建相册失败')
      }
    } catch (error) {
      console.error('创建相册失败:', error)
      ElMessage.error('创建相册失败')
    } finally {
      clear()
    }
  }
}

const clear = () => {
  optionName.value = ''
  isAdding.value = false
}

const router = useRouter()

// 标签数据
const availableTags = ref<TagInfo[]>([])

// 推荐标签（取前20个热门标签）
const recommendedTags = computed(() => {
  return availableTags.value
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 20)
})

// 选中的标签
const selectedTags = ref<string[]>([])

// 自定义标签输入
const customTagInput = ref('')

interface SuggestionItem {
  value: string
  count?: number
}

// 标签搜索逻辑
const querySearch = (queryString: string, cb: (results: SuggestionItem[]) => void) => {
  const results = queryString
    ? availableTags.value
        .filter(tag => tag.name.toLowerCase().includes(queryString.toLowerCase()))
        .map(tag => ({ value: tag.name, count: tag.count }))
    : availableTags.value.slice(0, 50).map(tag => ({ value: tag.name, count: tag.count })) // 默认显示前50个

  cb(results)
}

// 选择下拉建议中的标签
const handleSelectTag = (item: SuggestionItem) => {
  if (!selectedTags.value.includes(item.value)) {
    selectedTags.value.push(item.value)
  }
  customTagInput.value = ''
}

// 回车或点击添加按钮确认输入
const handleInputConfirm = async () => {
  const tagName = customTagInput.value.trim()
  if (!tagName) return

  // 如果标签已存在于选中列表
  if (selectedTags.value.includes(tagName)) {
    customTagInput.value = ''
    return
  }

  // 检查标签是否在已有库中
  const existingTag = availableTags.value.find(tag => tag.name === tagName)

  if (!existingTag) {
    // 创建新标签
    await createNewTag(tagName)
  }

  // 添加到选中列表
  selectedTags.value.push(tagName)
  customTagInput.value = ''
}

// 创建新标签
const createNewTag = async (tagName: string) => {
  try {
    const response = await createTag(tagName)
    if (response.success && response.data) {
      // 添加到本地可用标签库
      availableTags.value.push(response.data)
      ElMessage.success(`新标签 "${tagName}" 创建成功`)
    } else {
      // 即使后端创建失败（可能已存在），也允许用户暂时使用
      console.warn('创建标签返回异常:', response)
    }
  } catch (error) {
    console.error('创建标签失败:', error)
    // 静默失败，不阻断用户操作
  }
}

// 移除已选标签
const removeSelectedTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  }
}

// 标签选中状态切换（用于推荐标签）
const onChangeTag = (tagName: string, checked: boolean) => {
  if (checked) {
    if (!selectedTags.value.includes(tagName)) {
      selectedTags.value.push(tagName)
    }
  } else {
    const index = selectedTags.value.indexOf(tagName)
    if (index > -1) {
      selectedTags.value.splice(index, 1)
    }
  }
}

// 移除旧的 addCustomTag 和 removeTag 方法，因为逻辑已重构
// ... (保留旧代码中的 fetchTagsFromAPI 等其他方法)// 组件挂载时从API获取标签和相册数据
onMounted(async () => {
  await Promise.all([
    fetchTagsFromAPI(),
    fetchAlbumsFromAPI()
  ])
})
//从API获取相册数据
const fetchAlbumsFromAPI = async () => {
  try {
    const response = await getAlbumList()
    if (response.success) {
      albums.value = response.data.map((album: AlbumInfo) => ({
        label: album.name,
        value: album.id
      }))
    }
  } catch (error) {
    console.error('获取相册列表失败:', error)
    ElMessage.error('获取相册列表失败')
  }
}

// 从API获取标签数据
const fetchTagsFromAPI = async () => {
  try {
    // 调用实际的API获取标签列表
    const response = await getTagList()
    if (response.success) {
      availableTags.value = response.data
    }
    console.log('标签数据加载完成:', response.data)
  } catch (error) {
    console.error('获取标签数据失败:', error)
    ElMessage.error('获取标签列表失败')
  }
}

// 文件上传相关函数

// 文件选择变化处理
const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    // 生成预览URL
    const previewUrl = URL.createObjectURL(file.raw)
    previewImages.value.push({
      url: previewUrl,
      name: file.name,
      size: file.size || 0,
      file: file.raw,
      tags: []
    })
  }
}

// 文件移除处理
const handleFileRemove = (file: UploadFile) => {
  const index = previewImages.value.findIndex(img => img.name === file.name)
  if (index > -1) {
    // 释放预览URL
    URL.revokeObjectURL(previewImages.value[index].url)
    previewImages.value.splice(index, 1)
  }
}

// 上传前验证
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 移除预览图片
const removePreviewImage = (index: number) => {
  // 先获取要移除的图片信息
  const imageToRemove = previewImages.value[index]

  // 释放预览URL
  URL.revokeObjectURL(imageToRemove.url)

  // 从预览数组中移除
  previewImages.value.splice(index, 1)

  // 同时从fileList中移除对应的文件
  const fileIndex = fileList.value.findIndex(file => file.name === imageToRemove.name)
  if (fileIndex > -1) {
    // 从fileList中移除文件
    fileList.value.splice(fileIndex, 1)

    // 强制重新赋值fileList以触发el-upload组件重新渲染
    fileList.value = [...fileList.value]
  }
}

// 上传图片
const handleUpload = async () => {
  if (previewImages.value.length === 0) {
    ElMessage.warning('请先选择要上传的图片')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  const loading = ElLoading.service({
    lock: true,
    text: '上传中...',
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    // 构造 metadata
    const metadata: Record<string, { tags: string[] }> = {}
    const files: File[] = []

    previewImages.value.forEach(image => {
      files.push(image.file)
      if (image.tags && image.tags.length > 0) {
        metadata[image.file.name] = { tags: image.tags }
      }
    })

    // 模拟上传进度
    const progressInterval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 90) {
        clearInterval(progressInterval)
      }
    }, 200)

    // 调用上传API
    const result = await uploadImages(files, {
      tags: selectedTags.value,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      description: textarea.value.trim()
    })

    clearInterval(progressInterval)
    uploadProgress.value = 100

    // 处理上传结果，确保类型安全
    let uploadedCount = 0
    let uploadedImageIds: string[] = []

    if (result.success) {
      // 根据文件数量判断是单张还是批量上传
      if (files.length === 1) {
        // 单张上传，result.data 是单个 ImageInfo
        uploadedCount = 1
        uploadedImageIds = [(result.data as any).id]
      } else {
        // 批量上传，result.data 是 ImageInfo[]
        uploadedCount = (result as BatchUploadImageResponse).data.length
        uploadedImageIds = (result as BatchUploadImageResponse).data.map(img => img.id)
      }

      // 关联相册
      if (selectedAlbums.value.length > 0 && uploadedImageIds.length > 0) {
        try {
          await Promise.all(selectedAlbums.value.map(albumId =>
            addImagesToAlbum(albumId, uploadedImageIds)
          ))
          ElMessage.success(`成功上传 ${uploadedCount} 张图片并添加到相册`)
        } catch (albumError) {
          console.error('关联相册失败:', albumError)
          ElMessage.warning(`图片上传成功，但关联相册失败`)
        }
      } else {
        ElMessage.success(`成功上传 ${uploadedCount} 张图片`)
      }

      // 清空上传状态
      previewImages.value.forEach(image => URL.revokeObjectURL(image.url))
      previewImages.value = []
      fileList.value = []
      selectedTags.value = []
      selectedAlbums.value = []
      textarea.value = ''

      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      throw new Error(result.message || '上传失败')
    }
  } catch (error) {
    console.error('上传错误:', error)
    ElMessage.error(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    loading.close()
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 获取当前选中的标签（供其他组件使用）
const getSelectedTags = () => {
  return [...selectedTags.value]
}

// 清空所有选中的标签
const clearSelectedTags = () => {
  selectedTags.value = []
  ElMessage.info('已清空所有选中的标签')
}

// 暴露方法给模板使用
defineExpose({
  getSelectedTags,
  clearSelectedTags
})

</script>


<style scoped lang="scss">
@use 'sass:color';
@use 'sass:map';
@use '@/assets/scss/variables.scss' as *;

.upload-image-view {
  padding: 1rem;
  min-height: 100vh;
  background: linear-gradient(135deg, $winter-sky-1 0%, $winter-sky-2 100%);

  @media (min-width: 768px) {
    padding: 2rem;
  }

  .header {
    margin-bottom: 1.5rem;

    @media (min-width: 768px) {
      margin-bottom: 2rem;
    }

    .button {
      .el-button {
        border-radius: 20px;
        padding: 10px 20px;
        font-weight: 600;
        box-shadow: $active-shadow;
        border: 1px solid $active-border-color;
        background: linear-gradient(135deg, $active-background 0%, $active-hover-bg 100%);
        color: $active-color;
        transition: $transition-base;

        @media (min-width: 768px) {
          padding: 12px 24px;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba($active-color, 0.3);
          background: linear-gradient(135deg, $active-hover-bg 0%, color.adjust($active-hover-bg, $lightness: -5%) 100%);
        }

        &:active,
        &.is-active {
          background: map.get(map.get($active-states, "primary"), "background");
          color: map.get(map.get($active-states, "primary"), "color");
          border-color: map.get(map.get($active-states, "primary"), "border");
          transform: translateY(0);
        }
      }
    }
  }

  .upload {
    background: $white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 20px rgba($winter-sky-5, 0.08);
    border: 1px solid $gray-200;

    @media (min-width: 768px) {
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    .upload-content {
      margin-bottom: 1rem;

      @media (min-width: 768px) {
        margin-bottom: 1.5rem;
      }

      .el-upload {
        width: 100%;

        .el-upload-dragger {
          width: 100%;
          border: 2px dashed $winter-sky-5;
          background: rgba($winter-sky-5, 0.05);
          border-radius: 12px;
          transition: all 0.3s ease;
          padding: 2rem 1rem;

          @media (min-width: 768px) {
            padding: 3rem 2rem;
          }

          &:hover {
            border-color: $success-color;
            background: rgba($success-color, 0.05);
          }

          .el-icon--upload {
            color: $winter-sky-5;
            font-size: 36px;
            margin-bottom: 0.75rem;

            @media (min-width: 768px) {
              font-size: 48px;
              margin-bottom: 1rem;
            }
          }

          .el-upload__text {
            font-size: 14px;
            color: $gray-600;

            @media (min-width: 768px) {
              font-size: 16px;
            }

            em {
              color: $winter-sky-5;
              font-weight: 600;
            }
          }
        }
      }
    }

    .preview {
      background: $white;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid $gray-200;
      margin-top: 1rem;

      @media (min-width: 768px) {
        padding: 2rem;
        margin-top: 1.5rem;
      }

      .preview-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;

        .text-medium {
          font-size: 1.125rem;
          color: $gray-800;
        }
      }

      .preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;

        @media (min-width: 768px) {
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .preview-item {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: $transition-base;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);

            .remove-btn {
              opacity: 1;
            }
          }

          img {
            width: 100%;
            height: 120px;
            object-fit: cover;
            display: block;

            @media (min-width: 768px) {
              height: 150px;
            }
          }

          .preview-info {
            padding: 0.75rem;
            background: $gray-100;

            .file-name {
              display: block;
              font-size: 0.875rem;
              font-weight: 500;
              color: $gray-700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .file-size {
              display: block;
              font-size: 0.75rem;
              color: $gray-500;
              margin-top: 0.25rem;
            }
          }

          .remove-btn {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            opacity: 0;
            transition: $transition-base;
            width: 24px;
            height: 24px;

            &:hover {
              opacity: 1;
            }
          }
        }
      }
    }

    .preview-placeholder {
      background: $gray-100;
      border-radius: 8px;
      padding: 2rem;
      min-height: 150px;
      border: 1px solid $gray-200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: $gray-500;
      font-size: 14px;
      margin-top: 1rem;

      @media (min-width: 768px) {
        padding: 3rem;
        min-height: 200px;
        font-size: 16px;
        margin-top: 1.5rem;
      }

      .placeholder-icon {
        font-size: 48px;
        color: $gray-400;
        margin-bottom: 1rem;

        @media (min-width: 768px) {
          font-size: 64px;
          margin-bottom: 1.5rem;
        }
      }

      .placeholder-text {
        font-weight: 500;
        text-align: center;
      }
    }
  }

  .metadata-container {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background: white;
    border-radius: 12px;
    border: 1px solid #e8e8e8;
  }


  .label {
    padding: 1rem;

    @media (min-width: 768px) {
      padding-left: 1.5rem;
    }

    .tag-search-container {
      margin-bottom: 1rem;

      .tag-input {
        width: 100%;
        max-width: 300px;
      }
    }

    .section-title {
      font-size: 14px;
      color: $gray-600;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .recommend-tag-item {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: $active-color;
      }
    }
  }

  .album {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
    @media (min-width: 768px) {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }

    .el-select {
      width: 100%;

      @media (min-width: 768px) {
        width: 240px;
      }

      .el-input__wrapper {
         border-radius: 20px;
         border: 1px solid $gray-200;

         &:hover {
           border-color: $winter-sky-5;
         }
       }

      .el-select-dropdown {
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

        .el-button {
          border-radius: 16px;
          margin: 4px 8px;
          transition: $transition-base;

          &:hover {
            background: $active-background;
            color: $active-color;
            border-color: $active-border-color;
            transform: translateY(-1px);
            box-shadow: $active-shadow;
          }

          &.el-button--primary {
            background: linear-gradient(135deg, $active-background, $active-hover-bg);
            border-color: $active-border-color;
            color: $active-color;

            &:hover {
              background: linear-gradient(135deg, $active-hover-bg, color.adjust($active-hover-bg, $lightness: -5%));
              transform: translateY(-1px);
            }
          }
        }
      }
    }
  }

  .description {
    @media (min-width: 768px) {
      padding: 1.5rem;

    }

    .el-textarea {
      .el-textarea__inner {
        border-radius: 12px;
        border: 1px solid $gray-200;
        resize: vertical;
        min-height: 100px;

        @media (min-width: 768px) {
          min-height: 120px;
        }

        &:hover {
          border-color: $winter-sky-5;
        }

        &:focus {
          border-color: $winter-sky-5;
          box-shadow: 0 0 0 2px rgba($winter-sky-5, 0.2);
        }
      }
    }
  }

  .tag-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 10;
  }
}

.image-settings-content {
    .current-image-preview {
    text-align: center;
    margin-bottom: 1.5rem;
    img {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    }

    .current-image-tags {
    .section-title {
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: $gray-700;
    }
    .tags-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
        min-height: 32px;
    }
    .tag-input {
        width: 100%;
    }
    }
}
</style>
