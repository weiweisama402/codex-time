import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1'], {
  cwd,
  stdio: 'inherit',
  env: { ...process.env, VITE_E2E: 'true' }
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173');
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite preview did not start within 15 seconds');
}

function stopPreview() {
  if (!vite.killed) vite.kill();
}

try {
  await waitForServer();
  const cliArgs = ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)];
  const runner = spawn(process.execPath, cliArgs, { cwd, stdio: 'inherit', env: process.env });
  const exitCode = await new Promise((resolve) => runner.on('exit', (code) => resolve(code ?? 1)));
  stopPreview();
  process.exitCode = exitCode;
} catch (error) {
  stopPreview();
  console.error(error);
  process.exitCode = 1;
}
