/* =========================================================
   Hell Week → Google Sheet (Apps Script)
   วางโค้ดนี้ใน Extensions → Apps Script ของ Google Sheet
   แล้ว Deploy เป็น Web app

   เวอร์ชันนี้เปลี่ยนด่านกายภาพเป็น 10 ด่านชุดใหม่ (กระโดดตบ ซิตอัพ ดันพื้น HJS
   คลาน กระโดดกบ วิ่ง ว่ายน้ำรอบแมพ ดำน้ำ ลอยตัว) คอลัมน์ในตารางจึงเปลี่ยน
   ถ้า Sheet เดิมเป็นโครงสร้างเก่า (7 ด่าน) ให้เลือกฟังก์ชัน migrate แล้วกด Run 1 ครั้ง
   ระบบจะสำรองแท็บเก่าไว้ให้ก่อนย้ายข้อมูลเสมอ
   ========================================================= */

const SECRET = 'เปลี่ยนเป็นรหัสลับของคุณ';   // ต้องตรงกับ SHEETS_KEY ใน server.js
const MAIN = 'ผลการฝึก';
const DETAIL = 'รายละเอียดรายด่าน';

// ช่องของแต่ละด่านในชีตกรอกเป็น "ทำได้/เต็ม" เช่น 450/700 (ถ้ากรอกแค่ 450 จะใช้ค่าสูงสุดของด่านเป็นเต็ม)
// คะแนน = ทำได้ ÷ เต็ม x คะแนนเต็มของด่าน (ไม่เกินคะแนนเต็ม)
// [id, ชื่อด่าน, หน่วย, ตั้งเต็มได้ต่ำสุด, ตั้งเต็มได้สูงสุด (ค่าเริ่มต้นถ้าไม่กรอกเต็ม), คะแนนเต็ม]
const STATIONS = [
  ['jj',    'กระโดดตบ',        'ครั้ง', 300, 700, 5],
  ['su',    'ซิตอัพ',          'ครั้ง', 200, 500, 5],
  ['pu',    'ดันพื้น',         'ครั้ง', 200, 500, 5],
  ['hjs',   'HJS (กระโดดตบ)',  'ครั้ง', 100, 400, 5],
  ['crawl', 'คลานรอบแมพ',     'รอบ',   1,   2,   5],
  ['frog',  'กระโดดกบรอบแมพ', 'รอบ',   1,   1,   5],
  ['run',   'วิ่งรอบแมพ',     'รอบ',   2,   3,   5],
  ['swim',  'ว่ายน้ำรอบแมพ',  'รอบ',   3,   5,   5],
  ['dive',  'ดำน้ำ',           'นาที',  5,   5,   5],
  ['float', 'ลอยตัวในน้ำ',    'นาที',  5,   5,   5]
];
const SUBJECTS = [
  'วิชา 1 ความรู้เกี่ยวกับหน่วย SEAL', 'วิชา 2 วินัยและคำสั่งทางทหาร', 'วิชา 3 การทำงานเป็นทีม',
  'วิชา 4 การสื่อสารและรายงาน', 'วิชา 5 CQB และสถานการณ์จำลอง', 'วิชา 6 วางแผนภารกิจและจริยธรรม'
];

// ตำแหน่งคอลัมน์ (เริ่มนับจาก 0)
const C_ID = 0, C_NAME = 1, C_TRAINER = 2, C_DATE = 3;
const C_ST = 4;                          // 4..13  ด่านกายภาพ (10)
const C_AC = C_ST + STATIONS.length;     // 14..19 วิชาการ (6)
const C_DISC = C_AC + SUBJECTS.length;   // 20 วินัย
const C_TEAM = C_DISC + 1;               // 21 ทีม
const C_NOTES = C_TEAM + 1;              // 22 หมายเหตุ
const C_PHOTOS = C_NOTES + 1;            // 23 จำนวนรูป
const C_UPD = C_PHOTOS + 1;              // 24 เวลาแก้ไขล่าสุด
const C_PHYS = C_UPD + 1;                // 25 กายภาพ
const C_ACAD = C_PHYS + 1;               // 26 วิชาการ
const C_DT = C_ACAD + 1;                 // 27 วินัยและทีม
const C_TOTAL = C_DT + 1;                // 28 รวม
const C_GRADE = C_TOTAL + 1;             // 29 ผล
const C_EMAIL = C_GRADE + 1;             // 30 อีเมล (มาจากระบบสอบออนไลน์)
const NCOL = C_EMAIL + 1;

