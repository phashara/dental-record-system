import { DentureRecord, normalizeDoctorName, resolveCoverage, classifyDentureType } from '../types';

export interface MatrixParseResult {
  isMatrix: boolean;
  totalFound: number;
  months: { [monthKey: string]: DentureRecord[] };
  allRecords: DentureRecord[];
  monthList: { key: string; label: string; count: number }[];
}

/**
 * Standard coverage columns in government dental ledger matrix
 */
const COVERAGE_MAP: { [key: number]: string } = {
  5: 'UC 30 บาท',
  6: 'UC อสม.',
  7: 'UC ผู้พิการ',
  8: 'UC สอย.',
  9: 'UC ผู้นำศาสนา',
  10: 'UC ทหารผ่านศึก',
  11: 'UC รายได้น้อย',
  12: 'UC ผู้นำชุมชน',
  13: 'UC บัตรทองฟรี',
  14: 'ต้นสังกัด (ระบบจ่ายตรง)',
  15: 'เบิกจ่ายตรง กทม./อปท.',
  16: 'พรบ.',
  17: 'เบิกต้นสังกัด/รัฐวิสาหกิจ',
  18: 'ชำระเงินเอง',
  19: 'ประกันสังคม',
  20: 'ฟรี',
};

const THAI_MONTH_TO_NUM: Record<string, string> = {
  'ม.ค.': '01', 'มกราคม': '01',
  'ก.พ.': '02', 'กุมภาพันธ์': '02',
  'มี.ค.': '03', 'มีนาคม': '03',
  'เม.ย.': '04', 'เมษายน': '04',
  'พ.ค.': '05', 'พฤษภาคม': '05',
  'มิ.ย.': '06', 'มิถุนายน': '06',
  'ก.ค.': '07', 'กรกฎาคม': '07',
  'ส.ค.': '08', 'สิงหาคม': '08',
  'ก.ย.': '09', 'กันยายน': '09',
  'ต.ค.': '10', 'ตุลาคม': '10',
  'พ.ย.': '11', 'พฤศจิกายน': '11',
  'ธ.ค.': '12', 'ธันวาคม': '12',
};

export function parseBatchMonthToYearMonth(monthStr: string): { year: number; month: string } {
  let month = '01';
  for (const [key, val] of Object.entries(THAI_MONTH_TO_NUM)) {
    if (monthStr.includes(key)) {
      month = val;
      break;
    }
  }

  const numMatch = monthStr.match(/(\d{2,4})/);
  let year = 2023;
  if (numMatch) {
    let y = parseInt(numMatch[1], 10);
    if (y < 100) {
      if (y >= 60 && y <= 80) year = y + 2500 - 543;
      else year = 2000 + y;
    } else if (y > 2400) {
      year = y - 543;
    } else {
      year = y;
    }
  }

  return { year, month };
}

/**
 * Parses dates formatted as DD/MM/YY or DD/MM/YYYY into YYYY-MM-DD
 */
