/* =========================================================
   Hell Week — ระบบครูฝึก SEAL Roleplay
   1) ข้อมูลหลักสูตร  2) ตัวช่วย  3) ล็อกอิน  4) หน้าต่าง ๆ
   5) ฟอร์มบันทึกผล  6) สร้างภาพรายงาน  7) เริ่มทำงาน
   ========================================================= */

/* ---------- 1) ข้อมูลหลักสูตร (แก้ตัวเลขได้ที่นี่) ---------- */
const STATIONS = [
  { id: 'jj',   name: 'กระโดดตบ (Jumping Jacks)', target: 900, unit: 'ครั้ง', max: 7, note: 'บันทึกจำนวนครั้งโดยครูฝึก' },
  { id: 'su',   name: 'ซิตอัป (Sit-ups)',          target: 500, unit: 'ครั้ง', max: 7, note: 'ใช้ระบบนับจำนวนหรือคำสั่งจำลองในเกม' },
  { id: 'pu',   name: 'ดันพื้น (Push-ups)',        target: 500, unit: 'ครั้ง', max: 7, note: 'ครูฝึกตรวจสอบผลตามระบบของแมพ' },
  { id: 'obby', name: 'OBBY — ด่านอุปสรรค',        target: 20,  unit: 'รอบ',   max: 7, note: 'ต้องผ่านด่านและกลับถึงจุดเริ่มต้นตามเส้นทางที่กำหนด' },
  { id: 'pool', name: 'ว่ายน้ำในสระ',              target: 30,  unit: 'รอบ',   max: 7, note: 'ไป–กลับ ว่ายจากจุดเริ่มต้นไปปลายสระและกลับมาจุดเดิม' },
  { id: 'map',  name: 'ว่ายน้ำรอบแมพ',             target: 10,  unit: 'รอบ',   max: 7, note: 'ว่ายตามเส้นทางที่กำหนดไว้รอบแผนที่ในเกม' },
  { id: 'cqb',  name: 'CQB — Close Quarters Battle', target: null, unit: 'คะแนน', max: 8, note: 'ทดสอบภาคปฏิบัติ: เคลื่อนที่ในอาคาร สื่อสาร แบ่งหน้าที่ และทำตามคำสั่งในสถานการณ์จำลอง' }
];

