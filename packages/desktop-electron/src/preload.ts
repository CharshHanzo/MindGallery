import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, ScanProgressCallback } from './ipc/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // --- File System ---
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.FS.SELECT_DIRECTORY),
  
  readDirectory: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.READ_DIRECTORY, path),
  
  getFileInfo: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS.GET_FILE_INFO, path),
  
  onScanProgress: (callback: ScanProgressCallback) => {
    const subscription = (event: any, progress: any) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.FS.ON_SCAN_PROGRESS, subscription);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.FS.ON_SCAN_PROGRESS, subscription);
    };
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
