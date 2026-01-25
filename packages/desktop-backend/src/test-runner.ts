import { fork } from 'child_process';
import path from 'path';

// Path to the compiled backend entry point
const BACKEND_PATH = path.join(__dirname, '../dist/index.js');
const MOCK_DB_PATH = path.join(__dirname, '../test-data/test.db');

console.log('🧪 Starting Desktop Backend Test...');
console.log(`📂 Backend Path: ${BACKEND_PATH}`);
console.log(`💾 DB Path: ${MOCK_DB_PATH}`);

// Fork the backend process
const backend = fork(BACKEND_PATH, [], {
  env: {
    ...process.env,
    APP_DATA_PATH: path.dirname(MOCK_DB_PATH),
    // Mock other env vars if needed
  },
  stdio: ['ipc'] // Enable IPC
});

// Helper to send requests
const sendRequest = (method: string, params: any = {}) => {
  const id = Math.random().toString(36).substring(7);
  console.log(`[REQ ${id}] Calling ${method}...`);
  backend.send({ id, method, params });
  return id;
};

// Listen for messages
backend.on('message', (msg: any) => {
  if (msg.type === 'ready') {
    console.log('✅ Backend Service is READY!');
    
    // Test 1: Get System Info
    sendRequest('system:get-info');

    // Test 2: List Images (should be empty initially)
    sendRequest('images:list', { limit: 5 });

  } else if (msg.type === 'event') {
    console.log(`🔔 Event [${msg.event}]:`, msg.payload);
  } else if (msg.id) {
    if (msg.error) {
      console.error(`❌ Response [${msg.id}] Error:`, msg.error);
    } else {
      console.log(`✅ Response [${msg.id}] Success:`, msg.result);
    }
  }
});

backend.on('error', (err) => {
  console.error('❌ Backend Process Error:', err);
});

backend.on('exit', (code) => {
  console.log(`Backend Process exited with code ${code}`);
});

// Stop after 5 seconds
setTimeout(() => {
  console.log('🛑 Stopping test...');
  backend.kill();
  process.exit(0);
}, 5000);