const SUBJECTS = [
  {
    title: 'วิชาที่ 1 — ความรู้เกี่ยวกับหน่วย SEAL',
    why: 'ให้ผู้เข้ารับการฝึกรู้ว่าหน่วยมีไว้ทำอะไร ใครสั่งใคร และอะไรทำได้หรือไม่ได้ ก่อนเข้าปฏิบัติภารกิจร่วมกัน',
    topics: [
      ['ภารกิจและหน้าที่ของหน่วย', 'SEAL คือหน่วยปฏิบัติการพิเศษ เน้นภารกิจทางน้ำ ทางบก และทางอากาศ เช่น ลาดตระเวน กู้ภัยตัวประกัน ปฏิบัติการลับ ต้องรู้ว่าหน่วยของเรารับภารกิจประเภทไหน'],
      ['สายการบังคับบัญชา', 'จำลำดับยศตั้งแต่ผู้บัญชาการ ผู้ช่วย ครูฝึก หัวหน้าหมู่ จนถึงพลทหาร และรู้ว่าต้องรายงานใครก่อน ห้ามข้ามสายบังคับบัญชา'],
      ['ระเบียบและข้อบังคับประจำหน่วย', 'กฎของเซิร์ฟเวอร์และ Discord การแต่งกาย ชื่อเรียก เวลาเข้าร่วมกิจกรรม และบทลงโทษเมื่อละเมิด'],
      ['หน้าที่ของกำลังพลแต่ละตำแหน่ง', 'เช่น Point man (นำหน้า), Breacher (เปิดประตู), Medic (พยาบาล), Radio operator (สื่อสาร), Rear guard (คุ้มกันท้าย)']
    ],
    example: 'ถามว่า "ถ้าหัวหน้าหมู่ไม่อยู่ ใครสั่งการต่อ?" ผู้เข้ารับการฝึกต้องตอบได้ทันทีตามสายบังคับบัญชา',
    criteria: 'ตอบปากเปล่าหรือข้อสอบสั้น 5 ข้อ ข้อละ 1 คะแนน'
  },
  {
    title: 'วิชาที่ 2 — วินัยและคำสั่งทางทหาร',
    why: 'ความเก่งส่วนตัวไม่มีความหมายถ้าไม่ฟังคำสั่ง วินัยทำให้ทีมเคลื่อนที่เป็นหนึ่งเดียวภายใต้แรงกดดัน',
    topics: [
      ['การรับและทวนคำสั่ง', 'ทวนซ้ำสั้น ๆ เช่น "รับทราบ! เข้าตรวจอาคาร B ทางประตูหลัง" เพื่อให้แน่ใจว่าเข้าใจตรงกัน'],
      ['การรายงานผู้บังคับบัญชา', 'รายงานตรงประเด็น: ใคร ที่ไหน ทำอะไร ผลเป็นอย่างไร ไม่เล่าอ้อม ไม่แก้ตัว'],
      ['การรักษาระเบียบแถว', 'เข้าแถวตรงเวลา ยืนตามตำแหน่ง ไม่พูดคุยในแถว เคลื่อนไหวเมื่อได้รับคำสั่งเท่านั้น'],
      ['การรับผิดชอบต่อหน้าที่', 'ทำผิดพลาดให้รายงานทันที ไม่ปิดบัง ไม่โทษเพื่อน แก้ไขแล้วไปต่อ']
    ],
    example: 'ครูฝึกสั่ง "ทุกคนหยุด!" ระหว่างวิ่ง ทุกคนต้องหยุดทันทีโดยไม่ถามเหตุผล',
    criteria: 'สังเกตตลอดหลักสูตร ให้คะแนนจากการทวนคำสั่ง การตรงเวลา และการยอมรับความผิดพลาด'
  },
  {
    title: 'วิชาที่ 3 — การทำงานเป็นทีม',
    why: 'Hell Week ออกแบบให้ไม่มีใครรอดคนเดียว ทีมที่ดูแลกันและสื่อสารชัดเจนจะผ่านด่านได้เร็วกว่าคนเก่งที่ทำงานเดี่ยว',
    topics: [
      ['การแบ่งหน้าที่ภายในหมู่', 'ก่อนเริ่มภารกิจต้องตกลงบทบาทให้ชัดว่าใครนำ ใครเปิดทาง ใครคุ้มกัน และใครสำรอง'],
      ['การสื่อสารระหว่างปฏิบัติภารกิจ', 'พูดสั้น ชัด ครั้งละหนึ่งเรื่อง ไม่พูดทับกัน และฟังก่อนตอบ'],
      ['การแก้ไขปัญหาเมื่อสมาชิกทำภารกิจไม่สำเร็จ', 'ช่วยกันทันที เช่น แบ่งงานใหม่ หรือรอเพื่อน ไม่ตำหนิต่อหน้าทีม ค่อยสรุปบทเรียนหลังภารกิจ'],
      ['การตัดสินใจภายใต้เวลาจำกัด', 'ประเมิน → ตัดสินใจ → ลงมือ ภายใน 5–10 วินาที ถ้าไม่มั่นใจให้ถามหัวหน้าหมู่ อย่ายืนนิ่ง']
    ],
    example: 'สมาชิกตกจากด่าน OBBY ซ้ำ ๆ เพื่อนบอกเส้นทางผ่านวิทยุและรอจนเขาผ่าน คือพฤติกรรมที่ควรให้คะแนนสูง',
    criteria: 'ประเมินจากสถานการณ์กลุ่ม และการสังเกตระหว่าง CQB'
  },
  {
    title: 'วิชาที่ 4 — การสื่อสารและรายงาน',
    why: 'วิทยุคือเส้นชีวิตของทีม ข้อความที่ยาวหรือคลุมเครืออาจทำให้เพื่อนเสียเวลาหรือเสียตำแหน่งสำคัญ',
    topics: [
      ['การใช้วิทยุสื่อสารในเกม', 'กดพูดแล้วรอ 1 วินาที พูดช้า ชัด ใช้ศัพท์มาตรฐาน (ดูตารางคำศัพท์) และจบด้วย Over หรือ Out'],
      ['การรายงานสถานการณ์', 'ใช้ SALUTE: Size ขนาดกำลัง, Activity กำลังทำอะไร, Location ที่ไหน, Unit สังกัด, Time เวลา, Equipment อุปกรณ์'],
      ['การแจ้งตำแหน่งและสถานะภารกิจ', 'อ้างอิงอาคาร ชั้น ทิศ หรือจุดสังเกตในแมพ เช่น "อาคาร A ชั้น 2 ทิศตะวันออก" แล้วแจ้งสถานะ: กำลังเคลื่อนที่ / ถึงจุดแล้ว / ภารกิจเสร็จ'],
      ['การเขียนรายงานหลังจบภารกิจ', 'วัตถุประสงค์ → สิ่งที่ทำ → ผลลัพธ์ → ปัญหา → ข้อเสนอแนะ ภายใน 5–8 บรรทัด']
    ],
    example: '"Alpha-1 ถึง Command, ถึงจุด Bravo แล้ว พบฝ่ายตรงข้าม 2 นาย ชั้น 2 ทิศเหนือ, Over."',
    criteria: 'ให้รายงาน 1 สถานการณ์ต่อหน้าครูฝึก และส่งรายงานหลังภารกิจ 1 ฉบับ'
  },
  {
    title: 'วิชาที่ 5 — CQB และสถานการณ์จำลอง',
    why: 'CQB คือการรบในที่แคบ ต้องอาศัยจังหวะ การสื่อสาร และความไว้ใจ และมีความเสี่ยงยิงพวกเดียวกันถ้าไม่ฝึกกฎให้แม่น',
    topics: [
      ['กฎความปลอดภัยในการฝึกจำลอง', 'ฟังสัญญาณเริ่มและหยุดเสมอ ห้ามเริ่มเองก่อนครูฝึกสั่ง และหยุดทันทีเมื่อได้ยิน "Cease fire / หยุดฝึก"'],
      ['การระบุเป้าหมายในเกม', 'ยืนยันเป้าหมายก่อนยิงทุกครั้ง ดูชื่อ ทีม หรือเครื่องแบบ ห้ามยิงโดยไม่แน่ใจ'],
      ['การแยกแยะฝ่ายเดียวกันกับฝ่ายตรงข้ามตามระบบเกม', 'ใช้สีทีม ป้ายชื่อ หรือระบบ Team ของแมพ และสื่อสารกับเพื่อนว่ากำลังเข้าห้องไหน'],
      ['การปฏิบัติตามกติกาภารกิจและการยุติการฝึก', 'ทำตามเงื่อนไขชนะ-แพ้ของภารกิจ ไม่ใช้บั๊กหรือช่องโหว่ และยุติการฝึกเมื่อครูฝึกสั่ง']
    ],
    example: 'เปิดประตูห้อง ทีมต้องตะโกน "Clear!" เมื่อห้องปลอดภัย และ "Contact!" เมื่อพบศัตรู ก่อนเคลื่อนที่ต่อ',
    criteria: 'ผ่านการทดสอบกฎความปลอดภัยด้วยปากเปล่าก่อน จึงให้เข้าสอบ CQB จริง'
  },
  {
    title: 'วิชาที่ 6 — การวางแผนภารกิจและจริยธรรม Roleplay',
    why: 'ภารกิจที่ดีเริ่มจากแผนที่ชัดเจน และการเล่นบทบาทที่ดีคือการเล่นอย่างยุติธรรม ให้คนอื่นสนุกไปด้วย',
    topics: [
      ['การบรีฟภารกิจ (Mission Brief)', 'ก่อนออกปฏิบัติการต้องรู้ 5 อย่าง: สถานการณ์ ภารกิจ การดำเนินการ การส่งกำลังบำรุง และการบังคับบัญชา/สื่อสาร'],
      ['แผนสำรองและจุดนัดพบ', 'กำหนด Plan B และจุดรวมพลหากแผนล้มเหลวหรือหลุดจากกลุ่ม'],
      ['การเล่นบทบาทที่ยุติธรรม (Fair play)', 'ไม่ใช้ข้อมูลนอกเกมมาตัดสินใจ (Metagaming) ไม่บังคับเล่นบทเพื่อน และไม่ฆ่าโดยไม่มีเหตุผลในเนื้อเรื่อง'],
      ['การทำ AAR (After Action Review)', 'หลังภารกิจประชุมสั้น ๆ ตอบ 3 ข้อ: ตั้งใจทำอะไร เกิดอะไรขึ้นจริง ครั้งหน้าจะปรับอะไร'],
      ['การดูแลเพื่อนร่วมทีม', 'สังเกตเพื่อนที่เหนื่อยหรือท้อ พักได้ถ้าจำเป็น เพราะหลักสูตรนี้เป็นเกม ไม่ใช่การแข่งขันที่ต้องแลกกับสุขภาพจริง']
    ],
    example: 'หัวหน้าหมู่บรีฟ 1 นาที แล้วถามทุกคนว่า "ถ้าประตูหน้าเปิดไม่ได้ ใครทำอะไร?" ทุกคนต้องตอบได้',
    criteria: 'วางแผนภารกิจสั้น ๆ 1 แผนส่งครูฝึก และตอบคำถามเรื่อง Fair play 2 ข้อ'
  }
];

