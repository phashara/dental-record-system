export type DoctorName =
  | 'ทพญ.กนกวรรณ พัฒนกิจจารักษ์'
  | 'ทพญ.ศศิมนต์ วงศ์วัชรานนท์'
  | 'ทพญ.ชิดชนก สถิรวิชย์'
  | 'ทพญ.วีรยา จารุวัต'
  | 'ทพญ.จิณณพัต อินทร์ยัง'
  | 'กนกวรรณ'
  | 'ศศิมนต์'
  | 'ชิดชนก'
  | 'วีรยา'
  | 'จิณณพัต'
  | string;

export const DOCTORS_LIST = [
  { name: 'กนกวรรณ', fullName: 'ทพญ.กนกวรรณ พัฒนกิจจารักษ์', color: 'bg-teal-500' },
  { name: 'ศศิมนต์', fullName: 'ทพญ.ศศิมนต์ วงศ์วัชรานนท์', color: 'bg-purple-500' },
  { name: 'ชิดชนก', fullName: 'ทพญ.ชิดชนก สถิรวิชย์', color: 'bg-emerald-500' },
  { name: 'วีรยา', fullName: 'ทพญ.วีรยา จารุวัต', color: 'bg-amber-500' },
  { name: 'จิณณพัต', fullName: 'ทพญ.จิณณพัต อินทร์ยัง', color: 'bg-indigo-500' },
] as const;

/**
 * Normalizes doctor name to clean short format (ตัดคำว่า ทพญ., ทพ., หมอ ออกทั้งหมด)
 * เช่น "ทพญ.กนกวรรณ", "ทพญ.กนกวรรณ พัฒนกิจจารักษ์", "หมอกนกวรรณ" -> "กนกวรรณ"
 */
export function normalizeDoctorName(raw: string | undefined | null): string {
  if (!raw) return 'กนกวรรณ';
  const clean = raw.trim();

  // Match our 5 primary dentists
  if (clean.includes('กนกวรรณ')) return 'กนกวรรณ';
  if (clean.includes('ศศิมนต์')) return 'ศศิมนต์';
  if (clean.includes('ชิดชนก')) return 'ชิดชนก';
  if (clean.includes('วีรยา') || clean.includes('วรียา')) return 'วีรยา';
  if (clean.includes('จิณณพัต')) return 'จิณณพัต';

  // Historical archive dentists
  if (clean.includes('สุนิษา')) return 'สุนิษา';
  if (clean.includes('บุณยาพร')) return 'บุณยาพร';

  // Strip prefixes like ทพญ., ทพ., ทญ., หมอ, etc.
  return clean
    .replace(/^(ทพญ\.|ทพ\.|ทญ\.|หมอ|ทันตแพทย์หญิง|ทันตแพทย์)\s*/g, '')
    .trim();
}

// ---------------- DENTURE TYPE CLASSIFICATION & KNOWLEDGE BASE ----------------
export interface DentureCategoryRule {
  category: 'CD' | 'APD' | 'COMBINED' | 'TP' | 'RPD' | 'REPAIR' | 'OTHER';
  code: string;
  title: string;
  description: string;
  examples: string[];
}

