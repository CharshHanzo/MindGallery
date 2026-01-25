import type { ElectronAPI } from '@mindgallery/shared/dist/electron-api';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export type {
  ElectronAPI,
  FileInfo,
  SystemInfo,
  ServiceStatus,
  ScanProgressCallback,
  UploadProgressCallback,
  IpcResponse,
  UploadResult,
  BatchUploadResult
} from '@mindgallery/shared/dist/electron-api';
