import type { ElectronAPI, FileInfo, SystemInfo, ServiceStatus, ScanProgressCallback, IpcResponse } from '../types/electron';

// Safe wrapper that throws if called in Web environment
const ensureElectron = () => {
  if (!window.electronAPI) {
    throw new Error('Electron API is not available in this environment');
  }
  return window.electronAPI;
};

export const electronClient: ElectronAPI = {
  // --- File System ---
  selectDirectory: async (): Promise<string | null> => {
    return ensureElectron().selectDirectory();
  },

  readDirectory: async (path: string): Promise<FileInfo[]> => {
    return ensureElectron().readDirectory(path);
  },

  getFileInfo: async (path: string): Promise<FileInfo> => {
    return ensureElectron().getFileInfo(path);
  },

  onScanProgress: (callback: ScanProgressCallback): (() => void) => {
    return ensureElectron().onScanProgress(callback);
  },

  // --- App Info ---
  getAppVersion: async (): Promise<string> => {
    return ensureElectron().getAppVersion();
  },

  getPlatform: async (): Promise<string> => {
    return ensureElectron().getPlatform();
  },

  getSystemInfo: async (): Promise<SystemInfo> => {
    return ensureElectron().getSystemInfo();
  },

  // --- Service Management ---
  startService: async (name: string): Promise<IpcResponse<ServiceStatus>> => {
    return ensureElectron().startService(name);
  },

  stopService: async (name: string): Promise<IpcResponse<void>> => {
    return ensureElectron().stopService(name);
  },

  getServiceStatus: async (name: string): Promise<IpcResponse<ServiceStatus>> => {
    return ensureElectron().getServiceStatus(name);
  },

  // --- Legacy/General ---
  sendMessage: (channel: string, data: any) => {
    ensureElectron().sendMessage(channel, data);
  },

  onReceiveMessage: (channel: string, func: (...args: any[]) => void) => {
    ensureElectron().onReceiveMessage(channel, func);
  }
};
