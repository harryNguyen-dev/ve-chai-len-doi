// One-click launcher: starts the game server, then opens it in Chrome/Edge with the GPU forced on.
// A web page can't turn on hardware acceleration itself, but the browser we launch can be told to.
import { createServer } from 'vite';
import { spawn, exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const server = await createServer({ server: { port: 5173 } });
await server.listen();
const url = server.resolvedUrls.local[0];

const env = process.env;
const browser = [
  join(env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] || '', 'Google/Chrome/Application/chrome.exe'),
  join(env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
  join(env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
  join(env.ProgramFiles || '', 'Microsoft/Edge/Application/msedge.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));

const flags = [
  // own profile: "acceleration off" or a crashed-GPU state in the user's normal profile can't follow us here
  `--user-data-dir=${join(env.LOCALAPPDATA || tmpdir(), 've-chai-len-doi-browser')}`,
  '--ignore-gpu-blocklist',       // use the GPU even if its driver is on the browser's blocklist
  '--force_high_performance_gpu', // machines with 2 GPUs: pick the strong one, not the integrated one
  '--enable-gpu-rasterization',
  '--no-first-run', '--no-default-browser-check',
  '--start-maximized',
  `--app=${url}`,                 // clean window without tabs/address bar, good for a demo
];

if (browser) spawn(browser, flags, { detached: true, stdio: 'ignore' }).unref();
else exec(process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`);

console.log(`\n  Ve Chai Lên Đời đang chạy ở ${url}`);
console.log(browser ? `  Đã mở bằng ${browser.split(/[\\/]/).pop()} (ép dùng card đồ họa).` : '  Không thấy Chrome/Edge, đã mở bằng trình duyệt mặc định.');
console.log('  Đóng cửa sổ này để tắt game.\n');
