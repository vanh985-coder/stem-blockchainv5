// Chạy demo quay video: máy chủ đồ họa (5180) + hub gộp ở cổng 5873. Mở http://localhost:5873/?demo=1 (xem docs/DEMO.md).
import { spawn } from 'node:child_process';

const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
const procs = [run('node', ['scripts/dev-assets.mjs']), run('pnpm', ['--filter', '@so-chung/hub', 'exec', 'vite', '--mode', 'demo', '--port', '5873', '--strictPort'])];
const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('exit', stop);
