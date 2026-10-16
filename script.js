/* =========================================================
   Hell Week — ระบบครูฝึก SEAL Roleplay
   1) ข้อมูลหลักสูตร  2) ตัวช่วย  3) ล็อกอิน  4) หน้าต่าง ๆ
   5) ฟอร์มบันทึกผล  6) สร้างภาพรายงาน  7) เริ่มทำงาน
   ========================================================= */

/* ---------- 1) ข้อมูลหลักสูตร (แก้ตัวเลขได้ที่นี่) ---------- */
// ข้อมูลหลักสูตรและข้อสอบถูกส่งจากเซิร์ฟเวอร์หลังครูฝึกล็อกอินเท่านั้น (ดู loadCourse)
let STATIONS = [], SUBJECTS = [], GLOSSARY = [], EXAM = [], COURSES = [];

const STORE_KEY = 'hellweek_records_v1';
const TOKEN_KEY = 'hellweek_token';
const ROLE_KEY = 'hellweek_role';
const SESSION_KEY = 'hellweek_session';

/* ---------- 2) ตัวช่วย ---------- */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const num = v => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const round1 = n => Math.round(n * 10) / 10;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } }

function gradeOf(total) {
  if (total >= 80) return { key: 'pass', text: 'ผ่านหลักสูตร Hell Week', short: 'ผ่าน', color: '#2fb5a3', css: 'var(--teal)' };
  if (total >= 60) return { key: 'wait', text: 'รอประเมินซ้ำ', short: 'รอประเมินซ้ำ', color: '#e8b02f', css: 'var(--amber)' };
  return { key: 'fail', text: 'ไม่ผ่านหลักสูตร', short: 'ไม่ผ่าน', color: '#e0544f', css: 'var(--red)' };
}

// รายชื่อที่ยังไม่มีผลกรอกเลย (เช่น เพิ่มชื่อไว้ล่วงหน้า) ไม่นับเป็น "ไม่ผ่าน"
const hasVal = v => String(v ?? '').trim() !== '';
const isBlank = r => !Object.values(r.raw || {}).some(hasVal) && !(r.acad || []).some(hasVal) && !hasVal(r.disc) && !hasVal(r.team);
const gradeOfRec = r => isBlank(r)
  ? { key: 'none', text: 'ยังไม่ประเมิน', short: 'ยังไม่ประเมิน', color: '#8fa9b5', css: 'var(--steel)' }
  : gradeOf(r.scores.total);

/* ---------- 3) ข้อมูลร่วมกันทุกเครื่อง + ล็อกอิน ----------
   MODE 'server' = รันผ่าน server.js ทุกเครื่องเห็นข้อมูลชุดเดียวกัน
   MODE 'local'  = เปิดไฟล์ตรง ๆ เก็บ localStorage เฉพาะเครื่องนี้ */
let MODE = 'server';
let TOKEN = sessionStorage.getItem(TOKEN_KEY) || '';
let ROLE = sessionStorage.getItem(ROLE_KEY) || 'user';
const isAdmin = () => ROLE === 'admin';
let CACHE = [];
let syncTimer = null, lastSig = '';

const getRecords = () => CACHE;
const sigOf = list => list.map(r => r.id + ':' + (r.updated || 0) + ':' + (r.scores?.total ?? 0)).join('|');
const fixScores = list => list.map(r => ({ ...r, scores: scoresOf(r) }));

async function api(path, opt = {}) {
  const res = await fetch('/api' + path, { ...opt, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN } });
  if (res.status === 401) { logout(); throw new Error('401'); }
  if (res.status === 403) throw new Error('403');
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
async function loadCourse() {
  const d = await api('/course');
  STATIONS = d.STATIONS; SUBJECTS = d.SUBJECTS; GLOSSARY = d.GLOSSARY; EXAM = d.EXAM; COURSES = d.COURSES || [];
}
async function pull() {
  CACHE = fixScores(await api('/records'));
  lastSig = sigOf(CACHE);
}
async function upsertRecords(recs) {
  try {
    if (MODE === 'server') { CACHE = fixScores(await api('/records', { method: 'POST', body: JSON.stringify(recs) })); }
    else {
      const backup = CACHE;
      const next = [...CACHE];
      recs.forEach(r => { const i = next.findIndex(x => x.id === r.id); i >= 0 ? next[i] = r : next.unshift(r); });
      CACHE = next;
      if (!save(STORE_KEY, CACHE)) { CACHE = backup; return false; }
    }
    lastSig = sigOf(CACHE);
    return true;
  } catch { return false; }
}
async function deleteRecord(id) {
  if (!isAdmin()) { toast('ลบข้อมูลได้เฉพาะแอดมิน'); return; }
  try {
    if (MODE === 'server') CACHE = fixScores(await api('/records/' + encodeURIComponent(id), { method: 'DELETE' }));
    else { CACHE = CACHE.filter(r => r.id != id); save(STORE_KEY, CACHE); }
    lastSig = sigOf(CACHE);
  } catch (e) { toast(e.message === '403' ? 'ลบข้อมูลได้เฉพาะแอดมิน' : 'ลบไม่สำเร็จ'); }
}
async function wipeAll() {
  if (!isAdmin()) { toast('ลบข้อมูลได้เฉพาะแอดมิน'); return; }
  try {
    if (MODE === 'server') CACHE = fixScores(await api('/records', { method: 'DELETE' }));
    else { CACHE = []; localStorage.removeItem(STORE_KEY); }
    lastSig = '';
  } catch (e) { toast(e.message === '403' ? 'ลบข้อมูลได้เฉพาะแอดมิน' : 'ลบไม่สำเร็จ'); }
}
async function sync() {
  if (MODE !== 'server' || document.hidden) return;
  loadExamRequests();
  try {
    const list = fixScores(await api('/records'));
    const sig = sigOf(list);
    if (sig === lastSig) return;
    CACHE = list; lastSig = sig;
    const v = $$('.view').find(x => !x.hidden)?.id;
    if (v === 'v-dashboard') renderDashboard();
    if (v === 'v-trainees') renderRecords();
    if (v === 'v-settings') renderStorage();
  } catch {}
}

let fails = 0, lockedUntil = 0;
const showWrong = () => {
  fails++;
  if (fails >= 3) { lockedUntil = Date.now() + 15000; fails = 0; $('#lockErr').textContent = 'ลองผิด 3 ครั้ง ระบบล็อก 15 วินาที'; }
  else $('#lockErr').textContent = 'รหัสผ่านไม่ถูกต้อง';
  $('#lockPass').select();
};

