import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// High limit for mobile camera photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists for durable persistence
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'denture_records.json');

// Doctors specified by user and hospital records (5 dentists)
export const DOCTORS = [
  'ทพญ.ชิดชนก',
  'ทพญ.วีรยา',
  'ทพญ.จิณณพัต',
  'ทพญ.กนกวรรณ',
  'ทพญ.ศศิมนต์',
];

// Initial seed data is loaded from DB_FILE (data/denture_records.json)
const getInitialSeed = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      return Array.isArray(parsed) ? parsed : (parsed.records || []);
    }
  } catch (e) {
    console.error('Error loading seed from file', e);
  }
  return [];
};
const SEED_RECORDS = getInitialSeed();

// Helper to normalize coverage according to user's 5 exact categories:
// 1. UC (30 บาท, อสม/ครอบครัว อสม, ผู้พิการ, สอย., ผู้นำศาสนา, ครอบครัวทหารผ่านศึก, รายได้น้อย, บัตรผู้นำชุมชน, บัตรทองฟรี)
// 2. ใช้สิทธิจ่ายตรง (ต้นสังกัด (ระบบจ่ายตรง), เบิกจ่ายตรง กทม./อปท.)
// 3. พรบ.
// 4. ชำระเงินเอง (เบิกต้นสังกัด/รัฐวิสาหกิจ, ชำระเงินเอง, ประกันสังคม)
// 5. อื่นๆ (ฟรี)
function normalizeCoverage(raw: string | undefined): { group: string; subItem: string } {
  if (!raw) return { group: 'UC', subItem: '30 บาท' };
  const clean = raw.trim();

  // 1. UC
  if (clean.includes('อสม')) return { group: 'UC', subItem: 'อสม/ครอบครัว อสม' };
  if (clean.includes('พิการ')) return { group: 'UC', subItem: 'ผู้พิการ' };
  if (clean.includes('สอย')) return { group: 'UC', subItem: 'สอย.' };
  if (clean.includes('ศาสนา')) return { group: 'UC', subItem: 'ผู้นำศาสนา' };
  if (clean.includes('ทหาร')) return { group: 'UC', subItem: 'ครอบครัวทหารผ่านศึก' };
  if (clean.includes('รายได้น้อย')) return { group: 'UC', subItem: 'รายได้น้อย' };
  if (clean.includes('ผู้นำชุมชน')) return { group: 'UC', subItem: 'บัตรผู้นำชุมชน' };
  if (clean.includes('บัตรทอง') || clean.includes('สูงอายุ')) return { group: 'UC', subItem: 'บัตรทองฟรี' };
  if (clean.includes('30') || clean === 'UC') return { group: 'UC', subItem: '30 บาท' };

  // 2. ใช้สิทธิจ่ายตรง
  if (clean.includes('กทม') || clean.includes('อปท')) return { group: 'ใช้สิทธิจ่ายตรง', subItem: 'เบิกจ่ายตรง กทม./อปท.' };
  if (clean.includes('จ่ายตรง') || clean.includes('ต้นสังกัด')) return { group: 'ใช้สิทธิจ่ายตรง', subItem: 'ต้นสังกัด (ระบบจ่ายตรง)' };

  // 3. พรบ.
  if (clean.includes('พรบ') || clean.includes('พ.ร.บ')) return { group: 'พรบ.', subItem: 'พรบ.' };

  // 4. ชำระเงินเอง
  if (clean.includes('รัฐวิสาหกิจ')) return { group: 'ชำระเงินเอง', subItem: 'เบิกต้นสังกัด/รัฐวิสาหกิจ' };
  if (clean.includes('ประกันสังคม')) return { group: 'ชำระเงินเอง', subItem: 'ประกันสังคม' };
  if (clean.includes('ชำระ') || clean.includes('จ่ายเอง')) return { group: 'ชำระเงินเอง', subItem: 'ชำระเงินเอง' };

  // 5. อื่นๆ
  if (clean.includes('ฟรี')) return { group: 'อื่นๆ', subItem: 'ฟรี' };

  return { group: 'UC', subItem: clean };
}

// Helper to get or seed DB
function getRecords() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const list = Array.isArray(parsed) ? parsed : (parsed.records || []);
      return list.map((r: any) => {
        const norm = normalizeCoverage(r.coverage);
        return {
          ...r,
          coverageGroup: r.coverageGroup || norm.group,
          coverage: norm.subItem,
        };
      });
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
  // Initialize with seed
  const normalizedSeed = SEED_RECORDS.map((r: any) => {
    const norm = normalizeCoverage(r.coverage);
    return {
      ...r,
      coverageGroup: norm.group,
      coverage: norm.subItem,
    };
  });
  fs.writeFileSync(DB_FILE, JSON.stringify(normalizedSeed, null, 2));
  return normalizedSeed;
}

function saveRecords(records: any[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2));
}

// ----------------- API ENDPOINTS -----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// List doctors
app.get('/api/doctors', (req, res) => {
  res.json({ doctors: DOCTORS });
});

