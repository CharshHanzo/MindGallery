import type { ElectronAPI } from '@mindgallery/shared/dist/electron-api';
import { electronClient } from './electron-client';
import { webClient } from './web-client';

// Detect environment once
const isElectron = !!window.electronAPI;

// Export the appropriate client based on environment
// This allows the rest of the app to import 'universalApi' and not care about the environment
export const universalApi: ElectronAPI = isElectron ? electronClient : webClient;

// Re-export for convenience if needed specifically
export { electronClient, webClient };