async function onLogin(e) {
  e.preventDefault();
  $('#lockErr').textContent = '';
  const pass = $('#lockPass').value;
  if (Date.now() < lockedUntil) { $('#lockErr').textContent = `ลองผิดหลายครั้ง รออีก ${Math.ceil((lockedUntil - Date.now()) / 1000)} วินาที`; return; }

  let res = null;
  const division = $('#divSel').value;   // แอดมินและครูฝึกตรวจรหัสผ่านผ่าน endpoint กลาง
  const isCentralLogin = division === 'training' || division === 'admin';
  const url = isCentralLogin ? '/api/login' : '/api/dept/login';
  const payload = isCentralLogin ? { password: pass } : { password: pass, dept: division, name: $('#divName').value.trim() };
  try { res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch {}

  if (res && res.ok) {
    const d = await res.json();
    TOKEN = d.token; ROLE = d.role === 'admin' ? 'admin' : d.role === 'dept' ? 'dept' : 'user';
    sessionStorage.setItem(TOKEN_KEY, TOKEN);
    sessionStorage.setItem(ROLE_KEY, ROLE);
    if (ROLE === 'dept') {   // สมาชิกกอง: ไม่โหลดข้อมูลครูฝึก
      sessionStorage.setItem('hellweek_sname', d.name);
      try { await enterDept(); } catch { $('#lockErr').textContent = 'โหลดหน้าของกองไม่สำเร็จ ลองใหม่อีกครั้ง'; }
      return;
    }
    MODE = 'server';
    try { await loadCourse(); await pull(); } catch { $('#lockErr').textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'; return; }
    return enterApp();
  }
  if (res && res.status === 401) return showWrong();
  if (res && res.status === 429) { $('#lockErr').textContent = 'ลองผิดหลายครั้ง รอ 1 นาทีแล้วลองใหม่'; return; }
  if (res && res.status === 403) { $('#lockErr').textContent = 'กองนี้ยังไม่เปิดใช้งาน (ยังไม่ได้ตั้งรหัสผ่านของกอง)'; return; }
  if (res && res.status === 400) { $('#lockErr').textContent = 'กรอกชื่อสมาชิก 2–40 ตัวอักษร'; return; }
  $('#lockErr').textContent = 'ไม่พบเซิร์ฟเวอร์ ต้องเปิดผ่านลิงก์ของเว็บหรือรัน node server.js เท่านั้น';
}

async function enterApp() {
  sessionStorage.setItem(SESSION_KEY, '1');
  if (!$('#app')) {   // หน้าครูฝึกไม่อยู่ใน index.html ต้องขอจากเซิร์ฟเวอร์ด้วยโทเคนครูฝึก
    try {
      const r = await fetch('/api/ui', { headers: { Authorization: 'Bearer ' + TOKEN } });
      if (!r.ok) throw new Error();
      $('#appHost').innerHTML = await r.text();
    } catch { $('#lockErr').textContent = 'โหลดหน้าครูฝึกไม่สำเร็จ ลองใหม่อีกครั้ง'; return; }
  }
  document.body.classList.remove('locked');
  $('#app').hidden = false;
  $('#roleBadge').textContent = isAdmin() ? 'แอดมิน (ลบข้อมูลได้)' : 'ครูฝึก (ลบข้อมูลไม่ได้)';
  $('#roleBadge').className = 'role ' + ROLE;
  $('#wipeBtn').hidden = !isAdmin();
  $('#wipeNote').hidden = isAdmin();
  $('#navDepts').hidden = !isAdmin();   // แอดมินเห็นทุกกอง
  $('#modeBadge').className = 'mode ' + MODE;
  $('#modeBadge').textContent = MODE === 'server' ? 'ข้อมูลร่วมทุกเครื่อง' : 'เก็บเฉพาะเครื่องนี้';
  $('#modeInfo').textContent = MODE === 'server'
    ? 'เชื่อมต่อเซิร์ฟเวอร์แล้ว ครูฝึกทุกคนที่ล็อกอินจะเห็นและแก้ไขข้อมูลชุดเดียวกัน อัปเดตอัตโนมัติทุก 10 วินาที'
    : 'ไม่ได้เชื่อมต่อเซิร์ฟเวอร์ ข้อมูลเก็บใน localStorage ของเครื่องนี้เท่านั้น หากต้องการให้ทุกเครื่องเห็นข้อมูลร่วมกัน ให้รัน node server.js แล้วเปิดผ่านที่อยู่ของเซิร์ฟเวอร์';
  if (!enterApp.done) { initApp(); enterApp.done = true; }
  clearInterval(syncTimer);
  if (MODE === 'server') syncTimer = setInterval(sync, 10000);
  show(location.hash.slice(1) || 'dashboard');
  loadExamRequests();
}
function logout() {
  [SESSION_KEY, TOKEN_KEY, ROLE_KEY, 'hellweek_sname'].forEach(k => sessionStorage.removeItem(k));
  clearInterval(syncTimer);
  location.hash = '';
  location.reload();   // เคลียร์หน้าครูฝึก/ข้อสอบออกจากหน่วยความจำทั้งหมด
}
async function resume() {
  if (sessionStorage.getItem(SESSION_KEY) !== '1' || !TOKEN) return;
  try {
    if (ROLE === 'student') return enterStudent(sessionStorage.getItem('hellweek_sname') || '');
    if (ROLE === 'dept') return enterDept();
    await loadCourse();
    await pull();
    await enterApp();
  } catch { logout(); }
}

/* ---------- 4) หน้าต่าง ๆ ---------- */
function show(view) {
  if (!$('#v-' + view) || (view === 'depts' && !isAdmin())) view = 'dashboard';
  $$('.view').forEach(v => v.hidden = v.id !== 'v-' + view);
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  if (view === 'dashboard') renderDashboard();
  if (view === 'trainees') renderRecords();
  if (view === 'settings') renderStorage();
  if (view === 'exams') loadExamRequests();
  if (view === 'depts') loadAdminDept();
  window.scrollTo(0, 0);
}

function renderDashboard() {
  const list = getRecords();
  const c = { pass: 0, wait: 0, fail: 0, none: 0 };
  list.forEach(r => c[gradeOfRec(r).key]++);
  const graded = list.filter(r => !isBlank(r));
  const avg = graded.length ? round1(graded.reduce((a, r) => a + r.scores.total, 0) / graded.length) : 0;
  $('#stats').innerHTML = `
    <div class="stat"><b>${list.length}</b><span>ผู้เข้ารับการฝึกทั้งหมด</span></div>
    <div class="stat none"><b>${c.none}</b><span>ยังไม่ประเมิน</span></div>
    <div class="stat pass"><b>${c.pass}</b><span>ผ่าน</span></div>
    <div class="stat wait"><b>${c.wait}</b><span>รอประเมินซ้ำ</span></div>
    <div class="stat fail"><b>${c.fail}</b><span>ไม่ผ่าน</span></div>
    <div class="stat avg"><b>${avg}</b><span>คะแนนเฉลี่ย / 100</span></div>`;
  $('#splitBar').innerHTML = graded.length
    ? `<i style="flex:${c.pass};background:var(--teal)"></i><i style="flex:${c.wait};background:var(--amber)"></i><i style="flex:${c.fail};background:var(--red)"></i>` : '';
  const recent = [...list].sort((a, b) => b.id - a.id).slice(0, 5);
  $('#recentList').innerHTML = recent.length ? recent.map(r => {
    const g = gradeOfRec(r);
    return `<div class="recent-item"><div>${esc(r.name)}<small>${esc(r.date || '-')} · ครูฝึก ${esc(r.trainer || '-')}</small></div>
      <b>${isBlank(r) ? '-' : r.scores.total + '/100'}</b><span class="tag ${g.key}">${g.short}</span></div>`;
  }).join('') : `<div class="empty-box">ยังไม่มีบันทึก กด "บันทึกผลใหม่" เพื่อเริ่ม</div>`;
}

function stationCards() {
  const total = STATIONS.reduce((a, x) => a + x.pts, 0);
  return `<section class="c-sec"><h4>การให้คะแนนหมวดกายภาพ (รวม ${total} คะแนน)</h4>
    <p class="sub">${STATIONS.length} ด่าน ครูฝึกนับและบันทึกผลเอง</p>
    <div class="stations">${STATIONS.map(x => `
      <article class="station"><span class="pts">${x.pts} คะแนน</span>
        <div class="target">${x.min === x.full ? x.min : x.min + '–' + x.full}<span>${esc(x.unit)}</span></div>
        <h4>${esc(x.name)}</h4><p>${esc(x.note)}</p></article>`).join('')}</div>
    <p class="note">วิธีให้คะแนน: ครูฝึกกรอกว่านักเรียนทำได้เท่าไร และกำหนดเต็มเท่าไร (ตั้งได้ตามช่วงบนการ์ด ถ้าไม่กรอกจะใช้ค่าสูงสุด) คะแนนของด่าน = ทำได้ ÷ เต็ม x คะแนนด่าน เช่น เต็ม 500 ทำได้ 250 = ครึ่งหนึ่งของ 5 คะแนน</p></section>`;
}
function courseHTML(c, extra = '') {   // สร้าง HTML ของหลักสูตร/หัวข้อ (ใช้ทั้งคู่มือหลักสูตรและหน้าของกอง)
  const tag = x => x.ordered ? 'ol' : 'ul';
  return `<h3 class="c-title">${esc(c.title)}</h3>` +
    (c.subtitle ? `<p class="sub">${esc(c.subtitle)}</p>` : '') +
    (c.intro ? `<div class="why">${esc(c.intro)}</div>` : '') +
    extra +
    c.sections.map(x => `<section class="c-sec"><h4>${esc(x.heading)}</h4>` +
      (x.text ? `<p>${esc(x.text)}</p>` : '') +
      (x.items ? `<${tag(x)} class="c-list">${x.items.map((i, n) => `<li data-no="${i && i.no ? i.no : n + 1}">${esc(i && i.text ? i.text : i)}</li>`).join('')}</${tag(x)}>` : '') +
      `</section>`).join('') +
    (c.note ? `<p class="note">${esc(c.note)}</p>` : '');
}
function renderCourse() {
  COURSES.forEach(c => {
    const pane = $('#tab-' + c.id);
    if (pane) pane.innerHTML = courseHTML(c, c.id === 'hellweek' ? stationCards() : '');
  });

  $('#subjectList').innerHTML = SUBJECTS.map(s => `
    <details class="subject"><summary>${esc(s.title)} <span class="badge">5 คะแนน</span></summary>
      <div class="subject-body">
        <div class="why"><b>วัตถุประสงค์ของวิชา</b>${esc(s.why)}</div>
        <div>${s.topics.map(t => `<div class="topic"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div>`).join('')}</div>
        <div class="example"><b>ตัวอย่างสถานการณ์สอบ</b>${esc(s.example)}</div>
        <div class="criteria"><b>เกณฑ์ให้คะแนน</b>${esc(s.criteria)}</div>
      </div></details>`).join('');

  $('#glossary').innerHTML = GLOSSARY.map(g => `<div class="term"><b>${esc(g[0])}</b><span>${esc(g[1])}</span></div>`).join('');

  const L = ['ก', 'ข', 'ค', 'ง'];
  $('#examList').innerHTML = SUBJECTS.map((sb, si) => `<h3>${esc(sb.title)}</h3>` +
    EXAM.filter(q => q.s === si).map((q, i) => `
      <div class="exam-q"><h4>ข้อ ${i + 1}. ${esc(q.q)}</h4>
        <ul class="opts">${q.o.map((o, j) => `<li class="${j === q.a ? 'ans' : ''}">${L[j]}. ${esc(o)}${j === q.a ? ' ✓' : ''}</li>`).join('')}</ul>
        <p><b>เหตุผล:</b> ${esc(q.e)}</p></div>`).join('')).join('');

  $$('#courseTabs button').forEach(b => b.addEventListener('click', () => {
    $$('#courseTabs button').forEach(x => x.classList.toggle('active', x === b));
    $$('.pane').forEach(p => p.hidden = p.id !== 'tab-' + b.dataset.tab);
  }));
}

/* ---------- 5) ฟอร์มบันทึกผล ---------- */
function buildForm() {
  $('#physInputs').innerHTML = STATIONS.map(s => `
    <div class="irow irow4">
      <div class="nm">${esc(s.name)}<small>ตั้งเต็มได้ ${s.min === s.full ? s.min : s.min + '–' + s.full} ${s.unit} (เว้นว่าง = ${s.full}) · ${s.pts} คะแนน</small></div>
      <input type="number" min="0" step="any" id="in-${s.id}" placeholder="ทำได้" aria-label="${esc(s.name)} ทำได้">
      <input type="number" min="0" step="any" id="fu-${s.id}" placeholder="เต็ม ${s.full}" aria-label="${esc(s.name)} เต็ม">
      <div class="sc"><span id="sc-${s.id}">0</span>/${s.pts}</div>
    </div>`).join('');
  $('#acadInputs').innerHTML = SUBJECTS.map((s, i) => `
    <div class="irow">
      <div class="nm">${esc(s.title.split(' — ')[0])}<small>${esc(s.title.split(' — ')[1] || '')}</small></div>
      <input type="number" min="0" max="5" step="0.5" id="ac-${i}" placeholder="0–5" aria-label="${esc(s.title)}">
      <div class="sc">/5</div>
    </div>`).join('');
  $('#discInputs').innerHTML = `
    <div class="irow"><div class="nm">วินัย<small>ตรงเวลา ทวนคำสั่ง ระเบียบแถว</small></div>
      <input type="number" min="0" max="10" step="0.5" id="dc-disc" placeholder="0–10"><div class="sc">/10</div></div>
    <div class="irow"><div class="nm">การทำงานเป็นทีม<small>ช่วยเพื่อน สื่อสาร แบ่งหน้าที่</small></div>
      <input type="number" min="0" max="10" step="0.5" id="dc-team" placeholder="0–10"><div class="sc">/10</div></div>`;
  $('#trainDate').valueAsDate = new Date();
  try { $('#trainerName').value = localStorage.getItem('hw_trainer') || ''; } catch {}
  $$('#form input[type=number]').forEach(i => i.addEventListener('input', recalc));
}

// คะแนน = ทำได้ ÷ เต็ม x คะแนนเต็มของด่าน (ไม่เกินคะแนนเต็ม) ถ้าไม่กรอก "เต็ม" ใช้ค่าสูงสุดของด่านนั้น
const stationFull = (s, full) => num(full) > 0 ? num(full) : s.full;
const stationScoreOf = (s, raw, full) => round1(s.pts * clamp(num(raw) / stationFull(s, full), 0, 1));
const stationScore = s => stationScoreOf(s, $('#in-' + s.id).value, $('#fu-' + s.id).value);

function scoresOf(rec) {
  const phys = STATIONS.reduce((a, s) => a + stationScoreOf(s, rec.raw?.[s.id], rec.full?.[s.id]), 0);
  const acad = SUBJECTS.reduce((a, _, i) => a + clamp(num(rec.acad?.[i]), 0, 5), 0);
  const disc = clamp(num(rec.disc), 0, 10) + clamp(num(rec.team), 0, 10);
  return { phys: round1(phys), acad: round1(acad), disc: round1(disc), total: round1(phys + acad + disc) };
}

function weakest(sc) {
  return [['หมวดกายภาพ', sc.phys / 50], ['หมวดวิชาการ', sc.acad / 30], ['วินัยและทีม', sc.disc / 20]].sort((a, b) => a[1] - b[1])[0][0];
}

function recalc() {
  STATIONS.forEach(s => $('#sc-' + s.id).textContent = stationScore(s));
  const sc = scoresOf(collectRecord());
  const g = gradeOf(sc.total), empty = sc.total === 0;
  $('#sumPhys').textContent = `${sc.phys} / 50`;
  $('#sumAcad').textContent = `${sc.acad} / 30`;
  $('#sumDisc').textContent = `${sc.disc} / 20`;
  $('#bPhys').textContent = sc.phys; $('#bAcad').textContent = sc.acad; $('#bDisc').textContent = sc.disc;
  $('#totalNum').textContent = sc.total;
  $('#ring').style.setProperty('--p', sc.total);
  $('#ring').style.setProperty('--c', g.css);
  $('#verdict').textContent = empty ? 'ยังไม่มีคะแนน' : g.text;
  $('#verdict').style.color = empty ? '' : g.css;
  $('#advice').textContent = empty || g.key === 'pass' ? '' : `ควรแจ้งแนวทางแก้ไข จุดที่ต้องเสริมมากที่สุดคือ ${weakest(sc)}`;
}

/* รูปภาพแนบ */
let photos = [];
function compress(file, max = 900, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try { photos.push(await compress(f)); } catch { toast('เปิดรูปนี้ไม่ได้'); }
  }
  renderThumbs();
}
function renderThumbs() {
  $('#thumbs').innerHTML = photos.map((p, i) => `
    <div class="thumb"><img src="${p}" alt="ภาพผลการฝึก ${i + 1}" data-view="${i}">
    <button type="button" data-del="${i}" aria-label="ลบรูป">×</button></div>`).join('');
}
function setupPhotos() {
  const drop = $('#drop');
  $('#photoInput').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  document.addEventListener('paste', e => {
    if ($('#v-record').hidden) return;
    const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
    if (files.length) addFiles(files);
  });
  $('#thumbs').addEventListener('click', e => {
    if (e.target.dataset.del !== undefined) { photos.splice(+e.target.dataset.del, 1); renderThumbs(); }
    if (e.target.dataset.view !== undefined) openLightbox(photos[+e.target.dataset.view]);
  });
  $('#closeLb').onclick = () => $('#lightbox').close();
}
function openLightbox(src, download) {
  $('#lightbox img').src = src;
  const dl = $('#dlBtn');
  dl.hidden = !download;
  if (download) { dl.href = src; dl.download = download; }
  $('#lightbox').showModal();
}

/* บันทึก / โหลด */
let editingId = null;

function collectRecord() {
  const raw = {};
  const full = {};
  STATIONS.forEach(s => { raw[s.id] = $('#in-' + s.id).value; full[s.id] = $('#fu-' + s.id).value; });
  const rec = {
    id: editingId || Date.now(),
    name: $('#traineeName').value.trim(),
    trainer: $('#trainerName').value.trim(),
    date: $('#trainDate').value,
    raw, full,
    acad: SUBJECTS.map((_, i) => $('#ac-' + i).value),
    disc: $('#dc-disc').value,
    team: $('#dc-team').value,
    notes: $('#notes').value.trim(),
    photos: [...photos]
  };
  const prev = editingId ? CACHE.find(x => x.id === editingId) : null;
  if (prev?.email) rec.email = prev.email;
  rec.scores = scoresOf(rec);
  return rec;
}

function fillForm(r) {
  editingId = r.id;
  $('#recordTitle').textContent = `แก้ไขผล: ${r.name}`;
  $('#traineeName').value = r.name;
  $('#trainerName').value = r.trainer || '';
  $('#trainDate').value = r.date || '';
  STATIONS.forEach(s => { $('#in-' + s.id).value = r.raw?.[s.id] ?? ''; $('#fu-' + s.id).value = r.full?.[s.id] ?? ''; });
  SUBJECTS.forEach((_, i) => $('#ac-' + i).value = r.acad?.[i] ?? '');
  $('#dc-disc').value = r.disc ?? '';
  $('#dc-team').value = r.team ?? '';
  $('#notes').value = r.notes || '';
  photos = [...(r.photos || [])];
  renderThumbs();
  recalc();
}
function resetForm() {
  editingId = null;
  $('#recordTitle').textContent = 'บันทึกผลการฝึก';
  $('#form').reset();
  $('#trainDate').valueAsDate = new Date();
  try { $('#trainerName').value = localStorage.getItem('hw_trainer') || ''; } catch {}
  photos = [];
  renderThumbs();
  recalc();
}

async function onSubmit(e) {
  e.preventDefault();
  const rec = collectRecord();
  if (!rec.name) { toast('กรอกชื่อ Roblox ก่อน'); return; }
  rec.updated = Date.now();
  if (!editingId) {
    const dup = getRecords().find(x => x.name.trim().toLowerCase() === rec.name.toLowerCase());
    if (dup && confirm(`มีผู้เข้ารับการฝึกชื่อ "${dup.name}" อยู่แล้ว (เช่น จากการสอบออนไลน์)\nกด ตกลง เพื่ออัปเดตรายการเดิม (คะแนนวิชาการที่ช่องว่างจะคงค่าเดิมไว้)\nกด ยกเลิก เพื่อสร้างเป็นรายการใหม่`)) {
      rec.id = dup.id; rec.email = dup.email || '';
      rec.acad = rec.acad.map((v, i) => v === '' ? (dup.acad?.[i] ?? '') : v);
      if (!rec.photos.length) rec.photos = dup.photos || [];
      rec.scores = scoresOf(rec);
    }
  }
  if (!(await upsertRecords([rec]))) { toast(MODE === 'server' ? 'บันทึกไม่สำเร็จ ตรวจการเชื่อมต่อเซิร์ฟเวอร์' : 'พื้นที่เก็บข้อมูลเต็ม ลองลบรูปหรือสำรอง JSON ก่อน'); return; }
  try { localStorage.setItem('hw_trainer', rec.trainer); } catch {}
  toast(`บันทึกผลของ ${rec.name} แล้ว`);
  resetForm();
  show('trainees');
}

/* รายชื่อ */
function renderRecords() {
  const q = $('#search').value.trim().toLowerCase();
  const gf = $('#filterGrade').value;
  const list = getRecords().filter(r => r.name.toLowerCase().includes(q) && (!gf || gradeOfRec(r).key === gf));
  $('#recordBody').innerHTML = list.length ? list.map(r => {
    const g = gradeOfRec(r);
    return `<tr><td>${esc(r.name)}</td><td>${esc(r.trainer || '-')}</td><td>${esc(r.date || '-')}</td>
      <td>${isBlank(r) ? '-' : r.scores.total + ' / 100'}</td><td><span class="tag ${g.key}">${g.short}</span></td><td>${(r.photos || []).length}</td>
      <td><div class="acts">
        <button class="btn small primary" data-img="${r.id}">ภาพรายงาน</button>
        <button class="btn small" data-edit="${r.id}">แก้ไข</button>
        ${isAdmin() ? `<button class="btn small danger" data-rm="${r.id}">ลบ</button>` : ''}</div></td></tr>`;
  }).join('') : `<tr><td class="empty" colspan="7">ไม่พบรายการ</td></tr>`;
}
async function onTableClick(e) {
  const list = getRecords();
  const find = id => list.find(x => x.id == id);
  if (e.target.dataset.img) { const r = find(e.target.dataset.img); if (r) showReport(r); }
  if (e.target.dataset.edit) {
    const r = find(e.target.dataset.edit);
    if (r) { show('record'); fillForm(r); toast('โหลดข้อมูลมาแก้ไขแล้ว'); }
  }
  if (e.target.dataset.rm) {
    if (!isAdmin()) { toast('ลบข้อมูลได้เฉพาะแอดมิน'); return; }
    const r = find(e.target.dataset.rm);
    if (r && confirm(`ลบผลของ ${r.name}?`)) { await deleteRecord(r.id); renderRecords(); }
  }
}

/* ส่งออก / นำเข้า / Discord */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportCSV() {
  const list = getRecords();
  if (!list.length) return toast('ยังไม่มีข้อมูล');
  const head = ['ชื่อ Roblox', 'ครูฝึก', 'วันที่', 'กายภาพ/50', 'วิชาการ/30', 'วินัยและทีม/20', 'รวม/100', 'ผล', 'หมายเหตุ'];
  const rows = list.map(r => [r.name, r.trainer, r.date, r.scores.phys, r.scores.acad, r.scores.disc, r.scores.total, gradeOfRec(r).text, r.notes]);
  const csv = [head, ...rows].map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download('hellweek-results.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!Array.isArray(incoming)) throw new Error();
      const valid = incoming.filter(r => r && r.id && r.name && r.scores);
      if (!valid.length || !(await upsertRecords(valid))) throw new Error();
      renderRecords();
      toast(`นำเข้าข้อมูล ${valid.length} รายการแล้ว`);
    } catch { toast('ไฟล์ไม่ถูกต้อง'); }
  };
  reader.readAsText(file);
}
function copyDiscord() {
  const r = collectRecord(), g = gradeOf(r.scores.total);
  const text = [
    '**📋 ผลการฝึก Hell Week**',
    `ผู้เข้ารับการฝึก: ${r.name || '-'}`, `ครูฝึกผู้ประเมิน: ${r.trainer || '-'}`, `วันที่: ${r.date || '-'}`, '',
    ...STATIONS.map(s => `- ${s.name} (${num(r.raw[s.id])}/${stationFull(s, r.full?.[s.id])} ${s.unit}): ${stationScoreOf(s, r.raw[s.id], r.full?.[s.id])}/${s.pts}`),
    `**หมวดกายภาพ: ${r.scores.phys}/50**`, `**หมวดวิชาการ: ${r.scores.acad}/30**`, `**วินัยและทีม: ${r.scores.disc}/20**`,
    `**รวม: ${r.scores.total}/100 → ${g.text}**`, r.notes ? `หมายเหตุ: ${r.notes}` : ''
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  (navigator.clipboard?.writeText(text) ?? Promise.reject())
    .then(() => toast('คัดลอกแล้ว นำไปวางใน Discord ได้เลย'))
    .catch(() => prompt('คัดลอกข้อความนี้', text));
}

/* ตั้งค่า */
function renderStorage() {
  const list = getRecords();
  const mb = JSON.stringify(list).length * 2 / 1048576;
  $('#storageInfo').textContent = MODE === 'server'
    ? `ข้อมูลบนเซิร์ฟเวอร์ ${list.length} รายการ (ประมาณ ${mb.toFixed(2)} MB)`
    : `ใช้ไปประมาณ ${mb.toFixed(2)} MB จากราว 5 MB (${list.length} รายการ)`;
  $('#storageBar').style.width = (MODE === 'server' ? Math.min(mb / 50 * 100, 100) : Math.min(mb / 5 * 100, 100)) + '%';
  $('#storageBar').style.background = MODE === 'local' && mb > 4 ? 'var(--red)' : 'var(--teal)';
}
async function wipe() {
  if (!isAdmin()) { toast('ลบข้อมูลได้เฉพาะแอดมิน'); return; }
  const warn = MODE === 'server' ? 'ลบข้อมูลผู้เข้ารับการฝึก "ของทุกเครื่อง" ทั้งหมด? ย้อนกลับไม่ได้' : 'ลบข้อมูลผู้เข้ารับการฝึกทั้งหมด? ย้อนกลับไม่ได้';
  if (confirm(warn) && confirm('ยืนยันอีกครั้ง ลบทั้งหมดจริงหรือไม่?')) {
    await wipeAll();
    renderStorage();
    toast('ลบข้อมูลทั้งหมดแล้ว');
  }
}

/* ---------- 6) สร้างภาพรายงาน (PNG) ---------- */
const FONT = '"Kanit","Sarabun",sans-serif';

function wrapText(ctx, text, maxW) {
  const out = [];
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  text.split('\n').forEach(para => {
    const parts = seg ? [...seg.segment(para)].map(s => s.segment) : [...para];
    let cur = '';
    parts.forEach(p => {
      if (ctx.measureText(cur + p).width > maxW && cur) { out.push(cur); cur = p.trimStart(); }
      else cur += p;
    });
    out.push(cur);
  });
  return out;
}
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

async function buildReport(rec) {
  try { await Promise.all(['800 40px Kanit', '600 24px Kanit', '400 24px Sarabun'].map(f => document.fonts.load(f, 'ก'))); } catch {}
  const imgs = (await Promise.all((rec.photos || []).slice(0, 6).map(loadImg))).filter(Boolean);
  const sc = rec.scores || scoresOf(rec), g = gradeOf(sc.total);
  const W = 1080, P = 56, IW = W - P * 2;

  function layout(ctx, draw) {
    let y = 0;
    const C = { bg: '#06161f', panel: '#0f2d3a', line: '#1e4658', bone: '#ece8dc', steel: '#8fa9b5', signal: '#ff6b2c' };
    const txt = (t, x, yy, size, weight, color, align = 'left') => {
      ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      if (draw) ctx.fillText(t, x, yy);
    };
    const heading = t => { y += 34; txt(t, P, y, 30, 600, C.bone); if (draw) { ctx.fillStyle = C.signal; ctx.fillRect(P, y + 12, 56, 4); } y += 34; };

    if (draw) { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, ctx.canvas.height); }
    // header
    if (draw) { ctx.fillStyle = '#0a2029'; ctx.fillRect(0, 0, W, 190); ctx.fillStyle = C.signal; ctx.fillRect(0, 186, W, 4); }
    txt('⚓ HELL WEEK', P, 100, 68, 800, C.bone);
    txt('รายงานผลการฝึก · หน่วยสงครามพิเศษทางเรือ (SEAL)', P, 150, 26, 400, C.steel);
    txt(rec.date || '', W - P, 100, 28, 600, C.steel, 'right');
    y = 190;

    // trainee + total
    y += 56;
    txt('ผู้เข้ารับการฝึก', P, y, 24, 400, C.steel);
    ctx.font = `800 54px ${FONT}`;
    let nm = rec.name || '-';
    while (ctx.measureText(nm).width > 600 && nm.length > 3) nm = nm.slice(0, -1);
    if (nm !== (rec.name || '-')) nm += '…';
    txt(nm, P, y + 64, 54, 800, C.bone);
    txt(`ครูฝึกผู้ประเมิน: ${rec.trainer || '-'}`, P, y + 110, 26, 400, C.steel);
    const cx = W - P - 105, cy = y + 62;
    if (draw) {
      ctx.lineWidth = 18; ctx.lineCap = 'round';
      ctx.strokeStyle = C.panel; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.stroke();
      if (sc.total > 0) { ctx.strokeStyle = g.color; ctx.beginPath(); ctx.arc(cx, cy, 90, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(sc.total / 100, 0, 1)); ctx.stroke(); }
    }
    txt(String(sc.total), cx, cy + 20, 64, 800, C.bone, 'center');
    txt('/ 100', cx, cy + 56, 22, 400, C.steel, 'center');
    y += 190;

    // grade banner
    if (draw) { rrect(ctx, P, y, IW, 70, 8); ctx.fillStyle = g.color; ctx.fill(); }
    txt(g.text, W / 2, y + 47, 34, 800, '#06161f', 'center');
    y += 70;

    // category bars
    heading('สรุปคะแนนรายหมวด');
    [['หมวดกายภาพ', sc.phys, 50], ['หมวดวิชาการ', sc.acad, 30], ['วินัยและการทำงานเป็นทีม', sc.disc, 20]].forEach(([n, v, m]) => {
      txt(n, P, y + 30, 26, 400, C.bone);
      txt(`${v} / ${m}`, W - P, y + 30, 26, 600, C.bone, 'right');
      if (draw) {
        rrect(ctx, P, y + 42, IW, 14, 7); ctx.fillStyle = C.panel; ctx.fill();
        if (v > 0) { rrect(ctx, P, y + 42, Math.max(14, IW * clamp(v / m, 0, 1)), 14, 7); ctx.fillStyle = g.color; ctx.fill(); }
      }
      y += 74;
    });

    // rows
    const table = (rows) => rows.forEach((r, i) => {
      if (draw) { ctx.fillStyle = i % 2 ? '#0b2630' : C.panel; ctx.fillRect(P, y, IW, 52); }
      txt(r[0], P + 16, y + 35, 24, 400, C.bone);
      txt(r[1], W - P - 190, y + 35, 22, 400, C.steel, 'right');
      txt(r[2], W - P - 16, y + 35, 24, 600, '#2fb5a3', 'right');
      y += 52;
    });
    heading('ผลหมวดกายภาพ');
    table(STATIONS.map(s => [s.name, `${num(rec.raw?.[s.id])} / ${stationFull(s, rec.full?.[s.id])} ${s.unit}`, `${stationScoreOf(s, rec.raw?.[s.id], rec.full?.[s.id])} / ${s.pts}`]));
    heading('ผลหมวดวิชาการ');
    table(SUBJECTS.map((s, i) => [s.title.replace(' — ', ' '), '', `${clamp(num(rec.acad?.[i]), 0, 5)} / 5`]));
    heading('วินัยและการทำงานเป็นทีม');
    table([['วินัย', '', `${clamp(num(rec.disc), 0, 10)} / 10`], ['การทำงานเป็นทีม', '', `${clamp(num(rec.team), 0, 10)} / 10`]]);

    // notes
    if (rec.notes) {
      heading('หมายเหตุจากครูฝึก');
      ctx.font = `400 26px ${FONT}`;
      const lines = wrapText(ctx, rec.notes, IW).slice(0, 14);
      lines.forEach(l => { txt(l, P, y + 28, 26, 400, C.bone); y += 42; });
      y += 6;
    }

    // photos
    if (imgs.length) {
      heading('ภาพผลการฝึก');
      const gap = 16, cw = (IW - gap) / 2, ch = cw * 0.62;
      imgs.forEach((im, i) => {
        const x = P + (i % 2) * (cw + gap), yy = y + Math.floor(i / 2) * (ch + gap);
        if (draw) {
          ctx.save(); rrect(ctx, x, yy, cw, ch, 8); ctx.clip();
          const k = Math.max(cw / im.width, ch / im.height), w = im.width * k, h = im.height * k;
          ctx.drawImage(im, x + (cw - w) / 2, yy + (ch - h) / 2, w, h); ctx.restore();
        }
      });
      y += Math.ceil(imgs.length / 2) * (ch + gap);
    }

    // footer
    y += 30;
    if (draw) { ctx.fillStyle = C.line; ctx.fillRect(P, y, IW, 2); }
    txt('รายงานจากระบบครูฝึก Hell Week · SEAL Roleplay', W / 2, y + 44, 22, 400, C.steel, 'center');
    y += 76;
    return y;
  }

  const scratch = document.createElement('canvas').getContext('2d');
  const H = layout(scratch, false);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = Math.ceil(H);
  layout(canvas.getContext('2d'), true);
  return canvas.toDataURL('image/png');
}

