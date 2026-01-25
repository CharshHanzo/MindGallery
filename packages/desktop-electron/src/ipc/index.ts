import { BrowserWindow } from 'electron';
import { registerHandlers } from './handlers';

export const initializeIpc = (getMainWindow: () => BrowserWindow | null) => {
  registerHandlers(getMainWindow);
  console.log('IPC Handlers registered');
};
