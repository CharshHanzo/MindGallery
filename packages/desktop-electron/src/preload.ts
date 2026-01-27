import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, ScanProgressCallback, UploadProgressCallback } from './ipc/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // --- File System ---
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.FS.SELECT_DIRECTORY),
  
  readDirectory: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.READ_DIRECTORY, path),
  
  getFileInfo: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.GET_FILE_INFO, path),

  readFileBuffer: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.READ_FILE_BUFFER, path),

  openFileManager: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.OPEN_FILE_MANAGER, filePath),
  
  onScanProgress: (callback: ScanProgressCallback) => {
    const subscription = (event: any, progress: any) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.FS.ON_SCAN_PROGRESS, subscription);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.FS.ON_SCAN_PROGRESS, subscription);
    };
  },

  // --- Upload ---
  uploadFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.UPLOAD_FILE, filePath),
  
  uploadFiles: (filePaths: string[]) => ipcRenderer.invoke(IPC_CHANNELS.FS.UPLOAD_FILES, filePaths),
  
  onUploadProgress: (callback: UploadProgressCallback) => {
    const subscription = (event: any, progress: any) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.FS.ON_UPLOAD_PROGRESS, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.FS.ON_UPLOAD_PROGRESS, subscription);
    };
  },

  // --- Backend Service ---
  backend: {
    start: () => {
      console.log('[Preload] Invoking backend:start');
      return ipcRenderer.invoke(IPC_CHANNELS.BACKEND.START);
    },
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.BACKEND.STOP),
    restart: () => ipcRenderer.invoke(IPC_CHANNELS.BACKEND.RESTART),
    getStatus: () => {
      console.log('[Preload] Invoking backend:status');
      return ipcRenderer.invoke(IPC_CHANNELS.BACKEND.STATUS);
    },
    call: (method: string, params?: any) => {
      console.log(`[Preload] Invoking backend:call ${method}`, params);
      return ipcRenderer.invoke(IPC_CHANNELS.BACKEND.CALL, method, params);
    },
    onEvent: (event: string, callback: (data: any) => void) => {
      const subscription = (e: any, data: any) => callback(data);
      ipcRenderer.on(event, subscription);
      return () => {
        ipcRenderer.removeListener(event, subscription);
      };
    }
  },

  // --- App Info ---
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
  
  getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PLATFORM),
  
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_SYSTEM_INFO),

  // --- Service Management ---
  startService: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVICE.START, name),
  
  stopService: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVICE.STOP, name),
  
  getServiceStatus: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVICE.GET_STATUS, name),

  // --- Legacy/General (Optional) ---
  sendMessage: (channel: string, data: any) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  onReceiveMessage: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
