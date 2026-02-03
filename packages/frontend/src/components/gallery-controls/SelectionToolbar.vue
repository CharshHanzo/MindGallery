<template>
  <div class="selection-toolbar" v-if="effectiveSelectionMode">
    <div class="selection-toolbar__content">
      <!-- 选择计数 -->
      <div class="selection-toolbar__count">
        已选择 {{ selectedCount }} 张照片
      </div>

      <!-- 操作按钮组 -->
      <div class="selection-toolbar__actions">
        <!-- 内置操作按钮 -->
        <template v-if="showDefaultActions">
          <!-- 批量删除 -->
          <el-button
            v-if="showDelete"
            type="danger"
            :icon="Delete"
            @click="handleBatchDelete"
          >
            删除
          </el-button>

          <!-- 批量收藏 -->
          <el-button
            v-if="showFavorite"
            type="primary"
            :icon="Star"
            @click="handleBatchFavorite"
          >
            收藏
          </el-button>

          <!-- 添加到相册 -->
          <el-button
            v-if="showAddToAlbum"
            type="primary"
            :icon="CollectionTag"
            @click="$emit('show-add-to-album')"
          >
            添加到相册
          </el-button>
        </template>

        <!-- 自定义操作按钮插槽 -->
        <slot name="actions"></slot>

        <!-- 取消选择按钮 -->
        <el-button
          @click="handleCancelSelection"
        >
          取消
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { Delete, Star, CollectionTag } from '@element-plus/icons-vue'

/**
 * 注入的搜索状态接口
 * 与HomeView.vue中provide的状态结构匹配
 */
interface SearchState {
  searchQuery: any
  handleSearch: () => void
  selectionMode: any
  toggleSelectionMode: () => void
}

/**
 * 组件的Props接口
 * 支持通过props传入状态，优先于inject获取的状态
 */
interface SelectionToolbarProps {
  // 选择状态（优先使用）
  selectionMode?: boolean
  selectedIds?: string[]
  selectedCount?: number

  // 操作按钮配置
  showDefaultActions?: boolean
  showDelete?: boolean
  showFavorite?: boolean
  showAddToAlbum?: boolean
}

/**
 * 组件的Emits接口
 * 定义组件触发的事件
 */
interface SelectionToolbarEmits {
  (e: 'batch-delete', ids: string[]): void
  (e: 'batch-favorite', ids: string[]): void
  (e: 'show-add-to-album'): void
  (e: 'cancel-selection'): void
}

// 声明组件的Props
const props = withDefaults(defineProps<SelectionToolbarProps>(), {
  selectionMode: undefined,
  selectedIds: () => [],
  selectedCount: 0,
  showDefaultActions: true,
  showDelete: true,
  showFavorite: true,
  showAddToAlbum: true
})

// 声明组件的Emits
const emit = defineEmits<SelectionToolbarEmits>()

// 尝试从inject获取状态（作为fallback）
const searchState = inject<SearchState>('searchState')
const injectedSelectionMode = searchState?.selectionMode
const injectedToggleSelectionMode = searchState?.toggleSelectionMode

/**
 * 计算最终使用的选择模式状态
 * 优先使用props传入的状态，fallback到inject获取的状态
 */
const effectiveSelectionMode = computed(() => {
  // 优先使用props传入的状态
  if (props.selectionMode !== undefined) {
    return props.selectionMode
  }
  // fallback到inject获取的状态
  return injectedSelectionMode?.value || false
})

/**
 * 处理批量删除操作
 * 触发batch-delete事件，传递选中的ID
 */
const handleBatchDelete = () => {
  emit('batch-delete', props.selectedIds)
}

/**
 * 处理批量收藏操作
 * 触发batch-favorite事件，传递选中的ID
 */
const handleBatchFavorite = () => {
  emit('batch-favorite', props.selectedIds)
}

/**
 * 处理取消选择操作
 * 优先调用props传入的回调，fallback到inject获取的函数，最后触发事件
 */
const handleCancelSelection = () => {
  // 优先使用inject获取的toggleSelectionMode函数
  if (injectedToggleSelectionMode) {
    injectedToggleSelectionMode()
  }
  // 触发cancel-selection事件
  emit('cancel-selection')
}
</script>

<style scoped lang="scss">
.selection-toolbar {
  background-color: #f8f8f8;
  border-bottom: 1px solid #eaeaea;
  padding: 12px 20px;
  margin-bottom: 16px;

  &__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__count {
    font-size: 14px;
    color: var(--el-text-color-primary);
    font-weight: 500;
  }

  &__actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}
</style>
