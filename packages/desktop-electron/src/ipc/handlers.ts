import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import { statSync } from 'fs';
import path from 'path';
import os from 'os';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { IPC_CHANNELS, IpcResponse, FileInfo, SystemInfo, ServiceStatus } from './types';
import { httpUploader } from '../services/http-uploader';

// Service Manager Class
class ServiceManager {
  // 4. Correct Type Usage
  private services: Map<string, ChildProcessWithoutNullStreams> = new Map();

  startService(name: string, command: string, args: string[]): IpcResponse<ServiceStatus> {
    if (this.services.has(name)) {
      return { success: false, error: `Service ${name} is already running` };
    }

    try {
      // Security: Validate command (basic check)
      const child = spawn(command, args, {
        detached: false,
        stdio: 'pipe'
      });

      this.services.set(name, child);

      // 4. Log process output
      child.stdout.on('data', (data) => {
        console.log(`[${name} STDOUT]: ${data}`);
      });
      
      child.stderr.on('data', (data) => {
        console.error(`[${name} STDERR]: ${data}`);
      });

      child.on('error', (err) => {
        console.error(`Service ${name} error:`, err);
      });

      child.on('exit', (code) => {
        console.log(`Service ${name} exited with code ${code}`);
        this.services.delete(name);
      });

      return {
        success: true,
        data: {
          name,
          status: 'running',
          pid: child.pid
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  stopService(name: string): IpcResponse<void> {
    const child = this.services.get(name);
    if (!child) {
      return { success: false, error: `Service ${name} is not running` };
    }

    const killed = child.kill();
    if (killed) {
      this.services.delete(name);
      return { success: true };
    }
    return { success: false, error: `Failed to stop service ${name}` };
  }

  getStatus(name: string): IpcResponse<ServiceStatus> {
    const child = this.services.get(name);
    return {
      success: true,
      data: {
        name,
        status: child ? 'running' : 'stopped',
        pid: child?.pid
      }
    };
  }
}

const serviceManager = new ServiceManager();
let lastSelectedDirectory: string | null = null;

// Helper for error handling
const handleIpc = async <T>(handler: () => Promise<T> | T): Promise<IpcResponse<T>> => {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error) {
    console.error('IPC Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    };
  }
};

// 2. Path Validation & Sanitization
const validateAndSanitizePath = (targetPath: string): string => {
  if (!targetPath) {
    throw new Error('Path is required');
  }

  // Normalize path to resolve '..' and '.'
  const normalizedPath = path.normalize(targetPath);

  // Ensure absolute path
  if (!path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid path: Must be absolute');
  }

  // Prevent directory traversal attacks by checking if it resolves outside root
  if (normalizedPath.includes('..')) {
    throw new Error('Invalid path: Traversal detected');
  }
  
  // Whitelist common user directories and project data paths
  const allowedRoots = [
    app.getPath('home'),
    app.getPath('userData'),
    app.getPath('temp'),
    app.getPath('downloads'),
    app.getPath('documents'),
    app.getPath('pictures'),
    app.getPath('music'),
    app.getPath('videos'),
    app.getPath('desktop'),
    // Project-specific data directories (absolute paths)
    path.normalize('E:\\MindGallery\\mindgallery-monorepo\\packages\\desktop-electron\\data'), // Normalized absolute path
    path.normalize('E:\\MindGallery\\mindgallery-monorepo\\packages\\desktop-electron\\data\\uploads'), // Normalized uploads path
    // Also include path relative to electron process (from current working directory)
    path.normalize(path.join(process.cwd(), 'packages', 'desktop-electron', 'data')),
    path.normalize(path.join(process.cwd(), 'packages', 'desktop-electron', 'data', 'uploads'))
  ];
  
  // Normalize and convert to lowercase for consistent comparison
  const normalizedPathLower = normalizedPath.toLowerCase();
  const allowedRootsLower = allowedRoots.map(root => {
    const normalizedRoot = path.normalize(root);
    return normalizedRoot.toLowerCase();
  });
  
  // Check if the path starts with any of the allowed roots
  const isAllowed = allowedRootsLower.some(root => {
    return normalizedPathLower.startsWith(root);
  });
  
  if (!isAllowed) {
    console.warn(`Access denied to path: ${normalizedPath}`);
    throw new Error('Access denied: Path not in allowed directories');
  }

  return normalizedPath;
};

import { setupBackendIpcHandlers } from './backend-handlers';

export const registerHandlers = (getMainWindow: () => BrowserWindow | null) => {
  // Register Backend Handlers
  setupBackendIpcHandlers();

  // --- File System Handlers ---
  
  ipcMain.handle(IPC_CHANNELS.FS.SELECT_DIRECTORY, async () => {
    return handleIpc(async () => {
      const mainWindow = getMainWindow();
      if (!mainWindow) throw new Error('Main window not available');
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        defaultPath: lastSelectedDirectory ? path.dirname(lastSelectedDirectory) : app.getPath('desktop')
      });
      if (result.canceled) return null;
      const selected = result.filePaths[0];
      lastSelectedDirectory = selected;
      return selected;
    });
  });

  ipcMain.handle(IPC_CHANNELS.FS.READ_DIRECTORY, async (event, rawPath: string) => {
    return handleIpc(async () => {
      const dirPath = validateAndSanitizePath(rawPath);

      try {
        await fs.access(dirPath);
      } catch {
        throw new Error('Directory does not exist');
      }

      const files = await fs.readdir(dirPath);
      const imageExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', 
        '.webp', '.svg', '.heic', '.heif'
      ];
      const results: FileInfo[] = [];

      let processed = 0;
      const total = files.length;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stats = statSync(filePath);
          if (stats.isFile() && imageExtensions.includes(path.extname(file).toLowerCase())) {
            results.push({
              name: file,
              path: filePath,
              size: stats.size,
              mtime: stats.mtime,
              isDirectory: false
            });
          }
        } catch (e) {
          // Ignore unreadable files
        }

        // Progress feedback
        processed++;
        const mainWindow = getMainWindow();
        if (mainWindow && processed % 10 === 0) {
           mainWindow.webContents.send(IPC_CHANNELS.FS.ON_SCAN_PROGRESS, {
             processed,
             total,
             currentFile: file
           });
        }
      }

      return results;
    });
  });

  ipcMain.handle(IPC_CHANNELS.FS.GET_FILE_INFO, async (event, rawPath: string) => {
    return handleIpc(async () => {
       const filePath = validateAndSanitizePath(rawPath);
       const stats = await fs.stat(filePath);
       return {
         name: path.basename(filePath),
         path: filePath,
         size: stats.size,
         mtime: stats.mtime,
         isDirectory: stats.isDirectory()
       } as FileInfo;
    });
  });

  ipcMain.handle(IPC_CHANNELS.FS.READ_FILE_BUFFER, async (event, rawPath: string) => {
    return handleIpc(async () => {
      const filePath = validateAndSanitizePath(rawPath);
      const buffer = await fs.readFile(filePath);
      return buffer;
    });
  });

  // --- Upload Handlers ---
  
  ipcMain.handle(IPC_CHANNELS.FS.UPLOAD_FILE, async (event, rawPath: string) => {
    return handleIpc(async () => {
      const filePath = validateAndSanitizePath(rawPath);
      return await httpUploader.uploadFile(filePath);
    });
  });

  ipcMain.handle(IPC_CHANNELS.FS.UPLOAD_FILES, async (event, rawPaths: string[]) => {
    return handleIpc(async () => {
      // Validate all paths first
      const safePaths = rawPaths.map(p => validateAndSanitizePath(p));
      
      const mainWindow = getMainWindow();
      
      return await httpUploader.uploadFiles(safePaths, (processed, total) => {
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.FS.ON_UPLOAD_PROGRESS, { processed, total });
        }
      });
    });
  });

  // --- App Info Handlers ---

  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => handleIpc(() => app.getVersion()));
  
  ipcMain.handle(IPC_CHANNELS.APP.GET_PLATFORM, () => handleIpc(() => process.platform));

  ipcMain.handle(IPC_CHANNELS.APP.GET_SYSTEM_INFO, () => {
    return handleIpc(() => {
      const cpus = os.cpus();
      return {
        cpu: {
          model: cpus[0].model,
          speed: cpus[0].speed,
          cores: cpus.length
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem()
        },
        platform: os.platform(),
        arch: os.arch()
      } as SystemInfo;
    });
  });

  // --- Service Management Handlers ---

  ipcMain.handle(IPC_CHANNELS.SERVICE.START, (event, name: string) => {
    const serviceMap: Record<string, { cmd: string, args: string[] }> = {
      'clip-service': { cmd: 'python', args: ['--version'] },
    };

    if (!serviceMap[name]) {
      return { success: false, error: `Unknown service: ${name}` };
    }

    const config = serviceMap[name];
    return serviceManager.startService(name, config.cmd, config.args);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE.STOP, (event, name: string) => {
    return serviceManager.stopService(name);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE.GET_STATUS, (event, name: string) => {
    return serviceManager.getStatus(name);
  });
};
