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
    ON_SCAN_PROGRESS: 'fs:on-scan-progress',
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
