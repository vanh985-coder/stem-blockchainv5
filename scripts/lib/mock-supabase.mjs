// Máy chủ Supabase GIẢ (chỉ để kiểm giao diện P3b): bắt chước tối thiểu GoTrue và PostgREST đủ cho hub đọc hồ sơ, kéo/đẩy tiến độ.
// KHÔNG phải Supabase thật: không kiểm RLS, trigger hay JWT. Lỗi trả đúng dạng PostgREST ({code, message, details, hint}) với mã lấy từ PostgreSQL thật
// (42703 thiếu cột — xem /tmp/p3b_err_missing_column.txt do scripts/db-test-p3b.sh ghi; P0001 từ trigger protect_auto_completed).
import { createServer } from 'node:http';

const GAME_DATA = {"villageIntroSeen":{"lang-giay":true,"lang-det":true,"lang-khac-dau":true,"lang-bac":true},"villageSceneSeen":{"lang-giay":true,"lang-det":true,"lang-khac-dau":true,"lang-bac":true},"guideSeen":{"di-lai":true,"noi-chuyen":true,"bai-hoc":true,"man-2":true,"man-3":true,"trang-vang":true,"man-8":true,"man-12":true,"man-5":true,"man-6":true,"man-9":true,"man-11":true},"storySeen":true,"knowCards":{"lang-giay":15,"lang-det":15,"lang-khac-dau":15,"lang-bac":15},"gameTipSeen":{"1":true,"2":true,"3":true,"4":true,"5":true,"6":true,"7":true,"8":true,"9":true,"10":true,"11":true,"12":true}};
export const TEACHER_ID = '00000000-0000-0000-0000-0000000000b1';
export const GAME_DATA_SEED = GAME_DATA;
const DEFAULT_CFG = { colMissing: false, colMissingWrite: false, forbid: false, offline: false, failReal: false, failAuto: false, probeFail: false, staleProbe: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MISSING = { code: '42703', message: 'column "auto_completed" of relation "level_progress" does not exist', details: null, hint: null };
const FORBIDDEN = { code: 'P0001', message: 'Chỉ giáo viên mới dùng được tự hoàn thành', details: null, hint: null };

export function makeSession() {
  const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 86400;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: TEACHER_ID, role: 'authenticated', exp })}.mock`, token_type: 'bearer', expires_in: 315360000, expires_at: exp, refresh_token: 'mock-refresh', user: { id: TEACHER_ID, aud: 'authenticated', role: 'authenticated', email: 'giao-vien@mock.local', app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() } };
}
const session = makeSession;

export function startMockSupabase(port) {
  let cfg, levels, game, writes, probes, staleUsed;
  const reset = () => {
    cfg = { ...DEFAULT_CFG };
    levels = new Map();
    game = { golden_pages: 0, coins: 0, data: GAME_DATA, updated_at: new Date(0).toISOString() };
    writes = [];
    probes = [];
    staleUsed = false;
  };
  reset();
  const json = (res, status, body, extra = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', ...extra });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  const serializeLevel = (r) => {
    const { auto_completed, ...rest } = r;
    return cfg.colMissing || cfg.colMissingWrite ? rest : { ...rest, auto_completed: Boolean(auto_completed) };
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const origin = req.headers.origin ?? '*';
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers'] ?? '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('access-control-expose-headers', 'content-range');
    res.setHeader('cache-control', 'no-store'); // không để bộ nhớ đệm Chrome gộp hai yêu cầu cùng địa chỉ chạy song song
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    let raw = '';
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : null;
    const p = url.pathname;

    // ---- điều khiển từ script kiểm ----
    if (p === '/__reset') { reset(); return json(res, 200, { ok: true }); }
    if (p === '/__cfg') { Object.assign(cfg, body ?? {}); return json(res, 200, cfg); }
    if (p === '/__state') return json(res, 200, { cfg, levels: Object.fromEntries(levels), game, writes, probes });

    // ---- GoTrue ----
    if (p === '/auth/v1/user') return json(res, 200, session().user);
    if (p === '/auth/v1/token') return json(res, 200, session());
    if (p.startsWith('/auth/v1/')) return json(res, 200, {});

    // ---- PostgREST ----
    if (cfg.offline) { req.socket.destroy(); return; }
    const wantObject = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
    const reply = (rows) => (wantObject ? (rows.length ? json(res, 200, rows[0]) : json(res, 406, { code: 'PGRST116', message: 'The result contains 0 rows' })) : json(res, 200, rows, { 'content-range': `0-${Math.max(0, rows.length - 1)}/*` }));
    if (p === '/rest/v1/profiles' && req.method === 'GET') return reply([{ id: TEACHER_ID, display_name: 'Cô giáo thử', username: 'giao-vien', role: 'teacher', character_id: null }]);
    if (p === '/rest/v1/game_state') {
      if (req.method === 'GET') return reply([game]);
      if (cfg.failReal) { writes.push({ table: 'game_state', failed: 'network' }); req.socket.destroy(); return; }
      const { user_id, ...g } = body;
      game = g;
      writes.push({ table: 'game_state', coins: g.coins, golden_pages: g.golden_pages });
      res.writeHead(201); res.end(); return;
    }
    if (p === '/rest/v1/level_progress') {
      if (req.method === 'GET') {
        if (url.searchParams.get('select') === 'auto_completed') {
          const entry = { t: Date.now(), result: '' };
          probes.push(entry);
          if (cfg.staleProbe && !staleUsed) {
            staleUsed = true;
            await sleep(cfg.staleProbe.delayMs);
            entry.result = 'stale-42703';
            return json(res, 400, MISSING);
          }
          if (cfg.probeFail) { entry.result = 'network'; req.socket.destroy(); return; }
          if (cfg.colMissing) { entry.result = '42703'; return json(res, 400, MISSING); }
          entry.result = 'ok';
          return reply([]);
        }
        return reply([...levels.values()].map(serializeLevel));
      }
      const rows = Array.isArray(body) ? body : [body];
      const hasAuto = rows.some((r) => r.auto_completed === true);
      const ids = rows.map((r) => r.level_id);
      if (hasAuto) {
        if (cfg.colMissing || cfg.colMissingWrite) { writes.push({ table: 'level_progress', levels: ids, auto: true, failed: '42703' }); return json(res, 400, MISSING); }
        if (cfg.forbid) { writes.push({ table: 'level_progress', levels: ids, auto: true, failed: 'P0001' }); return json(res, 400, FORBIDDEN); }
        if (cfg.failAuto) { writes.push({ table: 'level_progress', levels: ids, auto: true, failed: 'network' }); req.socket.destroy(); return; }
      } else if (cfg.failReal) { writes.push({ table: 'level_progress', levels: ids, auto: false, failed: 'network' }); req.socket.destroy(); return; }
      for (const r of rows) levels.set(r.level_id, { ...(levels.get(r.level_id) ?? { auto_completed: false }), ...r });
      writes.push({ table: 'level_progress', levels: ids, auto: hasAuto });
      res.writeHead(201); res.end(); return;
    }
    if (p === '/rest/v1/quiz_answers') { res.writeHead(201); res.end(); return; }
    json(res, 404, { code: 'PGRST205', message: `không có ${p}` });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ close: () => server.close(), reset, state: () => ({ cfg, levels: Object.fromEntries(levels), game, writes, probes }), setCfg: (c) => Object.assign(cfg, c) })));
}