export const DENTURE_CLASSIFICATION_RULES: DentureCategoryRule[] = [
  {
    category: 'CD',
    code: 'CD',
    title: 'CD (Complete Denture - ฟันเทียมทั้งปาก)',
    description: 'สำหรับผู้สูญเสียฟันทั้งขากรรไกร บน, ล่าง หรือทั้งสองขากรรไกร',
    examples: ['CD', 'CD/CD (บน-ล่าง)', 'CD/- (บน)', '-/CD (ล่าง)']
  },
  {
    category: 'APD',
    code: 'APD',
    title: 'APD (Acrylic Partial Denture - ถอดได้ฐานพลาสติก)',
    description: 'ฟันเทียมบางส่วนถอดได้ ชนิดฐานอะคริลิกพลาสติก',
    examples: ['APD', 'APD/APD (บน-ล่าง)', 'APD/- (บน)', '-/APD (ล่าง)']
  },
  {
    category: 'COMBINED',
    code: 'CD/APD',
    title: 'CD/APD (ขากรรไกรหนึ่งทั้งปาก อีกขากรรไกรบางส่วน)',
    description: 'ขากรรไกรบนใส่ฟันทั้งปาก ขากรรไกรล่างใส่ฟันบางส่วน หรือสลับกัน',
    examples: ['CD/APD', 'APD/CD']
  },
  {
    category: 'TP',
    code: 'TP',
    title: 'TP / UTP / LTP (Temporary / Transitional Denture - ฟันปลอมชั่วคราว)',
    description: 'ฟันเทียมชั่วคราวรอแผลถอนฟันหาย หรือก่อนส่งต่อทำชิ้นถาวร (UTP=บน, LTP=ล่าง)',
    examples: ['TP', 'UTP', 'LTP', 'CD/TP']
  },
  {
    category: 'RPD',
    code: 'RPD',
    title: 'RPD (Removable Partial Denture - โครงโลหะ Co-Cr)',
    description: 'ฟันเทียมบางส่วนถอดได้ ชนิดฐานโครงโลหะ มีความบาง แข็งแรง และส่งถ่ายแรงลงฟันหลัก',
    examples: ['RPD', 'RPD/RPD', 'โครงโลหะ']
  },
  {
    category: 'REPAIR',
    code: 'ซ่อม',
    title: 'งานซ่อมฟันปลอม (Denture Repair / Relining / Addition)',
    description: 'ซ่อมฐานหัก, เสริมฐาน (Reline/Rebase), เติมซี่ฟัน หรือเติมตะขอ',
    examples: ['ซ่อม', 'ซ่อมฐานหัก', 'เติมฟัน 1 ซี่', 'เสริมฐาน (Reline)']
  },
  {
    category: 'OTHER',
    code: 'OTHER',
    title: 'งานแลปทันตกรรมประดิษฐ์อื่นๆ',
    description: 'งานครอบฟัน สะพานฟัน หรืองานแลปเฉพาะทาง',
    examples: ['PFM crown', 'SD/APD']
  }
];

export function classifyDentureType(typeStr: string | undefined): {
  code: string;
  category: string;
  categoryTitle: string;
  positionDesc: string;
} {
  if (!typeStr) {
    return { code: 'ไม่ระบุ', category: 'OTHER', categoryTitle: 'ไม่ระบุประเภท', positionDesc: '-' };
  }
  const t = typeStr.trim().toUpperCase();

  // Position detection
  let positionDesc = 'ชิ้นเดียว';
  if (t.includes('/') || t.includes('บน-ล่าง') || t.includes('บนและล่าง') || t === 'CD/CD' || t === 'APD/APD') {
    positionDesc = 'บนและล่าง (2 ชิ้น)';
  } else if (t.startsWith('U') || t.includes('บน') || t.endsWith('/-')) {
    positionDesc = 'บน (Upper)';
  } else if (t.startsWith('L') || t.includes('ล่าง') || t.startsWith('-/')) {
    positionDesc = 'ล่าง (Lower)';
  }

  // Combined
  if ((t.includes('CD') && t.includes('APD')) || (t.includes('CD') && t.includes('TP'))) {
    return { code: typeStr, category: 'COMBINED', categoryTitle: 'CD/APD (ผสมสองขากรรไกร)', positionDesc };
  }

  // CD
  if (t.includes('CD') || t.includes('ทั้งปาก') || t.includes('COMPLETE')) {
    return { code: typeStr, category: 'CD', categoryTitle: 'CD (ฟันเทียมทั้งปาก)', positionDesc };
  }

  // APD
  if (t.includes('APD') || t.includes('ฐานพลาสติก') || t.includes('PARTIAL')) {
    return { code: typeStr, category: 'APD', categoryTitle: 'APD (ฟันเทียมถอดได้ฐานพลาสติก)', positionDesc };
  }

  // TP / UTP / LTP
  if (t.includes('TP') || t.includes('TEMPORARY') || t.includes('ชั่วคราว')) {
    return { code: typeStr, category: 'TP', categoryTitle: 'TP (ฟันปลอมชั่วคราว)', positionDesc };
  }

  // RPD
  if (t.includes('RPD') || t.includes('โลหะ') || t.includes('CAST')) {
    return { code: typeStr, category: 'RPD', categoryTitle: 'RPD (โครงโลหะ)', positionDesc };
  }

  // Repair
  if (t.includes('ซ่อม') || t.includes('REPAIR') || t.includes('RELINE') || t.includes('เติม')) {
    return { code: typeStr, category: 'REPAIR', categoryTitle: 'ซ่อม/ปรับปรุงฟันปลอม', positionDesc: 'งานซ่อมแซม' };
  }

  return { code: typeStr, category: 'OTHER', categoryTitle: 'งานแลปทันตกรรมอื่นๆ', positionDesc };
}

