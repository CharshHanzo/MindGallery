import { ref } from 'vue';
import type { ElectronAPI } from '@mindgallery/shared/dist/electron-api';

export interface EnvironmentInfo {
  isElectron: boolean;
  isWeb: boolean;
  platform: 'windows' | 'mac' | 'linux' | 'web';
  version: string;
  isPackaged: boolean;
  capabilities: {
    fileSystem: boolean;
    serviceControl: boolean;
    nativeDialogs: boolean;
  };
}

export const useEnvironment = () => {
  const electronApi = window.electronAPI;
  const isElectron = !!electronApi;
  const userAgent = navigator.userAgent.toLowerCase();
  
  let platform: EnvironmentInfo['platform'] = 'web';
  if (isElectron) {
    if (userAgent.includes('win')) platform = 'windows';
    else if (userAgent.includes('mac')) platform = 'mac';
    else if (userAgent.includes('linux')) platform = 'linux';
  }

  // Basic detection, more accurate version/packaged info would require async IPC calls
  // which we might not want to block on during initialization.
  // For now, we use sensible defaults and async getters can be used elsewhere.
  
  const envInfo = ref<EnvironmentInfo>({
    isElectron,
    isWeb: !isElectron,
    platform,
    version: '1.0.0', // Placeholder, ideally fetch from app
    isPackaged: false, // Placeholder
    capabilities: {
      fileSystem: isElectron,
      serviceControl: isElectron,
      nativeDialogs: isElectron
    }
  });

  return {
    ...envInfo.value, // Spread for easy access
    envInfo // Ref for reactivity
  };
};
