Hell Week SEAL — ตั้งค่าบน Render

1) อัปโหลด/อัปเดตไฟล์โปรเจกต์นี้ใน repository ที่เชื่อมกับ Render แล้ว Deploy ใหม่
2) Render Dashboard > Web Service > Environment เพิ่มตัวแปร:
   HW_ADMIN_PASSWORD = รหัสผ่านแอดมิน (จำเป็น)
   HW_PASS_SEAL = รหัสผ่านสำหรับบุคลากร SEAL (จำเป็นสำหรับเปิดล็อกอิน SEAL)
3) กด Save Changes แล้ว Deploy หาก Render ไม่ deploy อัตโนมัติ

การใช้งาน:
- หน้าเข้าสู่ระบบกอง เลือก “บุคลากร SEAL” ใส่ชื่อ Roblox และรหัส HW_PASS_SEAL
- ระบบเข้าเวรและรายงานเข้า Discord ถูกถอดออกจากเวอร์ชันนี้แล้ว

ข้อควรระวัง:
- เก็บรหัสผ่านไว้ใน Environment Variables เท่านั้น ห้ามเผยแพร่ในแชตสาธารณะ
