import React from 'react';
import { DollarSign, TrendingUp, Download, PieChart, FileCheck, Layers, Calendar, Shield } from 'lucide-react';
import { DentureRecord, COVERAGE_CATEGORIES, resolveCoverage, maskPatientName, maskHN, normalizeDoctorName } from '../types';

interface LabCostSummaryViewProps {
  records: DentureRecord[];
  onViewRecord: (record: DentureRecord) => void;
  onExportCsv: () => void;
  isPdpaMode?: boolean;
}

export const LabCostSummaryView: React.FC<LabCostSummaryViewProps> = ({
  records,
  onViewRecord,
  onExportCsv,
  isPdpaMode = false,
}) => {
  const totalLab = records.reduce((acc, r) => acc + (r.labCost || 0), 0);
  const recordsWithLab = records.filter(r => (r.labCost || 0) > 0);
  const avgLab = recordsWithLab.length > 0 ? totalLab / recordsWithLab.length : 0;
  const maxLab = records.reduce((max, r) => Math.max(max, r.labCost || 0), 0);
  const minLab = recordsWithLab.reduce((min, r) => Math.min(min, r.labCost || 0), maxLab);

  // Group by procedure
  const labByProcedure: Record<string, { count: number; total: number }> = {};
  records.forEach(r => {
    let t = r.dentureType || 'อื่นๆ';
    if (t.includes('CD')) t = 'CD (ฟันเทียมทั้งปาก)';
    else if (t.includes('APD')) t = 'APD (ฟันเทียมบางส่วน)';
    else if (t.includes('UTP') || t.includes('LTP') || t.includes('USD')) t = 'UTP/LTP (แผ่นฟันชั่วคราว)';
    else if (t.includes('ซ่อม')) t = 'ซ่อมฟันปลอม';

    if (!labByProcedure[t]) {
      labByProcedure[t] = { count: 0, total: 0 };
    }
    labByProcedure[t].count += 1;
    labByProcedure[t].total += (r.labCost || 0);
  });

  // Group Lab Cost by 5 Coverage Categories
  const labByCoverage = COVERAGE_CATEGORIES.map(cat => {
    const matching = records.filter(r => {
      const cov = resolveCoverage(r.coverage);
      return (r.coverageGroup || cov.group) === cat.name;
    });
    const total = matching.reduce((acc, r) => acc + (r.labCost || 0), 0);
    const count = matching.filter(r => (r.labCost || 0) > 0).length;
    const percentage = totalLab > 0 ? Math.round((total / totalLab) * 100) : 0;
    return {
      ...cat,
      total,
      count,
      percentage
    };
  });

  // Handwritten formulas list
  const recordsWithFormulas = records.filter(r => 
    r.note && (r.note.includes('+') || r.note.includes('LAB') || r.note.includes('ค่าแลป'))
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Top Banner Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>สรุปและตรวจสอบค่าใช้จ่าย LAB ฟันปลอม</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            ตรวจเช็คยอดส่งแลปทันตกรรม บันทึกตัวเลขจากลายมือแพทย์ และการเบิกจ่าย
          </p>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>ส่งออกรายงานค่าแลป (CSV)</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
          <span className="text-xs text-zinc-400 font-medium">ยอดรวมค่าใช้จ่าย LAB</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ฿{totalLab.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-400">จาก {recordsWithLab.length} เคสที่ส่งแลป</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
          <span className="text-xs text-zinc-400 font-medium">ค่าแลปเฉลี่ยต่อเคส</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            ฿{avgLab.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-zinc-400">เฉลี่ยต่อชิ้นงานทันตกรรม</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
          <span className="text-xs text-zinc-400 font-medium">ค่าแลปสูงสุด</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-600 dark:text-blue-400">
            ฿{maxLab.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-400">ชิ้นงาน CD 2 ชิ้น (บน-ล่าง)</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
          <span className="text-xs text-zinc-400 font-medium">ค่าแลปเริ่มต้น</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-600 dark:text-purple-400">
            ฿{minLab > 0 ? minLab.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <p className="text-[11px] text-zinc-400">งานซ่อมฟันปลอม / ซี่เดียว</p>
        </div>
      </div>

      {/* Procedure Lab Split Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>ค่าใช้จ่าย LAB จำแนกตามประเภทฟันปลอม</span>
        </h3>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {Object.entries(labByProcedure).map(([name, data]) => {
            const pct = totalLab > 0 ? Math.round((data.total / totalLab) * 100) : 0;
            const avg = data.count > 0 ? data.total / data.count : 0;
            return (
              <div key={name} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{name}</h4>
                  <p className="text-[11px] text-zinc-400">
                    {data.count} เคส • เฉลี่ย ฿{avg.toLocaleString('th-TH', { maximumFractionDigits: 0 })} / เคส
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                    ฿{data.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-400">คิดเป็น {pct}% ของงบแลป</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coverage Categories Lab Cost Split Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>ค่าใช้จ่าย LAB จำแนกตามสิทธิการรักษา (7 หมวดสิทธิ)</span>
          </h3>
          <span className="text-xs text-zinc-400">
            UC • จ่ายตรง • พรบ. • ชำระเอง • เบิกต้นสังกัด/รัฐวิสาหกิจ • ประกันสังคม • อื่นๆ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {labByCoverage.map((cat, idx) => (
            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cat.badgeClass}`}>
                  {idx + 1}. {cat.name}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ฿{cat.total.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {cat.count} เคส ({cat.percentage}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handwritten Formulas & Calculations Auditing List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-amber-500" />
            <span>รายการที่มีการคำนวณลายมือแพทย์ (Handwritten LAB Formulas)</span>
          </h3>
          <span className="text-xs text-zinc-400">อ่านโดย AI OCR</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recordsWithFormulas.map(r => (
            <div
              key={r.id}
              onClick={() => onViewRecord(r)}
              className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-400 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1">
                  <span>{isPdpaMode ? maskPatientName(r.patientName) : r.patientName}</span>
                  <span className="text-zinc-400 font-mono">(HN: {isPdpaMode ? maskHN(r.hn) : r.hn})</span>
                  {isPdpaMode && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      PDPA
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {normalizeDoctorName(r.doctor)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 font-mono text-xs">
                {r.note}
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-zinc-400">{r.dentureType}</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  แลป: ฿{r.labCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
