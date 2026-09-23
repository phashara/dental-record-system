import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Check,
  ChevronDown,
  Layers,
  Calendar,
  User,
  Stethoscope,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  DentureRecord,
  DOCTORS_LIST,
  normalizeDoctorName,
  resolveCoverage,
  classifyDentureType
} from '../types';
import { dentureStorage } from '../lib/storage';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: DentureRecord[];
  onImportSuccess: (savedCount: number) => void;
}

interface ColumnMapping {
  hn: string;
  patientName: string;
  date: string;
  dentureType: string;
  denturePosition: string;
  coverage: string;
  doctor: string;
  labCost: string;
  treatmentFee: string;
  age: string;
  gender: string;
  status: string;
  note: string;
}

/**
 * Converts various date formats (Excel serial number, Thai Buddhist year 2566-2569, etc.)
 * to standard ISO YYYY-MM-DD format.
 */
function parseExcelDate(raw: any): string {
  if (!raw) return new Date().toISOString().split('T')[0];

  // If already Date object
  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) {
      return raw.toISOString().split('T')[0];
    }
  }

  // If number (Excel serial date number, e.g. 45180)
  if (typeof raw === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(raw);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {
      // Fallback
    }
  }

  const str = String(raw).trim();

  // If format is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    // If Buddhist Era (e.g. 2566, 2567, 2568, 2569)
    const adYear = y > 2400 ? y - 543 : y;
    return `${adYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // If format is DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  const slashMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (slashMatch) {
    const day = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
    let year = parseInt(slashMatch[3], 10);

    if (year < 100) {
      // e.g. 66 -> 2566 -> 2023, 67 -> 2567 -> 2024
      if (year >= 60 && year <= 80) {
        year += 2500 - 543; // BE to AD
      } else {
        year += 2000;
      }
    } else if (year > 2400) {
      // Buddhist Era e.g. 2566 -> 2023
      year -= 543;
    }

    return `${year}-${month}-${day}`;
  }

  // Thai month names fallback (e.g. "20 ก.ย. 2567" or "15 มกราคม 2566")
  const thaiMonths: Record<string, string> = {
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
    'ธ.ค.': '12', 'ธันวาคม': '12'
  };

  for (const [tName, mCode] of Object.entries(thaiMonths)) {
    if (str.includes(tName)) {
      const parts = str.split(/\s+/);
      const day = parts.find(p => /^\d{1,2}$/.test(p));
      const yearPart = parts.find(p => /^\d{2,4}$/.test(p));
      if (day && yearPart) {
        let yr = parseInt(yearPart, 10);
        if (yr < 100) yr += 2500 - 543;
        else if (yr > 2400) yr -= 543;
        return `${yr}-${mCode}-${day.padStart(2, '0')}`;
      }
    }
  }

  // Try standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingRecords,
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    hn: '',
    patientName: '',
    date: '',
    dentureType: '',
    denturePosition: '',
    coverage: '',
    doctor: '',
    labCost: '',
    treatmentFee: '',
    age: '',
    gender: '',
    status: '',
    note: ''
  });
  const [showMappingSettings, setShowMappingSettings] = useState<boolean>(false);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'replace' | 'keep_all'>('skip');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-detect matching column from header name
  const autoDetectColumn = (headers: string[], keywords: string[]): string => {
    for (const kw of keywords) {
      const found = headers.find(h => h.trim().toLowerCase().includes(kw.toLowerCase()));
      if (found) return found;
    }
    return '';
  };

  // Handle file select
  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setSelectedFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Load first sheet or all
        const firstSheetName = wb.SheetNames[0];
        const initialSheet = wb.SheetNames.length === 1 ? firstSheetName : 'all';
        setSelectedSheet(initialSheet);

        // Parse rows from sheet(s)
        extractRowsFromWorkbook(wb, initialSheet);
      } catch (err: any) {
        console.error('Error reading Excel file:', err);
        setErrorMsg('ไม่สามารถเปิดไฟล์ Excel ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx, .xls หรือ .csv ที่ถูกต้อง');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('เกิดข้อผิดพลาดในการอ่านไฟล์');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Extract raw rows and detect headers
  const extractRowsFromWorkbook = (wb: XLSX.WorkBook, sheetChoice: string) => {
    let rows: any[] = [];
    const sheetsToRead = sheetChoice === 'all' ? wb.SheetNames : [sheetChoice];

    for (const sName of sheetsToRead) {
      const ws = wb.Sheets[sName];
      if (!ws) continue;
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      // Add sheet name indicator for debugging / verification
      json.forEach(r => {
        rows.push({ ...r, _sheetSource: sName });
      });
    }

    if (rows.length === 0) {
      setErrorMsg('ไม่พบข้อมูลแถวใน Sheet ที่เลือก');
      setRawRows([]);
      setAvailableColumns([]);
      return;
    }

    // Get all unique column names
    const headersSet = new Set<string>();
    rows.forEach(r => {
      Object.keys(r).forEach(k => {
        if (k !== '_sheetSource' && !k.startsWith('__EMPTY')) {
          headersSet.add(k);
        }
      });
    });
    const headers = Array.from(headersSet);
    setAvailableColumns(headers);

    // Auto-map headers with intelligent Thai aliases
    const detected: ColumnMapping = {
      hn: autoDetectColumn(headers, ['hn', 'เลขประจำตัว', 'เวชระเบียน', 'เลขที่', 'id']),
      patientName: autoDetectColumn(headers, ['ชื่อ-สกุล', 'ชื่อ - สกุล', 'ชื่อผู้ป่วย', 'ชื่อคนไข้', 'ชื่อ', 'ผู้ป่วย', 'name', 'patient']),
      date: autoDetectColumn(headers, ['วันที่', 'วันส่ง', 'วันรับ', 'วันนัด', 'date', 'ส่งแลป', 'วันที่พิมพ์']),
      dentureType: autoDetectColumn(headers, ['ชนิดฟัน', 'ประเภทฟัน', 'ชนิดฟันเทียม', 'ชนิด', 'ประเภท', 'ฟันเทียม', 'ฟันปลอม', 'type', 'รายการ']),
      denturePosition: autoDetectColumn(headers, ['ตำแหน่ง', 'ขากรรไกร', 'ชิ้น', 'บน/ล่าง', 'position']),
      coverage: autoDetectColumn(headers, ['สิทธิการรักษา', 'สิทธิ', 'สิทธิ์', 'ประเภทสิทธิ', 'coverage', 'scheme']),
      doctor: autoDetectColumn(headers, ['ทันตแพทย์', 'ชื่อหมอ', 'หมอ', 'ทพ', 'ทพญ', 'ผู้รักษา', 'doctor', 'dentist']),
      labCost: autoDetectColumn(headers, ['ค่าแลป', 'ค่าแล็ป', 'แลป', 'lab', 'ราคาแลป', 'cost']),
      treatmentFee: autoDetectColumn(headers, ['ค่ารักษา', 'รวม', 'ค่าบริการ', 'ราคา', 'มูลค่า', 'fee', 'price', 'amount']),
      age: autoDetectColumn(headers, ['อายุ', 'age']),
      gender: autoDetectColumn(headers, ['เพศ', 'gender', 'sex']),
      status: autoDetectColumn(headers, ['สถานะ', 'status', 'ขั้นตอน']),
      note: autoDetectColumn(headers, ['หมายเหตุ', 'note', 'remark', 'ลายมือ'])
    };

    setColumnMapping(detected);
    setRawRows(rows);
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      extractRowsFromWorkbook(workbook, newSheet);
    }
  };

  // Convert raw rows to DentureRecord candidates
  const parsedRecords = useMemo(() => {
    if (rawRows.length === 0) return [];

    const list: DentureRecord[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Extract values using mapping
      const rawHn = columnMapping.hn ? String(row[columnMapping.hn] || '').trim() : '';
      const rawName = columnMapping.patientName ? String(row[columnMapping.patientName] || '').trim() : '';
      const rawDate = columnMapping.date ? row[columnMapping.date] : '';
      const rawType = columnMapping.dentureType ? String(row[columnMapping.dentureType] || '').trim() : 'CD';
      const rawPosition = columnMapping.denturePosition ? String(row[columnMapping.denturePosition] || '').trim() : '';
      const rawCoverage = columnMapping.coverage ? String(row[columnMapping.coverage] || '').trim() : 'UC 30 บาท';
      const rawDoctor = columnMapping.doctor ? String(row[columnMapping.doctor] || '').trim() : 'กนกวรรณ';
      const rawLabCost = columnMapping.labCost ? row[columnMapping.labCost] : 0;
      const rawFee = columnMapping.treatmentFee ? row[columnMapping.treatmentFee] : 0;
      const rawAge = columnMapping.age ? String(row[columnMapping.age] || '').trim() : '';
      const rawGender = columnMapping.gender ? String(row[columnMapping.gender] || '').trim() : 'ไม่ระบุ';
      const rawStatus = columnMapping.status ? String(row[columnMapping.status] || '').trim() : 'เสร็จสิ้น (Completed)';
      const rawNote = columnMapping.note ? String(row[columnMapping.note] || '').trim() : '';

      // Skip completely empty rows
      if (!rawHn && !rawName) continue;

      const dateIso = parseExcelDate(rawDate);
      const cleanDoctor = normalizeDoctorName(rawDoctor);
      const resolvedCov = resolveCoverage(rawCoverage);
      const classified = classifyDentureType(rawType);

      // Parse numerical amounts safely
      const numLabCost = Math.max(0, parseFloat(String(rawLabCost).replace(/[^0-9.-]/g, '')) || 0);
      const numFee = Math.max(0, parseFloat(String(rawFee).replace(/[^0-9.-]/g, '')) || numLabCost);

      const record: DentureRecord = {
        id: `rec-import-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        hn: rawHn || `HN-EXCEL-${i + 1}`,
        patientName: rawName || 'ผู้ป่วย (จากไฟล์ Excel)',
        age: rawAge,
        gender: rawGender === 'ชาย' ? 'ชาย' : rawGender === 'หญิง' ? 'หญิง' : 'ไม่ระบุ',
        date: dateIso,
        doctor: cleanDoctor,
        dentureType: rawType || classified.code || 'CD',
        denturePosition: rawPosition || classified.positionDesc || 'บนและล่าง',
        coverage: resolvedCov.subItem,
        coverageGroup: resolvedCov.group,
        labCost: numLabCost,
        treatmentFee: numFee,
        note: rawNote ? `${rawNote} [นำเข้าจาก Excel Sheet: ${row._sheetSource || ''}]` : `นำเข้าจาก Excel Sheet: ${row._sheetSource || ''}`,
        status: (rawStatus.includes('รอดำเนินการ') ? 'รอดำเนินการ' : rawStatus.includes('ส่งแลป') ? 'ส่งแลป' : 'เสร็จสิ้น (Completed)') as any,
        source: `Excel Import (${row._sheetSource || 'Sheet1'})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
      };

      list.push(record);
    }

    return list;
  }, [rawRows, columnMapping]);

  // Statistics & Breakdown of parsed data
  const stats = useMemo(() => {
    const total = parsedRecords.length;
    const yearCounts: Record<string, number> = {};
    const doctorCounts: Record<string, number> = {};
    const coverageCounts: Record<string, number> = {};
    let totalLab = 0;

    const existingHnDateSet = new Set(
      existingRecords.map(r => `${r.hn.trim().toLowerCase()}_${r.date || ''}`)
    );

    let duplicateCount = 0;

    parsedRecords.forEach(r => {
      // Year calculation
      const yStr = r.date ? r.date.split('-')[0] : '';
      const bYear = yStr ? parseInt(yStr, 10) + 543 : 0;
      const yKey = bYear > 0 ? `พ.ศ. ${bYear}` : 'ไม่ระบุปี';
      yearCounts[yKey] = (yearCounts[yKey] || 0) + 1;

      // Doctor
      const doc = r.doctor || 'ไม่ระบุ';
      doctorCounts[doc] = (doctorCounts[doc] || 0) + 1;

      // Coverage
      const cov = r.coverageGroup || 'อื่นๆ';
      coverageCounts[cov] = (coverageCounts[cov] || 0) + 1;

      // Lab Cost
      totalLab += r.labCost || 0;

      // Duplicate detection
      const key = `${r.hn.trim().toLowerCase()}_${r.date || ''}`;
      if (existingHnDateSet.has(key)) {
        duplicateCount++;
      }
    });

    return {
      total,
      yearCounts,
      doctorCounts,
      coverageCounts,
      totalLab,
      duplicateCount
    };
  }, [parsedRecords, existingRecords]);

  // Handle final commit to database
  const handleConfirmImport = async () => {
    if (parsedRecords.length === 0) {
      setErrorMsg('ไม่มีข้อมูลที่พร้อมนำเข้า');
      return;
    }

    setIsProcessing(true);
    setStatusMsg('กำลังเตรียมบันทึกข้อมูลเข้าสู่ฐานข้อมูล Firestore...');

    try {
      let finalToSave = parsedRecords;

      if (duplicateMode === 'skip') {
        const existingHnDateSet = new Set(
          existingRecords.map(r => `${r.hn.trim().toLowerCase()}_${r.date || ''}`)
        );
        finalToSave = parsedRecords.filter(
          r => !existingHnDateSet.has(`${r.hn.trim().toLowerCase()}_${r.date || ''}`)
        );
      } else if (duplicateMode === 'replace') {
        // Find existing IDs to replace
        const existingMap = new Map(
          existingRecords.map(r => [`${r.hn.trim().toLowerCase()}_${r.date || ''}`, r.id])
        );
        finalToSave = parsedRecords.map(r => {
          const matchedId = existingMap.get(`${r.hn.trim().toLowerCase()}_${r.date || ''}`);
          if (matchedId) {
            return { ...r, id: matchedId };
          }
          return r;
        });
      }

      if (finalToSave.length === 0) {
        setStatusMsg('⚠️ ข้อมูลทั้งหมดในไฟล์ตรงกับในระบบแล้ว จึงไม่มีรายการใหม่ถูกบันทึก');
        setIsProcessing(false);
        return;
      }

      setStatusMsg(`กำลังบันทึก ${finalToSave.length} รายการลงคลังข้อมูล...`);
      await dentureStorage.saveBatchRecords(finalToSave);

      onImportSuccess(finalToSave.length);
      setStatusMsg(`✅ นำเข้าข้อมูลสำเร็จเรียบร้อยแล้วทั้งหมด ${finalToSave.length} รายการ!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      console.error('Import failed:', e);
      setErrorMsg(`เกิดข้อผิดพลาดในการบันทึก: ${e.message || 'ไม่สามารถบันทึกข้อมูลได้'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'ลำดับ': 1,
          'วันที่รับบริการ': '2566-03-15',
          'HN': '660012345',
          'ชื่อ-สกุล': 'นายสมบัติ ทองสุข',
          'อายุ': 68,
          'เพศ': 'ชาย',
          'ชนิดฟันเทียม': 'CD (ฟันเทียมทั้งปาก)',
          'ตำแหน่ง': 'บนและล่าง',
          'สิทธิการรักษา': 'UC (30 บาท)',
          'ทันตแพทย์': 'สุนิษา',
          'ค่าแลป': 2800,
          'ค่ารักษา': 2800,
          'สถานะ': 'เสร็จสิ้น (Completed)',
          'หมายเหตุ': 'พิมพ์ปากขั้นที่สอง ส่งแลปเด็นทัล'
        },
        {
          'ลำดับ': 2,
          'วันที่รับบริการ': '2567-08-20',
          'HN': '670054321',
          'ชื่อ-สกุล': 'นางสมพร ศรีสวัสดิ์',
          'อายุ': 72,
          'เพศ': 'หญิง',
          'ชนิดฟันเทียม': 'APD (ฐานพลาสติก)',
          'ตำแหน่ง': 'บน',
          'สิทธิการรักษา': 'ใช้สิทธิจ่ายตรง',
          'ทันตแพทย์': 'บุณยาพร',
          'ค่าแลป': 1200,
          'ค่ารักษา': 1500,
          'สถานะ': 'เสร็จสิ้น (Completed)',
          'หมายเหตุ': 'เติมฟัน 2 ซี่'
        },
        {
          'ลำดับ': 3,
          'วันที่รับบริการ': '2568-11-10',
          'HN': '680098765',
          'ชื่อ-สกุล': 'นายวิชัย ใจดี',
          'อายุ': 65,
          'เพศ': 'ชาย',
          'ชนิดฟันเทียม': 'CD/APD',
          'ตำแหน่ง': 'บน CD / ล่าง APD',
          'สิทธิการรักษา': 'UC (ผู้สูงอายุ)',
          'ทันตแพทย์': 'กนกวรรณ',
          'ค่าแลป': 3200,
          'ค่ารักษา': 3200,
          'สถานะ': 'เสร็จสิ้น (Completed)',
          'หมายเหตุ': 'ลองขี้ผึ้งเสร็จ นัดใส่ฟัน'
        },
        {
          'ลำดับ': 4,
          'วันที่รับบริการ': '2569-02-05',
          'HN': '690023456',
          'ชื่อ-สกุล': 'นางประนอม มั่นคง',
          'อายุ': 61,
          'เพศ': 'หญิง',
          'ชนิดฟันเทียม': 'ซ่อมฐานหัก',
          'ตำแหน่ง': 'ล่าง',
          'สิทธิการรักษา': 'ชำระเงินเอง',
          'ทันตแพทย์': 'ศศิมนต์',
          'ค่าแลป': 600,
          'ค่ารักษา': 800,
          'สถานะ': 'เสร็จสิ้น (Completed)',
          'หมายเหตุ': 'ส่งแลปด่วน รับวันรุ่งขึ้น'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ตัวอย่างนำเข้าข้อมูล');
      XLSX.writeFile(wb, 'denture_hospital_import_template_2566_2569.xlsx');
    } catch (e) {
      console.error('Error generating template:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>นำเข้าข้อมูลเวชระเบียนจาก Excel (.xlsx / .csv)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  รองรับข้อมูลย้อนหลัง 2566 - 2569
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                โรงพยาบาลพยุหะคีรี • สแกนคอลัมน์อัตโนมัติ จัดกลุ่มสิทธิและคุณหมอในอดีตให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* File Upload & Dropzone Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Drag & Drop Target (2 Cols) */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`md:col-span-2 border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-zinc-50/50 dark:bg-zinc-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  selectedFile
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {selectedFile ? <FileSpreadsheet className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>

                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                    {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ Excel มาวางที่นี่'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {selectedFile
                      ? `ขนาดไฟล์ ${(selectedFile.size / 1024).toFixed(1)} KB • คลิกเพื่อเปลี่ยนไฟล์`
                      : 'รองรับไฟล์ .xlsx, .xls หรือ .csv ทุกเวอร์ชัน'}
                  </p>
                </div>
              </div>
            </div>

            {/* Template Download & Guide Box (1 Col) */}
            <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-200 font-bold mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>ยังไม่มีฟอร์มมาตรฐาน?</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                  ดาวน์โหลดไฟล์เทมเพลตตัวอย่างที่มีโครงสร้างคอลัมน์มาตรฐานโรงพยาบาล พร้อมตัวอย่างเคสปี 66 - 69
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-4 flex items-center justify-center space-x-1.5 w-full py-2.5 px-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>โหลดตัวอย่าง Excel</span>
              </button>
            </div>
          </div>

          {/* Status / Error Notifications */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Sheet Selector (If multiple sheets detected) */}
          {sheetNames.length > 1 && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    พบ {sheetNames.length} แผ่นงาน (Sheets) ในไฟล์นี้:
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-zinc-500 dark:text-zinc-400">เลือก Sheet:</label>
                  <select
                    value={selectedSheet}
                    onChange={e => handleSheetChange(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">⚡ รวมทุก Sheet พร้อมกัน (ทั้งหมด {sheetNames.length} Sheets)</option>
                    {sheetNames.map(s => (
                      <option key={s} value={s}>
                        📄 Sheet: {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Column Mapping Accordion */}
          {availableColumns.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMappingSettings(prev => !prev)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    การจับคู่คอลัมน์ (Column Mapping)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    จับคู่อัตโนมัติแล้ว {Object.values(columnMapping).filter(Boolean).length}/13 ช่อง
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showMappingSettings ? 'rotate-180' : ''}`} />
              </button>

              {showMappingSettings && (
                <div className="p-4 bg-white dark:bg-zinc-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-zinc-100 dark:border-zinc-800">
                  
                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      HN (เลขเวชระเบียน) *
                    </label>
                    <select
                      value={columnMapping.hn}
                      onChange={e => setColumnMapping({ ...columnMapping, hn: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ / สร้างให้อัตโนมัติ --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      ชื่อ-สกุล ผู้ป่วย *
                    </label>
                    <select
                      value={columnMapping.patientName}
                      onChange={e => setColumnMapping({ ...columnMapping, patientName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      วันที่รับบริการ / วันที่ทำ *
                    </label>
                    <select
                      value={columnMapping.date}
                      onChange={e => setColumnMapping({ ...columnMapping, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ (ใช้วันปัจจุบัน) --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      ชนิดฟันเทียม (CD, APD, TP ฯลฯ) *
                    </label>
                    <select
                      value={columnMapping.dentureType}
                      onChange={e => setColumnMapping({ ...columnMapping, dentureType: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ (ค่าเริ่มต้น: CD) --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      สิทธิการรักษา (UC, จ่ายตรง ฯลฯ)
                    </label>
                    <select
                      value={columnMapping.coverage}
                      onChange={e => setColumnMapping({ ...columnMapping, coverage: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ (ค่าเริ่มต้น: UC 30 บาท) --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      ทันตแพทย์ผู้รักษา (หมอ)
                    </label>
                    <select
                      value={columnMapping.doctor}
                      onChange={e => setColumnMapping({ ...columnMapping, doctor: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ (ค่าเริ่มต้น: กนกวรรณ) --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      ค่าแลป (LAB Cost บาท)
                    </label>
                    <select
                      value={columnMapping.labCost}
                      onChange={e => setColumnMapping({ ...columnMapping, labCost: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ (0 บาท) --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      ค่ารักษา / มูลค่าบริการ
                    </label>
                    <select
                      value={columnMapping.treatmentFee}
                      onChange={e => setColumnMapping({ ...columnMapping, treatmentFee: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ (เท่ากับค่าแลป) --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      หมายเหตุ / ข้อความเพิ่มเติม
                    </label>
                    <select
                      value={columnMapping.note}
                      onChange={e => setColumnMapping({ ...columnMapping, note: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Analysis & Summary Statistics */}
          {parsedRecords.length > 0 && (
            <div className="space-y-4">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-400">รายการที่พบในไฟล์</span>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
                    {stats.total.toLocaleString()} รายการ
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">รวมค่าใช้จ่าย LAB</span>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                    ฿{stats.totalLab.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40">
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">ช่วงปี พ.ศ. ที่พบ</span>
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-300 font-mono mt-1 flex flex-wrap gap-1">
                    {Object.entries(stats.yearCounts).map(([yr, cnt]) => (
                      <span key={yr} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60">
                        {yr}: {cnt}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border ${
                  stats.duplicateCount > 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  <span className="text-[11px]">เคสที่อาจซ้ำกับในระบบ</span>
                  <div className="text-lg font-bold font-mono mt-0.5">
                    {stats.duplicateCount} รายการ
                  </div>
                </div>
              </div>

              {/* Doctors Found Highlight */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center space-x-2 mb-2 font-bold text-zinc-700 dark:text-zinc-300">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>รายชื่อทันตแพทย์ที่ตรวจพบในไฟล์:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(stats.doctorCounts).map(([docName, cnt]) => {
                    const isCurrent = DOCTORS_LIST.some(d => d.name === docName);
                    return (
                      <span
                        key={docName}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium border ${
                          isCurrent
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
                        }`}
                      >
                        <span>{docName}</span>
                        <span className="font-mono text-[10px] opacity-75">({cnt})</span>
                        {!isCurrent && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            แพทย์เดิม
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Deduplication Option Selector */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  ตัวเลือกจัดการข้อมูลที่อาจซ้ำซ้อน:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    duplicateMode === 'skip'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    <input
                      type="radio"
                      name="dupMode"
                      checked={duplicateMode === 'skip'}
                      onChange={() => setDuplicateMode('skip')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-xs">ข้ามรายการซ้ำ (แนะนำ)</div>
                      <div className="text-[11px] text-zinc-400">ถ้าพบ HN และวันที่ตรงกัน จะข้ามไม่บันทึกซ้ำ</div>
                    </div>
                  </label>

                  <label className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    duplicateMode === 'replace'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    <input
                      type="radio"
                      name="dupMode"
                      checked={duplicateMode === 'replace'}
                      onChange={() => setDuplicateMode('replace')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-xs">อัปเดต / แทนที่เดิม</div>
                      <div className="text-[11px] text-zinc-400">ปรับปรุงข้อมูลเคสเดิมให้ตรงกับใน Excel</div>
                    </div>
                  </label>

                  <label className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    duplicateMode === 'keep_all'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    <input
                      type="radio"
                      name="dupMode"
                      checked={duplicateMode === 'keep_all'}
                      onChange={() => setDuplicateMode('keep_all')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-xs">นำเข้าทั้งหมด</div>
                      <div className="text-[11px] text-zinc-400">บันทึกทุกแถวโดยไม่ตรวจสอบความซ้ำซ้อน</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table Preview (First 5 Rows) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    ตัวอย่างข้อมูล 5 รายการแรกที่จะนำเข้า:
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    (แสดงตัวอย่างหลังจากแปลงวันที่และจัดกลุ่มสิทธิแล้ว)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">ลำดับ</th>
                        <th className="py-2 px-3">วันที่</th>
                        <th className="py-2 px-3">HN</th>
                        <th className="py-2 px-3">ชื่อ-สกุล</th>
                        <th className="py-2 px-3">ชนิดฟัน</th>
                        <th className="py-2 px-3">สิทธิ</th>
                        <th className="py-2 px-3">หมอ</th>
                        <th className="py-2 px-3 text-right">ค่าแลป</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {parsedRecords.slice(0, 5).map((r, idx) => (
                        <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                          <td className="py-2 px-3 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono">{r.date}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{r.hn}</td>
                          <td className="py-2 px-3 font-medium">{r.patientName}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold text-[11px]">
                              {r.dentureType}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              {r.coverageGroup} • {r.coverage}
                            </span>
                          </td>
                          <td className="py-2 px-3">{r.doctor}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                            ฿{r.labCost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs">
            {parsedRecords.length > 0 ? (
              <span>พร้อมนำเข้า <strong className="text-zinc-900 dark:text-zinc-100">{parsedRecords.length}</strong> รายการ</span>
            ) : (
              <span>กรุณาเลือกไฟล์เพื่อเริ่มต้น</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isProcessing || parsedRecords.length === 0}
              onClick={handleConfirmImport}
              className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-2xl font-bold text-white shadow-md transition-all ${
                isProcessing || parsedRecords.length === 0
                  ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/25'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันนำเข้าข้อมูล ({parsedRecords.length} รายการ)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
