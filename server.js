/* =========================================================
   เซิร์ฟเวอร์กลางของระบบครูฝึก Hell Week (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
   รัน:  node server.js     แล้วเปิด http://localhost:3000
   รหัสผ่านครูฝึก  : HW_PASSWORD (ค่าเริ่มต้น 0104) ดู/บันทึก/แก้ไขได้ แต่ลบไม่ได้
   รหัสผ่านแอดมิน  : HW_ADMIN_PASSWORD (ต้องตั้ง และต้องไม่ซ้ำรหัสครูฝึก)
                      เฉพาะแอดมินเท่านั้นที่ลบข้อมูลผู้ฝึกได้ (ตรวจที่เซิร์ฟเวอร์)
                      ถ้าไม่ตั้ง จะไม่มีใครลบข้อมูลได้เลย
   ข้อมูลทุกคนเก็บรวมที่ data.json (เปลี่ยนที่เก็บได้ด้วย DATA_DIR)

   เชื่อม Google Sheet (ไม่บังคับ):
     SHEETS_URL = ลิงก์ Web app ของ Apps Script (ลงท้าย /exec)
     SHEETS_KEY = รหัสลับเดียวกับ SECRET ใน Apps Script
   เมื่อเปิดใช้ Sheet จะเป็นฐานข้อมูลหลัก แก้ฝั่งไหนก็ตรงกัน (ต้องใช้ Node 18+)
   รูปภาพเก็บที่ data.json เท่านั้น ไม่ขึ้น Sheet
   ========================================================= */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.HW_PASSWORD || '0104';
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const ADMIN_PASSWORD = process.env.HW_ADMIN_PASSWORD || '';
const TOKEN = crypto.createHmac('sha256', 'hellweek-v1').update(PASSWORD).digest('hex');
const ADMIN_TOKEN = ADMIN_PASSWORD ? crypto.createHmac('sha256', 'hellweek-admin-v1').update(ADMIN_PASSWORD).digest('hex') : '';
if (ADMIN_PASSWORD && ADMIN_PASSWORD === PASSWORD) {
  console.error('ผิดพลาด: HW_ADMIN_PASSWORD ต้องไม่ซ้ำกับ HW_PASSWORD (ไม่งั้นครูทุกคนจะกลายเป็นแอดมิน)');
  process.exit(1);
}
const safeEq = (x, y) => { const a = Buffer.from(String(x ?? '')), b = Buffer.from(String(y ?? '')); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const SHEETS_URL = process.env.SHEETS_URL || '';
const SHEETS_KEY = process.env.SHEETS_KEY || '';
const MAX_BODY = 30 * 1024 * 1024;

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/script.js': ['script.js', 'text/javascript; charset=utf-8']
};

/* ---------- ข้อมูล ---------- */
let records = [];
try { records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); if (!Array.isArray(records)) records = []; } catch { records = []; }

function persist() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(records));
  fs.renameSync(tmp, DATA_FILE);
}
function clean(r) {
  if (!r || typeof r !== 'object' || !r.id || typeof r.name !== 'string' || !r.name.trim() || !r.scores || typeof r.scores.total !== 'number') return null;
  r.photos = Array.isArray(r.photos) ? r.photos.filter(p => typeof p === 'string' && p.startsWith('data:image/')).slice(0, 12) : [];
  return r;
}

