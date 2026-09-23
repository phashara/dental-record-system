import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Info,
  Trash2,
  ShieldCheck,
  ClipboardCopy,
  Sparkles,
  FileText,
  Clock
} from 'lucide-react';
import {
  DentureRecord,
  DOCTORS_LIST,
  normalizeDoctorName,
  resolveCoverage,
  classifyDentureType
} from '../types';
import { dentureStorage } from '../lib/storage';
import { parseMatrixData, MatrixParseResult } from '../lib/matrixParser';

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

  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) {
      return raw.toISOString().split('T')[0];
    }
  }

  if (typeof raw === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(raw);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {}
  }

  const str = String(raw).trim();

  // If format is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
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

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingRecords,
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab Mode: 'file' | 'paste'
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('paste');
  const [pastedText, setPastedText] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Matrix format state
  const [matrixResult, setMatrixResult] = useState<MatrixParseResult | null>(null);
  const [selectedMatrixMonth, setSelectedMatrixMonth] = useState<string>('all');

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

  // Auto-detect matching column from header name
  const autoDetectColumn = (headers: string[], keywords: string[]): string => {
    for (const kw of keywords) {
      const found = headers.find(h => h.trim().toLowerCase().includes(kw.toLowerCase()));
      if (found) return found;
    }
    return '';
  };

  // Process text change in paste tab
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    setErrorMsg(null);
    setStatusMsg(null);

    if (!text.trim()) {
      setMatrixResult(null);
      setRawRows([]);
      return;
    }

    // Try parsing as matrix first
    const matrix = parseMatrixData(text);
    if (matrix.isMatrix && matrix.totalFound > 0) {
      setMatrixResult(matrix);
      // If there are months, default to first month or all
      if (matrix.monthList.length > 0) {
        setSelectedMatrixMonth(matrix.monthList[0].key);
      } else {
        setSelectedMatrixMonth('all');
      }
      setRawRows([]);
    } else {
      setMatrixResult(null);
      // Fallback: parse CSV/TSV table
      try {
        const wb = XLSX.read(text, { type: 'string' });
        extractRowsFromWorkbook(wb, wb.SheetNames[0]);
      } catch (e) {
        // Simple line parser
      }
    }
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

        // Check if first sheet is matrix format
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const sheet2D: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        const matrix = parseMatrixData(sheet2D);

        if (matrix.isMatrix && matrix.totalFound > 0) {
          setMatrixResult(matrix);
          if (matrix.monthList.length > 0) {
            setSelectedMatrixMonth(matrix.monthList[0].key);
          } else {
            setSelectedMatrixMonth('all');
          }
          setRawRows([]);
        } else {
          setMatrixResult(null);
          const initialSheet = wb.SheetNames.length === 1 ? wb.SheetNames[0] : 'all';
          setSelectedSheet(initialSheet);
          extractRowsFromWorkbook(wb, initialSheet);
        }
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

    const detected: ColumnMapping = {
      hn: autoDetectColumn(headers, ['hn', 'เลขประจำตัว', 'เวชระเบียน', 'เลขที่', 'id']),
      patientName: autoDetectColumn(headers, ['ชื่อ-สกุล', 'ชื่อ - สกุล', 'ชื่อผู้ป่วย', 'ชื่อคนไข้', 'ชื่อ', 'ผู้ป่วย', 'name', 'patient']),
      date: autoDetectColumn(headers, ['วันที่', 'วันส่ง', 'วันรับ', 'วันนัด', 'date', 'ส่งแลป', 'วันที่พิมพ์', 'วันที่ insert']),
      dentureType: autoDetectColumn(headers, ['ชนิดฟัน', 'ประเภทฟัน', 'ชนิดฟันเทียม', 'ชนิด', 'ประเภท', 'ฟันเทียม', 'ฟันปลอม', 'type', 'ให้บริการ']),
      denturePosition: autoDetectColumn(headers, ['ตำแหน่ง', 'ขากรรไกร', 'ชิ้น', 'บน/ล่าง', 'position']),
      coverage: autoDetectColumn(headers, ['สิทธิการรักษา', 'สิทธิ', 'สิทธิ์', 'ประเภทสิทธิ', 'coverage', 'scheme']),
      doctor: autoDetectColumn(headers, ['ทันตแพทย์', 'ชื่อหมอ', 'หมอ', 'ทพ', 'ทพญ', 'ผู้รักษา', 'doctor', 'dentist']),
      labCost: autoDetectColumn(headers, ['ค่าแลป', 'ค่าแล็ป', 'แลป', 'lab', 'ราคาแลป', 'cost', 'หมายเหตุ']),
      treatmentFee: autoDetectColumn(headers, ['ค่ารักษา', 'รวม', 'ค่าบริการ', 'ราคา', 'มูลค่า', 'fee', 'price', 'amount']),
      age: autoDetectColumn(headers, ['อายุ', 'age']),
      gender: autoDetectColumn(headers, ['เพศ', 'gender', 'sex']),
      status: autoDetectColumn(headers, ['สถานะ', 'status', 'ขั้นตอน']),
      note: autoDetectColumn(headers, ['หมายเหตุ', 'note', 'remark'])
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

  // Convert raw rows or matrix to DentureRecord candidates
  const parsedRecords = useMemo(() => {
    // If matrix format is active
    if (matrixResult && matrixResult.isMatrix) {
      if (selectedMatrixMonth === 'all') {
        return matrixResult.allRecords;
      }
      return matrixResult.months[selectedMatrixMonth] || [];
    }

    if (rawRows.length === 0) return [];

    const list: DentureRecord[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

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

      if (!rawHn && !rawName) continue;

      const dateIso = parseExcelDate(rawDate);
      const cleanDoctor = normalizeDoctorName(rawDoctor);
      const cov = resolveCoverage(rawCoverage);
      const classified = classifyDentureType(rawType);

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
        dentureType: classified.code,
        denturePosition: rawPosition || classified.positionDesc,
        coverage: cov.fullDisplay,
        coverageGroup: cov.group,
        labCost: numLabCost,
        treatmentFee: numFee,
        diagnosis: 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
        status: (rawStatus as any) || 'เสร็จสิ้น (Completed)',
        note: rawNote,
        source: `Excel Import (${row._sheetSource || 'Sheet1'})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
      };

      list.push(record);
    }

    return list;
  }, [rawRows, columnMapping, matrixResult, selectedMatrixMonth]);

  // Existing records breakdown by year
  const existingBreakdown = useMemo(() => {
    let count2569 = 0;
    let count2568 = 0;
    let count2567 = 0;
    let count2566 = 0;
    let countOther = 0;

    existingRecords.forEach(r => {
      const d = r.date || '';
      if (d.startsWith('2026') || d.startsWith('2569')) {
        count2569++;
      } else if (d.startsWith('2025') || d.startsWith('2568')) {
        count2568++;
      } else if (d.startsWith('2024') || d.startsWith('2567')) {
        count2567++;
      } else if (d.startsWith('2023') || d.startsWith('2566')) {
        count2566++;
      } else {
        countOther++;
      }
    });

    return {
      total: existingRecords.length,
      count2569,
      count2568,
      count2567,
      count2566,
      countOther
    };
  }, [existingRecords]);

  // Download backup before importing
  const handleDownloadBackupBeforeImport = () => {
    try {
      const dataStr = JSON.stringify(existingRecords, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_before_excel_import_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMsg('✅ ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว');
    } catch (e) {
      setErrorMsg('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์สำรอง');
    }
  };

  // Statistics & Breakdown of parsed data
  const stats = useMemo(() => {
    const total = parsedRecords.length;
    const yearCounts: Record<string, number> = {};
    const doctorCounts: Record<string, number> = {};
    const coverageCounts: Record<string, number> = {};
    let totalLab = 0;
    let totalFee = 0;

    const existingHnDateSet = new Set(
      existingRecords.map(r => `${r.hn.trim().toLowerCase()}_${r.date || ''}`)
    );

    let duplicateCount = 0;

    parsedRecords.forEach(r => {
      const yStr = r.date ? r.date.split('-')[0] : '';
      const bYear = yStr ? parseInt(yStr, 10) + 543 : 0;
      const yKey = bYear > 0 ? `พ.ศ. ${bYear}` : 'ไม่ระบุปี';
      yearCounts[yKey] = (yearCounts[yKey] || 0) + 1;

      const doc = r.doctor || 'ไม่ระบุ';
      doctorCounts[doc] = (doctorCounts[doc] || 0) + 1;

      const cov = r.coverageGroup || 'อื่นๆ';
      coverageCounts[cov] = (coverageCounts[cov] || 0) + 1;

      totalLab += r.labCost || 0;
      totalFee += r.treatmentFee || 0;

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
      totalFee,
      duplicateCount
    };
  }, [parsedRecords, existingRecords]);

  if (!isOpen) return null;

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
                <span>นำเข้าข้อมูลเวชระเบียนทันตกรรม</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  รองรับ Matrix 16 สิทธิ & Copy/Paste
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                โรงพยาบาลพยุหะคีรี • สแกนอัตโนมัติ รวมชื่อ-สกุล แกะสิทธิ 16 ช่อง และดึงค่าแลปให้อัตโนมัติ
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

          {/* Data Safety Assurance Card */}
          <div className="p-4 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 text-blue-900 dark:text-blue-200">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs">ระบบความปลอดภัยข้อมูล (Data Safety Assurance)</h4>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    ระบบใช้วิธีบันทึกแบบผสานข้อมูล (Append & Merge) — ข้อมูลปี 2569 และปีก่อนหน้าจะยังคงอยู่ครบถ้วน ปลอดภัย
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackupBeforeImport}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-100/50 dark:hover:bg-zinc-700 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
                title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON เก็บไว้"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>สำรองข้อมูลเดิม (Backup)</span>
              </button>
            </div>

            {/* Current System Breakdown Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-blue-100 dark:border-blue-900/40">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">ปี 2569 ในระบบ</div>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
                  <span>{existingBreakdown.count2569} รายการ</span>
                </div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-blue-100 dark:border-blue-900/40">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">ปี 2566 ในระบบ</div>
                <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {existingBreakdown.count2566} รายการ
                </div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-blue-100 dark:border-blue-900/40">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">ปีอื่นๆ ในระบบ</div>
                <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                  {existingBreakdown.count2568 + existingBreakdown.count2567 + existingBreakdown.countOther} รายการ
                </div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-blue-100 dark:border-blue-900/40">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">รวมทั้งหมดในระบบ</div>
                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {existingBreakdown.total} รายการ
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector: Upload File vs Paste Text */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 px-2 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === 'paste'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <ClipboardCopy className="w-4 h-4" />
              <span>📋 วางข้อความจาก Excel (Copy & Paste)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                แนะนำ
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`pb-2.5 px-2 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === 'file'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>📁 อัปโหลดไฟล์ (.xlsx / .csv)</span>
            </button>
          </div>

          {/* TAB 1: PASTE TEXT DIRECTLY */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>วางข้อมูลที่ Copy มาจากไฟล์ Excel หรือ CSV ได้เลยที่นี่:</span>
                </label>
                {pastedText && (
                  <button
                    type="button"
                    onClick={() => handlePastedTextChange('')}
                    className="text-xs text-rose-500 hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ล้างข้อความ</span>
                  </button>
                )}
              </div>

              <textarea
                value={pastedText}
                onChange={e => handlePastedTextChange(e.target.value)}
                rows={6}
                placeholder="คลิกที่นี่แล้วกด Ctrl+V (วางข้อมูลจาก Excel)... ระบบจะวิเคราะห์คอลัมน์ รวมชื่อ-สกุล แยกงวดเดือน และแกะสิทธิ 16 ช่องให้อัตโนมัติ"
                className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-400">
                💡 <strong>เคล็ดลับ:</strong> สามารถเปิดไฟล์ Excel แล้วกดคลุมดำเลือกแถวที่ต้องการ (Ctrl+A หรือลากคลุม) แล้วกด Copy (Ctrl+C) นำมาวางที่นี่ได้ทันที
              </p>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-200 font-bold mb-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span>ระบบรองรับ 2 แบบ</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                    1. ตารางแบบ <strong>ทะเบียนเบิกจ่าย (Matrix 16 สิทธิ)</strong><br />
                    2. ตารางแบบ <strong>แถวปกติ (Single Header)</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MATRIX FORMAT DETECTION & MONTH SELECTOR BANNER */}
          {matrixResult && matrixResult.isMatrix && (
            <div className="p-4 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100 flex items-center space-x-2">
                      <span>ตรวจพบ: ตารางทะเบียนเบิกจ่ายทันตกรรม (Matrix 16 สิทธิ)</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono font-bold">
                        รวม {matrixResult.totalFound} เคส
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      ระบบรวมคำนำหน้า+ชื่อ+สกุล, แปลงวันที่รักษาจริง, แกะสิทธิ 16 ช่อง และดึงค่าแลปให้อัตโนมัติ 100%
                    </p>
                  </div>
                </div>

                {/* Month Choice Dropdown */}
                {matrixResult.monthList.length > 0 && (
                  <div className="flex items-center space-x-2 self-start sm:self-auto bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-emerald-300 dark:border-emerald-700 shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-600 ml-1" />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">เลือกงวดเดือน:</span>
                    <select
                      value={selectedMatrixMonth}
                      onChange={e => setSelectedMatrixMonth(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold text-xs focus:outline-none"
                    >
                      <option value="all">⚡ นำเข้าทุกเดือน (ทั้งหมด {matrixResult.totalFound} เคส)</option>
                      {matrixResult.monthList.map(m => (
                        <option key={m.key} value={m.key}>
                          📅 {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Analysis & Summary Statistics */}
          {parsedRecords.length > 0 && (
            <div className="space-y-4">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-400">รายการที่พร้อมนำเข้า</span>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
                    {stats.total.toLocaleString()} รายการ
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">รวมค่าใช้จ่าย LAB</span>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                    ฿{stats.totalLab.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40">
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400">รวมมูลค่าค่ารักษา</span>
                  <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300 font-mono mt-0.5">
                    ฿{stats.totalFee.toLocaleString()}
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
                  <span>รายชื่อทันตแพทย์ที่ตรวจพบในชุดข้อมูลนี้:</span>
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
                        <span className="font-mono text-[10px] opacity-75">({cnt} เคส)</span>
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
                      <div className="text-[11px] text-zinc-400">ปรับปรุงข้อมูลเคสเดิมให้ตรงกับในไฟล์</div>
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

              {/* Table Preview (First 8 Rows) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    ตัวอย่างข้อมูลที่จะนำเข้า ({parsedRecords.length} รายการ):
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    (แสดงตัวอย่างหลังจากแปลงวันที่ รวมชื่อ-สกุล และแกะสิทธิแล้ว)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">ลำดับ</th>
                        <th className="py-2 px-3">วันที่รักษาจริง</th>
                        <th className="py-2 px-3">HN</th>
                        <th className="py-2 px-3">ชื่อ-สกุล</th>
                        <th className="py-2 px-3">ชนิดฟันปลอม</th>
                        <th className="py-2 px-3">สิทธิการรักษา</th>
                        <th className="py-2 px-3 text-right">ค่ารักษา</th>
                        <th className="py-2 px-3 text-right">ค่าแลป</th>
                        <th className="py-2 px-3">ทันตแพทย์</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {parsedRecords.slice(0, 15).map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                          <td className="py-2 px-3 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400">{r.date}</td>
                          <td className="py-2 px-3 font-mono font-semibold">{r.hn}</td>
                          <td className="py-2 px-3 font-medium">{r.patientName}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold text-[11px]">
                              {r.dentureType}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              {r.coverage}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            ฿{(r.treatmentFee || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                            ฿{(r.labCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3">{r.doctor}</td>
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
              <span>พร้อมนำเข้า <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{parsedRecords.length}</strong> รายการ</span>
            ) : (
              <span>กรุณาวางข้อความ หรือเลือกไฟล์เพื่อเริ่มต้น</span>
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