async function showReport(rec) {
  if (!rec.name) { toast('กรอกชื่อ Roblox ก่อน'); return; }
  toast('กำลังสร้างภาพรายงาน...');
  try {
    const url = await buildReport(rec);
    const safe = rec.name.replace(/[^\w\u0E00-\u0E7F-]+/g, '_');
    openLightbox(url, `hellweek-${safe}-${rec.date || 'report'}.png`);
  } catch { toast('สร้างภาพไม่สำเร็จ'); }
}

/* ---------- 7) เริ่มทำงาน ---------- */
function initApp() {
  renderCourse();
  buildForm();
  setupPhotos();
  recalc();

  $$('#nav button').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  $('#logoutBtn').addEventListener('click', logout);
  $('#form').addEventListener('submit', onSubmit);
  $('#resetBtn').addEventListener('click', resetForm);
  $('#previewBtn').addEventListener('click', () => showReport(collectRecord()));
  $('#copyBtn').addEventListener('click', copyDiscord);
  $('#search').addEventListener('input', renderRecords);
  $('#filterGrade').addEventListener('change', renderRecords);
  $('#recordBody').addEventListener('click', onTableClick);
  $('#csvBtn').addEventListener('click', exportCSV);
  $('#jsonBtn').addEventListener('click', () => download('hellweek-backup.json', JSON.stringify(getRecords()), 'application/json'));
  $('#importInput').addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; });
  $('#wipeBtn').addEventListener('click', wipe);
  $('#examRefresh').addEventListener('click', loadExamRequests);
  $('#examBody').addEventListener('click', onExamClick);
  $('#adSel').addEventListener('change', loadAdminDept);
  $('#adTabs').addEventListener('click', e => { if (e.target.dataset.at) { adTab = e.target.dataset.at; renderAdminDept(); } });
  window.addEventListener('hashchange', () => { if (!document.body.classList.contains('locked')) show(location.hash.slice(1)); });
}