export interface CoverageCategoryGroup {
  id: string;
  name: string;
  color: string;
  badgeClass: string;
  items: string[];
}

export const COVERAGE_CATEGORIES: CoverageCategoryGroup[] = [
  {
    id: 'uc',
    name: 'UC',
    color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/40',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    items: [
      '30 บาท',
      'อสม/ครอบครัว อสม',
      'ผู้พิการ',
      'สอย.',
      'ผู้นำศาสนา',
      'ครอบครัวทหารผ่านศึก',
      'รายได้น้อย',
      'บัตรผู้นำชุมชน',
      'บัตรทองฟรี',
    ],
  },
  {
    id: 'direct_pay',
    name: 'ใช้สิทธิจ่ายตรง',
    color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/40',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    items: [
      'ต้นสังกัด (ระบบจ่ายตรง)',
      'เบิกจ่ายตรง กทม./อปท.',
    ],
  },
  {
    id: 'act',
    name: 'พรบ.',
    color: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800/40',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
    items: [
      'พรบ.',
    ],
  },
  {
    id: 'self_pay',
    name: 'ชำระเงินเอง',
    color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/40',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    items: [
      'ชำระเงินเอง',
    ],
  },
  {
    id: 'state_enterprise',
    name: 'เบิกต้นสังกัด / รัฐวิสาหกิจ',
    color: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/40',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50',
    items: [
      'เบิกต้นสังกัด / รัฐวิสาหกิจ',
    ],
  },
  {
    id: 'social_security',
    name: 'ประกันสังคม',
    color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/40',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
    items: [
      'ประกันสังคม',
    ],
  },
  {
    id: 'other',
    name: 'อื่นๆ',
    color: 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    badgeClass: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
    items: [
      'ฟรี',
    ],
  },
];

// Helper to normalize and categorize any coverage string
export function resolveCoverage(raw: string | undefined): { group: string; subItem: string; fullDisplay: string } {
  if (!raw) {
    return { group: 'UC', subItem: '30 บาท', fullDisplay: 'UC (30 บาท)' };
  }

  const clean = raw.trim();

  // Exact matching against configured categories
  for (const cat of COVERAGE_CATEGORIES) {
    for (const item of cat.items) {
      if (clean === item || clean === `${cat.name} - ${item}` || clean === `${cat.name} (${item})` || clean === `${cat.name} • ${item}`) {
        return { group: cat.name, subItem: item, fullDisplay: `${cat.name} • ${item}` };
      }
    }
  }

  // Fuzzy matching
  if (clean.includes('จ่ายตรง') || clean.includes('ต้นสังกัด (ระบบจ่ายตรง)')) {
    const sub = clean.includes('กทม') || clean.includes('อปท') ? 'เบิกจ่ายตรง กทม./อปท.' : 'ต้นสังกัด (ระบบจ่ายตรง)';
    return { group: 'ใช้สิทธิจ่ายตรง', subItem: sub, fullDisplay: `ใช้สิทธิจ่ายตรง • ${sub}` };
  }

  if (clean.includes('พรบ') || clean.includes('พ.ร.บ')) {
    return { group: 'พรบ.', subItem: 'พรบ.', fullDisplay: 'พรบ. • พรบ.' };
  }

  if (clean.includes('ประกันสังคม')) {
    return { group: 'ประกันสังคม', subItem: 'ประกันสังคม', fullDisplay: 'ประกันสังคม • ประกันสังคม' };
  }

  if (clean.includes('รัฐวิสาหกิจ') || clean.includes('เบิกต้นสังกัด')) {
    return { group: 'เบิกต้นสังกัด / รัฐวิสาหกิจ', subItem: 'เบิกต้นสังกัด / รัฐวิสาหกิจ', fullDisplay: 'เบิกต้นสังกัด / รัฐวิสาหกิจ • เบิกต้นสังกัด / รัฐวิสาหกิจ' };
  }

  if (clean.includes('ชำระ') || clean.includes('จ่ายเอง')) {
    return { group: 'ชำระเงินเอง', subItem: 'ชำระเงินเอง', fullDisplay: 'ชำระเงินเอง • ชำระเงินเอง' };
  }

  if (clean.includes('ฟรี')) {
    return { group: 'อื่นๆ', subItem: 'ฟรี', fullDisplay: 'อื่นๆ • ฟรี' };
  }

  // Check UC sub-items
  if (clean.includes('อสม')) {
    return { group: 'UC', subItem: 'อสม/ครอบครัว อสม', fullDisplay: 'UC • อสม/ครอบครัว อสม' };
  }
  if (clean.includes('พิการ')) {
    return { group: 'UC', subItem: 'ผู้พิการ', fullDisplay: 'UC • ผู้พิการ' };
  }
  if (clean.includes('สอย')) {
    return { group: 'UC', subItem: 'สอย.', fullDisplay: 'UC • สอย.' };
  }
  if (clean.includes('ศาสนา')) {
    return { group: 'UC', subItem: 'ผู้นำศาสนา', fullDisplay: 'UC • ผู้นำศาสนา' };
  }
  if (clean.includes('ทหาร')) {
    return { group: 'UC', subItem: 'ครอบครัวทหารผ่านศึก', fullDisplay: 'UC • ครอบครัวทหารผ่านศึก' };
  }
  if (clean.includes('รายได้น้อย')) {
    return { group: 'UC', subItem: 'รายได้น้อย', fullDisplay: 'UC • รายได้น้อย' };
  }
  if (clean.includes('ผู้นำชุมชน')) {
    return { group: 'UC', subItem: 'บัตรผู้นำชุมชน', fullDisplay: 'UC • บัตรผู้นำชุมชน' };
  }
  if (clean.includes('บัตรทอง')) {
    return { group: 'UC', subItem: 'บัตรทองฟรี', fullDisplay: 'UC • บัตรทองฟรี' };
  }

  // Default
  return { group: 'UC', subItem: clean.includes('30') ? '30 บาท' : clean, fullDisplay: `UC • ${clean}` };
}

