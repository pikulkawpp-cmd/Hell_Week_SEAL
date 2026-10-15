/* =========================================================
   เซิร์ฟเวอร์กลางของระบบครูฝึก Hell Week (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
   รัน:  node server.js     แล้วเปิด http://localhost:3000

   รหัสผ่าน
     HW_PASSWORD        รหัสครูฝึก (ค่าเริ่มต้น 0104) ดู/บันทึก/แก้ไข/อนุญาตสอบได้ แต่ลบไม่ได้
     HW_ADMIN_PASSWORD  รหัสแอดมิน (ต้องตั้ง และต้องไม่ซ้ำรหัสครูฝึก) ลบข้อมูลได้เฉพาะแอดมิน
   กองต่าง ๆ (ล็อกอินแยกแผนก ชื่อ + รหัสของกอง) ตั้งรหัสที่อยากเปิดใช้เท่านั้น ไม่ตั้ง = กองนั้นยังเข้าไม่ได้
     HW_PASS_OFFICE   กองธุรการ      HW_PASS_SPECIAL  กองรบพิเศษ      HW_PASS_SUPPORT  กองสนับสนุน
     สมาชิกกองเห็นเฉพาะหลักสูตรเข้ากอง / กดการทำงาน / คลังความรู้และหน้าที่ของกองตัวเอง
     แอดมินดูได้ทุกกอง ครูฝึก (กองฝึก) เห็นเหมือนเดิมและดูข้อมูลกองอื่นไม่ได้
   ระบบสอบออนไลน์
     นักเรียนเข้าด้วยชื่อ+อีเมล → ขอสอบ → ครูฝึกอนุญาต → สอบ → บันทึกคะแนนวิชาการอัตโนมัติ
     EXAM_MINUTES       เวลาสอบเป็นนาที (ค่าเริ่มต้น 45)
   เนื้อหาหลักสูตร/เฉลยอยู่ที่ course-data.js และหน้าครูฝึกอยู่ที่ staff.html
     สองไฟล์นี้ไม่เปิดให้ดาวน์โหลดตรง ส่งให้เฉพาะครูฝึกที่ล็อกอินแล้วเท่านั้น

   เชื่อม Google Sheet (ไม่บังคับ): SHEETS_URL, SHEETS_KEY  (ต้องใช้ Node 18+)
   ข้อมูลอื่นเก็บที่ data.json และ exam-state.json (เปลี่ยนที่เก็บด้วย DATA_DIR)
   ========================================================= */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const COURSE = require('./course-data.js');
const DEPT_DATA = require('./dept-data.js');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.HW_PASSWORD || '0104';
const ADMIN_PASSWORD = process.env.HW_ADMIN_PASSWORD || '';
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const EXAM_FILE = path.join(DATA_DIR, 'exam-state.json');
const DUTY_FILE = path.join(DATA_DIR, 'duty-log.json');
const SHEETS_URL = process.env.SHEETS_URL || '';
const SHEETS_KEY = process.env.SHEETS_KEY || '';
const EXAM_MINUTES = Number(process.env.EXAM_MINUTES) || 45;
const GRACE_MS = 60 * 1000;
const MAX_BODY = 30 * 1024 * 1024;

const DEPTS = {
  office:  { name: 'กองธุรการ',   pass: process.env.HW_PASS_OFFICE  || '' },
  special: { name: 'กองรบพิเศษ',  pass: process.env.HW_PASS_SPECIAL || '' },
  support: { name: 'กองสนับสนุน', pass: process.env.HW_PASS_SUPPORT || '' }
};
{
  const all = [['HW_PASSWORD', PASSWORD], ['HW_ADMIN_PASSWORD', ADMIN_PASSWORD], ...Object.entries(DEPTS).map(([k, d]) => ['HW_PASS_' + k.toUpperCase(), d.pass])].filter(x => x[1]);
  const seen = new Map();
  for (const [k, v] of all) {
    if (seen.has(v)) { console.error(`ผิดพลาด: ${k} ซ้ำกับ ${seen.get(v)} (รหัสผ่านของแต่ละกองและแอดมินต้องไม่ซ้ำกัน ไม่งั้นสิทธิ์จะปนกัน)`); process.exit(1); }
    seen.set(v, k);
  }
}