const HEAD = ['id', 'ชื่อ Roblox', 'ครูฝึก', 'วันที่ (ปปปป-ดด-วว)']
  .concat(STATIONS.map(s => `${s[1]} (ทำ/เต็ม ${s[2]})`))
  .concat(SUBJECTS.map(s => s + ' (0-5)'))
  .concat(['วินัย (0-10)', 'ทีม (0-10)', 'หมายเหตุ', 'จำนวนรูป', 'แก้ไขล่าสุด',
           'กายภาพ /50', 'วิชาการ /30', 'วินัยและทีม /20', 'รวม /100', 'ผล', 'อีเมล']);

/* ---------- ตัวช่วย ---------- */
const num_ = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const clamp_ = (n, a, b) => Math.min(Math.max(n, a), b);
const r1_ = n => Math.round(n * 10) / 10;

// อ่านช่องด่าน: "450/700" -> ทำได้ 450 เต็ม 700 | "450" -> ทำได้ 450 ไม่ระบุเต็ม | "/700" -> ยังไม่มีผล เต็ม 700
function parseCell_(v) {
  if (typeof v === 'number') return { done: String(v), full: '' };
  const t = String(v == null ? '' : v).trim();
  const i = t.indexOf('/');
  if (i < 0) return { done: t, full: '' };
  return { done: t.slice(0, i).trim(), full: t.slice(i + 1).trim() };
}
// คะแนนของด่านกายภาพหนึ่งด่าน (สูตรเดียวกับหน้าเว็บ)
function stationPts_(s, cell) {
  const p = parseCell_(cell);
  const full = num_(p.full) > 0 ? num_(p.full) : s[4];
  return r1_(s[5] * clamp_(num_(p.done) / full, 0, 1));
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function ensureCols_(sh) {   // ชีตใหม่มีแค่ 26 คอลัมน์ ต้องขยายให้พอ
  if (sh.getMaxColumns() < NCOL) sh.insertColumnsAfter(sh.getMaxColumns(), NCOL - sh.getMaxColumns());
}
function writeHeader_(sh) {
  ensureCols_(sh);
  sh.showColumns(1, sh.getMaxColumns());
  sh.getRange(1, 1, 1, NCOL).setValues([HEAD]).setFontWeight('bold').setBackground('#0f2d3a').setFontColor('#ffffff').setWrap(true);
  sh.getRange(1, C_PHYS + 1, 1, 5).setBackground('#17584f');
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);
  sh.getRange(2, C_ID + 1, 1000, 1).setNumberFormat('0');
  sh.getRange(2, C_DATE + 1, 1000, 1).setNumberFormat('@');
  sh.getRange(2, C_ST + 1, 1000, STATIONS.length).setNumberFormat('@');   // ช่อง ทำได้/เต็ม ต้องเป็นข้อความ ไม่งั้น Sheets จะแปลง 1/2 เป็นวันที่
  sh.hideColumns(C_ID + 1);
  sh.hideColumns(C_UPD + 1);
}
function layoutOk_(sh) {   // ตรวจว่าชีตเป็นโครงสร้างเวอร์ชันนี้
  const h = sh.getRange(1, 1, 1, Math.min(NCOL, sh.getMaxColumns())).getValues()[0];   // ชีตเก่ามีคอลัมน์น้อยกว่า ห้ามอ่านเกิน
  return h[C_AC] === HEAD[C_AC] && h[C_TOTAL] === HEAD[C_TOTAL];
}
function main_() {
  const sh = sheet_(MAIN);
  if (sh.getRange(1, 1).getValue() !== HEAD[0]) { writeHeader_(sh); return sh; }   // ชีตใหม่
  if (!layoutOk_(sh)) throw new Error('ชีตเป็นโครงสร้างเก่า ให้เปิด Apps Script เลือกฟังก์ชัน migrate แล้วกด Run หนึ่งครั้ง');
  ensureCols_(sh);
  if (sh.getRange(1, C_ST + 1).getValue() !== HEAD[C_ST]) {   // ชีตที่ย้ายมาก่อนหน้านี้: ปรับหัวคอลัมน์ด่านและฟอร์แมตให้เป็น ทำ/เต็ม
    sh.getRange(1, C_ST + 1, 1, STATIONS.length).setValues([HEAD.slice(C_ST, C_ST + STATIONS.length)]);
    sh.getRange(2, C_ST + 1, Math.max(sh.getMaxRows() - 1, 1000), STATIONS.length).setNumberFormat('@');
  }
  return sh;
}
function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === '' || v == null ? '' : String(v);
}
function grade_(t) { return t >= 80 ? 'ผ่าน' : t >= 60 ? 'รอประเมินซ้ำ' : 'ไม่ผ่าน'; }
function blankRow_(row) {   // ยังไม่มีผลกรอกเลย
  for (let i = C_ST; i <= C_TEAM; i++) if (String(row[i]).trim() !== '') return false;
  return true;
}

