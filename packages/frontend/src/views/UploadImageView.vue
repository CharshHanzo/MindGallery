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
          >
            <img :src="image.url" :alt="image.name" />
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
        <br>
            <div class="label-content" v-for="tag in availableTags" :key="tag.id">
              <el-check-tag
                :checked="selectedTags.includes(tag.name)"
                type="primary"
                @change="(checked: boolean) => onChangeTag(tag.name, checked)"
                round
              >
                {{ tag.name }} ({{ tag.count }})
              </el-check-tag>
            </div>

            <!-- 自定义标签输入 -->
            <div class="custom-tag-input">
              <el-input
                v-model="customTagInput"
                placeholder="输入自定义标签"
                size="small"
                style="width: 200px; margin-right: 10px;"
                @keyup.enter="addCustomTag"
              >
                <template #append>
                  <el-button @click="addCustomTag" :disabled="!customTagInput.trim()">
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </template>
              </el-input>
                <el-button type="primary" @click="clearSelectedTags">清空</el-button>
            </div>

            </div>
            <div class="album">
              <span class="text-large font-600 mr-3"> 照片集 </span>
              <br>
            <el-select v-model="value" placeholder="Select" style="width: 240px" filterable>
          <el-option
            v-for="item in cities"
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

</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { Plus, Close, Picture, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'

import type { TagInfo } from '@mindgallery/shared/src/types/api'
import type { CheckboxValueType, UploadFile} from 'element-plus'
import { uploadImages } from '@/api'

// 上传相关状态
const fileList = ref<UploadFile[]>([])
const previewImages = ref<Array<{url: string, name: string, size: number, file: File}>>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadRef = ref()

const isAdding = ref(false)
const value = ref<CheckboxValueType[]>([])
const optionName = ref('')
const cities = ref([
  {
    value: 'city',
    label: '城市',
  },
  {
    value: 'car',
    label: '汽车',
  },
])
const textarea = ref('')
const onAddOption = () => {
  isAdding.value = true
}

const onConfirm = () => {
  if (optionName.value) {
    cities.value.push({
      label: optionName.value,
      value: optionName.value,
    })
    clear()
  }
}

const clear = () => {
  optionName.value = ''
  isAdding.value = false
}

const router = useRouter()

// 标签数据
const availableTags = ref<TagInfo[]>([
  { id: 'tag-5rW35pWt', name: '风景', count: 15 },
  { id: 'tag-5Lq65rW0', name: '人物', count: 8 },
  { id: 'tag-5a6e5Yqb', name: '建筑', count: 12 },
  { id: 'tag-5pWw5a2m', name: '动物', count: 6 },
  { id: 'tag-6Z2e5bqX', name: '美食', count: 9 },
  { id: 'tag-6L+Z5piv', name: '旅行', count: 11 },
  { id: 'tag-5Yid5pW0', name: '艺术', count: 7 },
  { id: 'tag-57uR5bqX', name: '科技', count: 5 },
  { id: 'tag-6L+Z5LuO', name: '运动', count: 4 },
  { id: 'tag-55CG6KGo', name: '生活', count: 13 }
])

// 选中的标签
const selectedTags = ref<string[]>([])

// 自定义标签输入
const customTagInput = ref('')

// 组件挂载时从API获取标签数据
onMounted(async () => {
  await fetchTagsFromAPI()
})

// 从API获取标签数据
const fetchTagsFromAPI = async () => {
  try {
    // 这里应该调用实际的API
    // const response = await fetch('/api/tags')
    // const data = await response.json()
    // if (data.success) {
    //   availableTags.value = data.data
    // }

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 这里使用模拟数据，实际开发中应该使用上面的API调用
    console.log('标签数据加载完成')
  } catch (error) {
    console.error('获取标签数据失败:', error)
  }
}

// 标签选中状态切换
const onChangeTag = (tagName: string, checked: boolean) => {
  if (checked) {
    // 添加标签到选中列表
    if (!selectedTags.value.includes(tagName)) {
      selectedTags.value.push(tagName)
    }
  } else {
    // 从选中列表中移除标签
    const index = selectedTags.value.indexOf(tagName)
    if (index > -1) {
      selectedTags.value.splice(index, 1)
    }
  }

  console.log('当前选中的标签:', selectedTags.value)
}

// 添加自定义标签
const addCustomTag = () => {
  const tagName = customTagInput.value.trim()

  if (!tagName) {
    ElMessage.warning('请输入标签名称')
    return
  }

  // 检查标签是否已存在
  const existingTag = availableTags.value.find(tag => tag.name === tagName)
  if (existingTag) {
    ElMessage.warning(`标签"${tagName}"已存在`)
    return
  }

  // 添加新标签
  const newTag: TagInfo = {
    id: Date.now().toString(),
    name: tagName,
    count:0
  }

  availableTags.value.push(newTag)

  // 自动选中新添加的标签
  selectedTags.value.push(tagName)

  // 清空输入框
  customTagInput.value = ''
  console.log('添加新标签:', newTag)
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
      file: file.raw
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
    const formData = new FormData()

    // 添加图片文件
    previewImages.value.forEach(image => {
      formData.append('files', image.file)
    })

    // 添加元数据
    if (selectedTags.value.length > 0) {
      formData.append('tags', JSON.stringify(selectedTags.value))
    }
    if (value.value) {
      formData.append('albumId', value.value.toString())
    }
    if (textarea.value.trim()) {
      formData.append('description', textarea.value.trim())
    }

    // 模拟上传进度
    const progressInterval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 90) {
        clearInterval(progressInterval)
      }
    }, 200)

    // 调用上传API
    // 将 FormData 拆解为 File[] 以匹配 uploadImages 接口
    const files: File[] = []
    previewImages.value.forEach(image => files.push(image.file))
    const result = await uploadImages(files, {
      tags: selectedTags.value,
      albumId: value.value ? value.value.toString() : undefined,
      description: textarea.value.trim()
    })

    clearInterval(progressInterval)
    uploadProgress.value = 100

    if (result.success) {
      ElMessage.success(`成功上传 ${result.data.length} 张图片`)

      // 清空上传状态
      previewImages.value.forEach(image => URL.revokeObjectURL(image.url))
      previewImages.value = []
      fileList.value = []
      selectedTags.value = []
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

    .label-content {
      margin-bottom: 0.5rem;
      display: inline-block;
      margin-right: 0.5rem;

      @media (min-width: 768px) {
        margin-bottom: 0.75rem;
        margin-right: 0.75rem;
      }

      .el-check-tag {
        border-radius: 16px;
        padding: 6px 12px;
        font-weight: 500;
        transition: $transition-base;
        border: 1px solid $gray-200;
        font-size: 12px;
        background: $white;
        color: $gray-700;

        @media (min-width: 768px) {
          padding: 8px 16px;
          font-size: 14px;
        }

        &:hover {
          transform: translateY(-1px);
          box-shadow: $active-shadow;
          border-color: $active-border-color;
          color: $active-color;
        }

        &.is-checked {
          background: linear-gradient(135deg, $active-background, $active-hover-bg);
          border-color: $active-border-color;
          color: $active-color;
          box-shadow: $active-shadow;

          &:hover {
            background: linear-gradient(135deg, $active-hover-bg, color.adjust($active-hover-bg, $lightness: -5%));
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba($active-color, 0.3);
          }
        }
      }
    }

    .custom-tag-input {
      margin-top: 1rem;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;

      @media (min-width: 768px) {
        margin-top: 1.5rem;
        gap: 0.75rem;
      }

      .el-input {
        width: 100%;
        max-width: 200px;

        @media (min-width: 768px) {
          width: auto;
        }

        .el-input__wrapper {
          border-radius: 20px;
          border: 1px solid $gray-200;

          &:hover {
            border-color: $winter-sky-5;
          }
        }
      }

      .el-button {
        border-radius: 20px;
        transition: $transition-base;

        &:disabled {
          opacity: 0.6;
        }

        // 自定义标签按钮的激活状态
        &:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: $active-shadow;
        }

        &:active,
        &.is-active {
          background: $active-background;
          color: $active-color;
          border-color: $active-border-color;
          transform: translateY(0);
        }
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
}

</style>
