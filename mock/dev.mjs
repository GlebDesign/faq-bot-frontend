import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const apiPort = process.env.MOCK_API_PORT || '8081';
const frontendPort = process.env.MOCK_FRONTEND_PORT || '5173';
const origin = `http://127.0.0.1:${frontendPort}`;
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
function start(args, env, ipc = false) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: ipc ? ['inherit', 'inherit', 'inherit', 'ipc'] : 'inherit',
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on('error', () => stop(1));
  child.on('exit', (code) => {
    if (!stopping) stop(code || 0);
  });
  return child;
}
const api = start(['mock/server.mjs'], { MOCK_API_PORT: apiPort, MOCK_AUTH_ORIGIN: origin }, true);
api.once('message', (message) => {
  if (stopping || message.type !== 'ready') return;
  start(
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      frontendPort,
      '--strictPort',
    ],
    {
      VITE_AUTH_MODE: 'real',
      VITE_AGENTS_MODE: 'real',
      VITE_API_MODE: 'mock',
      VITE_MOCK_API: 'true',
      VITE_API_URL: '/api',
      API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
    },
  );
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