const hmac = (key, text) => crypto.createHmac('sha256', key).update(text).digest('hex');
const TOKEN = hmac('hellweek-v1', PASSWORD);
const ADMIN_TOKEN = ADMIN_PASSWORD ? hmac('hellweek-admin-v1', ADMIN_PASSWORD) : '';
const SIGN_KEY = hmac('hellweek-student-v1', PASSWORD + '|' + ADMIN_PASSWORD);
const safeEq = (x, y) => { const a = Buffer.from(String(x ?? '')), b = Buffer.from(String(y ?? '')); return a.length === b.length && crypto.timingSafeEqual(a, b); };

/* หน้าเว็บสาธารณะ (มีแค่หน้าล็อกอินและห้องสอบนักเรียน ไม่มีเนื้อหาหลักสูตร) */
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/script.js': ['script.js', 'text/javascript; charset=utf-8']
};

/* ---------- โทเคน ---------- */
function makeStudentToken(name, email) {
  const p = Buffer.from(JSON.stringify({ n: name, e: email, t: Date.now() + 12 * 3600 * 1000 })).toString('base64url');
  return 's.' + p + '.' + hmac(SIGN_KEY, p);
}
function parseStudent(h) {
  const [pre, p, sig] = h.split('.');
  if (pre !== 's' || !p || !sig || !safeEq(sig, hmac(SIGN_KEY, p))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (Date.now() > d.t) return null;
    return { role: 'student', name: d.n, email: d.e };
  } catch { return null; }
}
function makeDeptToken(dept, name) {   // เซ็นแยกโดเมนจากโทเคนนักเรียน เอาไปใช้ข้ามกันไม่ได้
  const p = Buffer.from(JSON.stringify({ d: dept, n: name, t: Date.now() + 12 * 3600 * 1000 })).toString('base64url');
  return 'd.' + p + '.' + hmac(SIGN_KEY, 'd.' + p);
}
function parseDept(h) {
  const [pre, p, sig] = h.split('.');
  if (pre !== 'd' || !p || !sig || !safeEq(sig, hmac(SIGN_KEY, 'd.' + p))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (Date.now() > d.t || !DEPTS[d.d] || !DEPTS[d.d].pass) return null;
    return { role: 'dept', dept: d.d, name: d.n };
  } catch { return null; }
}
function authed(req) {   // คืนค่า { role: 'admin' | 'user' | 'student', ... } หรือ null
  const h = (req.headers.authorization || '').replace('Bearer ', '');
  if (ADMIN_TOKEN && safeEq(h, ADMIN_TOKEN)) return { role: 'admin' };
  if (safeEq(h, TOKEN)) return { role: 'user' };
  if (h.startsWith('s.')) return parseStudent(h);
  if (h.startsWith('d.')) return parseDept(h);
  return null;
}

/* ---------- ข้อมูลผู้เข้ารับการฝึก ---------- */
let records = [];
try { records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); if (!Array.isArray(records)) records = []; } catch { records = []; }

function writeJSON(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}
const persist = () => writeJSON(DATA_FILE, records);
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
async function upsertRecords(incoming) {
  if (SHEETS_URL) await sheetCall({ action: 'upsert', records: incoming.map(forSheet) });
  incoming.forEach(r => {
    const i = records.findIndex(x => String(x.id) === String(r.id));
    if (i >= 0) records[i] = r; else records.unshift(r);
  });
  persist();
  if (SHEETS_URL) { try { await refresh(true); } catch {} }
}

/* ---------- ระบบสอบออนไลน์ ---------- */
let exams = [];
try { exams = JSON.parse(fs.readFileSync(EXAM_FILE, 'utf8')); if (!Array.isArray(exams)) exams = []; } catch { exams = []; }
const persistExams = () => { try { writeJSON(EXAM_FILE, exams); } catch {} };

