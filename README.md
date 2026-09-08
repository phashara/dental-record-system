# ระบบทะเบียนฟันปลอมและสแกน OCR แบบฟอร์ม (Denture Registry System)
### โรงพยาบาลพยุหะคีรี (Phayuha Khiri Hospital)

ระบบบันทึกและบริหารจัดการทะเบียนฟันปลอมอัจฉริยะ ออกแบบมาเพื่อกลุ่มงานทันตกรรม รองรับการอ่านและแปลงข้อมูลจากภาพถ่ายแบบฟอร์ม/ใบตรวจรักษาผู้ป่วยนอก (OPD Card) และสมุดบันทึกด้วยระบบ AI Vision OCR พร้อมระบบแดชบอร์ดสรุปสถิติหัตถการและค่าใช้จ่าย LAB แบบเรียลไทม์

---

## 🌟 ฟีเจอร์หลักของระบบ (Key Features)

1. **AI Vision OCR สแกนแบบฟอร์ม/ภาพถ่าย:**
   - ถ่ายรูปหรืออัปโหลดรูปภาพใบ OPD Card, ใบบันทึกทันตกรรม หรือใบสรุปค่าแลป
   - สกัดข้อมูลอัตโนมัติ: HN, ชื่อผู้ป่วย, วันที่, ทันตแพทย์ผู้รักษา, ชนิดฟันปลอม, ตำแหน่ง, สิทธิการรักษา, ค่าใช้จ่าย LAB และสูตรคำนวณลายมือแพทย์
2. **ระบบจัดหมวดสิทธิการรักษา 5 ประเภท (Coverage Categories):**
   - **1. UC (บัตรทอง/หลักประกันสุขภาพถ้วนหน้า):** 30 บาท, อสม./ครอบครัว อสม., ผู้พิการ, สอย., ผู้นำศาสนา, ครอบครัวทหารผ่านศึก, รายได้น้อย, บัตรผู้นำชุมชน, บัตรทองฟรี
   - **2. ใช้สิทธิจ่ายตรง:** ต้นสังกัด (ระบบจ่ายตรง), เบิกจ่ายตรง กทม./อปท.
   - **3. พรบ.**
   - **4. ชำระเงินเอง:** เบิกต้นสังกัด/รัฐวิสาหกิจ, ชำระเงินเอง, ประกันสังคม
   - **5. อื่นๆ:** ฟรี, สงเคราะห์
3. **แดชบอร์ดสรุปผลการดำเนินงาน (Real-time Dashboard):**
   - สรุปจำนวนเคสสะสม, ยอดค่าใช้จ่าย LAB รวม, สัดส่วนชนิดฟันปลอม (CD, APD, UTP/LTP, งานซ่อม)
   - กราฟสัดส่วนผู้ป่วยแยกตาม 5 หมวดสิทธิการรักษา
4. **สรุปภาระงานทันตแพทย์ 5 ท่าน (Dentist Workload):**
   - ทพญ.ชิดชนก, ทพญ.วีรยา, ทพญ.จิณณพัต, ทพญ.กนกวรรณ, ทพญ.ศศิมนต์
   - แสดงสถิติจำนวนเคส, ยอดค่าแลปรวม, และรายการประวัติการรักษาของแพทย์แต่ละท่าน
5. **สรุปค่าใช้จ่าย LAB และตรวจสอบสูตรคำนวณ (Lab Cost Auditing):**
   - คำนวณยอดเฉลี่ย สูงสุด ต่ำสุด
   - แสดงรายการที่มีการจดสูตรคำนวณค่าแลปด้วยลายมือแพทย์ เช่น `ค่าแลป = 300+1023 = 1323`
6. **การส่งออกรายงาน (CSV Export):**
   - ส่งออกข้อมูลเป็นไฟล์ Excel/CSV รองรับภาษาไทย (UTF-8 with BOM)
   - รองรับการ Export แบบ De-identified (PDPA Mode) เพื่อการทำสถิติหรืองานวิจัยอย่างปลอดภัย

---

## 🛡️ มาตรการความปลอดภัยและคุ้มครองข้อมูลส่วนบุคคล (PDPA & Privacy Protection)