/* ---------- 8) คำขอสอบ (ฝั่งครูฝึก) ---------- */
let EXREQ = [], lastPending = -1;
const EX_LABEL = {
  pending: ['รออนุญาต', 'wait'], approved: ['อนุญาตแล้ว รอเริ่มสอบ', 'go'], inprogress: ['กำลังสอบ', 'go'],
  done: ['สอบเสร็จ', 'pass'], denied: ['ไม่อนุญาต', 'fail'], expired: ['หมดเวลา/ไม่ได้ส่ง', 'off']
};
const fmtTime = t => t ? new Date(t).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }) : '-';

function updateExamBadge() {
  const n = EXREQ.filter(r => r.state === 'pending').length;
  const b = $('#examBadge');
  if (b) { b.textContent = n; b.hidden = !n; }
  if (lastPending >= 0 && n > lastPending) toast('มีคำขอสอบใหม่');
  lastPending = n;
}
async function loadExamRequests() {
  try {
    EXREQ = await api('/exam/requests');
    updateExamBadge();
    if ($('#v-exams') && !$('#v-exams').hidden) renderExamRequests();
  } catch {}
}
function renderExamRequests() {
  $('#examBody').innerHTML = EXREQ.length ? EXREQ.map(r => {
    const [label, key] = EX_LABEL[r.state] || [r.state, 'off'];
    const btn = (act, text, cls = '') => `<button class="btn small ${cls}" data-ex="${act}" data-id="${esc(r.id)}">${text}</button>`;
    const acts = r.state === 'pending' ? btn('approve', 'อนุญาต', 'primary') + btn('deny', 'ไม่อนุญาต')
      : r.state === 'approved' ? btn('deny', 'ยกเลิกสิทธิ์')
      : r.state === 'denied' ? btn('approve', 'อนุญาต') : '';
    const score = r.result ? `${r.result.total} / 30 <small>(${r.result.scores.join(' / ')})</small>` : '-';
    return `<tr><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${fmtTime(r.requestedAt)}</td>
      <td><span class="tag ${key}">${label}</span></td><td>${score}</td><td><div class="acts">${acts}</div></td></tr>`;
  }).join('') : `<tr><td class="empty" colspan="6">ยังไม่มีคำขอสอบ</td></tr>`;
}
async function onExamClick(e) {
  const act = e.target.dataset.ex;
  if (!act) return;
  try {
    EXREQ = await api('/exam/' + act, { method: 'POST', body: JSON.stringify({ id: e.target.dataset.id }) });
    updateExamBadge();
    renderExamRequests();
    toast(act === 'approve' ? 'อนุญาตให้สอบแล้ว' : 'อัปเดตสถานะแล้ว');
  } catch { toast('ทำรายการไม่สำเร็จ'); }
}