const GLOSSARY = [
  ['Roger / Copy', 'รับทราบข้อความแล้ว'], ['Wilco', 'รับทราบและจะปฏิบัติตาม'],
  ['Say again', 'ขอให้พูดซ้ำ'], ['Standby', 'รอก่อน เดี๋ยวตอบ'],
  ['Over', 'จบข้อความ รอตอบกลับ'], ['Out', 'จบการสนทนา ไม่ต้องตอบ'],
  ['Contact', 'พบฝ่ายตรงข้าม'], ['Clear', 'พื้นที่ปลอดภัย ไม่พบใคร'],
  ['Breach', 'เปิดทางเข้า (ประตู/กำแพง)'], ['Medic', 'ขอพยาบาล มีคนบาดเจ็บ'],
  ['Cease fire', 'หยุดยิง/หยุดฝึกทันที'], ['Rally point', 'จุดนัดพบเมื่อเกิดเหตุ']
];

const EXAM = [
  { q: 'ได้รับคำสั่งจากหัวหน้าหมู่ ควรทำอะไรเป็นอย่างแรก?', o: ['เงียบแล้วลงมือทำ', 'ทวนคำสั่งให้ตรงกัน', 'ถามเหตุผลก่อน', 'รอให้เพื่อนทำก่อน'], a: 1, e: 'การทวนคำสั่งทำให้แน่ใจว่าเข้าใจตรงกัน และเป็นหลักวินัยพื้นฐาน (วิชา 2)' },
  { q: 'คำว่า "Contact" ทางวิทยุหมายถึง?', o: ['ขอพยาบาล', 'พื้นที่ปลอดภัย', 'พบฝ่ายตรงข้าม', 'รอก่อน'], a: 2, e: 'Contact = พบฝ่ายตรงข้าม ส่วน Clear = ปลอดภัย (วิชา 4)' },
  { q: 'ได้ยิน "Cease fire" ระหว่างฝึก CQB ต้องทำอย่างไร?', o: ['ยิงต่อจนจบรอบ', 'หยุดทันที', 'ถามครูฝึกว่าทำไม', 'วิ่งไปจุดเริ่มต้น'], a: 1, e: 'ความปลอดภัยมาก่อน หยุดทันทีแล้วรับฟังคำสั่งต่อไป (วิชา 5)' },
  { q: 'เพื่อนในทีมทำด่านไม่ผ่านจนทีมช้า ควรทำอย่างไร?', o: ['ตำหนิต่อหน้าทุกคน', 'ทิ้งไว้แล้วไปต่อ', 'ช่วยแนะนำและรอ แล้วสรุปบทเรียนทีหลัง', 'ขอให้ครูฝึกเปลี่ยนคน'], a: 2, e: 'ทีมที่ดีช่วยกันก่อน แล้วค่อยทำ AAR (วิชา 3, 6)' },
  { q: 'ตัวย่อ SALUTE ใช้ทำอะไร?', o: ['รายงานข้อมูลฝ่ายตรงข้าม', 'ทำความเคารพ', 'เรียกกำลังเสริม', 'แบ่งหน้าที่ในหมู่'], a: 0, e: 'SALUTE คือรูปแบบรายงาน: ขนาด กิจกรรม ตำแหน่ง สังกัด เวลา อุปกรณ์ (วิชา 4)' },
  { q: 'การใช้ข้อมูลที่เห็นนอกเกมมาตัดสินใจในเกม เรียกว่า?', o: ['Fair play', 'Metagaming', 'AAR', 'Breach'], a: 1, e: 'Metagaming ทำให้ Roleplay ไม่ยุติธรรม (วิชา 6)' },
  { q: 'ก่อนยิงในสถานการณ์ CQB ต้องทำอะไร?', o: ['ยืนยันเป้าหมายก่อน', 'ยิงก่อนเพื่อความปลอดภัย', 'ตะโกนชื่อตัวเอง', 'รอเพื่อนยิงก่อน'], a: 0, e: 'ยืนยันจากชื่อ ทีม หรือเครื่องแบบ เพื่อไม่ให้ยิงพวกเดียวกัน (วิชา 5)' },
  { q: 'รายงานหลังจบภารกิจควรมีหัวข้อใด?', o: ['วัตถุประสงค์ สิ่งที่ทำ ผลลัพธ์ ปัญหา ข้อเสนอแนะ', 'ชื่อเพื่อนที่ทำผิด', 'คะแนนส่วนตัวเท่านั้น', 'ภาพหน้าจอเท่านั้น'], a: 0, e: 'โครงสร้างที่ชัดเจนช่วยให้ผู้บังคับบัญชาอ่านเข้าใจเร็ว (วิชา 4)' }
];

