<template>
  <div class="test-page p-8 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Directory Picker Component Test</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Component Container -->
      <div class="component-section">
        <h2 class="text-xl font-semibold mb-4">Component Instance</h2>
        <DirectoryPicker
          :auto-import="false"
          @selected="handleSelected"
          @import-started="handleStarted"
          @import-progress="handleProgress"
          @error="handleError"
        />
      </div>

      <!-- Logs/Debug Section -->
      <div class="debug-section bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-auto font-mono text-sm">
        <h2 class="text-white border-b border-gray-700 pb-2 mb-2 sticky top-0 bg-gray-900">Event Logs</h2>
        <div v-for="(log, i) in logs" :key="i" class="mb-1">
          <span class="text-gray-500">[{{ log.time }}]</span> {{ log.msg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import DirectoryPicker from '@/components/adapters/DirectoryPicker.vue';
import { universalApi } from '@/api';
import { useEnvironment } from '@/composables/useEnvironment';

const { isElectron } = useEnvironment();
const logs = ref<{time: string, msg: string}[]>([]);
let uploadCleanup: (() => void) | null = null;

const addLog = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, msg });
};

const handleSelected = async (payload: { path: string; fileCount: number }) => {
  addLog(`✅ Selected: ${payload.path} (${payload.fileCount} files)`);

  if (!isElectron) {
    addLog('⚠️ Web mode: Direct folder upload not supported. Using legacy file input.');
    return;
  }

  // Start Direct Import Process (Electron Side)
  addLog('🚀 Starting direct backend upload via Electron...');

  try {
    // 1. Get list of files
    const filesInfo = await universalApi.readDirectory(payload.path);
    const filePaths = filesInfo.map(f => f.path);

    // 2. Setup progress listener
    if (uploadCleanup) uploadCleanup();
    uploadCleanup = universalApi.onUploadProgress((progress) => {
      if (progress.processed % 5 === 0 || progress.processed === progress.total) {
        addLog(`⏳ Upload Progress: ${progress.processed} / ${progress.total}`);
      }
    });

    // 3. Trigger Batch Upload
    const result = await universalApi.uploadFiles(filePaths);

    if (result.success && result.data) {
      addLog(`🎉 Batch Upload Complete! Processed: ${result.data.processed}, Success: ${result.data.results.filter(r => r.success).length}`);

      // Log failures if any
      const failures = result.data.results.filter(r => !r.success);
      if (failures.length > 0) {
        addLog(`⚠️ ${failures.length} files failed to upload.`);
        failures.forEach(f => addLog(`❌ Failed: ${f.filePath} - ${f.error}`));
      }
    } else {
      addLog(`❌ Batch Upload Failed: ${result.error}`);
    }

  } catch (err: any) {
    addLog(`❌ Import Process Failed: ${err.message}`);
  }
};

const handleStarted = (payload: { path: string }) => {
  addLog(`🚀 Started scanning: ${payload.path}`);
};

const handleProgress = (payload: { processed: number; total: number }) => {
  if (payload.processed % 10 === 0 || payload.processed === payload.total) {
    addLog(`⏳ Scan Progress: ${payload.processed} / ${payload.total}`);
  }
};

const handleError = (payload: { message: string; error?: any }) => {
  let detail = '';
  if (payload.error) {
    detail = typeof payload.error === 'object'
      ? JSON.stringify(payload.error, null, 2)
      : String(payload.error);
  }
  addLog(`❌ Error: ${payload.message} ${detail}`);
};

onUnmounted(() => {
  if (uploadCleanup) uploadCleanup();
});
</script>