// Get all denture records
app.get('/api/records', (req, res) => {
  const records = getRecords();
  res.json({ records });
});

// Add new record
app.post('/api/records', (req, res) => {
  const records = getRecords();
  const newRecord = {
    id: req.body.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    hn: req.body.hn || '',
    patientName: req.body.patientName || '',
    age: req.body.age || '',
    gender: req.body.gender || 'ไม่ระบุ',
    date: req.body.date || new Date().toISOString().split('T')[0],
    doctor: req.body.doctor || 'ทพญ.ชิดชนก',
    dentureType: req.body.dentureType || 'CD',
    denturePosition: req.body.denturePosition || 'บนและล่าง',
    coverage: req.body.coverage || 'UC 30 บาท',
    labCost: Number(req.body.labCost) || 0,
    treatmentFee: Number(req.body.treatmentFee) || 0,
    note: req.body.note || '',
    diagnosis: req.body.diagnosis || 'K081 Loss of teeth',
    status: req.body.status || 'เสร็จสิ้น (Completed)',
    source: req.body.source || 'Manual Entry',
    createdAt: new Date().toISOString(),
  };

  records.unshift(newRecord);
  saveRecords(records);
  res.json({ success: true, record: newRecord });
});

// Batch add / sync records (for offline sync)
app.post('/api/records/batch', (req, res) => {
  const incoming = Array.isArray(req.body.records) ? req.body.records : [];
  const current = getRecords();
  const currentMap = new Map(current.map(r => [r.id, r]));

  for (const item of incoming) {
    if (!item.id) {
      item.id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }
    currentMap.set(item.id, item);
  }

  const updated = (Array.from(currentMap.values()) as any[]).sort((a: any, b: any) => {
    return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
  });

  saveRecords(updated);
  res.json({ success: true, count: updated.length, records: updated });
});

// Update record
app.put('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }

  records[index] = {
    ...records[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  saveRecords(records);
  res.json({ success: true, record: records[index] });
});

// Delete record
app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const records = getRecords();
  const filtered = records.filter(r => r.id !== id);
  saveRecords(filtered);
  res.json({ success: true });
});

// Reset / Clear data
app.post('/api/records/clear', (req, res) => {
  saveRecords([]);
  res.json({ success: true, count: 0, records: [] });
});

// Reset / Restore seed data
app.post('/api/records/reset', (req, res) => {
  saveRecords([]);
  res.json({ success: true, records: [] });
});

// Restore retrospective 274 records from archive
app.post('/api/records/restore-archive', (req, res) => {
  const archivePath = path.join(DATA_DIR, 'denture_records_archive_274.json');
  if (fs.existsSync(archivePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(archivePath, 'utf-8'));
      const list = Array.isArray(data) ? data : (data.records || []);
      const normalized = list.map((r: any) => {
        const norm = normalizeCoverage(r.coverage);
        return {
          ...r,
          coverageGroup: r.coverageGroup || norm.group,
          coverage: r.coverage || norm.subItem,
        };
      });
      saveRecords(normalized);
      res.json({ success: true, count: normalized.length, records: normalized });
    } catch (e) {
      res.status(500).json({ error: 'Failed to read archive file' });
    }
  } else {
    res.status(404).json({ error: 'Archive file not found' });
  }
});

// ----------------- OCR via GEMINI API -----------------
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', scanMode = 'auto' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server environment' });
    }

    // Clean data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `คุณคือระบบ AI OCR และผู้ช่วยวิเคราะห์เอกสารเวชระเบียนทันตกรรมเฉพาะทาง (Denture Dental Medical Record & OPD Card Analyzer) สำหรับโรงพยาบาลในประเทศไทย
เอกสารที่คุณกำลังวิเคราะห์อาจเป็น 1 ใน 2 รูปแบบ:
1. ใบตรวจรักษาผู้ป่วยนอก (OPD CARD ทันตกรรม รพ.พยุหะคีรี หรือ รพ.อื่นๆ) มี HN, ข้อมูลผู้ป่วย, วินิจฉัย, รายการทันตกรรม, บันทึกทันตกรรม (Dental note), ลายมือแพทย์เขียนค่าแลป เช่น "ค่าแลป = 300+1023 = 1323", "LAB = 2032 บาท", "ค่าแลป 1874.64", และชื่อแพทย์ผู้ตรวจรักษา
2. ใบทับเบียนฟันปลอม หรือ บัญชีรายชื่อผู้รับบริการฟันปลอม (ตารางหลายแถว) มีคอลัมน์: รหัส/ลำดับ, ชื่อ-สกุล, HN, สิทธิการรักษา (UC 30 บาท, อสม, ผู้พิการ, สอย., ผู้นำศาสนา, ข้าราชการ/จ่ายตรง, ชำระเงินเอง), ทันตแพทย์, วันที่ให้บริการ/Insert, ประเภทบริการ (CD, APD, TP, ซ่อม), ค่าใช้จ่าย LAB

