<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { universalApi } from '@/api';
import { useEnvironment } from '@/composables/useEnvironment';

const { isElectron } = useEnvironment();
const logs = ref<{time: string, msg: string, type: 'info' | 'success' | 'error'}[]>([]);
const systemInfo = ref<any>(null);
const isBackendRunning = ref(false);

const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, msg, type });
};

const checkStatus = async () => {
  try {
    const status = await universalApi.backend.getStatus();
    isBackendRunning.value = status.isRunning;
    addLog(`Backend Status: ${status.isRunning ? 'Running' : 'Stopped'} (PID: ${status.pid || 'N/A'})`, status.isRunning ? 'success' : 'error');
  } catch (err: any) {
    addLog(`Failed to get status: ${err.message}`, 'error');
  }
};

const startBackend = async () => {
  try {
    addLog('Starting backend...', 'info');
    await universalApi.backend.start();
    addLog('Backend start command sent', 'success');
    setTimeout(checkStatus, 1000);
  } catch (err: any) {
    addLog(`Start failed: ${err.message}`, 'error');
  }
};

const stopBackend = async () => {
  try {
    addLog('Stopping backend...', 'info');
    await universalApi.backend.stop();
    addLog('Backend stop command sent', 'success');
    setTimeout(checkStatus, 1000);
  } catch (err: any) {
    addLog(`Stop failed: ${err.message}`, 'error');
  }
};

const getSystemInfo = async () => {
  try {
    addLog('Fetching system info...', 'info');
    const info = await universalApi.backend.call('system:get-info');
    systemInfo.value = info;
    addLog('System info received', 'success');
  } catch (err: any) {
    addLog(`Call failed: ${err.message}`, 'error');
  }
};

const importTest = async () => {
  if (!isElectron) {
    addLog('Not in Electron, skipping import test', 'error');
    return;
  }

  try {
    const dir = await universalApi.selectDirectory();
    if (!dir) return;

    addLog(`Selected directory: ${dir}`, 'info');
    
    // Listen for progress
    const unsubscribe = universalApi.backend.onEvent('import:progress', (data) => {
      addLog(`Import Progress: ${data.current}/${data.total}`, 'info');
    });

    const result = await universalApi.backend.call('images:import-folder', { folderPath: dir });
    addLog(`Import Complete: ${JSON.stringify(result)}`, 'success');
    
    unsubscribe(); // Cleanup listener
  } catch (err: any) {
    addLog(`Import failed: ${err.message}`, 'error');
  }
};

onMounted(() => {
  if (isElectron) {
    checkStatus();
  } else {
    addLog('Web Environment Detected - Backend features disabled', 'error');
  }
});
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Backend Integration Test</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Controls -->
      <div class="space-y-4">
        <div class="bg-white p-4 rounded-lg shadow dark:bg-gray-800">
          <h2 class="text-lg font-semibold mb-4">Service Control</h2>
          <div class="flex gap-2 mb-4">
            <div class="px-3 py-1 rounded-full text-sm font-medium" 
                 :class="isBackendRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
              {{ isBackendRunning ? '● Running' : '○ Stopped' }}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button @click="checkStatus" class="btn btn-secondary">Check Status</button>
            <button @click="startBackend" class="btn btn-primary" :disabled="isBackendRunning">Start</button>
            <button @click="stopBackend" class="btn btn-danger" :disabled="!isBackendRunning">Stop</button>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow dark:bg-gray-800">
          <h2 class="text-lg font-semibold mb-4">API Tests</h2>
          <div class="space-y-2">
            <button @click="getSystemInfo" class="btn btn-secondary w-full" :disabled="!isBackendRunning">
              Get System Info (RPC Call)
            </button>
            <button @click="importTest" class="btn btn-secondary w-full" :disabled="!isBackendRunning">
              Test Import Folder (Long Running)
            </button>
          </div>
          
          <div v-if="systemInfo" class="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono overflow-auto max-h-40">
            {{ JSON.stringify(systemInfo, null, 2) }}
          </div>
        </div>
      </div>

      <!-- Logs -->
      <div class="bg-gray-900 text-gray-100 p-4 rounded-lg shadow h-[500px] overflow-auto font-mono text-sm">
        <div class="flex justify-between items-center mb-2 sticky top-0 bg-gray-900 pb-2 border-b border-gray-700">
          <span class="font-semibold">Operation Logs</span>
          <button @click="logs = []" class="text-xs text-gray-400 hover:text-white">Clear</button>
        </div>
        <div v-if="logs.length === 0" class="text-gray-500 italic text-center py-10">No logs yet</div>
        <div v-for="(log, i) in logs" :key="i" class="mb-1">
          <span class="text-gray-500">[{{ log.time }}]</span>
          <span :class="{
            'text-blue-400': log.type === 'info',
            'text-green-400': log.type === 'success',
            'text-red-400': log.type === 'error'
          }" class="ml-2">{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600;
}
.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>
