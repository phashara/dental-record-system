import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  HardDrive,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Printer,
  Calendar,
  Clock,
  BookOpen,
  Filter,
  Check
} from 'lucide-react';
import { DentureRecord, COVERAGE_CATEGORIES, resolveCoverage, DENTURE_CLASSIFICATION_RULES, classifyDentureType } from '../types';
import { dentureStorage, ExportFilterOptions } from '../lib/storage';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DentureRecord[];
  onRecordsUpdated: () => void;
  onOpenLockScreen: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  records,
  onRecordsUpdated,
  onOpenLockScreen,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'export' | 'denture_types' | 'backup' | 'reset'>('overview');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmResetText, setConfirmResetText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date filtering state for Export
  const [exportFilterMode, setExportFilterMode] = useState<'all' | 'custom_range' | 'year' | 'month'>('all');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportYear, setExportYear] = useState<string>('all');
  const [exportMonth, setExportMonth] = useState<string>('all');

  // Filtered records for export preview
  const filteredExportRecords = useMemo(() => {
    let list = records;
    if (exportFilterMode === 'custom_range') {
      if (exportStartDate && exportEndDate) {
        list = list.filter(r => r.date && r.date >= exportStartDate && r.date <= exportEndDate);
      }
    } else if (exportFilterMode === 'year' && exportYear !== 'all') {
      const bYear = parseInt(exportYear, 10);
      const cYear = bYear > 2500 ? bYear - 543 : bYear;
      list = list.filter(r => r.date && r.date.startsWith(String(cYear)));
    } else if (exportFilterMode === 'month') {
      if (exportYear !== 'all') {
        const bYear = parseInt(exportYear, 10);
        const cYear = bYear > 2500 ? bYear - 543 : bYear;
        list = list.filter(r => r.date && r.date.startsWith(String(cYear)));
      }
      if (exportMonth !== 'all') {
        list = list.filter(r => {
          if (!r.date) return false;
          return r.date.split('-')[1] === exportMonth;
        });
      }
    }
    return list;
  }, [records, exportFilterMode, exportStartDate, exportEndDate, exportYear, exportMonth]);

  const filteredExportAmount = useMemo(() => {
    return filteredExportRecords.reduce((sum, r) => sum + (r.treatmentFee || r.labCost || 0), 0);
  }, [filteredExportRecords]);

  // Helper to build export options
  const getExportOptions = (anonymize: boolean): ExportFilterOptions => {
    let periodLabel = 'ข้อมูลทั้งหมด (All Records)';
    if (exportFilterMode === 'custom_range' && exportStartDate && exportEndDate) {
      periodLabel = `ระหว่างวันที่ ${exportStartDate} ถึง ${exportEndDate}`;
      return { anonymize, startDate: exportStartDate, endDate: exportEndDate, periodLabel };
    }
    if (exportFilterMode === 'year' && exportYear !== 'all') {
      periodLabel = `ประจำปี พ.ศ. ${exportYear}`;
      return { anonymize, year: exportYear, periodLabel };
    }
    if (exportFilterMode === 'month') {
      const monthNames: Record<string, string> = {
        '01': 'มกราคม', '02': 'กุมภาพันธ์', '03': 'มีนาคม', '04': 'เมษายน',
        '05': 'พฤษภาคม', '06': 'มิถุนายน', '07': 'กรกฎาคม', '08': 'สิงหาคม',
        '09': 'กันยายน', '10': 'ตุลาคม', '11': 'พฤศจิกายน', '12': 'ธันวาคม'
      };
      const mName = monthNames[exportMonth] || 'ทุกเดือน';
      periodLabel = `ประจำเดือน ${mName} ${exportYear !== 'all' ? `พ.ศ. ${exportYear}` : ''}`;
      return { anonymize, year: exportYear, month: exportMonth, periodLabel };
    }
    return { anonymize, periodLabel };
  };

  if (!isOpen) return null;

  const totalLab = records.reduce((sum, r) => sum + (r.labCost || 0), 0);

  // Backup data as JSON file
  const handleDownloadBackup = () => {
    try {
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `denture_registry_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setImportStatus('✅ ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว');
    } catch (e) {
      setImportStatus('❌ เกิดข้อผิดพลาดในการสร้างไฟล์สำรอง');
    }
  };

  // Import JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus('กำลังอ่านและตรวจสอบไฟล์...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          throw new Error('ไฟล์สำรองต้องเป็นโครงสร้างข้อมูล Array ของรายการเวชระเบียน');
        }

        // Validate basic fields
        const validRecords: DentureRecord[] = parsed.filter(item => item && (item.hn || item.patientName));
        if (validRecords.length === 0) {
          throw new Error('ไม่พบข้อมูลรายการเวชระเบียนที่ถูกต้องในไฟล์นี้');
        }

        // Save to storage
        await dentureStorage.batchAddRecords(validRecords);
        onRecordsUpdated();
        setImportStatus(`✅ นำเข้าข้อมูลสำเร็จทั้งหมด ${validRecords.length} รายการ`);
      } catch (err: any) {
        setImportStatus(`❌ เกิดข้อผิดพลาด: ${err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setImportStatus('❌ ไม่สามารถอ่านไฟล์ได้');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Reset to Hospital Seed Data
  const handleResetToHospitalSeed = async () => {
    setIsProcessing(true);
    try {
      await dentureStorage.resetToHospitalOfficialData();
      onRecordsUpdated();
      setImportStatus('✅ โหลดข้อมูลเวชระเบียนย้อนหลังโรงพยาบาลพยุหะคีรี (274 รายการ พร้อมชื่อแพทย์เดิม) สำเร็จแล้ว');
      setConfirmResetText('');
    } catch (e) {
      setImportStatus('❌ ไม่สามารถรีเซ็ตข้อมูลได้');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>ศูนย์บริหารจัดการข้อมูลเวชระเบียน</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                โรงพยาบาลพยุหะคีรี • สำรองข้อมูล ส่งออกรายงาน และความปลอดภัย
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

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-5 pt-2 bg-zinc-50/40 dark:bg-zinc-900/40 space-x-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            ภาพรวมคลังข้อมูล
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ส่งออกรายงาน (เลือกวันเวลา)</span>
          </button>
          <button
            onClick={() => setActiveTab('denture_types')}
            className={`pb-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'denture_types'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>เรียนรู้จำแนกฟันปลอม</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            สำรอง / นำเข้าไฟล์
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`pb-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'reset'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            รีเซ็ต / คลังย้อนหลัง
          </button>
        </div>

        {/* Status Notification Banner */}
        {importStatus && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-900 dark:text-blue-200 flex items-center justify-between">
            <span>{importStatus}</span>
            <button onClick={() => setImportStatus(null)} className="text-blue-500 hover:text-blue-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* Fresh Database Banner when 0 records */}
              {records.length === 0 ? (
                <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-sm">คลังข้อมูลว่างพร้อมสำหรับเริ่มบันทึกเคสจริง (0 เคส)</h4>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    ระบบได้รับการรีเซ็ตข้อมูลสะอาดเรียบร้อย โดยข้อมูลย้อนหลัง 274 เคสเดิมได้ถูกจัดเก็บเข้าคลังสำรอง (Archive) แล้วอย่างปลอดภัย คุณสามารถเริ่มบันทึกเคสจริงของคลินิกได้ทันที
                  </p>
                  <div className="pt-1 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      • ทันตแพทย์ประจำการ 5 ท่าน: ทพญ.ชิดชนก, ทพญ.วีรยา, ทพญ.จิณณพัต, ทพญ.กนกวรรณ, ทพญ.ศศิมนต์
                    </p>
                    <p>
                      • การจำแนกประเภทฟันปลอม: ระบบได้เรียนรู้และจัดหมวดหมู่ CD, APD, Combined, TP, RPD และงานซ่อม พร้อมใช้งานแล้ว
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">รายการเวชระเบียน</span>
                  <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                    {records.length} <span className="text-xs font-normal text-zinc-400">เคส</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">ยอดค่าใช้จ่าย LAB รวม</span>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ฿{totalLab.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">ระบบรักษาความปลอดภัย</span>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>PIN 0723 ล็อคหน้าจอ</span>
                  </p>
                </div>
              </div>

              {/* Coverage Breakdown Summary */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>สัดส่วนสิทธิการรักษา 5 หมวด</span>
                </h4>
                <div className="space-y-1.5">
                  {COVERAGE_CATEGORIES.map((cat, i) => {
                    const count = records.filter(r => {
                      const res = resolveCoverage(r.coverage);
                      return (r.coverageGroup || res.group) === cat.name;
                    }).length;
                    const pct = records.length > 0 ? Math.round((count / records.length) * 100) : 0;
                    return (
                      <div key={cat.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {i + 1}. {cat.name} ({cat.items.length} ประเภทย่อย)
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 sm:w-32 bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono font-semibold w-12 text-right text-zinc-800 dark:text-zinc-200">
                            {count} เคส
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Lock Action */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                    <Lock className="w-4 h-4" />
                    <span>ล็อคหน้าจอทันทีเพื่อความปลอดภัย</span>
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    ป้องกันผู้อื่นเห็นข้อมูลคนไข้เมื่อต้องลุกออกจากโต๊ะทำงาน (ปลดล็อคด้วยรหัส 0723)
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenLockScreen();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                >
                  ล็อคหน้าจอ
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: EXPORT FOR HOSPITAL WITH DATE & TIME FILTER */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              
              {/* Structure Explanation */}
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                <p className="font-bold flex items-center space-x-1.5 text-zinc-900 dark:text-zinc-100">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>โครงสร้างรายงานที่ส่งออก (Grouped Export):</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 pl-1">
                  <li><strong>จำแนกแยกตามสิทธิการรักษา 5 หมวด</strong> เป็นตารางเฉพาะแต่ละสิทธิ (รวมทุกสิทธิในไฟล์เดียว)</li>
                  <li><strong>คอลัมน์มาตรฐาน:</strong> ลำดับ | รหัส | ชื่อ - สกุล | HN | สิทธิการรักษา | ทันตแพทย์ (5 ท่าน) | วัน Insert | จำนวนเงิน (บาท)</li>
                  <li><strong>แถวสรุปท้ายแต่ละสิทธิ:</strong> สรุปจำนวนเคส, ยอดรวมเงิน, ค่าเฉลี่ยต่อเคส และรายชื่อทันตแพทย์</li>
                  <li><strong>แถวสุดท้าย:</strong> รวมจำนวนเงินทั้งสิ้น พร้อมใส่ <strong>คำอ่านภาษาไทย (บาทถ้วน)</strong></li>
                </ul>
              </div>

              {/* DATE & TIME FILTER CONTROLS */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>ตัวกรองเลือกวันเวลาในการ Export (Date &amp; Period Filter)</span>
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    {exportFilterMode === 'all' ? 'ทุกช่วงเวลา' : exportFilterMode === 'custom_range' ? 'กำหนดช่วงวัน' : exportFilterMode === 'month' ? 'ประจำเดือน' : 'ประจำปี'}
                  </span>
                </div>

                {/* Filter Mode Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExportFilterMode('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      exportFilterMode === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    ทั้งหมด (All Time)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFilterMode('custom_range')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      exportFilterMode === 'custom_range'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    กำหนดช่วงวันที่เอง
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFilterMode('month')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      exportFilterMode === 'month'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    เลือกรายเดือน
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFilterMode('year')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      exportFilterMode === 'year'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    เลือกรายปี พ.ศ.
                  </button>
                </div>

                {/* Sub-inputs based on mode */}
                {exportFilterMode === 'custom_range' && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                          วันที่เริ่มต้น (Start Date)
                        </label>
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={e => setExportStartDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                          วันที่สิ้นสุด (End Date)
                        </label>
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={e => setExportEndDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">ปุ่มลัด:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setExportStartDate(today);
                          setExportEndDate(today);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        วันนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportStartDate('2024-01-01');
                          setExportEndDate('2024-12-31');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        ปี พ.ศ. 2567 (2024)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportStartDate('2025-01-01');
                          setExportEndDate('2025-12-31');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        ปี พ.ศ. 2568 (2025)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportStartDate('2023-10-01');
                          setExportEndDate('2024-09-30');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        ปีงบประมาณ 2567
                      </button>
                    </div>
                  </div>
                )}

                {exportFilterMode === 'month' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        เลือกเดือน
                      </label>
                      <select
                        value={exportMonth}
                        onChange={e => setExportMonth(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="all">ทุกเดือน</option>
                        <option value="01">มกราคม (01)</option>
                        <option value="02">กุมภาพันธ์ (02)</option>
                        <option value="03">มีนาคม (03)</option>
                        <option value="04">เมษายน (04)</option>
                        <option value="05">พฤษภาคม (05)</option>
                        <option value="06">มิถุนายน (06)</option>
                        <option value="07">กรกฎาคม (07)</option>
                        <option value="08">สิงหาคม (08)</option>
                        <option value="09">กันยายน (09)</option>
                        <option value="10">ตุลาคม (10)</option>
                        <option value="11">พฤศจิกายน (11)</option>
                        <option value="12">ธันวาคม (12)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        เลือกปี พ.ศ.
                      </label>
                      <select
                        value={exportYear}
                        onChange={e => setExportYear(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="all">ทุกปี</option>
                        <option value="2569">2569 (2026)</option>
                        <option value="2568">2568 (2025)</option>
                        <option value="2567">2567 (2024)</option>
                        <option value="2566">2566 (2023)</option>
                        <option value="2565">2565 (2022)</option>
                      </select>
                    </div>
                  </div>
                )}

                {exportFilterMode === 'year' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      เลือกปี พ.ศ. ที่ต้องการส่งออก
                    </label>
                    <select
                      value={exportYear}
                      onChange={e => setExportYear(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="all">ทุกปี</option>
                      <option value="2569">ปี พ.ศ. 2569 (2026)</option>
                      <option value="2568">ปี พ.ศ. 2568 (2025)</option>
                      <option value="2567">ปี พ.ศ. 2567 (2024)</option>
                      <option value="2566">ปี พ.ศ. 2566 (2023)</option>
                      <option value="2565">ปี พ.ศ. 2565 (2022)</option>
                    </select>
                  </div>
                )}

                {/* Filter Result Summary */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-blue-100 dark:border-blue-900 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ข้อมูลที่ตรงตามเงื่อนไข: <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold text-sm">{filteredExportRecords.length}</strong> เคส (จาก {records.length} เคสทั้งหมด)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ฿{filteredExportAmount.toLocaleString('th-TH')} บาท
                  </span>
                </div>

                {filteredExportRecords.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>ไม่พบข้อมูลในช่วงเวลาที่เลือก คุณยังสามารถดาวน์โหลดไฟล์ว่าง หรือเปลี่ยนช่วงวันที่ได้</span>
                  </p>
                )}
              </div>

              {/* Official Report Card */}
              <div className="p-4 rounded-2xl border-2 border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white">
                      แนะนำสำหรับส่งโรงพยาบาล
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <span>รายงานทะเบียนฟันปลอมฉบับสมบูรณ์ (ชื่อคนไข้จริง &amp; HN เต็ม)</span>
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      แสดงชื่อ-นามสกุลจริง, เลข HN โรงพยาบาล, ชนิดฟันปลอม, สิทธิการรักษา 5 หมวด, ค่าใช้จ่าย และทันตแพทย์ผู้รักษา (5 ท่าน) ครบถ้วนตามช่วงวันที่กำหนด
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const opts = getExportOptions(false);
                    dentureStorage.exportToCsv(opts);
                    setImportStatus(`✅ กำลังดาวน์โหลดรายงานทางการ (${filteredExportRecords.length} รายการ - ${opts.periodLabel || 'ทั้งหมด'})...`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด Excel/CSV รายงานทางการ (ชื่อจริง • {filteredExportRecords.length} เคส)</span>
                </button>
              </div>

              {/* PDPA Masked Report Card */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-3">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                    มาตรฐาน PDPA
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>รายงานสถิตินิรนาม (De-identified Statistics)</span>
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    ซ่อนชื่อผู้ป่วยเป็นนามสมมุติและ Mask เลข HN (เช่น 49XXXX357) เพื่อนำไปใช้นำเสนอผลงาน สรุปสถิติวิชาการ หรือส่งต่อหน่วยงานภายนอก
                  </p>
                </div>

                <button
                  onClick={() => {
                    const opts = getExportOptions(true);
                    dentureStorage.exportToCsv(opts);
                    setImportStatus(`✅ กำลังดาวน์โหลดรายงานสถิติ PDPA นิรนาม (${filteredExportRecords.length} รายการ - ${opts.periodLabel || 'ทั้งหมด'})...`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-900 dark:hover:bg-zinc-600 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด Excel/CSV ฉบับนิรนาม (PDPA Masked • {filteredExportRecords.length} เคส)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DENTURE CLASSIFICATION LEARNING & TAXONOMY */}
          {activeTab === 'denture_types' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-200">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-bold">คลังความรู้การเรียนรู้และจำแนกประเภทฟันปลอม (Denture Classification)</h4>
                </div>
                <p className="text-xs text-indigo-800/80 dark:text-indigo-300 leading-relaxed">
                  ระบบได้เรียนรู้โครงสร้างการจำแนกชนิดฟันปลอมจากการทำงานจริงและเวชระเบียนย้อนหลังของโรงพยาบาลพยุหะคีรี โดยจัดแบ่งออกเป็น 7 หมวดหมู่มาตรฐาน พร้อมจับคู่คำค้นอัตโนมัติทั้งจากกล้อง AI OCR และการบันทึกด้วยมือ:
                </p>
              </div>

              {/* Classification Cards */}
              <div className="space-y-3">
                {DENTURE_CLASSIFICATION_RULES.map((rule, idx) => {
                  const matchingCount = records.filter(r => classifyDentureType(r.dentureType).category === rule.category).length;
                  return (
                    <div
                      key={rule.category}
                      className="p-4 rounded-2xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                              {rule.title}
                            </h5>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-8">
                            {rule.description}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex-shrink-0">
                          {matchingCount} เคสในระบบ
                        </span>
                      </div>

                      {/* Examples & Keywords */}
                      <div className="pl-8 pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-zinc-400">คำที่ระบบเรียนรู้และจับคู่อัตโนมัติ:</span>
                        {rule.examples.map(ex => (
                          <span
                            key={ex}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              
              {/* Backup */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>สำรองฐานข้อมูล (Backup JSON)</span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ดาวน์โหลดไฟล์สำรองข้อมูลเวชระเบียนทั้งหมด ({records.length} รายการ) เก็บไว้ในเครื่องคอมพิวเตอร์อย่างปลอดภัย
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์สำรอง JSON</span>
                </button>
              </div>

              {/* Restore / Import */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>นำเข้าข้อมูลจากไฟล์สำรอง (Restore / Import)</span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  เลือกไฟล์ JSON ที่เคยสำรองไว้เพื่อนำข้อมูลกลับเข้าสู่ระบบ
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="backup-file-upload"
                />

                <label
                  htmlFor="backup-file-upload"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>เลือกไฟล์ JSON เพื่อนำเข้า</span>
                </label>
              </div>

            </div>
          )}

          {/* TAB 5: RESET / PRODUCTION WIPE / ARCHIVE RESTORE */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              
              {/* Wipe for Real Production */}
              <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/50 space-y-3">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <h4 className="text-xs font-bold">ล้างข้อมูลทั้งหมดเพื่อนำระบบไปใช้จริง (Wipe Data for Clinical Use)</h4>
                </div>
                <p className="text-xs text-red-700/80 dark:text-red-300 leading-relaxed">
                  ล้างข้อมูลเวชระเบียนทั้งหมดในฐานข้อมูลและแคชให้เหลือ 0 รายการ เพื่อเตรียมพร้อมสำหรับเริ่มลงบันทึกผู้ป่วยจริงในคลินิกทันตกรรม โดยคงการจำแนกประเภทฟันปลอมและรายชื่อทันตแพทย์ 5 ท่านไว้สมบูรณ์
                </p>

                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="text"
                    value={confirmResetText}
                    onChange={e => setConfirmResetText(e.target.value)}
                    placeholder="พิมพ์ CONFIRM เพื่อยืนยัน"
                    className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-800 font-mono w-48 text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    disabled={confirmResetText !== 'CONFIRM' || isProcessing}
                    onClick={async () => {
                      if (confirmResetText === 'CONFIRM') {
                        setIsProcessing(true);
                        try {
                          await dentureStorage.clearAllRecords();
                          onRecordsUpdated();
                          setImportStatus('✅ ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว — ฐานข้อมูลสะอาดพร้อมเริ่มใช้งานจริง');
                          setConfirmResetText('');
                        } catch (e) {
                          setImportStatus('❌ เกิดข้อผิดพลาดในการล้างข้อมูล');
                        } finally {
                          setIsProcessing(false);
                        }
                      }
                    }}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-40 transition-colors flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันล้างข้อมูลเพื่อเริ่มใช้จริง</span>
                  </button>
                </div>
              </div>

              {/* Restore Archived 274 Records */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-2">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1.5">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>โหลดข้อมูลเวชระเบียนย้อนหลัง 274 เคส (Archive Reference)</span>
                </h4>
                <p className="text-xs text-blue-800/80 dark:text-blue-300 leading-relaxed">
                  หากต้องการเรียกดูข้อมูลประวัติเดิม 274 รายการของโรงพยาบาลพยุหะคีรีเพื่อใช้อ้างอิงหรือเปรียบเทียบ สามารถกดโหลดกลับเข้าสู่ระบบได้ทันที
                </p>
                <button
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      const res = await dentureStorage.restoreRetrospectiveArchive();
                      onRecordsUpdated();
                      setImportStatus(`✅ โหลดข้อมูลย้อนหลัง 274 เคสกลับเข้าสู่ระบบสำเร็จ (${res.length} รายการ)`);
                    } catch (e) {
                      setImportStatus('❌ ไม่สามารถโหลดข้อมูลย้อนหลังได้');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                  className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>โหลดข้อมูลย้อนหลัง 274 เคส (จากคลัง Archive)</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-mono">
            ระบบความปลอดภัย รหัสปลดล็อค: 0723
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
