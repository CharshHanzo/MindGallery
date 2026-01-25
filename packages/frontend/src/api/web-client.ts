import type { 
  ElectronAPI, 
  FileInfo, 
  SystemInfo, 
  ServiceStatus, 
  IpcResponse, 
  ScanProgressCallback,
  UploadProgressCallback,
  UploadResult,
  BatchUploadResult
} from '@mindgallery/shared/dist/electron-api';

// Web implementation of the ElectronAPI interface
// This provides graceful fallbacks for when running in a browser
export const webClient: ElectronAPI = {
  // --- File System ---
  selectDirectory: async (): Promise<string | null> => {
    return new Promise((resolve) => {
      // In web, we can't get a real path, but we can trigger a file input
      // However, for this specific API contract which expects a string path, 
      // we can't fulfill it strictly.
      
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      
      input.onchange = (e: any) => {
        if (e.target.files.length > 0) {
          // Web security prevents getting full path. 
          // We return a mock path or handle this differently in the UI layer.
          console.warn('Web mode: File selected but full path is hidden by browser security');
          resolve('Web Directory Selection (Mock Path)');
        } else {
          resolve(null);
        }
      };
      
      input.click();
    });
  },

  readDirectory: async (path: string): Promise<FileInfo[]> => {
    console.warn(`Web mode: Cannot read arbitrary directory ${path}`);
    return []; // Return empty or mock data
  },

  getFileInfo: async (path: string): Promise<FileInfo> => {
    return {
      name: 'Mock File.png',
      path: path,
      size: 1024,
      mtime: new Date(),
      isDirectory: false
    };
  },

  readFileBuffer: async (path: string): Promise<Uint8Array> => {
    console.warn(`Web mode: Cannot read arbitrary file buffer ${path}`);
    return new Uint8Array();
  },

  onScanProgress: (callback: ScanProgressCallback) => {
    console.log('Web mode: Scan progress listener registered');
    return () => {}; // No-op cleanup
  },

  // --- Upload ---
  uploadFile: async (filePath: string): Promise<IpcResponse<UploadResult>> => {
    return { success: false, error: 'Direct upload not supported in Web mode' };
  },

  uploadFiles: async (filePaths: string[]): Promise<IpcResponse<BatchUploadResult>> => {
    return { success: false, error: 'Direct upload not supported in Web mode' };
  },

  onUploadProgress: (callback: UploadProgressCallback) => {
    console.log('Web mode: Upload progress listener registered');
    return () => {};
  },

  // --- App Info ---
  getAppVersion: async (): Promise<string> => {
    return '1.0.0 (Web)';
  },

  getPlatform: async (): Promise<string> => {
    return 'web';
  },

  getSystemInfo: async (): Promise<SystemInfo> => {
    return {
      cpu: {
        model: 'Browser Virtual CPU',
        speed: 0,
        cores: navigator.hardwareConcurrency || 1
      },
      memory: {
        total: 0, // Not available in browser
        free: 0
      },
      platform: 'web',
      arch: 'unknown'
    };
  },

  // --- Service Management ---
  startService: async (name: string): Promise<IpcResponse<ServiceStatus>> => {
    return { success: false, error: 'Cannot start native services in Web mode' };
  },

  stopService: async (name: string): Promise<IpcResponse<void>> => {
    return { success: false, error: 'Cannot stop native services in Web mode' };
  },

  getServiceStatus: async (name: string): Promise<IpcResponse<ServiceStatus>> => {
    return { success: true, data: { name, status: 'stopped', message: 'Web mode' } };
  },

  // --- Legacy ---
  sendMessage: (channel: string, data: any) => {
    console.log(`Web mode: sendMessage to ${channel}`, data);
  },

  onReceiveMessage: (channel: string, func: (...args: any[]) => void) => {
    console.log(`Web mode: onReceiveMessage registered for ${channel}`);
  }
};