/* ---------- 9) ห้องสอบนักเรียน ---------- */
let sPoll = null, sTick = null, sQs = [], sAns = {}, sEnd = 0, sId = '', sBusy = false;
const sBody = () => $('#sBody');
const fmtMs = ms => { const t = Math.max(0, Math.round(ms / 1000)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

async function onStudentLogin(e) {
  e.preventDefault();
  const err = $('#lockErr');
  err.textContent = '';
  const name = $('#stName').value.trim().replace(/\s+/g, ' '), email = $('#stEmail').value.trim();
  let res = null;
  try { res = await fetch('/api/student/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) }); } catch {}
  if (!res) { err.textContent = 'ไม่พบเซิร์ฟเวอร์ ต้องเปิดผ่านลิงก์ของเว็บเท่านั้น'; return; }
  if (res.status === 409) { err.textContent = 'อีเมลไม่ตรงกับที่ลงทะเบียนไว้กับชื่อนี้ ติดต่อครูฝึก'; return; }
  if (!res.ok) { err.textContent = 'กรอกชื่อและอีเมลให้ถูกต้อง'; return; }
  const d = await res.json();
  TOKEN = d.token; ROLE = 'student';
  sessionStorage.setItem(TOKEN_KEY, TOKEN);
  sessionStorage.setItem(ROLE_KEY, ROLE);
  sessionStorage.setItem('hellweek_sname', d.name);
  enterStudent(d.name);
}
function enterStudent(name) {
  sessionStorage.setItem(SESSION_KEY, '1');
  document.body.classList.remove('locked');
  $('#student').hidden = false;
  $('#sName').textContent = name;
  studentRefresh();
}
async function studentRefresh() { try { renderStudent(await api('/exam/status')); } catch {} }

function renderStudent(v) {
  clearInterval(sPoll); clearInterval(sTick);
  const rules = `<ul class="s-rules">
    <li>ข้อสอบ ${v.total || 30} ข้อ เวลา ${v.minutes || 45} นาที เริ่มจับเวลาเมื่อกดเริ่มสอบ</li>
    <li>ส่งข้อสอบได้ครั้งเดียว ส่งแล้วแก้ไขไม่ได้</li>
    <li>ถ้าหน้าจอค้างหรือรีเฟรช ให้เข้าสู่ระบบใหม่ ข้อสอบและเวลาจะทำต่อจากเดิม</li>
    <li>คะแนนบันทึกลงผลการฝึกให้อัตโนมัติ</li></ul>`;
  const B = sBody();

  if (['none', 'denied', 'expired'].includes(v.state)) {
    const msg = {
      none: 'ยังไม่มีสิทธิ์สอบ กดขอสอบเพื่อส่งคำขอให้ครูฝึก เมื่อครูฝึกอนุญาตแล้วจึงจะเริ่มสอบได้',
      denied: 'ครูฝึกไม่อนุญาตในครั้งนี้ หากมีข้อสงสัยให้ติดต่อครูฝึก',
      expired: 'การสอบครั้งก่อนหมดเวลาโดยไม่ได้ส่งข้อสอบ ต้องขออนุญาตครูฝึกใหม่'
    }[v.state];
    B.innerHTML = `<div class="s-card"><h2>ห้องสอบวิชาการ</h2><p>${msg}</p>${rules}<button class="btn primary" id="sReq">ขอเข้าสอบ</button></div>`;
    $('#sReq').onclick = studentRequest;
  } else if (v.state === 'pending') {
    B.innerHTML = `<div class="s-card"><h2>ส่งคำขอแล้ว</h2><div class="s-wait"><i></i><span>รอครูฝึกอนุญาต หน้านี้จะอัปเดตเอง ไม่ต้องรีเฟรช</span></div>${rules}</div>`;
    sPoll = setInterval(studentRefresh, 5000);
  } else if (v.state === 'approved') {
    B.innerHTML = `<div class="s-card"><h2>ครูฝึกอนุญาตแล้ว</h2><p>เตรียมตัวให้พร้อม เมื่อกดเริ่มสอบ เวลาจะเริ่มนับทันที</p>${rules}<button class="btn primary" id="sStart">เริ่มสอบ</button></div>`;
    $('#sStart').onclick = startExam;
  } else if (v.state === 'inprogress') {
    startExam();
  } else if (v.state === 'done') {
    const r = v.result;
    B.innerHTML = `<div class="s-card"><h2>สอบเสร็จแล้ว</h2>
      <div class="s-total">${r.total}<small> / ${(v.subjects || []).length * 5} คะแนน</small></div>
      <p>บันทึกคะแนนลงผลการฝึกเรียบร้อยแล้ว</p>
      <div class="s-result">${(v.subjects || []).map((t, i) => `<div class="row"><span>${esc(t)}</span><b>${r.scores[i]} / 5</b></div>`).join('')}</div>
      <p>หากต้องการสอบใหม่ ต้องขออนุญาตครูฝึกอีกครั้ง</p>
      <button class="btn" id="sReq">ขอสอบใหม่</button></div>`;
    $('#sReq').onclick = studentRequest;
  }
}
async function studentRequest() {
  try { renderStudent(await api('/exam/request', { method: 'POST' })); }
  catch (e) { toast(e.message === '409' ? 'อีเมลไม่ตรงกับที่ลงทะเบียนไว้ ติดต่อครูฝึก' : 'ส่งคำขอไม่สำเร็จ ลองใหม่'); }
}
async function startExam() {
  try { renderExam(await api('/exam/start', { method: 'POST' })); }
  catch { toast('ยังเริ่มสอบไม่ได้ ตรวจสอบกับครูฝึก'); studentRefresh(); }
}

function renderExam(d) {
  clearInterval(sPoll); clearInterval(sTick);
  sId = d.id; sQs = d.questions; sEnd = Date.now() + d.remainingMs;
  try { sAns = JSON.parse(sessionStorage.getItem('hw_ans_' + sId) || '{}'); } catch { sAns = {}; }
  const L = ['ก', 'ข', 'ค', 'ง'];
  sBody().innerHTML = `<div class="timer-bar" id="sBar"><div>เวลาที่เหลือ <b id="sTime">--:--</b></div><div>ตอบแล้ว <b id="sCnt">0</b> / ${sQs.length}</div></div>` +
    sQs.map((q, n) => `<div class="sq"><h4>ข้อ ${n + 1}. ${esc(q.text)}</h4>${q.options.map((o, j) =>
      `<label><input type="radio" name="q${q.qid}" value="${j}" data-q="${q.qid}" ${sAns[q.qid] === j ? 'checked' : ''}><span>${L[j]}. ${esc(o)}</span></label>`).join('')}</div>`).join('') +
    `<button class="btn primary" id="sSubmit">ส่งข้อสอบ</button>`;
  const count = () => { $('#sCnt').textContent = Object.keys(sAns).length; };
  sBody().onchange = ev => {
    const q = ev.target.dataset.q;
    if (q === undefined) return;
    sAns[q] = +ev.target.value;
    try { sessionStorage.setItem('hw_ans_' + sId, JSON.stringify(sAns)); } catch {}
    count();
  };
  $('#sSubmit').onclick = () => submitExam(false);
  count();
  const tick = () => {
    const left = sEnd - Date.now();
    $('#sTime').textContent = fmtMs(left);
    $('#sBar').classList.toggle('low', left < 5 * 60000);
    if (left <= 0) { clearInterval(sTick); toast('หมดเวลา ระบบกำลังส่งข้อสอบ'); submitExam(true); }
  };
  sTick = setInterval(tick, 1000);
  tick();
  window.scrollTo(0, 0);
}

async function submitExam(auto) {
  if (sBusy) return;
  const left = sQs.length - Object.keys(sAns).length;
  if (!auto) {
    const msg = left > 0 ? `ยังไม่ได้ตอบ ${left} ข้อ ส่งข้อสอบเลยหรือไม่? ส่งแล้วแก้ไขไม่ได้` : 'ยืนยันส่งข้อสอบ? ส่งแล้วแก้ไขไม่ได้';
    if (!confirm(msg)) return;
  }
  sBusy = true;
  const btn = $('#sSubmit'); if (btn) btn.disabled = true;
  try {
    const v = await api('/exam/submit', { method: 'POST', body: JSON.stringify({ answers: sAns }) });
    try { sessionStorage.removeItem('hw_ans_' + sId); } catch {}
    clearInterval(sTick);
    renderStudent(v);
  } catch (e) {
    if (e.message === '409') { clearInterval(sTick); renderStudent({ state: 'expired' }); }
    else { toast('ส่งข้อสอบไม่สำเร็จ กดส่งอีกครั้ง'); if (btn) btn.disabled = false; }
  } finally { sBusy = false; }
}

/* ---------- 10) กองธุรการ / กองรบพิเศษ / กองสนับสนุน ---------- */
const hasSec = o => !!(o && o.sections && o.sections.length);
const draftBar = d => d.draft ? '<p class="note">เนื้อหาของกองนี้ยังเป็นตัวอย่างเริ่มต้น ยังไม่ได้ใส่เนื้อหาจริง</p>' : '';
function deptParts(d) {   // แยกเนื้อหากองเป็น 3 หน้า: หลักสูตรเข้ากอง / กฎการทำงาน / หน้าที่และคลังความรู้
  const none = t => `<p class="sub">ยังไม่มี${t}</p>`;
  return {
    course: hasSec(d.entry) ? courseHTML(d.entry) : none('หลักสูตรเข้ากอง'),
    rules: hasSec(d.rules) ? courseHTML({ title: 'กฎการทำงาน', ...d.rules }) : none('กฎการทำงาน'),
    library: (hasSec(d.duties) ? courseHTML({ title: 'หน้าที่', ...d.duties }) : none('หน้าที่')) +
             (hasSec(d.library) ? courseHTML({ title: 'คลังความรู้', ...d.library }) : none('คลังความรู้'))
  };
}

async function enterDept() {   // สมาชิกกอง: โหลดหน้าและเนื้อหาของกองตัวเองเท่านั้น
  sessionStorage.setItem(SESSION_KEY, '1');
  if (!$('#dapp')) {
    const r = await fetch('/api/dept/ui', { headers: { Authorization: 'Bearer ' + TOKEN } });
    if (!r.ok) throw new Error('ui');
    $('#appHost').innerHTML = await r.text();
  }
  const d = await api('/dept/content');
  const p = deptParts(d);
  document.body.classList.remove('locked');
  $('#dName').textContent = d.name;
  $('#dMember').textContent = sessionStorage.getItem('hellweek_sname') || '';
  $('#dv-course').innerHTML = draftBar(d) + p.course;
  $('#dv-rules').innerHTML = p.rules;
  $('#dv-library').innerHTML = p.library;
  const isSeal = d.id === 'seal';
  if ($('#dDutyNav')) $('#dDutyNav').hidden = !isSeal;
  if (isSeal) initDutyReport();
  $$('#dnav button').forEach(b => b.onclick = () => {
    if (b.dataset.dv === 'duty' && !isSeal) return;
    $$('#dnav button').forEach(x => x.classList.toggle('active', x === b));
    $$('.dview').forEach(v => v.hidden = v.id !== 'dv-' + b.dataset.dv);
  });
  $('#dLogout').onclick = logout;
}

/* ---------- ระบบเข้า–ออกเวร SEAL: สร้างภาพรายงานให้บันทึกลงเครื่อง ---------- */
let dutyEvidenceData = '';
let dutyReportData = '';
let lastDutyAction = 'เข้าเวร';
function dutyKey() {
  const n = sessionStorage.getItem('hellweek_sname') || 'บุคลากร';
  return 'hellweek_seal_shift_' + n.trim().toLowerCase();
}
function getDutyState() { return load(dutyKey(), null); }
function setDutyState(value) { return save(dutyKey(), value); }
function dutyDate(ms) {
  return new Date(ms).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'medium' });
}
function initDutyReport() {
  const name = sessionStorage.getItem('hellweek_sname') || '';
  $('#dutyName').value = name;
  $('#dutyPhoto').value = '';
  $('#dutyPreviewWrap').hidden = true;
  $('#dutyDownloadBtn').hidden = true;
  dutyEvidenceData = ''; dutyReportData = '';
  const state = getDutyState();
  $('#dutyStatus').textContent = state && state.start && !state.end ? 'สถานะ: กำลังเข้าเวรตั้งแต่ ' + dutyDate(state.start) : 'สถานะ: ยังไม่ได้เริ่มเวร';
  $('#dutyStartBtn').disabled = !!(state && state.start && !state.end);
  $('#dutyEndBtn').disabled = !(state && state.start && !state.end);
  $('#dutyPhoto').onchange = async e => {
    const file = e.target.files && e.target.files[0];
    dutyEvidenceData = ''; dutyReportData = ''; $('#dutyDownloadBtn').hidden = true;
    if (!file) { $('#dutyPreviewWrap').hidden = true; return; }
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
      toast('กรุณาใช้ภาพ PNG, JPG หรือ WebP ขนาดไม่เกิน 8 MB'); e.target.value = ''; $('#dutyPreviewWrap').hidden = true; return;
    }
    try {
      dutyEvidenceData = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      $('#dutyPreview').src = dutyEvidenceData; $('#dutyPreviewWrap').hidden = false;
    } catch { toast('อ่านไฟล์ภาพไม่สำเร็จ'); }
  };
  $('#dutyStartBtn').onclick = () => confirmDutyAction('เข้าเวร');
  $('#dutyEndBtn').onclick = () => confirmDutyAction('ออกเวร');
  $('#dutyDownloadBtn').onclick = () => {
    if (!dutyReportData) return;
    const a = document.createElement('a');
    a.href = dutyReportData;
    a.download = `SEAL_${lastDutyAction}_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };
}
async function confirmDutyAction(action) {
  if (!dutyEvidenceData) { toast('กรุณาเลือกภาพหลักฐานก่อน'); return; }
  const state = getDutyState();
  if (action === 'เข้าเวร' && state && state.start && !state.end) { toast('คุณกำลังเข้าเวรอยู่'); return; }
  if (action === 'ออกเวร' && !(state && state.start && !state.end)) { toast('ยังไม่มีรายการเข้าเวรที่กำลังดำเนินอยู่'); return; }
  const now = Date.now();
  lastDutyAction = action;
  const next = action === 'เข้าเวร' ? { name: sessionStorage.getItem('hellweek_sname') || '', start: now, end: null } : { ...state, end: now };
  try {
    dutyReportData = await makeDutyReport(action, next, dutyEvidenceData, now);
    if (!setDutyState(next)) throw new Error('storage');
    $('#dutyStatus').textContent = action === 'เข้าเวร'
      ? 'ยืนยันเข้าเวรแล้ว เวลา ' + dutyDate(now) + ' — กดบันทึกภาพรายงานเพื่อนำไปโพสต์ใน Discord'
      : 'ยืนยันออกเวรแล้ว เวลา ' + dutyDate(now) + ' — กดบันทึกภาพรายงานเพื่อนำไปโพสต์ใน Discord';
    $('#dutyDownloadBtn').hidden = false;
    $('#dutyStartBtn').disabled = action === 'เข้าเวร';
    $('#dutyEndBtn').disabled = action !== 'เข้าเวร';
    $('#dutyHelp').textContent = 'สร้างภาพรายงานสำเร็จแล้ว กด “บันทึกภาพรายงานลงเครื่อง” จากนั้นนำไฟล์ PNG ไปโพสต์ในห้อง Discord';
    toast('ยืนยัน' + action + 'และสร้างภาพรายงานแล้ว');
  } catch (e) {
    toast('สร้างภาพรายงานไม่สำเร็จ กรุณาเลือกภาพใหม่แล้วลองอีกครั้ง');
  }
}
async function makeDutyReport(action, state, photoData, now) {
  const canvas = $('#dutyCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#071a2c'; ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = '#d6ad5c'; ctx.fillRect(0, 0, 1200, 14);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px sans-serif'; ctx.fillText('HELL WEEK SEAL', 60, 78);
  ctx.fillStyle = '#d6ad5c'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(`รายงาน${action}บุคลากร`, 60, 132);
  ctx.fillStyle = '#ffffff'; ctx.font = '28px sans-serif';
  ctx.fillText('ชื่อ Roblox: ' + (state.name || 'ไม่ระบุ'), 60, 194);
  ctx.fillText('เวลา' + action + ': ' + dutyDate(now), 60, 242);
  if (state.start) ctx.fillText('เวลาเข้าเวร: ' + dutyDate(state.start), 60, 290);
  if (action === 'ออกเวร' && state.end) {
    const mins = Math.max(0, Math.floor((state.end - state.start) / 60000));
    ctx.fillText(`ระยะเวลาเวร: ${Math.floor(mins / 60)} ชั่วโมง ${mins % 60} นาที`, 60, 338);
  }
  ctx.fillStyle = '#d6ad5c'; ctx.fillRect(60, 366, 1080, 3);
  const img = await new Promise((resolve, reject) => {
    const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = photoData;
  });
  const maxW = 1080, maxH = 440;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(60, 390, 1080, 450);
  ctx.drawImage(img, 60 + (1080 - w) / 2, 390 + (450 - h) / 2, w, h);
  ctx.fillStyle = '#b8c7d8'; ctx.font = '20px sans-serif';
  ctx.fillText('ภาพหลักฐานแนบโดยบุคลากร • สร้างจากเว็บไซต์ Hell Week SEAL', 60, 875);
  return canvas.toDataURL('image/png');
}
let adTab = 'course', AD = null;
async function loadAdminDept() {   // แอดมิน: ดูเนื้อหาของกองที่เลือก
  if (!isAdmin()) return;
  const id = $('#adSel').value;
  try {
    const c = await api('/dept/content?dept=' + id);
    AD = { parts: deptParts(c), draft: draftBar(c) };
    renderAdminDept();
  } catch { toast('โหลดข้อมูลกองไม่สำเร็จ'); }
}
function renderAdminDept() {
  if (!AD) return;
  $$('#adTabs button').forEach(b => b.classList.toggle('active', b.dataset.at === adTab));
  $('#adBody').innerHTML = AD.draft + AD.parts[adTab];
}

/* ---------- 11) เริ่มทำงาน ---------- */
$$('#lockTabs button').forEach(b => b.addEventListener('click', () => {
  $$('#lockTabs button').forEach(x => x.classList.toggle('active', x === b));
  $('#studentForm').hidden = b.dataset.lt !== 'student';
  $('#lockForm').hidden = b.dataset.lt !== 'staff';
  $('#lockErr').textContent = '';
}));
$('#lockForm').addEventListener('submit', onLogin);
$('#studentForm').addEventListener('submit', onStudentLogin);
$('#divSel').addEventListener('change', () => { $('#divNameWrap').hidden = ['training', 'admin'].includes($('#divSel').value); });
$('#sLogout').addEventListener('click', logout);
resume();
