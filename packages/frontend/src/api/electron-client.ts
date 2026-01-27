import type {
  ElectronAPI,
  FileInfo,
  SystemInfo,
  ServiceStatus,
  ScanProgressCallback,
  UploadProgressCallback,
  IpcResponse,
  UploadResult,
  BatchUploadResult
} from '../types/electron';

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
    // The IPC returns IpcResponse<string | null>
    const res = await ensureElectron().selectDirectory() as unknown as IpcResponse<string | null>;
    if (res.success) {
      return res.data || null;
    }
    throw new Error(res.error || 'Failed to select directory');
  },

  readDirectory: async (path: string): Promise<FileInfo[]> => {
    const res = await ensureElectron().readDirectory(path) as unknown as IpcResponse<FileInfo[]>;
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to read directory');
  },

  getFileInfo: async (path: string): Promise<FileInfo> => {
    const res = await ensureElectron().getFileInfo(path) as unknown as IpcResponse<FileInfo>;
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to get file info');
  },

  readFileBuffer: async (path: string): Promise<Uint8Array> => {
    const res = await ensureElectron().readFileBuffer(path) as unknown as IpcResponse<Uint8Array>;
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to read file buffer');
  },

  openFileManager: async (filePath: string): Promise<boolean> => {
    const res = await ensureElectron().openFileManager(filePath) as unknown as IpcResponse<boolean>;
    if (res.success) {
      return res.data || false;
    }
    throw new Error(res.error || 'Failed to open file manager');
  },

  onScanProgress: (callback: ScanProgressCallback): (() => void) => {
    return ensureElectron().onScanProgress(callback);
  },

  // --- Upload ---
  uploadFile: async (filePath: string): Promise<IpcResponse<UploadResult>> => {
    return ensureElectron().uploadFile(filePath);
  },

  uploadFiles: async (filePaths: string[]): Promise<IpcResponse<BatchUploadResult>> => {
    return ensureElectron().uploadFiles(filePaths);
  },

  onUploadProgress: (callback: UploadProgressCallback): (() => void) => {
    return ensureElectron().onUploadProgress(callback);
  },

  // --- Backend Service ---
  backend: {
    start: async () => {
      const res = await ensureElectron().backend.start() as unknown as IpcResponse<void>;
      if (!res.success) throw new Error(res.error || 'Failed to start backend');
    },
    stop: async () => {
      const res = await ensureElectron().backend.stop() as unknown as IpcResponse<void>;
      if (!res.success) throw new Error(res.error || 'Failed to stop backend');
    },
    restart: async () => {
      const res = await ensureElectron().backend.restart() as unknown as IpcResponse<void>;
      if (!res.success) throw new Error(res.error || 'Failed to restart backend');
    },
    getStatus: async () => {
      const res = await ensureElectron().backend.getStatus() as unknown as IpcResponse<{ isRunning: boolean; pid?: number }>;
      if (res.success && res.data) return res.data;
      throw new Error(res.error || 'Failed to get backend status');
    },
    call: async (method: string, params?: any) => {
      const res = await ensureElectron().backend.call(method, params) as unknown as IpcResponse<any>;
      if (res.success && res.data) return res.data;
      if (res.success && res.data === undefined) return; // void return
      throw new Error(res.error || `Failed to call ${method}`);
    },
    onEvent: (event: string, callback: (data: any) => void) => ensureElectron().backend.onEvent(event, callback)
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