const STORE_KEY = 'hellweek_records_v1';
const AUTH_KEY  = 'hellweek_auth_v1';
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

/* ---------- 3) ล็อกอินครูฝึก ----------
   หมายเหตุ: เป็นการล็อกฝั่งเบราว์เซอร์เพื่อกันนักเรียนเข้าหน้านี้โดยไม่ตั้งใจ
   ถ้าต้องการความปลอดภัยจริง ควรโฮสต์หลังระบบรหัสผ่านของเซิร์ฟเวอร์ */
async function sha(text) {
  if (window.crypto?.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;
  for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return 'x' + h;
}
const randSalt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

let fails = 0, lockedUntil = 0;

function setupLock() {
  const auth = load(AUTH_KEY, null);
  const first = !auth;
  $('#lockTitle').textContent = first ? 'ตั้งรหัสผ่านครูฝึก' : 'ห้องครูฝึก';
  $('#lockMsg').textContent = first ? 'ใช้งานครั้งแรก ตั้งรหัสผ่านเพื่อกันผู้เข้ารับการฝึกเข้าหน้านี้' : 'เฉพาะครูฝึกเท่านั้น กรอกรหัสผ่านเพื่อเข้าสู่ระบบ';
  $('#lockConfirmWrap').hidden = !first;
  $('#lockConfirm').required = first;
  $('#lockBtn').textContent = first ? 'ตั้งรหัสผ่านและเข้าสู่ระบบ' : 'เข้าสู่ระบบ';
  $('#lockPass').value = ''; $('#lockConfirm').value = '';
}

async function onLogin(e) {
  e.preventDefault();
  const err = $('#lockErr');
  err.textContent = '';
  const pass = $('#lockPass').value;
  const auth = load(AUTH_KEY, null);

  if (!auth) {
    if (pass.length < 4) { err.textContent = 'รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร'; return; }
    if (pass !== $('#lockConfirm').value) { err.textContent = 'รหัสผ่านสองช่องไม่ตรงกัน'; return; }
    const salt = randSalt();
    save(AUTH_KEY, { salt, hash: await sha(salt + pass) });
    return enterApp();
  }
  if (Date.now() < lockedUntil) {
    err.textContent = `ลองผิดหลายครั้ง รออีก ${Math.ceil((lockedUntil - Date.now()) / 1000)} วินาที`;
    return;
  }
  if (await sha(auth.salt + pass) === auth.hash) { fails = 0; return enterApp(); }
  fails++;
  if (fails >= 3) { lockedUntil = Date.now() + 15000; fails = 0; err.textContent = 'ลองผิด 3 ครั้ง ระบบล็อก 15 วินาที'; }
  else err.textContent = 'รหัสผ่านไม่ถูกต้อง';
  $('#lockPass').select();
}

function enterApp() {
  sessionStorage.setItem(SESSION_KEY, '1');
  document.body.classList.remove('locked');
  $('#app').hidden = false;
  if (!enterApp.done) { initApp(); enterApp.done = true; }
  show(location.hash.slice(1) || 'dashboard');
}
function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.hash = '';
  document.body.classList.add('locked');
  $('#app').hidden = true;
  setupLock();
}

