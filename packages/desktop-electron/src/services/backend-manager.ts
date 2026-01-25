import { ChildProcess, fork } from 'child_process';
import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { EventEmitter } from 'events';

// Error types
export class BackendError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'BACKEND_ERROR', details?: any) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.details = details;
  }
}

interface RequestContext {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeoutId: NodeJS.Timeout;
}

export class BackendServiceManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<string, RequestContext> = new Map();
  private restartAttempts: number = 0;
  private maxRestartAttempts: number = 3;
  private backendPath: string;
  private mainWindowGetter: (() => BrowserWindow | null) | null = null;

  // Singleton instance
  private static instance: BackendServiceManager;

  private constructor() {
    super();
    // Determine backend path based on environment
    // In dev, it's in packages/desktop-backend/dist/index.js relative to electron main process
    // In prod, it should be bundled or adjacent
    const isDev = !app.isPackaged;
    // Current file is in dist/services/backend-manager.js
    // So __dirname is dist/services
    // We need to go up to project root to find packages/desktop-backend/dist/index.js
    
    // In dev mode with tsc-watch, the structure is usually:
    // packages/desktop-electron/dist/services/backend-manager.js
    // We need to go to:
    // packages/desktop-backend/dist/index.js
    
    // So: ../../../desktop-backend/dist/index.js
    this.backendPath = isDev 
      ? path.resolve(__dirname, '../../../desktop-backend/dist/index.js')
      : path.join(process.resourcesPath, 'backend/index.js'); // Adjust for prod build structure
  }

  static getInstance(): BackendServiceManager {
    if (!BackendServiceManager.instance) {
      BackendServiceManager.instance = new BackendServiceManager();
    }
    return BackendServiceManager.instance;
  }

  setMainWindowGetter(getter: () => BrowserWindow | null) {
    this.mainWindowGetter = getter;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log(`[BackendManager] Starting backend service from: ${this.backendPath}`);
    
    // Determine App Data Path
    // In dev, use project root's 'data' folder to avoid polluting system AppData
    const isDev = !app.isPackaged;
    const appDataPath = isDev 
      ? path.resolve(process.cwd(), 'data') 
      : app.getPath('userData');

    console.log(`[BackendManager] Using Data Path: ${appDataPath}`);

    return new Promise((resolve, reject) => {
      try {
        this.process = fork(this.backendPath, [], {
          env: {
            ...process.env,
            APP_DATA_PATH: appDataPath,
            ELECTRON_VERSION: process.versions.electron
          },
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        this.setupProcessListeners();
        
        // Wait for ready signal
        const readyHandler = (msg: any) => {
          if (msg.type === 'ready') {
            this.isRunning = true;
            this.restartAttempts = 0;
            this.process?.off('message', readyHandler);
            console.log('[BackendManager] Backend service ready');
            resolve();
          }
        };

        this.process.on('message', readyHandler);
        
        // Safety timeout
        setTimeout(() => {
          if (!this.isRunning) {
            this.process?.off('message', readyHandler);
            reject(new BackendError('Backend start timeout', 'TIMEOUT'));
            this.stop();
          }
        }, 10000);

      } catch (error: any) {
        reject(new BackendError(`Failed to start backend: ${error.message}`, 'START_FAILED'));
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;

    console.log('[BackendManager] Stopping backend service...');
    this.process.kill();
    this.process = null;
    this.isRunning = false;
    
    // Clear pending requests
    this.pendingRequests.forEach((ctx) => {
      clearTimeout(ctx.timeoutId);
      ctx.reject(new BackendError('Backend stopped', 'SERVICE_STOPPED'));
    });
    this.pendingRequests.clear();
  }

  async restart(): Promise<void> {
    console.log('[BackendManager] Restarting backend service...');
    await this.stop();
    await this.start();
  }

  async call<T>(method: string, params: any = {}): Promise<T> {
    if (!this.isRunning || !this.process) {
      throw new BackendError('Backend is not running', 'SERVICE_NOT_RUNNING');
    }

    const id = (this.requestId++).toString();
    
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new BackendError(`Request ${method} timed out`, 'TIMEOUT'));
        }
      }, 30000); // 30s timeout

      this.pendingRequests.set(id, { resolve, reject, timeoutId });

      // Protocol: { id, method, params } matches IpcRequest interface in backend
      this.process!.send({ id, method, params });
    });
  }

  getStatus(): { isRunning: boolean; pid?: number } {
    return {
      isRunning: this.isRunning,
      pid: this.process?.pid
    };
  }

  private setupProcessListeners() {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      console.log(`[Backend STDOUT] ${data.toString().trim()}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`[Backend STDERR] ${data.toString().trim()}`);
    });

    this.process.on('message', (msg: any) => {
      this.handleMessage(msg);
    });

    this.process.on('exit', (code, signal) => {
      console.log(`[BackendManager] Backend exited with code ${code} and signal ${signal}`);
      this.isRunning = false;
      this.handleExit(code);
    });

    this.process.on('error', (err) => {
      console.error('[BackendManager] Process error:', err);
    });
  }

  private handleMessage(msg: any) {
    // 1. Response handling
    if (msg.id) {
      const ctx = this.pendingRequests.get(msg.id);
      if (ctx) {
        clearTimeout(ctx.timeoutId);
        this.pendingRequests.delete(msg.id);
        
        if (msg.error) {
          ctx.reject(new BackendError(msg.error, 'REMOTE_ERROR'));
        } else {
          ctx.resolve(msg.result);
        }
      }
      return;
    }

    // 2. Event handling
    if (msg.type === 'event') {
      this.forwardToFrontend(msg.event, msg.payload);
      this.emit(msg.event, msg.payload); // Also emit locally for main process listeners
    }
  }

  private handleExit(code: number | null) {
    // Attempt auto-restart if exit wasn't clean and we haven't exceeded limits
    if (code !== 0 && this.restartAttempts < this.maxRestartAttempts) {
      this.restartAttempts++;
      console.log(`[BackendManager] Attempting restart (${this.restartAttempts}/${this.maxRestartAttempts})...`);
      setTimeout(() => this.start(), 1000 * this.restartAttempts);
    } else if (this.restartAttempts >= this.maxRestartAttempts) {
      console.error('[BackendManager] Max restart attempts reached. Giving up.');
      this.emit('backend-fatal-error');
    }
  }

  private forwardToFrontend(event: string, data: any) {
    if (this.mainWindowGetter) {
      const win = this.mainWindowGetter();
      if (win && !win.isDestroyed()) {
        win.webContents.send(event, data);
      }
    }
  }
}

export const backendManager = BackendServiceManager.getInstance();
