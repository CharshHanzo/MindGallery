<template>
  <div 
    class="directory-picker p-6 border-2 border-dashed rounded-lg transition-colors duration-200"
    :class="[
      isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400',
      status === 'error' ? 'border-red-500 bg-red-50' : '',
      status === 'loading' ? 'opacity-75 cursor-wait' : ''
    ]"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <!-- 主要内容区域 -->
    <div class="flex flex-col items-center justify-center text-center space-y-4">
      
      <!-- 图标状态 -->
      <div class="icon-wrapper text-4xl mb-2">
        <span v-if="status === 'loading'" class="animate-spin inline-block">⏳</span>
        <span v-else-if="status === 'error'">❌</span>
        <span v-else-if="status === 'success'">✅</span>
        <span v-else>📁</span>
      </div>

      <!-- 文本提示 -->
      <div class="text-content">
        <h3 class="text-lg font-medium text-gray-900">
          {{ titleText }}
        </h3>
        <p class="text-sm text-gray-500 mt-1">
          {{ subtitleText }}
        </p>
      </div>

      <!-- 已选路径显示 (Electron) -->
      <div v-if="selectedPath" class="path-display bg-gray-100 px-3 py-1 rounded text-sm font-mono break-all max-w-full">
        {{ selectedPath }}
      </div>

      <!-- 操作按钮区域 -->
      <div class="actions flex gap-3 mt-4">
        <!-- Electron: 原生按钮 -->
        <template v-if="isElectron">
          <button 
            @click="triggerSelection" 
            :disabled="status === 'loading'"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {{ buttonText }}
          </button>
        </template>

        <!-- Web: 文件输入框降级 -->
        <template v-else>
          <label class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition">
            {{ buttonText }}
            <input 
              type="file" 
              webkitdirectory 
              directory 
              multiple 
              class="hidden" 
              @change="handleWebSelect"
              :accept="allowedExtensions?.join(',')"
            >
          </label>
        </template>

        <!-- 重新选择/清除按钮 -->
        <button 
          v-if="selectedPath || fileCount > 0" 
          @click="clearSelection"
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
        >
          清除
        </button>
      </div>

      <!-- 进度/统计信息 -->
      <div v-if="status === 'loading' || status === 'success'" class="stats text-sm text-gray-600 mt-2">
        <div v-if="status === 'loading'">
          正在扫描: {{ processedCount }} / {{ totalCount || '?' }}
        </div>
        <div v-else>
          已找到 {{ fileCount }} 个图片文件
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMsg" class="error-msg text-red-600 text-sm mt-2">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useEnvironment } from '@/composables/useEnvironment';
import { universalApi } from '@/api';
import type { FileInfo } from '@mindgallery/shared/dist/electron-api';

// --- Props & Emits ---
interface Props {
  initialPath?: string;
  allowedExtensions?: string[]; // e.g. ['.jpg', '.png']
  autoImport?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowedExtensions: () => ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'],
  autoImport: false
});

const emit = defineEmits<{
  (e: 'selected', payload: { path: string; fileCount: number }): void;
  (e: 'import-started', payload: { path: string }): void;
  (e: 'import-progress', payload: { processed: number; total: number }): void;
  (e: 'import-completed', payload: { path: string; importedCount: number }): void;
  (e: 'error', payload: { message: string; error?: any }): void;
}>();

// --- State ---
const { isElectron, isWeb } = useEnvironment();
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const selectedPath = ref(props.initialPath || '');
const fileCount = ref(0);
const processedCount = ref(0);
const totalCount = ref(0);
const errorMsg = ref('');
const isDragging = ref(false);
let scanCleanup: (() => void) | null = null;

// --- Computed Text ---
const titleText = computed(() => {
  if (status.value === 'loading') return '正在扫描目录...';
  if (status.value === 'success') return '扫描完成';
  if (selectedPath.value) return '已选择目录';
  return isElectron ? '点击或拖拽文件夹到此处' : '选择图片文件夹';
});

const subtitleText = computed(() => {
  if (status.value === 'error') return '请重试';
  if (selectedPath.value) return '可重新选择其他目录';
  return `支持格式: ${props.allowedExtensions.join(', ')}`;
});

const buttonText = computed(() => {
  return selectedPath.value ? '更改目录' : '选择目录';
});

// --- Methods ---

// 1. Core Selection Logic (Electron)
const triggerSelection = async () => {
  if (status.value === 'loading') return;
  resetState();

  try {
    const path = await universalApi.selectDirectory();
    if (path) {
      await handlePathSelected(path);
    }
  } catch (err: any) {
    handleError('选择目录失败', err);
  }
};