async function changePass(e) {
  e.preventDefault();
  const auth = load(AUTH_KEY, null);
  if (!auth || await sha(auth.salt + $('#oldPass').value) !== auth.hash) { toast('รหัสผ่านเดิมไม่ถูกต้อง'); return; }
  const np = $('#newPass').value;
  if (np.length < 4) { toast('รหัสผ่านใหม่ต้องยาวอย่างน้อย 4 ตัวอักษร'); return; }
  const salt = randSalt();
  save(AUTH_KEY, { salt, hash: await sha(salt + np) });
  $('#passForm').reset();
  toast('เปลี่ยนรหัสผ่านแล้ว');
}

/* ---------- 4) หน้าต่าง ๆ ---------- */
function show(view) {
  if (!$('#v-' + view)) view = 'dashboard';
  $$('.view').forEach(v => v.hidden = v.id !== 'v-' + view);
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  if (view === 'dashboard') renderDashboard();
  if (view === 'trainees') renderRecords();
  if (view === 'settings') renderStorage();
  window.scrollTo(0, 0);
}

function renderDashboard() {
  const list = load(STORE_KEY, []);
  const c = { pass: 0, wait: 0, fail: 0 };
  list.forEach(r => c[gradeOf(r.scores.total).key]++);
  const avg = list.length ? round1(list.reduce((a, r) => a + r.scores.total, 0) / list.length) : 0;
  $('#stats').innerHTML = `
    <div class="stat"><b>${list.length}</b><span>ผู้เข้ารับการฝึกทั้งหมด</span></div>
    <div class="stat pass"><b>${c.pass}</b><span>ผ่าน</span></div>
    <div class="stat wait"><b>${c.wait}</b><span>รอประเมินซ้ำ</span></div>
    <div class="stat fail"><b>${c.fail}</b><span>ไม่ผ่าน</span></div>
    <div class="stat avg"><b>${avg}</b><span>คะแนนเฉลี่ย / 100</span></div>`;
  $('#splitBar').innerHTML = list.length
    ? `<i style="flex:${c.pass};background:var(--teal)"></i><i style="flex:${c.wait};background:var(--amber)"></i><i style="flex:${c.fail};background:var(--red)"></i>` : '';
  const recent = [...list].sort((a, b) => b.id - a.id).slice(0, 5);
  $('#recentList').innerHTML = recent.length ? recent.map(r => {
    const g = gradeOf(r.scores.total);
    return `<div class="recent-item"><div>${esc(r.name)}<small>${esc(r.date || '-')} · ครูฝึก ${esc(r.trainer || '-')}</small></div>
      <b>${r.scores.total}/100</b><span class="tag ${g.key}">${g.short}</span></div>`;
  }).join('') : `<div class="empty-box">ยังไม่มีบันทึก กด "บันทึกผลใหม่" เพื่อเริ่ม</div>`;
}

