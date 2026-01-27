// Shared Types for Electron IPC

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
}

export interface SystemInfo {
  cpu: {
    model: string;
    speed: number;
    cores: number;
  };
  memory: {
    total: number;
    free: number;
  };
  platform: string;
  arch: string;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  pid?: number;
  message?: string;
}

export type ScanProgressCallback = (progress: { processed: number; total?: number; currentFile: string }) => void;

// Channel definitions
export const IPC_CHANNELS = {
  FS: {
    SELECT_DIRECTORY: 'fs:select-directory',
    READ_DIRECTORY: 'fs:read-directory',
    GET_FILE_INFO: 'fs:get-file-info',
    READ_FILE_BUFFER: 'fs:read-file-buffer',
    ON_SCAN_PROGRESS: 'fs:on-scan-progress',
    UPLOAD_FILE: 'fs:upload:file',
    UPLOAD_FILES: 'fs:upload:files',
    ON_UPLOAD_PROGRESS: 'fs:upload:on-progress',
    OPEN_FILE_MANAGER: 'fs:open-file-manager',
  },
  BACKEND: {
    START: 'backend:start',
    STOP: 'backend:stop',
    RESTART: 'backend:restart',
    STATUS: 'backend:status',
    CALL: 'backend:call',
    ON_EVENT: 'backend:on-event',
  },
  APP: {
    GET_VERSION: 'app:get-version',
    GET_PLATFORM: 'app:get-platform',
    GET_SYSTEM_INFO: 'app:get-system-info',
  },
  SERVICE: {
    START: 'service:start',
    STOP: 'service:stop',
    GET_STATUS: 'service:get-status',
  }
} as const;

export type UploadProgressCallback = (progress: { processed: number; total: number }) => void;

export interface UploadResult {
  success: boolean;
  filePath: string;
  error?: string;
}

export interface BatchUploadResult {
  success: boolean;
  processed: number;
  total: number;
  results: UploadResult[];
}

export interface BackendIpcAPI {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  getStatus: () => Promise<{ isRunning: boolean; pid?: number }>;
  call: <T = any>(method: string, params?: any) => Promise<T>;
  onEvent: (event: string, callback: (data: any) => void) => () => void;
}

export interface ElectronAPI {
  // File System
  selectDirectory: () => Promise<string | null>;
  readDirectory: (path: string) => Promise<FileInfo[]>;
  getFileInfo: (path: string) => Promise<FileInfo>;
  readFileBuffer: (path: string) => Promise<Uint8Array>;
  openFileManager: (filePath: string) => Promise<boolean>;
  onScanProgress: (callback: ScanProgressCallback) => () => void;

  // Upload
  uploadFile: (filePath: string) => Promise<IpcResponse<UploadResult>>;
  uploadFiles: (filePaths: string[]) => Promise<IpcResponse<BatchUploadResult>>;
  onUploadProgress: (callback: UploadProgressCallback) => () => void;

  // Backend Service
  backend: BackendIpcAPI;

  // App Info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getSystemInfo: () => Promise<SystemInfo>;

  // Service Management
  startService: (name: string) => Promise<IpcResponse<ServiceStatus>>;
  stopService: (name: string) => Promise<IpcResponse<void>>;
  getServiceStatus: (name: string) => Promise<IpcResponse<ServiceStatus>>;

  // Legacy/General
  sendMessage: (channel: string, data: any) => void;
  onReceiveMessage: (channel: string, func: (...args: any[]) => void) => void;
}

// Global Window Extension
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
