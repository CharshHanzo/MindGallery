<template>
  <div class="search-wrapper">
    <el-icon class="search-icon"><Search /></el-icon>
    <el-input
      v-model="searchQuery"
      :placeholder="placeholder"
      class="search-input"
      clearable
      @keyup.enter="handleSearch"
      @clear="handleSearch"
    >
    </el-input>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

/**
 * 搜索控制组件
 * 封装搜索输入框，支持v-model双向绑定和搜索事件
 */

/**
 * 组件的Props接口
 */
interface SearchControlProps {
  // 搜索查询字符串
  modelValue?: string
  // 占位符文本
  placeholder?: string
  // 搜索框宽度
  width?: string
}

/**
 * 组件的Emits接口
 */
interface SearchControlEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
}

// 声明组件的Props
const props = withDefaults(defineProps<SearchControlProps>(), {
  modelValue: '',
  placeholder: '搜索照片...',
  width: '380px'
})

// 声明组件的Emits
const emit = defineEmits<SearchControlEmits>()

// 内部搜索查询状态
const searchQuery = ref(props.modelValue)

// 监听外部modelValue变化，更新内部状态
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined) {
      searchQuery.value = newValue
    }
  }
)

// 监听内部searchQuery变化，触发update:modelValue事件
watch(
  searchQuery,
  (newValue) => {
    emit('update:modelValue', newValue)
  }
)

// 处理搜索事件
const handleSearch = () => {
  emit('search', searchQuery.value)
}
</script>

<style scoped lang="scss">
.search-wrapper {
  position: relative;
  width: v-bind(width);

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    font-size: 14px;
    z-index: 1;
  }

  .search-input {
    width: 100% !important;
    background-color: #f2f2f7 !important;
    border: none !important;
    padding: 8px 12px 8px 0 !important;
    border-radius: 10px !important;
    font-size: 14px !important;
    outline: none !important;
    box-shadow: none !important;
    height: auto !important;
    line-height: normal !important;
    transition: none !important;

    &:hover,
    &:focus {
      background-color: #f2f2f7 !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }
  }

  /* 覆盖 Element Plus 输入框样式 */
  :deep(.el-input__wrapper) {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  :deep(.el-input__inner) {
    background-color: #f2f2f7 !important;
    border: none !important;
    padding: 8px 12px 8px 36px !important;
    border-radius: 10px !important;
    font-size: 14px !important;
    outline: none !important;
    box-shadow: none !important;
    height: auto !important;
    line-height: normal !important;
  }

  :deep(.el-input__inner:hover),
  :deep(.el-input__inner:focus) {
    background-color: #f2f2f7 !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
  }

  /* 覆盖清除按钮样式 */
  :deep(.el-input__clear) {
    color: var(--text-secondary) !important;
    font-size: 14px !important;
  }

  :deep(.el-input__clear:hover) {
    color: var(--text-primary) !important;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-wrapper {
    width: 100% !important;
  }
}
</style>