/* ---------- Google Sheet ---------- */
function sheetErr(e) { const err = new Error(e.message || 'sheet'); err.sheet = true; return err; }
async function sheetCall(payload) {
  try {
    const res = await fetch(SHEETS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, key: SHEETS_KEY }), redirect: 'follow' });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'sheet error');
    return j;
  } catch (e) { throw sheetErr(e); }
}
async function sheetList() {
  try {
    const res = await fetch(SHEETS_URL + (SHEETS_URL.includes('?') ? '&' : '?') + 'action=list&key=' + encodeURIComponent(SHEETS_KEY), { redirect: 'follow' });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'sheet error');
    return j.records;
  } catch (e) { throw sheetErr(e); }
}
const forSheet = r => { const { photos, ...rest } = r; return { ...rest, photoCount: (photos || []).length }; };
function mergeFromSheet(list) {
  const byId = new Map(records.map(r => [String(r.id), r]));
  records = list.map(s => { const { photoCount, ...rest } = s; return { ...rest, photos: byId.get(String(s.id))?.photos || [] }; });
  persist();
}
let lastPull = 0;
async function refresh(force) {
  if (!SHEETS_URL || (!force && Date.now() - lastPull < 5000)) return;
  mergeFromSheet(await sheetList());
  lastPull = Date.now();
}
async function initSheets() {
  if (!SHEETS_URL) return;
  try {
    const list = await sheetList();
    if (!list.length && records.length) {
      await sheetCall({ action: 'upsert', records: records.map(forSheet) });
      console.log(`  Google Sheet ว่าง จึงส่งข้อมูลเดิม ${records.length} รายการขึ้น Sheet แล้ว`);
    } else {
      try { if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak'); } catch {}
      mergeFromSheet(list);
      console.log(`  ดึงข้อมูลจาก Google Sheet ${list.length} รายการ (สำรองไฟล์เดิมไว้ที่ data.json.bak)`);
    }
    lastPull = Date.now();
  } catch (e) { console.log('  เชื่อมต่อ Google Sheet ไม่สำเร็จ:', e.message); }
}

/* ---------- ตัวช่วย ---------- */
const fails = new Map();
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex'
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function authed(req) {   // คืนค่า 'admin' | 'user' | null
  const h = (req.headers.authorization || '').replace('Bearer ', '');
  if (ADMIN_TOKEN && safeEq(h, ADMIN_TOKEN)) return 'admin';
  if (safeEq(h, TOKEN)) return 'user';
  return null;
}

/* ---------- เซิร์ฟเวอร์ ---------- */
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  try {
    if (req.method === 'GET' && STATIC[p]) {
      const [file, type] = STATIC[p];
      return send(res, 200, fs.readFileSync(path.join(__dirname, file)), type);
    }

    if (p === '/api/login' && req.method === 'POST') {
      const ip = req.socket.remoteAddress;
      const f = fails.get(ip) || { n: 0, until: 0 };
      if (Date.now() < f.until) return send(res, 429, { error: 'blocked' });
      const { password } = await readBody(req);
      if (ADMIN_PASSWORD && safeEq(password, ADMIN_PASSWORD)) { fails.delete(ip); return send(res, 200, { token: ADMIN_TOKEN, role: 'admin' }); }
      if (safeEq(password, PASSWORD)) { fails.delete(ip); return send(res, 200, { token: TOKEN, role: 'user' }); }
      f.n++;
      if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
      fails.set(ip, f);
      return send(res, 401, { error: 'wrong' });
    }

    if (p.startsWith('/api/')) {
      const role = authed(req);
      if (!role) return send(res, 401, { error: 'unauthorized' });

      if (p === '/api/records' && req.method === 'GET') { try { await refresh(false); } catch {} return send(res, 200, records); }

      if (p === '/api/records' && req.method === 'POST') {
        const body = await readBody(req);
        const incoming = (Array.isArray(body) ? body : [body]).map(clean).filter(Boolean);
        if (SHEETS_URL) await sheetCall({ action: 'upsert', records: incoming.map(forSheet) });
        incoming.forEach(r => {
          const i = records.findIndex(x => String(x.id) === String(r.id));
          if (i >= 0) records[i] = r; else records.unshift(r);
        });
        persist();
        if (SHEETS_URL) { try { await refresh(true); } catch {} }
        return send(res, 200, records);
      }

      // ลบข้อมูล: เฉพาะแอดมินเท่านั้น
      if (req.method === 'DELETE' && role !== 'admin') return send(res, 403, { error: 'admin only' });

      if (p.startsWith('/api/records/') && req.method === 'DELETE') {
        const id = decodeURIComponent(p.split('/').pop());
        if (SHEETS_URL) await sheetCall({ action: 'delete', id });
        records = records.filter(r => String(r.id) !== id);
        persist();
        return send(res, 200, records);
      }

      if (p === '/api/records' && req.method === 'DELETE') {
        if (SHEETS_URL) await sheetCall({ action: 'wipe' });
        records = [];
        persist();
        return send(res, 200, records);
      }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, e.sheet ? 502 : 400, { error: e.sheet ? 'sheet unavailable' : 'bad request' });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\nHell Week ห้องครูฝึก พร้อมใช้งาน`);
  console.log(`  เครื่องนี้:        http://localhost:${PORT}`);
  Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal)
    .forEach(i => console.log(`  เครื่องอื่นในเน็ตเดียวกัน: http://${i.address}:${PORT}`));
  console.log(`  ไฟล์ข้อมูล:         ${DATA_FILE}`);
  console.log(ADMIN_PASSWORD ? '  แอดมิน: ตั้งรหัสแอดมินแล้ว (ลบข้อมูลได้เฉพาะแอดมิน)' : '  คำเตือน: ยังไม่ได้ตั้ง HW_ADMIN_PASSWORD จึงไม่มีใครลบข้อมูลได้');
  console.log(SHEETS_URL ? '  โหมด: เชื่อม Google Sheet' : '  โหมด: เก็บในไฟล์ data.json (ยังไม่ได้ตั้ง SHEETS_URL)');
  initSheets().then(() => console.log(''));
});