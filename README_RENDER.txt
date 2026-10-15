Hell Week SEAL — ตั้งค่าบน Render

1) อัปโหลด/อัปเดตไฟล์โปรเจกต์นี้ใน repository ที่เชื่อมกับ Render แล้ว Deploy ใหม่
2) Render Dashboard > Web Service > Environment เพิ่มตัวแปร:
   HW_ADMIN_PASSWORD = รหัสผ่านแอดมิน (จำเป็น)
   HW_PASS_SEAL = รหัสผ่านสำหรับบุคลากร SEAL (จำเป็นสำหรับเปิดล็อกอิน SEAL)
   DISCORD_WEBHOOK_URL = URL ของ Discord Webhook สำหรับช่องรายงานเวร (จำเป็นสำหรับส่งรายงานเข้า Discord)
3) กด Save Changes แล้ว Deploy หาก Render ไม่ deploy อัตโนมัติ

การใช้งาน:
- หน้าเข้าสู่ระบบกอง เลือก “บุคลากร SEAL” ใส่ชื่อ Roblox และรหัส HW_PASS_SEAL
- เข้าเมนู “กดเข้า-ออกเวร” แนบภาพหน้าจอ Roblox แล้วกดเริ่มเวรหรือเลิกเวร
- ระบบส่ง Embed พร้อมภาพไปยัง Discord ผ่าน Webhook ทุกครั้งที่เข้า/ออกเวร
- หากไม่ตั้ง DISCORD_WEBHOOK_URL ระบบจะบันทึกเวลาเวรได้ แต่จะไม่ส่ง Discord
- ภาพถูกส่งไป Discord โดยตรงและไม่เก็บเป็น Base64 ในไฟล์ประวัติเวร

ข้อควรระวัง:
- เก็บ URL ของ Discord Webhook และรหัสผ่านไว้ใน Environment Variables เท่านั้น ห้ามใส่ใน HTML/JavaScript ฝั่งผู้ใช้หรือเผยแพร่ในแชตสาธารณะ
- ภาพหลักฐานรองรับ JPEG, PNG, WebP ขนาดไม่เกิน 5 MB หลังบีบอัด
