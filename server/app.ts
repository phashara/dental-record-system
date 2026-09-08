import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// High limit for mobile camera photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Determine safe data directory (Vercel serverless has writable /tmp)
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'denture_data')
  : path.join(process.cwd(), 'data');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create DATA_DIR', e);
}

const DB_FILE = path.join(DATA_DIR, 'denture_records.json');
const ROOT_ARCHIVE_FILE = path.join(process.cwd(), 'data', 'denture_records_archive_274.json');

// Doctors specified by user (5 dentists)
export const DOCTORS = [
  'ทพญ.ชิดชนก',
  'ทพญ.วีรยา',
  'ทพญ.จิณณพัต',
  'ทพญ.กนกวรรณ',
  'ทพญ.ศศิมนต์',
];

// Lazy Gemini API initialization to prevent startup crashes
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Initial seed data loader
const getInitialSeed = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      return Array.isArray(parsed) ? parsed : (parsed.records || []);
    }
    const rootDbFile = path.join(process.cwd(), 'data', 'denture_records.json');
    if (fs.existsSync(rootDbFile)) {
      const parsed = JSON.parse(fs.readFileSync(rootDbFile, 'utf-8'));
      return Array.isArray(parsed) ? parsed : (parsed.records || []);
    }
  } catch (e) {
    console.error('Error loading seed from file', e);
  }
  return [];
};
const SEED_RECORDS = getInitialSeed();

// Normalizes coverage according to 5 exact categories:
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

  const normalizedSeed = SEED_RECORDS.map((r: any) => {
    const norm = normalizeCoverage(r.coverage);
    return {
      ...r,
      coverageGroup: norm.group,
      coverage: norm.subItem,
    };
  });

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(normalizedSeed, null, 2));
  } catch (e) {
    // Non-fatal if filesystem is read-only
  }
  return normalizedSeed;
}

function saveRecords(records: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2));
  } catch (e) {
    console.warn('Could not save to DB file (e.g. read-only filesystem)', e);
  }
}

// ----------------- API ROUTES -----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), vercel: Boolean(process.env.VERCEL) });
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
    updatedAt: new Date().toISOString(),
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

// Reset / Restore empty state
app.post('/api/records/reset', (req, res) => {
  saveRecords([]);
  res.json({ success: true, records: [] });
});

