import { app, BrowserWindow, shell, ipcMain, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeIpc } from './ipc';
import { backendManager } from './services/backend-manager';

// Global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Robust Project Root Calculation
const getProjectRoot = () => {
  // Check common paths relative to the current script execution location
  // 1. Dev (ts-node/tsc): src/main.ts -> packages/desktop-electron/src -> packages/desktop-electron -> packages -> root
  // 2. Prod (dist): dist/main.js -> packages/desktop-electron/dist -> packages/desktop-electron -> packages -> root
  // 3. Packaged: resources/app.asar/dist/main.js -> ...
  
  const possiblePaths = [
    path.resolve(__dirname, '../../..'), // Standard dev/build structure
    path.resolve(__dirname, '../../../..'), // Nested deeper
    path.resolve(process.cwd()), // Current working directory (often root in dev)
    path.join(process.resourcesPath, '..') // Packaged app
  ];

  for (const p of possiblePaths) {
    // Check if packages/frontend exists in this root
    if (fs.existsSync(path.join(p, 'packages', 'frontend'))) {
      return p;
    }
  }

  // Fallback to CWD if nothing else matches, though this might fail later
  return process.cwd();
};

const PROJECT_ROOT = getProjectRoot();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false 
    },
  });

  // Register window getter for backend manager
  backendManager.setMainWindowGetter(() => mainWindow);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  // Match the port in packages/frontend/vite.config.ts
  const VITE_PORT = process.env.VITE_PORT || '5175';

  // 2. Improved CSP Configuration
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspDirectives = isDev
      ? [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
          `connect-src 'self' http://localhost:${VITE_PORT} ws://localhost:${VITE_PORT}`,
          "img-src 'self' data: file: asset:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        ]
      : [
          "default-src 'self'",
          "script-src 'self'", 
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: file: asset:"
        ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives.join('; ')]
      }
    });
  });

  if (isDev) {
    const devUrl = `http://localhost:${VITE_PORT}`;
    
    const loadDevServer = async () => {
      try {
        await mainWindow?.loadURL(devUrl);
        mainWindow?.webContents.openDevTools();
        console.log(`Successfully connected to ${devUrl}`);
      } catch (e) {
        console.log(`Failed to connect to ${devUrl}, retrying in 1s...`);
        setTimeout(loadDevServer, 1000);
      }
    };
    loadDevServer();
  } else {
    // 5. Verify Frontend Dist Existence
    const frontendDistPath = path.join(PROJECT_ROOT, 'packages/frontend/dist/index.html');
    
    if (fs.existsSync(frontendDistPath)) {
      mainWindow.loadFile(frontendDistPath).catch(err => {
        console.error('Failed to load production build:', err);
      });
    } else {
      console.error(`Frontend build not found at: ${frontendDistPath}`);
      // Show friendly error to user
      dialog.showErrorBox(
        'Startup Error', 
        `Could not find frontend files.\nExpected at: ${frontendDistPath}\n\nPlease build the frontend package first.`
      );
    }
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  // 1. Correct IPC Registration Timing
  console.log('App ready, registering IPC handlers...');
  // Pass a getter to ensure handlers always access the current mainWindow instance
  initializeIpc(() => mainWindow);
  
  // 2. Start Backend Service
  try {
    await backendManager.start();
    
    // Optional: Log initial system info
    const info = await backendManager.call('system:get-info');
    console.log('Backend System Info:', info);
  } catch (err) {
    console.error('Failed to start backend service:', err);
  }

  console.log('IPC registered, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', async () => {
  await backendManager.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