function scores_(row) {
  let phys = 0;
  STATIONS.forEach((s, i) => phys += stationPts_(s, row[C_ST + i]));
  let acad = 0;
  SUBJECTS.forEach((_, i) => acad += clamp_(num_(row[C_AC + i]), 0, 5));
  const disc = clamp_(num_(row[C_DISC]), 0, 10) + clamp_(num_(row[C_TEAM]), 0, 10);
  const total = r1_(phys) + r1_(acad) + r1_(disc);
  return { phys: r1_(phys), acad: r1_(acad), disc: r1_(disc), total: r1_(total) };
}
function computedCells_(row) {
  const s = scores_(row);
  return [s.phys, s.acad, s.disc, s.total, blankRow_(row) ? 'ยังไม่ประเมิน' : grade_(s.total)];
}
function writeComputed_(sh, rowNo, row) {
  sh.getRange(rowNo, C_PHYS + 1, 1, 5).setValues([computedCells_(row)]);
}

function rowToRec_(r) {
  const raw = {}, full = {};
  STATIONS.forEach((s, i) => { const p = parseCell_(r[C_ST + i]); raw[s[0]] = p.done; full[s[0]] = p.full; });
  const s = scores_(r);
  return {
    id: Number(r[C_ID]) || r[C_ID],
    name: String(r[C_NAME]).trim(),
    trainer: String(r[C_TRAINER] || ''),
    date: fmtDate_(r[C_DATE]),
    raw: raw,
    full: full,
    acad: SUBJECTS.map((_, i) => r[C_AC + i] === '' ? '' : String(r[C_AC + i])),
    disc: r[C_DISC] === '' ? '' : String(r[C_DISC]),
    team: r[C_TEAM] === '' ? '' : String(r[C_TEAM]),
    notes: String(r[C_NOTES] || ''),
    photoCount: Number(r[C_PHOTOS]) || 0,
    email: String(r[C_EMAIL] || ''),
    updated: Number(r[C_UPD]) || 0,
    scores: s
  };
}
function recToRow_(rec) {
  const row = new Array(NCOL).fill('');
  row[C_ID] = rec.id; row[C_NAME] = rec.name; row[C_TRAINER] = rec.trainer || '';
  row[C_DATE] = rec.date || '';
  STATIONS.forEach((s, i) => {
    const d = rec.raw && rec.raw[s[0]] !== '' && rec.raw[s[0]] != null ? String(num_(rec.raw[s[0]])) : '';
    const f = rec.full && num_(rec.full[s[0]]) > 0 ? String(num_(rec.full[s[0]])) : '';
    row[C_ST + i] = f ? d + '/' + f : d;   // เช่น 450/700 (ถ้าไม่ได้ตั้งเต็ม เก็บแค่ 450)
  });
  SUBJECTS.forEach((_, i) => row[C_AC + i] = rec.acad && rec.acad[i] !== '' && rec.acad[i] != null ? num_(rec.acad[i]) : '');
  row[C_DISC] = rec.disc !== '' && rec.disc != null ? num_(rec.disc) : '';
  row[C_TEAM] = rec.team !== '' && rec.team != null ? num_(rec.team) : '';
  row[C_NOTES] = rec.notes || '';
  row[C_PHOTOS] = rec.photoCount || 0;
  row[C_UPD] = rec.updated || Date.now();
  row[C_EMAIL] = rec.email || '';
  return row;
}

function readAll_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, NCOL).getValues();
}

