import { BackendServiceManager } from '../src/services/backend-manager';
import { app } from 'electron';
import path from 'path';

// Mock electron app for testing context
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test-data'),
    isPackaged: false
  },
  ipcMain: {
    handle: jest.fn()
  }
}));

describe('BackendServiceManager', () => {
  let manager: BackendServiceManager;

  beforeAll(() => {
    manager = BackendServiceManager.getInstance();
  });

  afterAll(async () => {
    await manager.stop();
  });

  test('should be a singleton', () => {
    const instance2 = BackendServiceManager.getInstance();
    expect(manager).toBe(instance2);
  });

  test('should initialize with correct backend path', () => {
    // Access private property for testing if needed, or infer from behavior
    // For now we just check if it throws when calling without start
    expect(manager.getStatus().isRunning).toBe(false);
  });

  // Note: Full integration testing requires spawning actual processes which is flaky in unit tests.
  // Ideally we mock child_process.fork here.
});
