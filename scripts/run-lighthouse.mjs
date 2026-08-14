import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1'], {
  cwd,
  stdio: 'inherit'
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
  if (!preview.killed) preview.kill();
}

let chrome;
try {
  await waitForServer();
  chrome = await chromeLauncher.launch({
    chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-gpu']
  });
  const result = await lighthouse('http://127.0.0.1:4173/', {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices']
  });
  if (!result) throw new Error('Lighthouse returned no result');

  const scores = Object.fromEntries(
    Object.entries(result.lhr.categories).map(([key, category]) => [
      key,
      Math.round((category.score ?? 0) * 100)
    ])
  );
  const cls = result.lhr.audits['cumulative-layout-shift'].numericValue ?? Number.POSITIVE_INFINITY;
  console.log(JSON.stringify({ ...scores, cls: Number(cls.toFixed(4)) }, null, 2));

  const passed =
    scores.performance >= 90 && scores.accessibility >= 95 && scores['best-practices'] >= 95 && cls < 0.1;
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (chrome) {
    try {
      await chrome.kill();
    } catch (error) {
      console.warn(`Chrome 已结束，但临时目录未能自动清理：${error.message}`);
    }
  }
  stopPreview();
}
