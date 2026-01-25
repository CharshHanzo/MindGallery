import { ipcMain } from 'electron';
import { backendManager } from '../services/backend-manager';
import { IPC_CHANNELS, IpcResponse } from './types';

// Helper to wrap response in standard format
const handleIpc = async <T>(handler: () => Promise<T> | T): Promise<IpcResponse<T>> => {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error) {
    console.error('IPC Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    };
  }
};

export function setupBackendIpcHandlers() {
  // --- Service Control ---

  ipcMain.handle(IPC_CHANNELS.BACKEND.START, async () => {
    console.log('[IPC] Received backend:start request');
    return handleIpc(async () => {
      await backendManager.start();
      return { isRunning: true };
    });
  });

  ipcMain.handle(IPC_CHANNELS.BACKEND.STOP, async () => {
    return handleIpc(async () => {
      await backendManager.stop();
      return { isRunning: false };
    });
  });

  ipcMain.handle(IPC_CHANNELS.BACKEND.RESTART, async () => {
    return handleIpc(async () => {
      await backendManager.restart();
      return { isRunning: true };
    });
  });

  ipcMain.handle(IPC_CHANNELS.BACKEND.STATUS, async () => {
    console.log('[IPC] Received backend:status request');
    return handleIpc(() => backendManager.getStatus());
  });

  // --- RPC Call (Forward to Backend) ---

  ipcMain.handle(IPC_CHANNELS.BACKEND.CALL, async (event, method: string, params?: any) => {
    console.log(`[IPC] Received backend:call for ${method}`);
    return handleIpc(async () => {
      // Security: Validate method name to prevent internal prototype access or injection
      // Allowed format: namespace:action (e.g. 'images:list', 'system:get-info')
      if (!/^[a-z]+:[a-z-]+$/.test(method)) {
        throw new Error(`Invalid method format: ${method}`);
      }

      // Forward to backend process
      return await backendManager.call(method, params);
    });
  });
}
