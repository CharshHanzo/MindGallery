import path from 'path';
import fs from 'fs-extra';
import { IpcServer } from './ipc-server';
import { vectorService } from './services/vector-service';

const APP_DATA_PATH = process.env.APP_DATA_PATH || path.join(process.cwd(), 'data');
const DB_PATH = path.join(APP_DATA_PATH, 'mindgallery.db');

async function main() {
  try {
    console.log('Starting Desktop Backend Service...');
    
    // Ensure data directory exists
    await fs.ensureDir(APP_DATA_PATH);

    // Initialize AI Service
    await vectorService.init();

    // Start IPC Server (which initializes DB)
    const server = new IpcServer(DB_PATH);

    console.log(`Backend Service Ready. DB Path: ${DB_PATH}`);

    // Handle signals
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

main();