function renderCourse() {
  $('#stationGrid').innerHTML = STATIONS.map(s => `
    <article class="station"><span class="pts">${s.max} คะแนน</span>
      <div class="target">${s.target ?? 'ปฏิบัติ'}<span>${s.target ? s.unit : ''}</span></div>
      <h4>${esc(s.name)}</h4><p>${esc(s.note)}</p></article>`).join('');

  $('#subjectList').innerHTML = SUBJECTS.map(s => `
    <details class="subject"><summary>${esc(s.title)} <span class="badge">5 คะแนน</span></summary>
      <div class="subject-body">
        <div class="why"><b>วัตถุประสงค์ของวิชา</b>${esc(s.why)}</div>
        <div>${s.topics.map(t => `<div class="topic"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div>`).join('')}</div>
        <div class="example"><b>ตัวอย่างสถานการณ์สอบ</b>${esc(s.example)}</div>
        <div class="criteria"><b>เกณฑ์ให้คะแนน</b>${esc(s.criteria)}</div>
      </div></details>`).join('');

  $('#glossary').innerHTML = GLOSSARY.map(g => `<div class="term"><b>${esc(g[0])}</b><span>${esc(g[1])}</span></div>`).join('');

  $('#examList').innerHTML = EXAM.map((q, i) => `
    <div class="exam-q"><h4>ข้อ ${i + 1}. ${esc(q.q)}</h4>
      <ol type="ก">${q.o.map((o, j) => `<li class="${j === q.a ? 'ans' : ''}">${esc(o)}${j === q.a ? ' ✓' : ''}</li>`).join('')}</ol>
      <p>${esc(q.e)}</p></div>`).join('');

  $$('#courseTabs button').forEach(b => b.addEventListener('click', () => {
    $$('#courseTabs button').forEach(x => x.classList.toggle('active', x === b));
    $$('.pane').forEach(p => p.hidden = p.id !== 'tab-' + b.dataset.tab);
  }));
}