/* ---------- ชีต "รายละเอียดรายด่าน": ชื่อ | รายการ | ผลที่ทำได้ | กี่คะแนน ---------- */
function rebuildDetail_() {
  const rows = readAll_(main_()).filter(r => String(r[C_NAME]).trim());
  const out = [['ชื่อ Roblox', 'วันที่', 'หมวด', 'รายการ', 'ผลที่ทำได้', 'เกณฑ์', 'คะแนนที่ได้', 'คะแนนเต็ม']];
  rows.forEach(r => {
    const nm = r[C_NAME], d = fmtDate_(r[C_DATE]);
    STATIONS.forEach((s, i) => {
      const p = parseCell_(r[C_ST + i]);
      const full = num_(p.full) > 0 ? num_(p.full) : s[4];
      const rule = 'ตั้งเต็มได้ ' + (s[3] === s[4] ? s[3] : s[3] + '–' + s[4]) + ' ' + s[2];
      out.push([nm, d, 'กายภาพ', s[1], p.done === '' ? '-' : num_(p.done) + ' / ' + full + ' ' + s[2], rule, stationPts_(s, r[C_ST + i]), s[5]]);
    });
    SUBJECTS.forEach((s, i) => out.push([nm, d, 'วิชาการ', s, '-', '-', clamp_(num_(r[C_AC + i]), 0, 5), 5]));
    out.push([nm, d, 'วินัยและทีม', 'วินัย', '-', '-', clamp_(num_(r[C_DISC]), 0, 10), 10]);
    out.push([nm, d, 'วินัยและทีม', 'การทำงานเป็นทีม', '-', '-', clamp_(num_(r[C_TEAM]), 0, 10), 10]);
  });
  const sh = sheet_(DETAIL);
  sh.clear();
  sh.getRange(1, 1, out.length, 8).setValues(out);
  sh.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#0f2d3a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

/* ---------- เมื่อมีคนแก้ในชีตโดยตรง ---------- */
function onEdit(e) {
  if (!e || !e.range) return;   // กดรันเองจากหน้า Apps Script จะไม่มี e ให้ข้ามไป
  const sh = e.range.getSheet();
  if (sh.getName() !== MAIN || e.range.getRow() < 2) return;
  if (!layoutOk_(sh)) return;   // โครงสร้างเก่า ยังไม่ได้ migrate ห้ามเขียนทับ
  ensureCols_(sh);
  const first = e.range.getRow(), n = e.range.getNumRows();
  const rows = sh.getRange(first, 1, n, NCOL).getValues();
  rows.forEach((row, k) => {
    if (!String(row[C_NAME]).trim()) return;
    if (!row[C_ID]) row[C_ID] = Date.now() + k;
    row[C_UPD] = Date.now();
    sh.getRange(first + k, C_ID + 1).setValue(row[C_ID]);
    sh.getRange(first + k, C_UPD + 1).setValue(row[C_UPD]);
    writeComputed_(sh, first + k, row);
  });
  rebuildDetail_();
}

/* ---------- Web app (server.js เรียกใช้) ---------- */
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e.parameter || e.parameter.key !== SECRET) return json_({ ok: false, error: 'unauthorized' });
  try {
    if (e.parameter.action === 'list') {
      const recs = readAll_(main_()).filter(r => String(r[C_NAME]).trim() && r[C_ID]).map(rowToRec_);
      return json_({ ok: true, records: recs });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (body.key !== SECRET) return json_({ ok: false, error: 'unauthorized' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = main_();

    if (body.action === 'upsert') {
      const rows = readAll_(sh);
      const idx = new Map(rows.map((r, i) => [String(r[C_ID]), i + 2]));
      (body.records || []).forEach(rec => {
        const row = recToRow_(rec);
        const at = idx.get(String(rec.id));
        if (at) { row[C_PHOTOS] = rec.photoCount != null ? rec.photoCount : rows[at - 2][C_PHOTOS]; sh.getRange(at, 1, 1, NCOL).setValues([row]); writeComputed_(sh, at, row); }
        else {
          const nr = Math.max(sh.getLastRow() + 1, 2);
          sh.getRange(nr, 1, 1, NCOL).setValues([row]);
          writeComputed_(sh, nr, row);
          idx.set(String(rec.id), nr);
        }
      });
    } else if (body.action === 'delete') {
      const rows = readAll_(sh);
      for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][C_ID]) === String(body.id)) sh.deleteRow(i + 2);
    } else if (body.action === 'wipe') {
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, NCOL).clearContent();
    } else {
      return json_({ ok: false, error: 'unknown action' });
    }

    rebuildDetail_();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// รันฟังก์ชันนี้ 1 ครั้งตอนติดตั้งใหม่ เพื่อสร้างหัวตารางและขอสิทธิ์
