/* =========================================================
   เซิร์ฟเวอร์กลางของระบบครูฝึก Hell Week (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
   รัน:  node server.js     แล้วเปิด http://localhost:3000
   รหัสผ่านเริ่มต้น 0104 (เปลี่ยนได้ด้วย HW_PASSWORD)
   ข้อมูลทุกคนเก็บรวมที่ data.json (เปลี่ยนที่เก็บได้ด้วย DATA_DIR)
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
const TOKEN = crypto.createHmac('sha256', 'hellweek-v1').update(PASSWORD).digest('hex');
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
function authed(req) {
  const h = (req.headers.authorization || '').replace('Bearer ', '');
  const a = Buffer.from(h), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
      const a = Buffer.from(String(password ?? '')), b = Buffer.from(PASSWORD);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) { fails.delete(ip); return send(res, 200, { token: TOKEN }); }
      f.n++;
      if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
      fails.set(ip, f);
      return send(res, 401, { error: 'wrong' });
    }

    if (p.startsWith('/api/')) {
      if (!authed(req)) return send(res, 401, { error: 'unauthorized' });

      if (p === '/api/records' && req.method === 'GET') return send(res, 200, records);

      if (p === '/api/records' && req.method === 'POST') {
        const body = await readBody(req);
        const incoming = (Array.isArray(body) ? body : [body]).map(clean).filter(Boolean);
        incoming.forEach(r => {
          const i = records.findIndex(x => String(x.id) === String(r.id));
          if (i >= 0) records[i] = r; else records.unshift(r);
        });
        persist();
        return send(res, 200, records);
      }

      if (p.startsWith('/api/records/') && req.method === 'DELETE') {
        const id = decodeURIComponent(p.split('/').pop());
        records = records.filter(r => String(r.id) !== id);
        persist();
        return send(res, 200, records);
      }

      if (p === '/api/records' && req.method === 'DELETE') {
        records = [];
        persist();
        return send(res, 200, records);
      }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 400, { error: 'bad request' });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\nHell Week ห้องครูฝึก พร้อมใช้งาน`);
  console.log(`  เครื่องนี้:        http://localhost:${PORT}`);
  Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal)
    .forEach(i => console.log(`  เครื่องอื่นในเน็ตเดียวกัน: http://${i.address}:${PORT}`));
  console.log(`  ไฟล์ข้อมูล:         ${DATA_FILE}\n`);
});