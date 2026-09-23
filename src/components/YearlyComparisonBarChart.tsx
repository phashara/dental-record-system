import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  Layers, 
  Stethoscope, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { 
  DentureRecord, 
  COVERAGE_CATEGORIES, 
  resolveCoverage, 
  normalizeDoctorName, 
  getYearBE,
  ACTIVE_DOCTORS,
  FORMER_DOCTORS
} from '../types';

interface YearlyComparisonBarChartProps {
  records: DentureRecord[];
  isPdpaMode?: boolean;
}

type ComparisonTab = 'coverage' | 'cases' | 'financial' | 'dentureType' | 'doctors';

interface YearAggregate {
  yearBE: string;
  totalCases: number;
  treatmentFee: number;
  labCost: number;
  netMargin: number;
  // Coverage breakdown
  coverageCounts: {
    uc: number;
    direct: number;
    self: number;
    social: number;
    act: number;
    other: number;
  };
  coverageSubItems: Record<string, number>;
  // Denture type breakdown
  cdCount: number;
  apdCount: number;
  repairCount: number;
  otherCount: number;
  // Doctor breakdown
  doctorCounts: Record<string, number>;
}

export const YearlyComparisonBarChart: React.FC<YearlyComparisonBarChartProps> = ({
  records,
  isPdpaMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<ComparisonTab>('coverage');
  const [selectedYearDetail, setSelectedYearDetail] = useState<string>('2569');

  // Compute aggregated data by year: 2566, 2567, 2568, 2569
  const yearsData = useMemo<YearAggregate[]>(() => {
    const map: Record<string, YearAggregate> = {
      '2566': {
        yearBE: '2566',
        totalCases: 0,
        treatmentFee: 0,
        labCost: 0,
        netMargin: 0,
        coverageCounts: { uc: 0, direct: 0, self: 0, social: 0, act: 0, other: 0 },
        coverageSubItems: {},
        cdCount: 0,
        apdCount: 0,
        repairCount: 0,
        otherCount: 0,
        doctorCounts: {},
      },
      '2567': {
        yearBE: '2567',
        totalCases: 0,
        treatmentFee: 0,
        labCost: 0,
        netMargin: 0,
        coverageCounts: { uc: 0, direct: 0, self: 0, social: 0, act: 0, other: 0 },
        coverageSubItems: {},
        cdCount: 0,
        apdCount: 0,
        repairCount: 0,
        otherCount: 0,
        doctorCounts: {},
      },
      '2568': {
        yearBE: '2568',
        totalCases: 0,
        treatmentFee: 0,
        labCost: 0,
        netMargin: 0,
        coverageCounts: { uc: 0, direct: 0, self: 0, social: 0, act: 0, other: 0 },
        coverageSubItems: {},
        cdCount: 0,
        apdCount: 0,
        repairCount: 0,
        otherCount: 0,
        doctorCounts: {},
      },
      '2569': {
        yearBE: '2569',
        totalCases: 0,
        treatmentFee: 0,
        labCost: 0,
        netMargin: 0,
        coverageCounts: { uc: 0, direct: 0, self: 0, social: 0, act: 0, other: 0 },
        coverageSubItems: {},
        cdCount: 0,
        apdCount: 0,
        repairCount: 0,
        otherCount: 0,
        doctorCounts: {},
      },
    };

    records.forEach(r => {
      const year = getYearBE(r.date);
      if (!map[year]) return;

      const agg = map[year];
      agg.totalCases++;
      
      const fee = Number(r.treatmentFee) || 0;
      const lab = Number(r.labCost) || 0;
      agg.treatmentFee += fee;
      agg.labCost += lab;
      agg.netMargin += (fee - lab);

      // Coverage classification via resolveCoverage
      const cov = resolveCoverage(r.coverage || r.coverageGroup);
      const groupName = cov.group;
      const subItem = cov.subItem;

      agg.coverageSubItems[subItem] = (agg.coverageSubItems[subItem] || 0) + 1;

      if (groupName === 'UC') {
        agg.coverageCounts.uc++;
      } else if (groupName === 'ใช้สิทธิจ่ายตรง') {
        agg.coverageCounts.direct++;
      } else if (groupName === 'ชำระเงินเอง') {
        agg.coverageCounts.self++;
      } else if (groupName === 'ประกันสังคม') {
        agg.coverageCounts.social++;
      } else if (groupName === 'พรบ.') {
        agg.coverageCounts.act++;
      } else {
        agg.coverageCounts.other++;
      }

      // Denture type classification
      const t = (r.dentureType || '').toUpperCase();
      if (t.includes('CD') || t.includes('ทั้งปาก') || t.includes('TP')) {
        agg.cdCount++;
      } else if (t.includes('APD') || t.includes('USD') || t.includes('LSD') || t.includes('ถอดได้')) {
        agg.apdCount++;
      } else if (t.includes('ซ่อม') || t.includes('เติม') || t.includes('REPAIR')) {
        agg.repairCount++;
      } else {
        agg.otherCount++;
      }

      // Doctor classification
      const doc = normalizeDoctorName(r.doctor);
      agg.doctorCounts[doc] = (agg.doctorCounts[doc] || 0) + 1;
    });

    return ['2566', '2567', '2568', '2569'].map(y => map[y]);
  }, [records]);

  // Selected year aggregate
  const currentSelectedAgg = useMemo(() => {
    return yearsData.find(y => y.yearBE === selectedYearDetail) || yearsData[yearsData.length - 1];
  }, [yearsData, selectedYearDetail]);

  // Maximum values for scaling
  const maxCases = Math.max(...yearsData.map(y => y.totalCases), 1);
  const maxFinancial = Math.max(
    ...yearsData.flatMap(y => [y.treatmentFee, y.labCost, y.netMargin]),
    100000
  );

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-6">
      
      {/* Header and Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
              📊 กราฟเปรียบเทียบข้อมูลรายปี (พ.ศ. 2566 – 2569)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            สรุปข้อมูลเปรียบเทียบ 4 ปีจากหน้าแดชบอร์ด ดูแนวโน้มสิทธิการรักษา ยอดเคส และการเงิน
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('coverage')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'coverage'
                ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>สิทธิการรักษา</span>
          </button>

          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'cases'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>จำนวนผู้ป่วย</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'financial'
                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>ค่ารักษา & ค่าแลป</span>
          </button>

          <button
            onClick={() => setActiveTab('dentureType')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'dentureType'
                ? 'bg-white dark:bg-zinc-700 text-sky-600 dark:text-sky-300 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ประเภทฟันปลอม</span>
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'doctors'
                ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-300 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>ทันตแพทย์ (8 ท่าน)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. TAB: สิทธิการรักษา (COVERAGE RIGHTS COMPARISON) */}
      {/* ======================================================== */}
      {activeTab === 'coverage' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              เปรียบเทียบสิทธิบัตรทอง (UC) vs จ่ายตรง vs ชำระเงินเอง แยกตามปี
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>UC (บัตรทอง/สอย/อสม)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>จ่ายตรง (กทม/อปท)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>ชำระเงินเอง</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>อื่นๆ/ประกันสังคม</span>
              </span>
            </div>
          </div>

          {/* Grouped Bar Columns for each year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {yearsData.map(y => {
              const ucPct = y.totalCases > 0 ? (y.coverageCounts.uc / y.totalCases) * 100 : 0;
              const directPct = y.totalCases > 0 ? (y.coverageCounts.direct / y.totalCases) * 100 : 0;
              const selfPct = y.totalCases > 0 ? (y.coverageCounts.self / y.totalCases) * 100 : 0;
              const otherPct = y.totalCases > 0 ? ((y.coverageCounts.social + y.coverageCounts.act + y.coverageCounts.other) / y.totalCases) * 100 : 0;
              const isSelected = selectedYearDetail === y.yearBE;

              return (
                <div
                  key={y.yearBE}
                  onClick={() => setSelectedYearDetail(y.yearBE)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 shadow-sm'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                        ปี {y.yearBE}
                      </span>
                      {y.yearBE === '2569' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          ล่าสุด
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      รวม {y.totalCases} ราย
                    </span>
                  </div>

                  {/* 4 Vertical Bars comparing rights in this year */}
                  <div className="h-40 flex items-end justify-around gap-2 pt-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    
                    {/* UC Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 opacity-90 group-hover:scale-110 transition-transform">
                        {y.coverageCounts.uc}
                      </span>
                      <div 
                        style={{ height: `${Math.max(ucPct * 1.2, y.coverageCounts.uc > 0 ? 8 : 2)}%` }}
                        className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300 group-hover:bg-emerald-400"
                        title={`UC บัตรทอง: ${y.coverageCounts.uc} ราย (${ucPct.toFixed(1)}%)`}
                      />
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                        UC
                      </span>
                    </div>

                    {/* Direct Pay Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-1 opacity-90 group-hover:scale-110 transition-transform">
                        {y.coverageCounts.direct}
                      </span>
                      <div 
                        style={{ height: `${Math.max(directPct * 1.2, y.coverageCounts.direct > 0 ? 8 : 2)}%` }}
                        className="w-full bg-blue-500 rounded-t-lg transition-all duration-300 group-hover:bg-blue-400"
                        title={`สิทธิจ่ายตรง: ${y.coverageCounts.direct} ราย (${directPct.toFixed(1)}%)`}
                      />
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                        ตรง
                      </span>
                    </div>

                    {/* Self Pay Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-1 opacity-90 group-hover:scale-110 transition-transform">
                        {y.coverageCounts.self}
                      </span>
                      <div 
                        style={{ height: `${Math.max(selfPct * 1.2, y.coverageCounts.self > 0 ? 8 : 2)}%` }}
                        className="w-full bg-amber-500 rounded-t-lg transition-all duration-300 group-hover:bg-amber-400"
                        title={`ชำระเงินเอง: ${y.coverageCounts.self} ราย (${selfPct.toFixed(1)}%)`}
                      />
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                        สด
                      </span>
                    </div>

                    {/* Other Bar */}
                    <div className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 mb-1 opacity-90 group-hover:scale-110 transition-transform">
                        {y.coverageCounts.social + y.coverageCounts.act + y.coverageCounts.other}
                      </span>
                      <div 
                        style={{ height: `${Math.max(otherPct * 1.2, (y.coverageCounts.social + y.coverageCounts.act + y.coverageCounts.other) > 0 ? 8 : 2)}%` }}
                        className="w-full bg-purple-500 rounded-t-lg transition-all duration-300 group-hover:bg-purple-400"
                        title={`อื่นๆ: ${y.coverageCounts.social + y.coverageCounts.act + y.coverageCounts.other} ราย (${otherPct.toFixed(1)}%)`}
                      />
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                        อื่น
                      </span>
                    </div>

                  </div>

                  {/* Summary percentages below bar */}
                  <div className="pt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      UC {ucPct.toFixed(0)}%
                    </span>
                    <span className="text-blue-700 dark:text-blue-400 font-bold">
                      ตรง {directPct.toFixed(0)}%
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      สด {selfPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-item Drilldown for Selected Year */}
          {currentSelectedAgg && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>รายละเอียดสิทธิย่อยเฉพาะ ปี พ.ศ. {currentSelectedAgg.yearBE} (รวม {currentSelectedAgg.totalCases} เคส):</span>
                </h4>
                <span className="text-[11px] text-zinc-400">
                  แตะที่การ์ดปีด้านบนเพื่อเปลี่ยนปีที่ดู
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(Object.entries(currentSelectedAgg.coverageSubItems) as [string, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => {
                    const pct = currentSelectedAgg.totalCases > 0 ? ((count / currentSelectedAgg.totalCases) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={name}
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700 text-xs shadow-2xs"
                      >
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{name}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{count} ราย</span>
                        <span className="text-[10px] text-zinc-400">({pct}%)</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAB: จำนวนผู้ป่วยรวม (TOTAL CASES COMPARISON) */}
      {/* ======================================================== */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              เปรียบเทียบยอดผู้ป่วยฟันปลอมรวม 4 ปี (2566 – 2569)
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
              รวมสะสม 4 ปี: {yearsData.reduce((s, y) => s + y.totalCases, 0)} ราย
            </span>
          </div>

          <div className="h-56 flex items-end justify-between gap-4 sm:gap-8 px-4 sm:px-12 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            {yearsData.map((y, idx) => {
              const heightPct = (y.totalCases / maxCases) * 100;
              const prev = idx > 0 ? yearsData[idx - 1] : null;
              const growth = prev && prev.totalCases > 0 ? ((y.totalCases - prev.totalCases) / prev.totalCases) * 100 : null;

              return (
                <div key={y.yearBE} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-center mb-2">
                    <span className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400 block group-hover:scale-110 transition-transform">
                      {y.totalCases} เคส
                    </span>
                    {growth !== null && (
                      <span className={`text-[10px] font-bold ${growth >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(0)}% YoY
                      </span>
                    )}
                  </div>

                  <div 
                    style={{ height: `${Math.max(heightPct, 8)}%` }}
                    className="w-full max-w-[80px] bg-gradient-to-t from-blue-600 to-sky-400 hover:from-blue-500 hover:to-sky-300 rounded-t-2xl shadow-md transition-all duration-300"
                  />

                  <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-2">
                    ปี {y.yearBE}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TAB: การเงิน & ค่าแลป (FINANCIALS COMPARISON) */}
      {/* ======================================================== */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              เปรียบเทียบมูลค่ารักษา (ม่วง) vs ค่าแลป LAB (เขียว) vs ส่วนต่างสุทธิ (น้ำเงิน)
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>ค่ารักษา</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>ค่าแลป</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>ส่วนต่างสุทธิ</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {yearsData.map(y => {
              const marginPct = y.treatmentFee > 0 ? (y.netMargin / y.treatmentFee) * 100 : 0;
              return (
                <div key={y.yearBE} className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                      ปี {y.yearBE}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/60">
                      กำไร {marginPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">ค่ารักษาเบิกชดเชย:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          ฿{y.treatmentFee.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(y.treatmentFee / maxFinancial) * 100}%` }}
                          className="h-full bg-purple-500 rounded-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">ค่าแลปที่จ่าย:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ฿{y.labCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(y.labCost / maxFinancial) * 100}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">ส่วนต่างสุทธิ (Net):</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          ฿{y.netMargin.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.max(0, (y.netMargin / maxFinancial) * 100)}%` }}
                          className="h-full bg-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TAB: ประเภทฟันปลอม (DENTURE TYPES COMPARISON) */}
      {/* ======================================================== */}
      {activeTab === 'dentureType' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              เปรียบเทียบสัดส่วน CD (ทั้งปาก) vs APD (ถอดได้บางส่วน) vs ซ่อมแซม
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>CD ฟันทั้งปาก</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>APD ฐานพลาสติก</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>ซ่อมแซม/อื่นๆ</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {yearsData.map(y => {
              const cdPct = y.totalCases > 0 ? (y.cdCount / y.totalCases) * 100 : 0;
              const apdPct = y.totalCases > 0 ? (y.apdCount / y.totalCases) * 100 : 0;
              const repairPct = y.totalCases > 0 ? ((y.repairCount + y.otherCount) / y.totalCases) * 100 : 0;

              return (
                <div key={y.yearBE} className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                      ปี {y.yearBE}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {y.totalCases} เคส
                    </span>
                  </div>

                  {/* Horizontal Stacked Bar */}
                  <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex">
                    <div style={{ width: `${cdPct}%` }} className="bg-blue-600" title={`CD: ${y.cdCount} ราย`} />
                    <div style={{ width: `${apdPct}%` }} className="bg-sky-400" title={`APD: ${y.apdCount} ราย`} />
                    <div style={{ width: `${repairPct}%` }} className="bg-emerald-400" title={`ซ่อม: ${y.repairCount + y.otherCount} ราย`} />
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">CD ฟันทั้งปาก:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {y.cdCount} ราย ({cdPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">APD ถอดได้บางส่วน:</span>
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {y.apdCount} ราย ({apdPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">ซ่อมแซม/อื่นๆ:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {y.repairCount + y.otherCount} ราย ({repairPct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB: ทันตแพทย์ (8 ท่าน - ปัจจุบัน & อดีต) */}
      {/* ======================================================== */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              เปรียบเทียบภาระงานทันตแพทย์รวม 8 ท่าน (ปัจจุบัน 5 ท่าน, อดีต 3 ท่าน เพื่อความสอดคล้องกับข้อมูลเวชระเบียนย้อนหลัง)
            </span>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                ● ปัจจุบัน (5 ท่าน)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                ○ อดีต (3 ท่าน)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <th className="py-3 px-4 font-bold">ทันตแพทย์ผู้รักษา</th>
                  <th className="py-3 px-3 font-semibold text-center">สถานะ</th>
                  <th className="py-3 px-3 font-semibold text-right">ปี 2566</th>
                  <th className="py-3 px-3 font-semibold text-right">ปี 2567</th>
                  <th className="py-3 px-3 font-semibold text-right">ปี 2568</th>
                  <th className="py-3 px-3 font-semibold text-right">ปี 2569 (ล่าสุด)</th>
                  <th className="py-3 px-4 font-bold text-right bg-zinc-100/50 dark:bg-zinc-800/90">รวม 4 ปี</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {/* 1. ทันตแพทย์ปัจจุบัน (5 ท่าน) */}
                <tr className="bg-blue-50/40 dark:bg-blue-950/20">
                  <td colSpan={7} className="py-2 px-4 text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                    🩺 ทันตแพทย์ปฏิบัติงานปัจจุบัน (5 ท่าน)
                  </td>
                </tr>
                {ACTIVE_DOCTORS.map(doc => {
                  const c66 = yearsData[0]?.doctorCounts[doc.name] || 0;
                  const c67 = yearsData[1]?.doctorCounts[doc.name] || 0;
                  const c68 = yearsData[2]?.doctorCounts[doc.name] || 0;
                  const c69 = yearsData[3]?.doctorCounts[doc.name] || 0;
                  const total = c66 + c67 + c68 + c69;

                  return (
                    <tr key={doc.name} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-6 h-6 rounded-lg ${doc.color} text-white flex items-center justify-center text-[10px] font-bold shadow-2xs`}>
                            {doc.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                              ทพญ.{doc.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {doc.fullName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          ปัจจุบัน
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                        {c66 > 0 ? `${c66} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                        {c67 > 0 ? `${c67} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                        {c68 > 0 ? `${c68} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        {c69 > 0 ? `${c69} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-blue-700 dark:text-blue-300 bg-zinc-50/50 dark:bg-zinc-800/50">
                        {total} เคส
                      </td>
                    </tr>
                  );
                })}

                {/* 2. ทันตแพทย์ในอดีต (3 ท่าน) */}
                <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                  <td colSpan={7} className="py-2 px-4 text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    📜 ทันตแพทย์ในอดีต / บันทึกประวัติย้อนหลัง (3 ท่าน)
                  </td>
                </tr>
                {FORMER_DOCTORS.map(doc => {
                  const c66 = yearsData[0]?.doctorCounts[doc.name] || 0;
                  const c67 = yearsData[1]?.doctorCounts[doc.name] || 0;
                  const c68 = yearsData[2]?.doctorCounts[doc.name] || 0;
                  const c69 = yearsData[3]?.doctorCounts[doc.name] || 0;
                  const total = c66 + c67 + c68 + c69;

                  return (
                    <tr key={doc.name} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors bg-zinc-50/30 dark:bg-zinc-900/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-6 h-6 rounded-lg ${doc.color} text-white flex items-center justify-center text-[10px] font-bold shadow-2xs opacity-80`}>
                            {doc.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 block">
                              ทพญ.{doc.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {doc.periodLabel || 'แพทย์ในอดีต'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                          อดีต
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        {c66 > 0 ? `${c66} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        {c67 > 0 ? `${c67} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        {c68 > 0 ? `${c68} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-400">
                        {c69 > 0 ? `${c69} เคส` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-800/50">
                        {total} เคส
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Grand Total Row */}
              <tfoot>
                <tr className="bg-zinc-100 dark:bg-zinc-800/90 font-bold border-t-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
                  <td className="py-3 px-4 font-extrabold" colSpan={2}>
                    รวมผู้ป่วยทุกท่าน (8 ท่าน)
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                    {yearsData[0]?.totalCases || 0} เคส
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                    {yearsData[1]?.totalCases || 0} เคส
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                    {yearsData[2]?.totalCases || 0} เคส
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-blue-600 dark:text-blue-400">
                    {yearsData[3]?.totalCases || 0} เคส
                  </td>
                  <td className="py-3 px-4 text-right font-black text-indigo-600 dark:text-indigo-400 bg-zinc-200/60 dark:bg-zinc-700/60">
                    {yearsData.reduce((s, y) => s + y.totalCases, 0)} เคส
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