// Restore retrospective 274 records from archive
app.post('/api/records/restore-archive', (req, res) => {
  const possiblePaths = [
    ROOT_ARCHIVE_FILE,
    path.join(DATA_DIR, 'denture_records_archive_274.json'),
    path.join(__dirname, '..', 'data', 'denture_records_archive_274.json'),
  ];

  let archivePath = possiblePaths.find(p => fs.existsSync(p));

  if (archivePath) {
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

// AI OCR Vision Endpoint
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const ai = getAI();

    const prompt = `คุณคือผู้เชี่ยวชาญการอ่านเอกสารทางทันตกรรมและเวชระเบียนผู้ป่วยนอก (OPD Card) ของโรงพยาบาลพยุหะคีรี
เอกสารในภาพเป็นเอกสารบันทึกการรักษาฟันปลอม (Denture Treatment Record) ซึ่งอาจเป็น:
1. การ์ด OPD ทันตกรรม (ใบตรวจผู้ป่วยนอก) มีช่อง HN, ชื่อ-สกุล, วันที่, การวินิจฉัย (Diagnosis เช่น K081 Loss of teeth due to accident, extraction), ตารางหัตถการ/ขั้นตอนการรักษา, ค่าแลป, ลายเซ็นทันตแพทย์
2. ใบทับเบียนฟันปลอม หรือ บัญชีรายชื่อผู้รับบริการฟันปลอม (ตารางหลายแถว) มีคอลัมน์: รหัส/ลำดับ, ชื่อ-สกุล, HN, สิทธิการรักษา (UC 30 บาท, อสม, ผู้พิการ, สอย., ผู้นำศาสนา, ข้าราชการ/จ่ายตรง, ชำระเงินเอง), ทันตแพทย์, วันที่ให้บริการ/Insert, ประเภทบริการ (CD, APD, TP, ซ่อม), ค่าใช้จ่าย LAB

รายชื่อทันตแพทย์ 5 ท่านในระบบ (สำคัญมาก: ให้เทียบและจับคู่ชื่อแพทย์กับ 5 ท่านนี้):
1. ทพญ.ชิดชนก (ชิดชนก)
2. ทพญ.วีรยา (วีรยา)
3. ทพญ.จิณณพัต (จิณณพัต)
4. ทพญ.กนกวรรณ (กนกวรรณ)
5. ทพญ.ศศิมนต์ (ศศิมนต์)

กรุณาวิเคราะห์ภาพอย่างละเอียด และส่งออกผลลัพธ์เป็น JSON รูปแบบนี้เท่านั้น (ห้ามใส่ Markdown code block ครอบ หรือใส่เฉพาะ JSON text ล้วน):
{
  "documentType": "OPD_CARD หรือ DENTURE_REGISTRY_TABLE",
  "confidenceScore": 0.95,
  "records": [
    {
      "hn": "เลข HN เช่น 580012345 หรือตัวเลข 6-10 หลักที่พบ",
      "patientName": "ชื่อและนามสกุลเต็ม เช่น นายสมชาย ใจดี หรือ นางสมพร มีสุข",
      "age": "อายุ เช่น 64",
      "gender": "ชาย หรือ หญิง",
      "date": "วันที่ในรูปแบบ YYYY-MM-DD เช่น 2026-08-06 ถ้าปีพุทธศักราช 2569 ให้แปลงเป็น ค.ศ. 2026, 2566 -> 2023, 2565 -> 2022",
      "doctor": "เลือก 1 ใน 5 ท่านนี้เท่านั้น: 'ทพญ.ชิดชนก', 'ทพญ.วีรยา', 'ทพญ.จิณณพัต', 'ทพญ.กนกวรรณ', 'ทพญ.ศศิมนต์'",
      "dentureType": "ชนิดฟันปลอม เช่น 'CD (ฟันเทียมทั้งปาก)', 'APD (ฟันเทียมบางส่วนถอดได้)', 'APD/APD', 'UTP', 'LTP', 'ซ่อม (Repair)', 'CD/TP'",
      "denturePosition": "เช่น 'บนและล่าง', 'บน (Upper)', 'ล่าง (Lower)', 'บน CD / ล่าง APD'",
      "coverage": "ต้องระบุตามโครงสร้างสิทธิ 5 ประเภทนี้เท่านั้น:
                   - หมวด UC: '30 บาท', 'อสม/ครอบครัว อสม', 'ผู้พิการ', 'สอย.', 'ผู้นำศาสนา', 'ครอบครัวทหารผ่านศึก', 'รายได้น้อย', 'บัตรผู้นำชุมชน', 'บัตรทองฟรี'
                   - หมวด ใช้สิทธิจ่ายตรง: 'ต้นสังกัด (ระบบจ่ายตรง)', 'เบิกจ่ายตรง กทม./อปท.'
                   - หมวด พรบ.: 'พรบ.'
                   - หมวด ชำระเงินเอง: 'เบิกต้นสังกัด/รัฐวิสาหกิจ', 'ชำระเงินเอง', 'ประกันสังคม'
                   - หมวด อื่นๆ: 'ฟรี'
                   (หากไม่แน่ชัด ให้ระบุ '30 บาท')",
      "coverageGroup": "หนึ่งใน 5 กลุ่มนี้: 'UC (บัตรทอง/สอย.)', 'ใช้สิทธิจ่ายตรง', 'พรบ.', 'ชำระเงินเอง', 'อื่นๆ (ฟรี)'",
      "labCost": 1200.00,
      "labCalculationDetail": "หากพบลายมือการคิดคำนวณค่าแลป ให้ใส่สูตรมาด้วย เช่น 'ค่าแลป = 300+1023 = 1323'",
      "treatmentFee": 4450.00,
      "diagnosis": "การวินิจฉัยโรค เช่น K081 Loss of teeth due to extraction",
      "status": "เสร็จสิ้น (Completed) หรือ กำลังรักษา",
      "note": "ข้อความหรือหมายเหตุอื่นๆ ที่ตรวจพบบนเอกสาร"
    }
  ],
  "rawSummary": "สรุปเนื้อหาสำคัญที่ตรวจพบจากเอกสารสั้นๆ 1-2 ประโยค"
}`;

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

export default app;
