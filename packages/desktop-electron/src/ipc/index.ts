import { BrowserWindow } from 'electron';
import { registerHandlers } from './handlers';

export const initializeIpc = (mainWindow: BrowserWindow | null) => {
  registerHandlers(mainWindow);
  console.log('IPC Handlers registered');
};