export interface DentureRecord {
  id: string;
  hn: string;
  patientName: string;
  age?: string;
  gender?: 'ชาย' | 'หญิง' | 'ไม่ระบุ';
  date: string; // YYYY-MM-DD
  doctor: DoctorName;
  dentureType: string; // CD, APD, UTP, LTP, CD/TP, ซ่อม
  denturePosition?: string; // บน, ล่าง, บนและล่าง, etc.
  coverage: string; // สิทธิการรักษาตาม 7 หมวดหมู่ใหม่
  coverageGroup?: string; // 1. UC, 2. ใช้สิทธิจ่ายตรง, 3. พรบ., 4. ชำระเงินเอง, 5. เบิกต้นสังกัด / รัฐวิสาหกิจ, 6. ประกันสังคม, 7. อื่นๆ
  labCost: number; // ค่าแลป (เขียนด้วยลายมือ/พิมพ์)
  treatmentFee: number; // รวมค่าใช้จ่ายทั้งสิ้น
  note?: string; // Dental note / ลายมือแพทย์
  diagnosis?: string; // ICD10 เช่น K081 Loss of teeth
  status?: 'เสร็จสิ้น (Completed)' | 'รอดำเนินการ' | 'ส่งแลป' | 'รอใส่ฟัน';
  source?: string; // OCR สแกนกล้อง, ทะเบียน มค66, Manual Key
  rawOcrSnippet?: string;
  createdAt: string;
  updatedAt?: string;
  synced?: boolean; // Offline sync status
}

export interface OCRScanResult {
  documentType: 'OPD_CARD' | 'REGISTRY_TABLE';
  summary?: string;
  records: Partial<DentureRecord>[];
  detectedHandwriting?: string;
}

export type ViewTab = 'dashboard' | 'records' | 'doctors' | 'lab';

// PDPA / Medical privacy masking helpers
export function maskPatientName(name: string): string {
  if (!name) return 'ผู้ป่วย (ไม่ระบุชื่อ)';
  const clean = name.trim();
  if (clean.includes('นามสมมุติ') || clean.includes('จำลอง')) {
    return clean;
  }
  let title = '';
  let rest = clean;
  const titles = ['นางสาว', 'นาง', 'นาย', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.'];
  for (const t of titles) {
    if (rest.startsWith(t)) {
      title = t;
      rest = rest.substring(t.length).trim();
      break;
    }
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const last = parts[1] || '';

  const maskedFirst = first.length > 2 ? `${first.slice(0, 1)}***` : `${first}*`;
  const maskedLast = last ? (last.length > 2 ? `${last.slice(0, 1)}***` : `${last}*`) : '';
  return `${title ? title + ' ' : ''}${maskedFirst} ${maskedLast}`.trim();
}

export function maskHN(hn: string): string {
  if (!hn) return '-';
  const clean = String(hn).trim();
  if (clean.length >= 6) {
    return clean.slice(0, 2) + '****' + clean.slice(-2);
  }
  return clean;
}
