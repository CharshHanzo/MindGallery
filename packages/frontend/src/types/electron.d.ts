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
  IpcResponse 
} from '@mindgallery/shared/dist/electron-api';