const norm = s => String(s || '').trim().replace(/\s+/g, ' ');
const skey = (n, e) => norm(n).toLowerCase() + '|' + norm(e).toLowerCase();
const latestFor = (n, e) => { const k = skey(n, e); for (let i = exams.length - 1; i >= 0; i--) if (skey(exams[i].name, exams[i].email) === k) return exams[i]; return null; };
const findRecord = name => records.find(r => norm(r.name).toLowerCase() === norm(name).toLowerCase());
const emailConflict = (name, email) => { const rec = findRecord(name); return !!(rec && rec.email && norm(rec.email).toLowerCase() !== norm(email).toLowerCase()); };

function sweep(r) {
  if (r && r.state === 'inprogress' && Date.now() > r.deadline + GRACE_MS) { r.state = 'expired'; delete r.session; persistExams(); }
  return r;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function studentView(r) {
  if (!r) return { state: 'none', minutes: EXAM_MINUTES, total: COURSE.EXAM.length };
  sweep(r);
  const v = { state: r.state, id: r.id, minutes: EXAM_MINUTES, total: COURSE.EXAM.length };
  if (r.state === 'done') { v.result = r.result; v.subjects = COURSE.SUBJECTS.map(s => s.title); }
  return v;
}
function staffView(r) {
  sweep(r);
  return { id: r.id, name: r.name, email: r.email, state: r.state, requestedAt: r.requestedAt, approvedAt: r.approvedAt, approvedBy: r.approvedBy, startedAt: r.startedAt, finishedAt: r.finishedAt, result: r.result };
}
const staffList = () => exams.slice(-200).reverse().map(staffView);

function sessionPayload(r) {
  return {
    id: r.id,
    remainingMs: Math.max(0, r.deadline - Date.now()),
    questions: r.session.map(it => { const q = COURSE.EXAM[it.i]; return { qid: it.i, text: q.q, options: it.order.map(k => q.o[k]) }; })
  };
}

async function saveExamResult(r) {
  try { await refresh(false); } catch {}
  const sum = r.result.scores.reduce((a, b) => a + b, 0);
  const acad = r.result.scores.map(String);
  const round1 = n => Math.round(n * 10) / 10;
  let rec = findRecord(r.name);
  if (rec) {
    const old = rec.scores || {};
    rec = { ...rec, acad, email: rec.email || r.email, updated: Date.now(),
      scores: { phys: old.phys || 0, acad: sum, disc: old.disc || 0, total: round1((old.phys || 0) + sum + (old.disc || 0)) } };
  } else {
    rec = { id: Date.now(), name: norm(r.name), trainer: 'ระบบสอบออนไลน์',
      date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
      raw: {}, acad, disc: '', team: '', notes: 'สอบวิชาการออนไลน์', email: r.email, photos: [], updated: Date.now(),
      scores: { phys: 0, acad: sum, disc: 0, total: sum } };
  }
  await upsertRecords([rec]);
}

/* ---------- กดการทำงาน (บันทึกเวลาปฏิบัติหน้าที่ของแต่ละกอง) ---------- */
let duty = [];
try { duty = JSON.parse(fs.readFileSync(DUTY_FILE, 'utf8')); if (!Array.isArray(duty)) duty = []; } catch { duty = []; }
let dutySheetOk = !!SHEETS_URL, lastDutyPull = 0;
const persistDuty = () => { try { writeJSON(DUTY_FILE, duty); } catch {} };
const sameName = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();

async function dutyRefresh(force) {   // Google Sheet เป็นหลัก (ถ้าเชื่อมไว้และ Apps Script รองรับ)
  if (!SHEETS_URL || !dutySheetOk || (!force && Date.now() - lastDutyPull < 8000)) return;
  let j;
  try {
    const res = await fetch(SHEETS_URL + (SHEETS_URL.includes('?') ? '&' : '?') + 'action=duty&key=' + encodeURIComponent(SHEETS_KEY), { redirect: 'follow' });
    j = await res.json();
  } catch (e) { throw sheetErr(e); }
  if (!j.ok) throw sheetErr(new Error(j.error || 'sheet error'));
  if (!Array.isArray(j.entries)) { dutySheetOk = false; console.log('  Apps Script ยังเป็นเวอร์ชันเก่า ไม่รองรับบันทึกการปฏิบัติงาน จึงเก็บไว้ที่เซิร์ฟเวอร์เท่านั้น'); return; }
  duty = j.entries; lastDutyPull = Date.now(); persistDuty();
}
async function dutySave(entry) {
  if (SHEETS_URL && dutySheetOk) {
    try { await sheetCall({ action: 'duty_save', entries: [entry] }); }
    catch (e) {
      if (e.message === 'unknown action') { dutySheetOk = false; console.log('  Apps Script ยังเป็นเวอร์ชันเก่า ไม่รองรับบันทึกการปฏิบัติงาน จึงเก็บไว้ที่เซิร์ฟเวอร์เท่านั้น'); }
      else throw e;
    }
  }
  const i = duty.findIndex(x => x.id === entry.id);
  if (i >= 0) duty[i] = entry; else duty.push(entry);
  persistDuty();
}
const openDuty = (dept, name) => duty.find(x => x.dept === dept && !x.end && sameName(x.name, name));

// เส้นทางของกอง: สมาชิกกองใช้ได้เฉพาะกองตัวเอง แอดมินระบุกองเองได้ (?dept= หรือใน body)
async function deptRoutes(req, res, p, url, who) {
  const admin = who.role === 'admin';
  const body = req.method === 'POST' ? await readBody(req) : {};
  const deptId = admin ? (url.searchParams.get('dept') || body.dept || '') : who.dept;
  if (p === '/api/dept/ui' && req.method === 'GET' && !admin) { send(res, 200, fs.readFileSync(path.join(__dirname, 'dept.html')), 'text/html; charset=utf-8'); return true; }
  if (!DEPT_DATA[deptId]) { send(res, 400, { error: 'invalid dept' }); return true; }

  if (p === '/api/dept/content' && req.method === 'GET') { send(res, 200, DEPT_DATA[deptId]); return true; }

  if (p === '/api/dept/duty' && req.method === 'GET') {
    try { await dutyRefresh(false); } catch {}
    const mine = admin ? null : openDuty(deptId, who.name) || null;
    const inDept = duty.filter(x => x.dept === deptId);
    send(res, 200, { dept: deptId, now: Date.now(), me: mine, onDuty: inDept.filter(x => !x.end), entries: [...inDept].sort((a, b) => b.start - a.start).slice(0, 100) });
    return true;
  }

  if (p === '/api/dept/duty/start' && req.method === 'POST' && !admin) {
    try { await dutyRefresh(false); } catch {}
    if (openDuty(deptId, who.name)) { send(res, 409, { error: 'already on duty' }); return true; }
    await dutySave({ id: Date.now() + '-' + crypto.randomInt(1000, 9999), dept: deptId, name: norm(who.name), start: Date.now(), end: null });
    send(res, 200, { ok: true }); return true;
  }

  if (p === '/api/dept/duty/stop' && req.method === 'POST') {
    try { await dutyRefresh(false); } catch {}
    const e = openDuty(deptId, admin ? body.name : who.name);   // แอดมินบังคับเลิกเวรให้คนอื่นได้
    if (!e) { send(res, 409, { error: 'not on duty' }); return true; }
    await dutySave({ ...e, end: Date.now() });
    send(res, 200, { ok: true }); return true;
  }
  return false;
}

/* ---------- ตัวช่วย HTTP ---------- */
const fails = new Map();
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' });
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- เซิร์ฟเวอร์ ---------- */
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  try {
    if (req.method === 'GET' && STATIC[p]) {
      const [file, type] = STATIC[p];
      return send(res, 200, fs.readFileSync(path.join(__dirname, file)), type);
    }

    /* ล็อกอินครูฝึก/แอดมิน */
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

    /* ล็อกอินสมาชิกกอง (กองธุรการ / กองรบพิเศษ / กองสนับสนุน) ด้วยชื่อ + รหัสของกอง แอดมินใช้รหัสแอดมินได้ทุกกอง */
    if (p === '/api/dept/login' && req.method === 'POST') {
      const ip = req.socket.remoteAddress;
      const f = fails.get(ip) || { n: 0, until: 0 };
      if (Date.now() < f.until) return send(res, 429, { error: 'blocked' });
      const b = await readBody(req);
      if (ADMIN_PASSWORD && safeEq(b.password, ADMIN_PASSWORD)) { fails.delete(ip); return send(res, 200, { token: ADMIN_TOKEN, role: 'admin' }); }
      const d = DEPTS[b.dept];
      if (!d) return send(res, 400, { error: 'invalid dept' });
      if (!d.pass) return send(res, 403, { error: 'not configured' });
      if (safeEq(b.password, d.pass)) {
        const name = norm(b.name);
        if (name.length < 2 || name.length > 40 || /[<>]/.test(name)) return send(res, 400, { error: 'invalid name' });
        fails.delete(ip);
        return send(res, 200, { token: makeDeptToken(b.dept, name), role: 'dept', dept: b.dept, deptName: d.name, name });
      }
      f.n++;
      if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
      fails.set(ip, f);
      return send(res, 401, { error: 'wrong' });
    }

    /* ล็อกอินนักเรียน (ชื่อ + อีเมล) */
    if (p === '/api/student/login' && req.method === 'POST') {
      const b = await readBody(req);
      const name = norm(b.name), email = norm(b.email);
      if (name.length < 2 || name.length > 40 || /[<>]/.test(name) || email.length > 80 || !EMAIL_RE.test(email)) return send(res, 400, { error: 'invalid' });
      await refresh(false).catch(() => {});
      if (emailConflict(name, email)) return send(res, 409, { error: 'email mismatch' });
      return send(res, 200, { token: makeStudentToken(name, email), name });
    }

    if (p.startsWith('/api/')) {
      const who = authed(req);
      if (!who) return send(res, 401, { error: 'unauthorized' });
      const role = who.role;

      /* ===== นักเรียน: ทำได้เฉพาะเรื่องสอบของตัวเองเท่านั้น ===== */
      if (role === 'student') {
        if (p === '/api/exam/status' && req.method === 'GET') return send(res, 200, studentView(latestFor(who.name, who.email)));

        if (p === '/api/exam/request' && req.method === 'POST') {
          if (emailConflict(who.name, who.email)) return send(res, 409, { error: 'email mismatch' });
          let r = sweep(latestFor(who.name, who.email));
          if (!r || !['pending', 'approved', 'inprogress'].includes(r.state)) {
            r = { id: Date.now() + '-' + crypto.randomInt(1000, 9999), name: who.name, email: who.email, state: 'pending', requestedAt: Date.now() };
            exams.push(r); persistExams();
          }
          return send(res, 200, studentView(r));
        }

        if (p === '/api/exam/start' && req.method === 'POST') {
          const r = sweep(latestFor(who.name, who.email));
          if (!r || !['approved', 'inprogress'].includes(r.state)) return send(res, 409, { error: 'not approved' });
          if (r.state === 'approved') {
            r.session = shuffle(COURSE.EXAM.map((_, i) => i)).map(i => ({ i, order: shuffle([0, 1, 2, 3]) }));
            r.state = 'inprogress'; r.startedAt = Date.now(); r.deadline = Date.now() + EXAM_MINUTES * 60000;
            persistExams();
          }
          return send(res, 200, sessionPayload(r));
        }

        if (p === '/api/exam/submit' && req.method === 'POST') {
          const r = sweep(latestFor(who.name, who.email));
          if (!r || r.state !== 'inprogress') return send(res, 409, { error: r && r.state === 'expired' ? 'expired' : 'not in progress' });
          const { answers } = await readBody(req);
          const ans = answers && typeof answers === 'object' ? answers : {};
          const scores = COURSE.SUBJECTS.map(() => 0);
          r.session.forEach(it => {
            const q = COURSE.EXAM[it.i];
            const chosen = ans[it.i];
            if (Number.isInteger(chosen) && chosen >= 0 && chosen <= 3 && it.order[chosen] === q.a) scores[q.s]++;
          });
          const done = { ...r, result: { scores, total: scores.reduce((a, b) => a + b, 0) }, state: 'done', finishedAt: Date.now() };
          await saveExamResult(done);   // ถ้าบันทึกไม่สำเร็จ (เช่น Sheet ล่ม) จะ throw และนักเรียนส่งซ้ำได้
          Object.assign(r, done); delete r.session; persistExams();
          return send(res, 200, studentView(r));
        }
        return send(res, 403, { error: 'forbidden' });
      }

      /* ===== สมาชิกกอง: ใช้ได้เฉพาะเส้นทางของกองตัวเองเท่านั้น ===== */
      if (role === 'dept') {
        if (p.startsWith('/api/dept/') && await deptRoutes(req, res, p, url, who)) return;
        return send(res, 403, { error: 'forbidden' });
      }

      /* ===== ครูฝึก / แอดมิน ===== */
      if (p.startsWith('/api/dept/')) {   // ข้อมูลกองต่าง ๆ ดูได้เฉพาะแอดมิน (ครูฝึกเห็นเหมือนเดิม ไม่เห็นกองอื่น)
        if (role !== 'admin') return send(res, 403, { error: 'admin only' });
        if (await deptRoutes(req, res, p, url, who)) return;
      }
      if (p === '/api/ui' && req.method === 'GET') return send(res, 200, fs.readFileSync(path.join(__dirname, 'staff.html')), 'text/html; charset=utf-8');
      if (p === '/api/course' && req.method === 'GET') return send(res, 200, COURSE);

      if (p === '/api/exam/requests' && req.method === 'GET') return send(res, 200, staffList());
      if ((p === '/api/exam/approve' || p === '/api/exam/deny') && req.method === 'POST') {
        const { id } = await readBody(req);
        const r = exams.find(x => x.id === id);
        if (!r) return send(res, 404, { error: 'not found' });
        sweep(r);
        if (p.endsWith('approve') && ['pending', 'denied'].includes(r.state)) { r.state = 'approved'; r.approvedAt = Date.now(); r.approvedBy = role === 'admin' ? 'แอดมิน' : 'ครูฝึก'; }
        if (p.endsWith('deny') && ['pending', 'approved'].includes(r.state)) { r.state = 'denied'; }
        persistExams();
        return send(res, 200, staffList());
      }

      if (p === '/api/records' && req.method === 'GET') { try { await refresh(false); } catch {} return send(res, 200, records); }

      if (p === '/api/records' && req.method === 'POST') {
        const body = await readBody(req);
        const incoming = (Array.isArray(body) ? body : [body]).map(clean).filter(Boolean);
        await upsertRecords(incoming);
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
  console.log('  กองต่าง ๆ: ' + Object.values(DEPTS).map(d => d.name + (d.pass ? ' (เปิด)' : ' (ยังไม่ได้ตั้งรหัส)')).join(' | '));
  console.log(`  ห้องสอบนักเรียน: เวลาสอบ ${EXAM_MINUTES} นาที ข้อสอบ ${COURSE.EXAM.length} ข้อ`);
  console.log(SHEETS_URL ? '  โหมด: เชื่อม Google Sheet' : '  โหมด: เก็บในไฟล์ data.json (ยังไม่ได้ตั้ง SHEETS_URL)');
  initSheets().then(() => dutyRefresh(true).catch(() => {})).then(() => console.log(''));
});