// 2. Core Selection Logic (Web Fallback)
const handleWebSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  resetState();
  status.value = 'loading';
  
  try {
    // Web FileList processing
    const files = Array.from(input.files);
    totalCount.value = files.length;
    
    // Filter images
    const imageFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return props.allowedExtensions.includes(ext);
    });

    // Simulate scanning delay for UX
    for (let i = 0; i < imageFiles.length; i++) {
      processedCount.value = i + 1;
      // In a real app, you might upload here or parse metadata
      if (i % 50 === 0) await new Promise(r => setTimeout(r, 0)); 
    }

    selectedPath.value = 'Web Upload Session'; // Mock path
    fileCount.value = imageFiles.length;
    status.value = 'success';
    
    emit('selected', { path: selectedPath.value, fileCount: fileCount.value });
    
    if (props.autoImport) {
      // Trigger Web Import Flow
      emit('import-completed', { path: selectedPath.value, importedCount: fileCount.value });
    }

  } catch (err: any) {
    handleError('读取文件失败', err);
  } finally {
    // Clear input so same directory can be selected again
    input.value = '';
  }
};

// 3. Shared Path Handling (Electron mostly)
const handlePathSelected = async (path: string) => {
  selectedPath.value = path;
  status.value = 'loading';
  fileCount.value = 0;
  processedCount.value = 0;
  totalCount.value = 0; // Unknown initially for directory scan

  emit('import-started', { path });

  try {
    // Setup progress listener
    if (scanCleanup) scanCleanup();
    scanCleanup = universalApi.onScanProgress((progress) => {
      processedCount.value = progress.processed;
      if (progress.total) totalCount.value = progress.total;
      emit('import-progress', { processed: progress.processed, total: progress.total || 0 });
    });

    // Start scan
    const response = await universalApi.readDirectory(path);
    // Handle IpcResponse wrapper if present (depending on how IPC is structured)
    // The shared interface says readDirectory returns Promise<FileInfo[]>
    // But handlers.ts wraps it in IpcResponse<FileInfo[]>
    // Let's handle both for safety
    
    let files: FileInfo[] = [];
    if (Array.isArray(response)) {
      files = response;
    } else if ((response as any).success && Array.isArray((response as any).data)) {
      files = (response as any).data;
    } else if ((response as any).error) {
       throw new Error((response as any).error);
    }
    
    fileCount.value = files.length;
    status.value = 'success';
    
    emit('selected', { path, fileCount: files.length });
    
    if (props.autoImport) {
      emit('import-completed', { path, importedCount: files.length });
    }
  } catch (err: any) {
    // Extract actual error message from IpcResponse object if it was passed as error
    const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
    handleError('扫描目录失败', { message: msg });
  } finally {
    if (scanCleanup) {
      scanCleanup();
      scanCleanup = null;
    }
  }
};

// 4. Drag & Drop Support
const handleDragEnter = () => { isDragging.value = true; };
const handleDragLeave = () => { isDragging.value = false; };

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false;
  if (!e.dataTransfer?.files.length) return;

  // Electron: Get path from first file (if it's a directory)
  if (isElectron) {
    // Electron adds 'path' property to File object
    const droppedFile = e.dataTransfer.files[0] as any;
    if (droppedFile.path) {
      // Check if it's a directory (simple check, or use IPC to verify)
      // For now we assume if it has no extension it might be a dir, 
      // or we just pass it to readDirectory which validates it.
      await handlePathSelected(droppedFile.path);
    }
  } else {
    // Web: Handle as standard file drop
    // Similar to handleWebSelect logic
    // (Simplified for brevity)
    handleError('Web模式暂不支持拖拽目录扫描，请使用选择按钮', null);
  }
};

// Helper
const resetState = () => {
  status.value = 'idle';
  errorMsg.value = '';
  processedCount.value = 0;
  fileCount.value = 0;
};

const clearSelection = () => {
  resetState();
  selectedPath.value = '';
};

const handleError = (msg: string, err: any) => {
  console.error(msg, err);
  status.value = 'error';
  errorMsg.value = msg + (err?.message ? `: ${err.message}` : '');
  emit('error', { message: msg, error: err });
};

// Lifecycle
onUnmounted(() => {
  if (scanCleanup) scanCleanup();
});
</script>

<style scoped>
/* Scoped styles if Tailwind is not enough */
.cursor-wait {
  cursor: wait;
}
</style>