รายชื่อทันตแพทย์ 5 ท่านในระบบ (สำคัญมาก: ให้เทียบและจับคู่ชื่อแพทย์กับ 5 ท่านนี้):
1. ทพญ.ชิดชนก (ชิดชนก)
2. ทพญ.วีรยา (วีรยา)
3. ทพญ.จิณณพัต (จิณณพัต)
4. ทพญ.กนกวรรณ (กนกวรรณ)
5. ทพญ.ศศิมนต์ (ศศิมนต์)

กรุณาวิเคราะห์ภาพอย่างละเอียด และส่งออกผลลัพธ์เป็น JSON รูปแบบนี้เท่านั้น (ห้ามใส่ Markdown code block ครอบ หรือใส่เฉพาะ JSON text ล้วน):
{
  "documentType": "OPD_CARD" หรือ "REGISTRY_TABLE",
  "summary": "สรุปสั้นๆ เกี่ยวกับเอกสารที่ตรวจพบ",
  "records": [
    {
      "hn": "ตัวเลข HN เช่น 680020696",
      "patientName": "ชื่อ-นามสกุล เช่น นางอารี บุตรน้อย",
      "age": "อายุ เช่น 64",
      "gender": "ชาย หรือ หญิง",
      "date": "วันที่ในรูปแบบ YYYY-MM-DD เช่น 2026-08-06 ถ้าปีพุทธศักราช 2569 ให้แปลงเป็น ค.ศ. 2026, 2566 -> 2023, 2565 -> 2022",
      "doctor": "เลือก 1 ใน 5 ท่านนี้เท่านั้น: 'ทพญ.ชิดชนก', 'ทพญ.วีรยา', 'ทพญ.จิณณพัต', 'ทพญ.กนกวรรณ', 'ทพญ.ศศิมนต์'",
      "dentureType": "ชนิดฟันปลอม เช่น 'CD (ฟันเทียมทั้งปาก)', 'APD (ฟันเทียมบางส่วนถอดได้)', 'APD/APD', 'UTP', 'LTP', 'ซ่อม (Repair)', 'CD/TP'",
      "denturePosition": "เช่น 'บนและล่าง', 'บน (Upper)', 'ล่าง (Lower)', 'บน CD / ล่าง APD'",
      "coverage": "ต้องระบุตามโครงสร้างสิทธิ 5 ประเภทนี้เท่านั้น:
1. UC: '30 บาท', 'อสม/ครอบครัว อสม', 'ผู้พิการ', 'สอย.', 'ผู้นำศาสนา', 'ครอบครัวทหารผ่านศึก', 'รายได้น้อย', 'บัตรผู้นำชุมชน', 'บัตรทองฟรี'
2. ใช้สิทธิจ่ายตรง: 'ต้นสังกัด (ระบบจ่ายตรง)', 'เบิกจ่ายตรง กทม./อปท.'
3. พรบ.: 'พรบ.'
4. ชำระเงินเอง: 'เบิกต้นสังกัด/รัฐวิสาหกิจ', 'ชำระเงินเอง', 'ประกันสังคม'
5. อื่นๆ: 'ฟรี'
ตัวอย่างค่าที่จะใส่: 'UC - 30 บาท', 'UC - อสม/ครอบครัว อสม', 'ใช้สิทธิจ่ายตรง - ต้นสังกัด (ระบบจ่ายตรง)', 'UC - สอย.', 'ชำระเงินเอง - ชำระเงินเอง' หรือระบุเฉพาะชื่อสิทธิย่อยที่ตรงที่สุด",
      "labCost": 1234.56, // ตัวเลขค่าใช้จ่าย LAB/ค่าแลป ที่อ่านได้จากลายมือหรือช่อง LAB (เช่น 575, 1323, 2261.98, 2032, 2960) ถ้าไม่มีให้ใส่ 0
      "treatmentFee": 3000.0, // รวมค่าใช้จ่ายทั้งสิ้น หรือ ค่ารักษา
      "note": "ข้อความลายมือแพทย์ / Dental note / หมายเหตุ เช่น Tx. insert upper APD / ค่าแลป = 575",
      "diagnosis": "การวินิจฉัย เช่น K081 Loss of teeth due to accident, extraction",
      "rawOcrSnippet": "ข้อความสำคัญที่ดึงได้จากเอกสาร"
    }
  ],
  "detectedHandwriting": "ข้อความลายมือที่ตรวจพบเพิ่มเติม เช่น สูตรคำนวณค่าแลป หรือบันทึกนัด"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '{}';
    let parsedJson = {};
    try {
      parsedJson = JSON.parse(responseText);
    } catch (parseErr) {
      // Clean JSON markers if any
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedJson = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      data: parsedJson,
    });
  } catch (error: any) {
    console.error('OCR Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process document with OCR',
    });
  }
});

// ----------------- VITE MIDDLEWARE & SERVER START -----------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Denture Registry Server running on port ${PORT}`);
  });
}

start();