โครงการนี้ปฏิบัติตาม **พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)** และมาตรฐานเวชระเบียนทางการแพทย์:

- **1. Data Sanitization (ข้อมูลตัวอย่างใน Repository ปลอดภัย 100%):**
  - ข้อมูลใน `data/denture_records.json` สำหรับ Public Repository ถูกแทนที่ด้วย **ข้อมูลสมมุติ (Pseudonymized Data)** ชื่อผู้ป่วยถูกเปลี่ยนเป็น *"ผู้ป่วยจำลอง"* และเลข HN ถูกปิดบังเป็น `68XXXX696`
- **2. `.gitignore` ป้องกันข้อมูลจริงรั่วไหล:**
  - กำหนดไม่ให้ Git ติดตามไฟล์ `.env`, `credentials*.json`, `data/*.private.json`, และโฟลเดอร์ภาพถ่ายสแกน `scans/`, `uploads/`
- **3. โหมด Dynamic PDPA บนหน้าเว็บ (In-App Privacy Toggle):**
  - มีปุ่มสลับ **"🛡️ PDPA ซ่อนชื่อ"** ที่แถบเมนูด้านบน เพื่อปิดบังชื่อ-นามสกุล และ Mask เลข HN ทันทีในทุกหน้าจอ (Dashboard, Table, Doctors, OPD Card Modal)
  - เมื่อเปิดโหมด PDPA การกดปุ่ม **"ส่งออก CSV"** จะทำการแปลงชื่อและเลขประจำตัวผู้ป่วยให้เป็น De-identified อัตโนมัติ

---

## 🚀 ขั้นตอนการนำขึ้น GitHub (How to Push to Public GitHub)

### ขั้นตอนที่ 1: ตรวจสอบความปลอดภัยก่อน Push
ตรวจสอบว่าไม่มีไฟล์ข้อมูลคนไข้จริงหรือไฟล์ API Key หลุดออกไป:
```bash
# ตรวจสอบสถานะไฟล์
git status
```
มั่นใจว่าไม่มีไฟล์ `.env` หรือไฟล์ที่มีชื่อคนไข้จริงติดอยู่ในรายการ Staged

### ขั้นตอนที่ 2: ตั้งค่า Git และ Commit โค้ด
```bash
# เตรียมไฟล์ทั้งหมดเข้าสู่ Git (เคารพการคัดกรองใน .gitignore)
git add .

# บันทึกประวัติการเปลี่ยนแปลง
git commit -m "feat: Denture Registry system with OCR, 5 coverage categories, and PDPA privacy protection"
```

### ขั้นตอนที่ 3: เชื่อมต่อและ Push ไปยัง GitHub
1. สร้าง New Repository บน [GitHub](https://github.com/new) (ตั้งชื่อเช่น `phayuha-denture-registry`)
2. ดำเนินการรันคำสั่ง:
```bash
# เปลี่ยนชื่อ branch หลักเป็น main
git branch -M main

# ผูก Remote repository กับ URL บน GitHub ของท่าน
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/phayuha-denture-registry.git

# Push โค้ดขึ้นสู่ GitHub
git push -u origin main
```

> **⚠️ ข้อควรระวังสำคัญ:** ห้ามนำ API Key จริง (เช่น `GEMINI_API_KEY`) ใส่ไว้ในโค้ดหรือไฟล์ที่ Commit ขึ้น GitHub เด็ดขาด ให้ใช้การตั้งค่า Environment Variable บนโฮสติ้ง หรือไฟล์ `.env` ในเครื่องเท่านั้น

---

## 💻 วิธีการติดตั้งและรันในเครื่อง (Local Setup)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. คัดลอกและตั้งค่า Environment Variables
cp .env.example .env
# จากนั้นเปิดไฟล์ .env และระบุ GEMINI_API_KEY ของท่าน

# 3. รันโปรเจกต์ในโหมดพัฒนา (Development)
npm run dev

# 4. เปิดเบราว์เซอร์ที่ http://localhost:3000
```

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, tsx
- **AI OCR:** Google Gemini 2.5 API (Multimodal Vision & Structured Output)
- **Storage:** Local Indexed & Offline Cache Sync + REST API
