export interface LocalImage {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  createdAt: number;
  updatedAt: number;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Record<string, any>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  text?: string;
  vector?: number[];
  limit?: number;
  threshold?: number;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  databaseSize: number;
  imageCount: number;
}

export interface AppStats {
  totalImages: number;
  totalSize: number;
  lastScan: number;
}

export interface ImageAnalysis {
  tags: string[];
  embedding?: number[];
  colors?: string[];
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
}

// IPC Messages
export type IpcRequest = {
  id: string;
  method: string;
  params?: any;
};

export type IpcResponse = {
  id: string;
  result?: any;
  error?: string;
};

export interface ImportProgress {
  current: number;
  total: number;
  currentPath: string;
}

export interface ImportComplete {
  count: number;
  duration: number;
}

export interface AIProcessingEvent {
  stage: 'loading' | 'processing' | 'saving';
  progress: number;
  message?: string;
}