export function parseDateString(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const str = String(raw).trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    const adYear = y > 2400 ? y - 543 : y;
    return `${adYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // If DD/MM/YY or DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (match) {
    const day = String(parseInt(match[1], 10)).padStart(2, '0');
    const month = String(parseInt(match[2], 10)).padStart(2, '0');
    let year = parseInt(match[3], 10);

    if (year < 100) {
      if (year >= 60 && year <= 80) {
        year += 2500 - 543;
      } else {
        year += 2000;
      }
    } else if (year > 2400) {
      year -= 543;
    }

    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Splits a CSV or TSV line respecting quotes
 */
export function splitLine(line: string): string[] {
  const isTab = line.includes('\t');
  const delimiter = isTab ? '\t' : ',';
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur.trim());
  return parts;
}

/**
 * Parses raw text or lines from Matrix dental ledger
 */
export function parseMatrixData(textOrRows: string | any[][]): MatrixParseResult {
  let rows: string[][] = [];

  if (typeof textOrRows === 'string') {
    const rawLines = textOrRows.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    rows = rawLines.map(splitLine);
  } else if (Array.isArray(textOrRows)) {
    rows = textOrRows.map(r => (Array.isArray(r) ? r.map(c => String(c ?? '').trim()) : []));
  }

  const months: { [monthKey: string]: DentureRecord[] } = {};
  const allRecords: DentureRecord[] = [];
  let currentMonth = 'ทั่วไป';
  let isMatrix = false;

  // Detect matrix signature: Look for row with '30 บาท' and 'สอย.' or 'ใช้สิทธิจ่ายตรง'
  let subheaderColMap = { ...COVERAGE_MAP };
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const lineStr = rows[r].join(' ');
    if (lineStr.includes('30 บาท') || lineStr.includes('สอย.') || lineStr.includes('อสม')) {
      isMatrix = true;
      headerRowIndex = r;
      // Map columns dynamically if possible
      rows[r].forEach((col, idx) => {
        const val = col.trim();
        if (val) {
          subheaderColMap[idx] = val;
        }
      });
      break;
    }
  }

  let recordCounter = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length === 0) continue;

    // Check if this row is a Month separator (e.g. "ม.ค.-66", "ก.พ.-66", "มีนาคม 2566", etc.)
    const firstCell = (cols[0] || '').trim();
    const joinedFirstFew = cols.slice(0, 3).join('').trim();

    const isMonthRow = /^(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)[\s\-_0-9]*/i.test(firstCell) ||
                       /^(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)[\s\-_0-9]*/i.test(firstCell);

    if (isMonthRow) {
      currentMonth = firstCell.replace(/[,;]/g, '').trim();
      if (!months[currentMonth]) {
        months[currentMonth] = [];
      }
      continue;
    }

    // Skip if row doesn't have at least an index and name/HN
    const indexNum = parseInt(firstCell, 10);
    if (isNaN(indexNum) && !cols[4]) continue;

    // Col 1: Prefix, Col 2: Name, Col 3: Surname
    let prefix = cols[1] || '';
    let fName = cols[2] || '';
    let lName = cols[3] || '';
    let hn = (cols[4] || '').trim();

    // If HN is not purely numeric or seems shifted
    let fullName = `${prefix}${fName} ${lName}`.trim();
    if (!fullName && cols[1]) fullName = cols[1];

    if (!hn && !fullName) continue;

    // Find Fee & Coverage across coverage columns (cols 5 to 20)
    let fee = 0;
    let coverageName = 'UC 30 บาท';

    for (let c = 5; c <= Math.min(cols.length - 1, 20); c++) {
      const cellVal = (cols[c] || '').replace(/[,\s"']/g, '');
      const numVal = parseFloat(cellVal);
      if (!isNaN(numVal) && numVal > 0) {
        fee = numVal;
        coverageName = subheaderColMap[c] || COVERAGE_MAP[c] || 'UC 30 บาท';
        break;
      }
    }

    // Dentist
    const rawDoctor = (cols[21] || '').trim();
    const cleanDoctor = normalizeDoctorName(rawDoctor);

    // Date anchored to the batch month (งวดเดือน) so all cases stay in the exact month
    const rawDate = (cols[22] || '').trim();
    const { year: bYear, month: bMonth } = parseBatchMonthToYearMonth(currentMonth);
    let dayStr = '15';
    const dayMatch = rawDate.match(/^(\d{1,2})/);
    if (dayMatch) {
      const dVal = Math.min(28, Math.max(1, parseInt(dayMatch[1], 10)));
      dayStr = String(dVal).padStart(2, '0');
    } else {
      const clampedIdx = Math.min(28, Math.max(1, (recordCounter % 28) + 1));
      dayStr = String(clampedIdx).padStart(2, '0');
    }
    const dateIso = `${bYear}-${bMonth}-${dayStr}`;

    // Service / Denture Type
    const rawType = (cols[23] || 'CD').trim();
    const classified = classifyDentureType(rawType);

    // Lab Cost from Remark/Col 24
    let rawLab = cols[24] || '';
    if (!rawLab && cols[25]) rawLab = cols[25];
    const cleanLabNum = parseFloat(String(rawLab).replace(/[,\s"']/g, '')) || 0;

    const cov = resolveCoverage(coverageName);

    recordCounter++;
    const record: DentureRecord = {
      id: `rec-matrix-${Date.now()}-${recordCounter}-${Math.random().toString(36).substring(2, 6)}`,
      hn: hn || `HN-${Date.now()}-${recordCounter}`,
      patientName: fullName || 'ไม่ระบุนาม',
      age: '',
      gender: prefix.includes('นาย') || prefix.includes('พระ') ? 'ชาย' : prefix.includes('นาง') || prefix.includes('น.ส.') || prefix.includes('นส') ? 'หญิง' : 'ไม่ระบุ',
      date: dateIso,
      doctor: cleanDoctor,
      dentureType: classified.code,
      denturePosition: classified.positionDesc,
      coverage: cov.fullDisplay,
      coverageGroup: cov.group,
      labCost: cleanLabNum,
      treatmentFee: fee > 0 ? fee : cleanLabNum,
      diagnosis: 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
      status: 'เสร็จสิ้น (Completed)',
      source: `ทะเบียนเบิกจ่าย (${currentMonth})`,
      note: `งวดเดือน: ${currentMonth} | วันที่บันทึกเดิม: ${rawDate || '-'} | บริการ: ${rawType}`,
      createdAt: new Date().toISOString()
    };

    if (!months[currentMonth]) {
      months[currentMonth] = [];
    }
    months[currentMonth].push(record);
    allRecords.push(record);
  }

  const monthList = Object.keys(months).map(m => ({
    key: m,
    label: `${m} (${months[m].length} เคส)`,
    count: months[m].length
  }));

  return {
    isMatrix,
    totalFound: allRecords.length,
    months,
    allRecords,
    monthList
  };
}
