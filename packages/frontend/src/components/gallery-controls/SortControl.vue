<template>
  <div class="sort-control" @click="toggleSortOrder">
    <i class="fa-solid" :class="sortOrder === 'desc' ? 'fa-arrow-down-short-wide' : 'fa-arrow-up-wide-short'"></i>
    <span>{{ sortOrder === 'desc' ? '最新在前' : '最早在前' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// 定义组件的Props接口
interface SortControlProps {
  modelValue?: 'asc' | 'desc'
}

// 定义组件的Emits接口
interface SortControlEmits {
  (e: 'update:modelValue', value: 'asc' | 'desc'): void
  (e: 'sort-change', order: 'asc' | 'desc'): void
}

// 声明组件的Props
const props = withDefaults(defineProps<SortControlProps>(), {
  modelValue: 'desc'
})

// 声明组件的Emits
const emit = defineEmits<SortControlEmits>()

// 内部状态，用于控制排序顺序
const sortOrder = ref<'asc' | 'desc'>(props.modelValue)

// 监听外部传入的modelValue变化，更新内部状态
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      sortOrder.value = newValue
    }
  }
)

// 监听内部sortOrder变化，触发update:modelValue事件
watch(
  sortOrder,
  (newValue) => {
    emit('update:modelValue', newValue)
    emit('sort-change', newValue)
  }
)

// 切换排序顺序
const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}
</script>

<style scoped lang="scss">
.sort-control {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--el-text-color-primary);
  font-size: 14px;

  &:hover {
    color: var(--el-color-primary);
  }

  i {
    font-size: 14px;
  }

  span {
    user-select: none;
  }
}
</style>