function setup() {
  main_();
  rebuildDetail_();
}

/* ---------- ย้ายข้อมูลจากโครงสร้างเก่า (7 ด่าน) มาโครงสร้างใหม่ (10 ด่าน) ----------
   รัน 1 ครั้งเท่านั้น: เลือกฟังก์ชัน migrate แล้วกด Run
   - สำรองแท็บเดิมเป็น "ผลการฝึก (สำรองก่อนย้าย ...)" ก่อนเสมอ
   - คงไว้: ชื่อ ครูฝึก วันที่ คะแนนวิชาการ วินัย ทีม หมายเหตุ อีเมล
   - ด่านที่ชื่อเดิมยังอยู่ (กระโดดตบ ซิตอัพ ดันพื้น) ย้ายจำนวนที่ทำได้มาให้
   - ด่านที่ยกเลิก (OBBY ว่ายน้ำในสระ ว่ายน้ำรอบแมพแบบเดิม CQB) ไม่ถูกย้าย (ยังอยู่ในแท็บสำรอง) */
function migrate() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(MAIN);
  if (!sh || sh.getLastRow() < 1 || sh.getRange(1, 1).getValue() !== HEAD[0]) { setup(); return 'ไม่มีข้อมูลเก่า สร้างตารางใหม่แล้ว'; }
  if (layoutOk_(sh)) return 'ชีตเป็นโครงสร้างใหม่อยู่แล้ว ไม่ต้องย้าย';

  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
  sh.copyTo(ss).setName(MAIN + ' (สำรองก่อนย้าย ' + stamp + ')');

  // โครงสร้างเดิม: 0 id,1 ชื่อ,2 ครูฝึก,3 วันที่, 4..10 ด่าน(7: jj su pu obby pool map cqb),
  // 11..16 วิชาการ(6), 17 วินัย, 18 ทีม, 19 หมายเหตุ, 20 รูป, 21 แก้ไขล่าสุด, 22..26 ผลคำนวณ, 27 อีเมล
  const OLD_AC = 11, OLD_DISC = 17, OLD_TEAM = 18, OLD_NOTES = 19, OLD_PHOTOS = 20, OLD_UPD = 21, OLD_EMAIL = 27;
  const last = sh.getLastRow(), width = sh.getLastColumn();
  const old = last >= 2 ? sh.getRange(2, 1, last - 1, width).getValues() : [];
  const get = (r, i) => i < r.length ? r[i] : '';

  const rows = old.filter(r => String(get(r, 1)).trim() && get(r, 0)).map(r => {
    const n = new Array(NCOL).fill('');
    for (let i = 0; i <= 3; i++) n[i] = get(r, i);
    n[C_ST + 0] = get(r, 4);   // กระโดดตบ
    n[C_ST + 1] = get(r, 5);   // ซิตอัพ
    n[C_ST + 2] = get(r, 6);   // ดันพื้น
    for (let i = 0; i < SUBJECTS.length; i++) n[C_AC + i] = get(r, OLD_AC + i);
    n[C_DISC] = get(r, OLD_DISC); n[C_TEAM] = get(r, OLD_TEAM);
    n[C_NOTES] = get(r, OLD_NOTES); n[C_PHOTOS] = get(r, OLD_PHOTOS);
    n[C_UPD] = Date.now(); n[C_EMAIL] = get(r, OLD_EMAIL);
    const c = computedCells_(n);
    for (let i = 0; i < 5; i++) n[C_PHYS + i] = c[i];
    return n;
  });

  sh.clear();
  sh.clearFormats();
  writeHeader_(sh);
  if (rows.length) sh.getRange(2, 1, rows.length, NCOL).setValues(rows);
  rebuildDetail_();
  return 'ย้ายข้อมูลแล้ว ' + rows.length + ' แถว (แท็บเดิมถูกสำรองไว้)';
}
