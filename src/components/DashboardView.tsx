import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Activity, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  Award, 
  Calendar, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Filter,
  RotateCcw,
  FileText,
  PiggyBank,
  Scale
} from 'lucide-react';
import { DentureRecord, DOCTORS_LIST, COVERAGE_CATEGORIES, resolveCoverage, maskPatientName, maskHN, normalizeDoctorName, normalizeRecordDate, getYearBE } from '../types';

interface DashboardViewProps {
  records: DentureRecord[];
  onSelectDoctorFilter: (docName: string) => void;
  onViewRecord: (record: DentureRecord) => void;
  onOpenScanner: () => void;
  onOpenPdfUpload?: () => void;
  isPdpaMode?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  onSelectDoctorFilter,
  onViewRecord,
  onOpenScanner,
  onOpenPdfUpload,
  isPdpaMode = false,
}) => {
  // Date / Time Range Filter States
  const [timeFilter, setTimeFilter] = useState<'all' | '2566' | '2567' | '2568' | '2569' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Filter records based on selected date/time range
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.date) return true;
      const normDate = normalizeRecordDate(r.date);
      const beYear = getYearBE(r.date);

      if (timeFilter === '2566') {
        if (beYear !== '2566') return false;
      } else if (timeFilter === '2567') {
        if (beYear !== '2567') return false;
      } else if (timeFilter === '2568') {
        if (beYear !== '2568') return false;
      } else if (timeFilter === '2569') {
        if (beYear !== '2569') return false;
      } else if (timeFilter === 'custom') {
        if (startDate && normDate < startDate) return false;
        if (endDate && normDate > endDate) return false;
      }

      if (selectedMonth !== 'all') {
        const parts = normDate.split('-');
        if (parts[1] !== selectedMonth) return false;
      }

      return true;
    });
  }, [records, timeFilter, startDate, endDate, selectedMonth]);

  // Metric calculations using filteredRecords
  const totalPatients = filteredRecords.length;
  const totalLabCost = filteredRecords.reduce((acc, r) => acc + (r.labCost || 0), 0);
  const totalTreatmentFee = filteredRecords.reduce((acc, r) => acc + (r.treatmentFee || 0), 0);
  const netMargin = totalTreatmentFee - totalLabCost;
  const netMarginPercent = totalTreatmentFee > 0 ? (netMargin / totalTreatmentFee) * 100 : 0;
  const avgLabCost = totalPatients > 0 ? totalLabCost / totalPatients : 0;

  // Denture type breakdown
  const typeCounts: Record<string, number> = {};
  filteredRecords.forEach(r => {
    let t = r.dentureType || 'อื่นๆ';
    if (t.includes('CD')) t = 'CD (ทั้งปาก)';
    else if (t.includes('APD')) t = 'APD (บางส่วน)';
    else if (t.includes('UTP') || t.includes('LTP') || t.includes('USD')) t = 'UTP/LTP';
    else if (t.includes('ซ่อม')) t = 'ซ่อมฟันปลอม';
    else t = 'อื่นๆ';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // Dynamic Doctor breakdown: automatically adapts to the selected year & dataset
  const doctorStats = useMemo(() => {
    const currentDocMap = new Map<string, typeof DOCTORS_LIST[number]>(
      DOCTORS_LIST.map(d => [d.name as string, d])
    );
    const extraColors = [
      'bg-indigo-600',
      'bg-purple-600',
      'bg-cyan-600',
      'bg-rose-600',
      'bg-amber-600',
      'bg-emerald-700'
    ];

    const activeDocNames = new Set<string>();
    filteredRecords.forEach(r => {
      const clean = normalizeDoctorName(r.doctor);
      if (clean) activeDocNames.add(clean);
    });

    // If 'all' or '2569' (current year), always ensure current 5 doctors are present
    if (timeFilter === 'all' || timeFilter === '2569') {
      DOCTORS_LIST.forEach(d => activeDocNames.add(d.name));
    }

    let extraColorIdx = 0;
    const list = Array.from(activeDocNames).map(docName => {
      const current = currentDocMap.get(docName);
      const docRecords = filteredRecords.filter(
        r => normalizeDoctorName(r.doctor) === docName || r.doctor?.includes(docName)
      );
      const count = docRecords.length;
      const labSum = docRecords.reduce((acc, r) => acc + (r.labCost || 0), 0);
      const feeSum = docRecords.reduce((acc, r) => acc + (r.treatmentFee || 0), 0);
      const netSum = feeSum - labSum;
      const color = current ? current.color : extraColors[extraColorIdx++ % extraColors.length];

      return {
        name: docName,
        fullName: current ? current.fullName : `ทพ./ทพญ. ${docName}`,
        color,
        isCurrent: !!current,
        count,
        labSum,
        feeSum,
        netSum,
        percentage: totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0,
        recentCases: docRecords.slice(0, 3)
      };
    });

    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return a.name.localeCompare(b.name, 'th');
    });

    return list;
  }, [filteredRecords, totalPatients, timeFilter]);

  // Coverage Breakdown
  const coverageStats = COVERAGE_CATEGORIES.map(cat => {
    const matchingRecords = filteredRecords.filter(r => {
      const cov = resolveCoverage(r.coverage);
      return (r.coverageGroup || cov.group) === cat.name;
    });
    const count = matchingRecords.length;
    const percentage = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0;
    const labSum = matchingRecords.reduce((acc, r) => acc + (r.labCost || 0), 0);

    const subItemsMap: Record<string, number> = {};
    matchingRecords.forEach(r => {
      const cov = resolveCoverage(r.coverage);
      subItemsMap[cov.subItem] = (subItemsMap[cov.subItem] || 0) + 1;
    });

    return {
      ...cat,
      count,
      percentage,
      labSum,
      subItemsMap
    };
  });

  // Recent 5 records
  const recentRecords = [...filteredRecords].slice(0, 5);

  const resetTimeFilter = () => {
    setTimeFilter('all');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('all');
  };

  const isFilterActive = timeFilter !== 'all' || selectedMonth !== 'all' || !!startDate || !!endDate;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Top Banner Hero iOS Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>แดชบอร์ดติดตามทะเบียนฟันปลอมเรียลไทม์</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              ระบบทะเบียน & วิเคราะห์ประวัติผู้ป่วยฟันปลอม
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              โรงพยาบาลพยุหะคีรี • สแกนแบบฟอร์ม OPD Card และทะเบียนด้วย AI OCR พร้อมวิเคราะห์ค่าใช้จ่าย LAB และลายมือแพทย์ทันที
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2.5">
            {onOpenPdfUpload && (
              <button
                onClick={onOpenPdfUpload}
                className="flex items-center space-x-2 px-4 sm:px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 active:scale-95 text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all duration-150"
                title="อัปโหลดไฟล์ PDF สแกนหลายหน้า AI สกัดข้อมูลทุกหน้า"
              >
                <FileText className="w-4 h-4 text-zinc-950" />
                <span>อัปโหลด PDF (หลายหน้า)</span>
              </button>
            )}

            <button
              onClick={onOpenScanner}
              className="flex items-center space-x-2 px-4 sm:px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-xs sm:text-sm font-bold shadow-md transition-all duration-150"
            >
              <Activity className="w-4 h-4 text-blue-600" />
              <span>เปิดกล้องสแกน OPD Card</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle ambient circles */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* Date / Time Range Filter Card (ปรับ FILL ตามวันเวลาที่เลือกได้) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>กรองข้อมูลตามวันเวลา (Date Range Filter)</span>
                {isFilterActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    กำลังกรอง
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                เลือกช่วงเวลาที่ต้องการดูข้อมูลสถิติ ค่าใช้จ่าย LAB และผลการให้บริการ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              พบ {totalPatients.toLocaleString('th-TH')} เคส (จาก {records.length.toLocaleString('th-TH')})
            </span>
            {isFilterActive && (
              <button
                onClick={resetTimeFilter}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                title="ล้างตัวกรองเวลากลับสู่ทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset Year & Mode Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => { setTimeFilter('all'); setSelectedMonth('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === 'all' && selectedMonth === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            ทั้งหมดทุกช่วงเวลา
          </button>
          <button
            onClick={() => setTimeFilter('2566')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === '2566'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            ปี 2566 (2023)
          </button>
          <button
            onClick={() => setTimeFilter('2567')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === '2567'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            ปี 2567 (2024)
          </button>
          <button
            onClick={() => setTimeFilter('2568')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === '2568'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            ปี 2568 (2025)
          </button>
          <button
            onClick={() => setTimeFilter('2569')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === '2569'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            ปี 2569 (2026)
          </button>
          <button
            onClick={() => setTimeFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 ${
              timeFilter === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>กำหนดช่วงวันเอง</span>
          </button>
        </div>

        {/* Month selector row (when a year is chosen or always accessible) */}
        <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-medium text-zinc-400 mr-1.5">เดือน:</span>
          {[
            { key: 'all', label: 'ทุกเดือน' },
            { key: '01', label: 'ม.ค.' },
            { key: '02', label: 'ก.พ.' },
            { key: '03', label: 'มี.ค.' },
            { key: '04', label: 'เม.ย.' },
            { key: '05', label: 'พ.ค.' },
            { key: '06', label: 'มิ.ย.' },
            { key: '07', label: 'ก.ค.' },
            { key: '08', label: 'ส.ค.' },
            { key: '09', label: 'ก.ย.' },
            { key: '10', label: 'ต.ค.' },
            { key: '11', label: 'พ.ย.' },
            { key: '12', label: 'ธ.ค.' }
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedMonth === m.key
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs (when timeFilter === 'custom') */}
        {timeFilter === 'custom' && (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-3 animate-in fade-in duration-100">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">ตั้งแต่วันที่:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">ถึงวันที่:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Patients */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ผู้ป่วยฟันปลอมทั้งหมด
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {totalPatients.toLocaleString('th-TH')}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>บันทึกผ่านระบบ OCR & ทะเบียน</span>
            </p>
          </div>
        </div>

        {/* Total Treatment Value */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              มูลค่าการรักษาทั้งหมด
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              ฿{totalTreatmentFee.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              ยอดตั้งเบิก & ค่าบริการ รพ.
            </p>
          </div>
        </div>

        {/* Total Lab Costs */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              รวมค่าใช้จ่าย LAB
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ฿{totalLabCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              เฉลี่ย ฿{avgLabCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })} / เคส
            </p>
          </div>
        </div>

        {/* Net Margin Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-white dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-zinc-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
              ส่วนต่างสุทธิ (Net Margin)
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${netMargin >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-600'}`}>
              ฿{netMargin.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                netMargin >= 0
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
              }`}>
                {netMarginPercent >= 0 ? '+' : ''}{netMarginPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                คงเหลือหลังหักค่าแลป
              </span>
            </div>
          </div>
        </div>

        {/* Active Dentists */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ทันตแพทย์ผู้ดูแล
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {doctorStats.filter(d => d.count > 0).length || doctorStats.length} ท่าน
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              {doctorStats.filter(d => d.count > 0).map(d => d.name).join(', ') || 'ไม่มีข้อมูลในตัวกรองนี้'}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Formula Mini-Banner */}
      <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-300">
          <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold">สมการสรุปสถานะการเงินฟันเทียม:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono font-bold">
          <span className="text-purple-600 dark:text-purple-400">
            มูลค่ารักษา ฿{totalTreatmentFee.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-zinc-400 font-sans">-</span>
          <span className="text-emerald-600 dark:text-emerald-400">
            ค่าแลป ฿{totalLabCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-zinc-400 font-sans">=</span>
          <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
            ส่วนต่างสุทธิ ฿{netMargin.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ({netMarginPercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Dentists Workload Section (Dynamic) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <span>ภาระงานทันตแพทย์ ({doctorStats.length} ท่าน)</span>
            <span className="text-xs text-zinc-400 font-normal">(กดเพื่อกรองดูประวัติเฉพาะท่านได้)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {doctorStats.map(doc => (
            <div
              key={doc.name}
              onClick={() => onSelectDoctorFilter(doc.name)}
              className="cursor-pointer group p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-150 shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-2.5 mb-2">
                <div className={`w-8 h-8 rounded-xl ${doc.color} text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0`}>
                  {doc.name.charAt(0)}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {doc.name}
                    </h4>
                    {!doc.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                        อดีต
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {doc.fullName}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">จำนวนเคส:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{doc.count} เคส</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">รวมค่าแลป:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ฿{doc.labSum.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">ส่วนต่างสุทธิ:</span>
                  <span className={`font-bold ${doc.netSum >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
                    ฿{doc.netSum.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${doc.color}`}
                  style={{ width: `${Math.max(doc.percentage, doc.count > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Denture Types & Coverage Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Denture Types Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              จำแนกตามประเภทฟันปลอม
            </h3>
            <span className="text-xs text-zinc-400">
              {Object.keys(typeCounts).length} ประเภท
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(typeCounts).map(([type, count]) => {
              const pct = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-700 dark:text-zinc-300">{type}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{count} ราย ({pct}%)</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage Types Breakdown (7 Categorized Groups) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                สิทธิการรักษาพยาบาล (7 หมวดสิทธิ)
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                UC • จ่ายตรง • พรบ. • ชำระเอง • เบิกต้นสังกัด/รัฐวิสาหกิจ • ประกันสังคม • อื่นๆ
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
              7 หมวดหมู่
            </span>
          </div>

          <div className="space-y-3">
            {coverageStats.map((group, idx) => {
              const hasSubItems = Object.keys(group.subItemsMap).length > 0;
              return (
                <div key={group.id} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${group.badgeClass}`}>
                        {idx + 1}. {group.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {group.count} ราย
                      </span>
                      <span className="text-[11px] text-zinc-400 ml-1.5">
                        ({group.percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-200/60 dark:bg-zinc-700/60 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0 ? 'bg-emerald-500' :
                        idx === 1 ? 'bg-blue-500' :
                        idx === 2 ? 'bg-purple-500' :
                        idx === 3 ? 'bg-amber-500' : 'bg-zinc-500'
                      }`}
                      style={{ width: `${Math.max(group.percentage, group.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>

                  {/* Sub-item badges */}
                  {hasSubItems ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(group.subItemsMap).map(([subName, count]) => (
                        <span
                          key={subName}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium"
                        >
                          <span>{subName}</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-200">({count})</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-400 italic">ยังไม่มีผู้ป่วยในสิทธินี้</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Activity & Latest Scans */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            รายการบันทึกล่าสุด
          </h3>
          <span className="text-xs text-zinc-400">เรียลไทม์</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {recentRecords.map(r => (
            <div
              key={r.id}
              onClick={() => onViewRecord(r)}
              className="py-3.5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 px-2 rounded-xl cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                  {normalizeDoctorName(r.doctor)?.charAt(0) || 'ฟ'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {isPdpaMode ? maskPatientName(r.patientName) : r.patientName}
                    </h4>
                    {isPdpaMode && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        PDPA
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-400">
                      HN: {isPdpaMode ? maskHN(r.hn) : r.hn}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {r.dentureType} • ทันตแพทย์: {normalizeDoctorName(r.doctor)} • {r.date}
                  </p>
                </div>
              </div>

              <div className="text-right flex items-center space-x-3">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    แลป: ฿{r.labCost?.toLocaleString('th-TH') || '0'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {r.coverage}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