/* ---------- 5) ฟอร์มบันทึกผล ---------- */
function buildForm() {
  $('#physInputs').innerHTML = STATIONS.map(s => `
    <div class="irow">
      <div class="nm">${esc(s.name)}<small>${s.target ? `เป้าหมาย ${s.target} ${s.unit}` : 'ให้คะแนนตรง ๆ'} · เต็ม ${s.max}</small></div>
      <input type="number" min="0" ${s.target ? '' : `max="${s.max}" step="0.5"`} id="in-${s.id}" placeholder="${s.target ? s.unit : 'คะแนน'}" aria-label="${esc(s.name)}">
      <div class="sc"><span id="sc-${s.id}">0</span>/${s.max}</div>
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
  $$('#form input[type=number]').forEach(i => i.addEventListener('input', recalc));
}

const stationScoreOf = (s, raw) => {
  const v = num(raw);
  return s.target ? round1(clamp(v / s.target, 0, 1) * s.max) : clamp(v, 0, s.max);
};
const stationScore = s => stationScoreOf(s, $('#in-' + s.id).value);

function scoresOf(rec) {
  const phys = STATIONS.reduce((a, s) => a + stationScoreOf(s, rec.raw?.[s.id]), 0);
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
  STATIONS.forEach(s => raw[s.id] = $('#in-' + s.id).value);
  const rec = {
    id: editingId || Date.now(),
    name: $('#traineeName').value.trim(),
    trainer: $('#trainerName').value.trim(),
    date: $('#trainDate').value,
    raw,
    acad: SUBJECTS.map((_, i) => $('#ac-' + i).value),
    disc: $('#dc-disc').value,
    team: $('#dc-team').value,
    notes: $('#notes').value.trim(),
    photos: [...photos]
  };
  rec.scores = scoresOf(rec);
  return rec;
}

function fillForm(r) {
  editingId = r.id;
  $('#recordTitle').textContent = `แก้ไขผล: ${r.name}`;
  $('#traineeName').value = r.name;
  $('#trainerName').value = r.trainer || '';
  $('#trainDate').value = r.date || '';
  STATIONS.forEach(s => $('#in-' + s.id).value = r.raw?.[s.id] ?? '');
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
  photos = [];
  renderThumbs();
  recalc();
}

function onSubmit(e) {
  e.preventDefault();
  const rec = collectRecord();
  if (!rec.name) { toast('กรอกชื่อ Roblox ก่อน'); return; }
  const list = load(STORE_KEY, []);
  const idx = list.findIndex(x => x.id === rec.id);
  idx >= 0 ? list[idx] = rec : list.unshift(rec);
  if (!save(STORE_KEY, list)) { toast('พื้นที่เก็บข้อมูลเต็ม ลองลบรูปหรือสำรอง JSON ก่อน'); return; }
  toast(`บันทึกผลของ ${rec.name} แล้ว`);
  resetForm();
  show('trainees');
}

/* รายชื่อ */
function renderRecords() {
  const q = $('#search').value.trim().toLowerCase();
  const gf = $('#filterGrade').value;
  const list = load(STORE_KEY, []).filter(r => r.name.toLowerCase().includes(q) && (!gf || gradeOf(r.scores.total).key === gf));
  $('#recordBody').innerHTML = list.length ? list.map(r => {
    const g = gradeOf(r.scores.total);
    return `<tr><td>${esc(r.name)}</td><td>${esc(r.trainer || '-')}</td><td>${esc(r.date || '-')}</td>
      <td>${r.scores.total} / 100</td><td><span class="tag ${g.key}">${g.short}</span></td><td>${(r.photos || []).length}</td>
      <td><div class="acts">
        <button class="btn small primary" data-img="${r.id}">ภาพรายงาน</button>
        <button class="btn small" data-edit="${r.id}">แก้ไข</button>
        <button class="btn small" data-rm="${r.id}">ลบ</button></div></td></tr>`;
  }).join('') : `<tr><td class="empty" colspan="7">ไม่พบรายการ</td></tr>`;
}
function onTableClick(e) {
  const list = load(STORE_KEY, []);
  const find = id => list.find(x => x.id == id);
  if (e.target.dataset.img) { const r = find(e.target.dataset.img); if (r) showReport(r); }
  if (e.target.dataset.edit) {
    const r = find(e.target.dataset.edit);
    if (r) { show('record'); fillForm(r); toast('โหลดข้อมูลมาแก้ไขแล้ว'); }
  }
  if (e.target.dataset.rm) {
    const r = find(e.target.dataset.rm);
    if (r && confirm(`ลบผลของ ${r.name}?`)) { save(STORE_KEY, list.filter(x => x.id != r.id)); renderRecords(); }
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
  const list = load(STORE_KEY, []);
  if (!list.length) return toast('ยังไม่มีข้อมูล');
  const head = ['ชื่อ Roblox', 'ครูฝึก', 'วันที่', 'กายภาพ/50', 'วิชาการ/30', 'วินัยและทีม/20', 'รวม/100', 'ผล', 'หมายเหตุ'];
  const rows = list.map(r => [r.name, r.trainer, r.date, r.scores.phys, r.scores.acad, r.scores.disc, r.scores.total, gradeOf(r.scores.total).text, r.notes]);
  const csv = [head, ...rows].map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download('hellweek-results.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!Array.isArray(incoming)) throw new Error();
      const map = new Map(load(STORE_KEY, []).map(r => [r.id, r]));
      incoming.forEach(r => r && r.id && r.name && r.scores && map.set(r.id, r));
      save(STORE_KEY, [...map.values()]);
      renderRecords();
      toast('นำเข้าข้อมูลแล้ว');
    } catch { toast('ไฟล์ไม่ถูกต้อง'); }
  };
  reader.readAsText(file);
}
function copyDiscord() {
  const r = collectRecord(), g = gradeOf(r.scores.total);
  const text = [
    '**📋 ผลการฝึก Hell Week**',
    `ผู้เข้ารับการฝึก: ${r.name || '-'}`, `ครูฝึกผู้ประเมิน: ${r.trainer || '-'}`, `วันที่: ${r.date || '-'}`, '',
    ...STATIONS.map(s => `- ${s.name}: ${stationScoreOf(s, r.raw[s.id])}/${s.max}`),
    `**หมวดกายภาพ: ${r.scores.phys}/50**`, `**หมวดวิชาการ: ${r.scores.acad}/30**`, `**วินัยและทีม: ${r.scores.disc}/20**`,
    `**รวม: ${r.scores.total}/100 → ${g.text}**`, r.notes ? `หมายเหตุ: ${r.notes}` : ''
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  (navigator.clipboard?.writeText(text) ?? Promise.reject())
    .then(() => toast('คัดลอกแล้ว นำไปวางใน Discord ได้เลย'))
    .catch(() => prompt('คัดลอกข้อความนี้', text));
}

/* ตั้งค่า */
function renderStorage() {
  const bytes = (localStorage.getItem(STORE_KEY) || '').length * 2;
  const mb = bytes / 1048576;
  $('#storageInfo').textContent = `ใช้ไปประมาณ ${mb.toFixed(2)} MB จากราว 5 MB (${load(STORE_KEY, []).length} รายการ)`;
  $('#storageBar').style.width = clamp(mb / 5 * 100, 0, 100) + '%';
  $('#storageBar').style.background = mb > 4 ? 'var(--red)' : 'var(--teal)';
}
function wipe() {
  if (confirm('ลบข้อมูลผู้เข้ารับการฝึกทั้งหมด? ย้อนกลับไม่ได้ (รหัสผ่านจะไม่ถูกลบ)') && confirm('ยืนยันอีกครั้ง ลบทั้งหมดจริงหรือไม่?')) {
    localStorage.removeItem(STORE_KEY);
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
    table(STATIONS.map(s => [s.name, s.target ? `${num(rec.raw?.[s.id])} / ${s.target} ${s.unit}` : 'ครูฝึกให้คะแนน', `${stationScoreOf(s, rec.raw?.[s.id])} / ${s.max}`]));
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
  $('#jsonBtn').addEventListener('click', () => download('hellweek-backup.json', JSON.stringify(load(STORE_KEY, [])), 'application/json'));
  $('#importInput').addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; });
  $('#passForm').addEventListener('submit', changePass);
  $('#wipeBtn').addEventListener('click', wipe);
  window.addEventListener('hashchange', () => { if (!document.body.classList.contains('locked')) show(location.hash.slice(1)); });
}

$('#lockForm').addEventListener('submit', onLogin);
setupLock();
if (sessionStorage.getItem(SESSION_KEY) === '1' && load(AUTH_KEY, null)) enterApp();