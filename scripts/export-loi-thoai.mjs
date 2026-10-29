// Xuất docs/LOI-THOAI-NHAN-VAT.xlsx: bước 1 (vitest) gom lời thoại ra JSON, bước 2 (Python + openpyxl) ghi Excel.
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const json = join(mkdtempSync(join(tmpdir(), 'loi-thoai-')), 'loi-thoai.json');
const xlsx = 'docs/LOI-THOAI-NHAN-VAT.xlsx';
const step1 = spawnSync('npx', ['vitest', 'run', 'scripts/export-loi-thoai.test.mjs'], { stdio: 'inherit', shell: true, env: { ...process.env, EXPORT_LOI_THOAI: json } });
if (step1.status !== 0) process.exit(step1.status ?? 1);
const py = process.platform === 'win32' ? 'python' : 'python3';
const step2 = spawnSync(py, ['-I', 'scripts/export-loi-thoai.py', json, xlsx], { stdio: 'inherit' });
process.exit(step2.status ?? 1);
