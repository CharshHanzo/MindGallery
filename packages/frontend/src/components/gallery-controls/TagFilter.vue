<template>
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
      :loading="loading"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TagInfo } from '@mindgallery/shared/src/types/api'

// 定义组件的Props接口
interface TagFilterProps {
  modelValue?: string[]
  availableTags?: TagInfo[]
  loading?: boolean
}

// 定义组件的Emits接口
interface TagFilterEmits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'tag-change', value: string[]): void
}

// 声明组件的Props
const props = withDefaults(defineProps<TagFilterProps>(), {
  modelValue: () => [],
  availableTags: () => [],
  loading: false
})

// 声明组件的Emits
const emit = defineEmits<TagFilterEmits>()

// 内部状态，用于控制选中的标签
const selectedTags = ref<string[]>(props.modelValue)

// 监听外部传入的modelValue变化，更新内部状态
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      selectedTags.value = newValue
    }
  }
)

// 监听内部selectedTags变化，触发update:modelValue事件
watch(
  selectedTags,
  (newValue) => {
    emit('update:modelValue', newValue)
    emit('tag-change', newValue)
  }
)

// 处理标签变化
const handleTagChange = (value: string[]) => {
  selectedTags.value = value
}
</script>

<style scoped lang="scss">
.tag-filter {
  margin-bottom: 16px;

  .tag-select {
    width: 100%;
  }
}
</style>
