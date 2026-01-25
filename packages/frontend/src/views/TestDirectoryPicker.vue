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
import { ref } from 'vue';
import DirectoryPicker from '@/components/adapters/DirectoryPicker.vue';
import { universalApi } from '@/api';
import { uploadImages } from '@/api/modules/image';

const logs = ref<{time: string, msg: string}[]>([]);

const addLog = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, msg });
};

// Helper to determine mime type
const getMimeType = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml'
  };
  return map[ext || ''] || 'application/octet-stream';
};

const handleSelected = async (payload: { path: string; fileCount: number }) => {
  addLog(`✅ Selected: ${payload.path} (${payload.fileCount} files)`);

  // Start Import Process
  addLog('🚀 Starting import process...');
  try {
    // 1. Get list of files again (or modify DirectoryPicker to pass them, but let's re-fetch for safety/simplicity)
    const filesInfo = await universalApi.readDirectory(payload.path);

    let successCount = 0;
    let failCount = 0;

    for (const [index, fileInfo] of filesInfo.entries()) {
      try {
        addLog(`[${index + 1}/${filesInfo.length}] Reading: ${fileInfo.name}`);

        // 2. Read Buffer
        const buffer = await universalApi.readFileBuffer(fileInfo.path);

        // 3. Create File object
        const file = new File([buffer as unknown as BlobPart], fileInfo.name, { type: getMimeType(fileInfo.name) });
        
        // 4. Upload
        addLog(`⬆️ Uploading: ${fileInfo.name} (${(file.size / 1024).toFixed(1)} KB)`);
        await uploadImages([file]);

        successCount++;
        addLog(`✅ Uploaded: ${fileInfo.name}`);
      } catch (err: any) {
        failCount++;
        addLog(`❌ Failed to upload ${fileInfo.name}: ${err.message}`);
      }
    }

    addLog(`🎉 Import Complete! Success: ${successCount}, Failed: ${failCount}`);

  } catch (err: any) {
    addLog(`❌ Import Process Failed: ${err.message}`);
  }
};

const handleStarted = (payload: { path: string }) => {
  addLog(`🚀 Started scanning: ${payload.path}`);
};

const handleProgress = (payload: { processed: number; total: number }) => {
  // Throttle logs slightly
  if (payload.processed % 10 === 0 || payload.processed === payload.total) {
    addLog(`⏳ Progress: ${payload.processed} / ${payload.total}`);
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
</script>
