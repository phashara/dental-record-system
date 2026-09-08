import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Eye, 
  Edit3, 
  Trash2, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  Download,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { DentureRecord, DOCTORS_LIST, COVERAGE_CATEGORIES, resolveCoverage, maskPatientName, maskHN } from '../types';
import { CoverageSliderFilter } from './CoverageSliderFilter';
import { thaiBahtText } from '../lib/bahtText';

interface TableViewProps {
  records: DentureRecord[];
  onViewRecord: (record: DentureRecord) => void;
  onEditRecord: (record: DentureRecord) => void;
  onDeleteRecord: (id: string) => void;
  selectedDoctorFilter?: string;
  onClearDoctorFilter?: () => void;
  onExportCsv: () => void;
  isPdpaMode?: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  records,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  selectedDoctorFilter = 'all',
  onClearDoctorFilter,
  onExportCsv,
  isPdpaMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState(selectedDoctorFilter);
  const [typeFilter, setTypeFilter] = useState('all');
  const [coverageGroup, setCoverageGroup] = useState('all');
  const [coverageSubItem, setCoverageSubItem] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'labCost' | 'hn'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Keep local filter synced with prop
  React.useEffect(() => {
    setDoctorFilter(selectedDoctorFilter);
  }, [selectedDoctorFilter]);

  // Unique denture types and coverages for filters
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.dentureType) set.add(r.dentureType);
    });
    return Array.from(set);
  }, [records]);

  const availableCoverages = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.coverage) set.add(r.coverage);
    });
    return Array.from(set);
  }, [records]);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        // Search query
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          r.patientName?.toLowerCase().includes(term) ||
          r.hn?.toLowerCase().includes(term) ||
          r.doctor?.toLowerCase().includes(term) ||
          r.dentureType?.toLowerCase().includes(term) ||
          r.coverage?.toLowerCase().includes(term) ||
          r.note?.toLowerCase().includes(term) ||
          r.diagnosis?.toLowerCase().includes(term);

        // Doctor filter
        const matchesDoctor =
          doctorFilter === 'all' || r.doctor?.includes(doctorFilter);

        // Denture type filter
        const matchesType =
          typeFilter === 'all' || r.dentureType === typeFilter;

        // Coverage filter
        const recordCoverage = resolveCoverage(r.coverage);
        let matchesCoverage = true;
        if (coverageGroup !== 'all') {
          const recGroup = r.coverageGroup || recordCoverage.group;
          if (recGroup !== coverageGroup) {
            matchesCoverage = false;
          } else if (coverageSubItem !== 'all') {
            matchesCoverage = recordCoverage.subItem === coverageSubItem || r.coverage === coverageSubItem;
          }
        }

        return matchesSearch && matchesDoctor && matchesType && matchesCoverage;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') {
          cmp = new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
        } else if (sortBy === 'name') {
          cmp = (a.patientName || '').localeCompare(b.patientName || '', 'th');
        } else if (sortBy === 'labCost') {
          cmp = (a.labCost || 0) - (b.labCost || 0);
        } else if (sortBy === 'hn') {
          cmp = (a.hn || '').localeCompare(b.hn || '');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [records, searchTerm, doctorFilter, typeFilter, coverageGroup, coverageSubItem, sortBy, sortOrder]);

  const totalFilteredLab = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (r.labCost || 0), 0);
  }, [filteredRecords]);

  const totalFilteredTreatment = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (r.treatmentFee || r.labCost || 0), 0);
  }, [filteredRecords]);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      
      {/* Search & Filter Header Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* iOS Style Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาตาม HN, ชื่อผู้ป่วย, ทันตแพทย์, ลายมือแพทย์ หรือการวินิจฉัย..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Export Action */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onExportCsv}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก Excel/CSV</span>
            </button>
          </div>

        </div>

        {/* Coverage Slider Filter (Slide across 5 categories and sub-types) */}
        <CoverageSliderFilter
          records={records}
          activeGroup={coverageGroup}
          activeSubItem={coverageSubItem}
          onChange={(group, sub) => {
            setCoverageGroup(group);
            setCoverageSubItem(sub);
          }}
        />

        {/* Filter Pills / Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          
          {/* Doctor Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-medium text-zinc-400">ทันตแพทย์:</span>
            <select
              value={doctorFilter}
              onChange={e => setDoctorFilter(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-800 dark:text-zinc-200 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">หมอทั้งหมด (5 ท่าน)</option>
              {DOCTORS_LIST.map(doc => (
                <option key={doc.name} value={doc.name}>
                  {doc.fullName} ({doc.name})
                </option>
              ))}
            </select>
          </div>

          {/* Denture Type Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-medium text-zinc-400">ชนิดฟันปลอม:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">ทุกประเภท</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Shortcut if anything is filtered */}
          {(doctorFilter !== 'all' || typeFilter !== 'all' || coverageGroup !== 'all' || coverageSubItem !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setDoctorFilter('all');
                setTypeFilter('all');
                setCoverageGroup('all');
                setCoverageSubItem('all');
                setSearchTerm('');
                if (onClearDoctorFilter) onClearDoctorFilter();
              }}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 font-medium transition-colors"
            >
              รีเซ็ตตัวกรองทั้งหมด
            </button>
          )}

          {/* Sort By */}
          <div className="flex items-center space-x-1 ml-auto">
            <span className="text-[11px] font-medium text-zinc-400">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs py-1 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="date">วันที่รับบริการ</option>
              <option value="labCost">ค่าใช้จ่าย LAB</option>
              <option value="name">ชื่อผู้ป่วย</option>
              <option value="hn">เลขประจำตัว HN</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2 py-1 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            >
              {sortOrder === 'asc' ? '↑ น้อยไปมาก' : '↓ มากไปน้อย'}
            </button>
          </div>

        </div>

        {/* Filter summary status */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1">
          <span>
            แสดง {filteredRecords.length} จาก {records.length} รายการ
            {doctorFilter !== 'all' && ` (ทันตแพทย์: ${doctorFilter})`}
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            รวมค่าแลปที่กรอง: ฿{totalFilteredLab.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* สรุปผลเบื้องต้นกำกับตาราง (Preliminary Summary Bar) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="font-bold">สรุปผลเบื้องต้นกำกับตาราง:</span>{' '}
            <span>ผู้รับบริการ <strong>{filteredRecords.length.toLocaleString('th-TH')}</strong> ราย</span>
            {doctorFilter !== 'all' && <span className="ml-1 text-blue-700 dark:text-blue-300">| แพทย์: {doctorFilter}</span>}
            {coverageGroup !== 'all' && <span className="ml-1 text-blue-700 dark:text-blue-300">| สิทธิ: {coverageGroup}</span>}
            {typeFilter !== 'all' && <span className="ml-1 text-blue-700 dark:text-blue-300">| ชนิด: {typeFilter}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-zinc-700 dark:text-zinc-300">
          <span>ยอดรวมเงิน: <strong className="text-blue-700 dark:text-blue-300 text-sm">฿{totalFilteredTreatment.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">({thaiBahtText(totalFilteredTreatment)})</span>
        </div>
      </div>

      {/* Main Table for Desktop */}
      <div className="hidden lg:block overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50/90 dark:bg-zinc-950/70 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">HN & ชื่อผู้ป่วย</th>
                <th className="py-3 px-3">วันที่บริการ</th>
                <th className="py-3 px-4">ทันตแพทย์ผู้รักษา</th>
                <th className="py-3 px-4">ชนิดฟันปลอม</th>
                <th className="py-3 px-3">ตำแหน่ง</th>
                <th className="py-3 px-3">สิทธิการรักษา</th>
                <th className="py-3 px-3 text-right">ค่าใช้จ่าย LAB ✍️</th>
                <th className="py-3 px-3 text-right">รวมค่ารักษา</th>
                <th className="py-3 px-4 max-w-xs">หมายเหตุ/ลายมือแพทย์</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                    onClick={() => onViewRecord(r)}
                  >
                    <td className="py-3 px-4 text-center text-zinc-400 font-mono">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                        <span>{isPdpaMode ? maskPatientName(r.patientName) : r.patientName}</span>
                        {isPdpaMode && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            PDPA
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        HN: {isPdpaMode ? maskHN(r.hn) : r.hn} {r.age ? `• อายุ ${r.age} ปี` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      {r.date}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                        {r.doctor}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {r.dentureType}
                    </td>

                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400">
                      {r.denturePosition || '-'}
                    </td>

                    <td className="py-3 px-3">
                      {(() => {
                        const cov = resolveCoverage(r.coverage);
                        const catGroup = COVERAGE_CATEGORIES.find(c => c.name === (r.coverageGroup || cov.group)) || COVERAGE_CATEGORIES[0];
                        return (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catGroup.badgeClass}`}>
                              {r.coverageGroup || cov.group}
                            </span>
                            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                              {cov.subItem}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ฿{r.labCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                      ฿{r.treatmentFee?.toLocaleString('th-TH', { minimumFractionDigits: 0 }) || '0'}
                    </td>

                    <td className="py-3 px-4 max-w-xs text-zinc-500 dark:text-zinc-400 truncate" title={r.note}>
                      {r.note || '-'}
                    </td>

                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onViewRecord(r)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="ดูรายละเอียดชาร์ต"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditRecord(r)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ต้องการลบรายการ ${r.patientName} (HN: ${r.hn}) หรือไม่?`)) {
                              onDeleteRecord(r.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-zinc-50/90 dark:bg-zinc-950/80 font-semibold border-t-2 border-zinc-300 dark:border-zinc-700 text-xs">
              <tr>
                <td colSpan={7} className="py-3 px-4 text-right text-zinc-900 dark:text-zinc-100">
                  รวมจำนวนเงินแถวสุดท้าย ({filteredRecords.length} ราย):
                </td>
                <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                  ฿{totalFilteredLab.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400 font-mono">
                  ฿{totalFilteredTreatment.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="py-3 px-4 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 italic">
                  คำอ่าน: {thaiBahtText(totalFilteredTreatment)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile Card List View for Phones */}
      <div className="lg:hidden space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          filteredRecords.map((r, idx) => (
            <div
              key={r.id}
              onClick={() => onViewRecord(r)}
              className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-zinc-400">#{idx + 1}</span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {isPdpaMode ? maskPatientName(r.patientName) : r.patientName}
                    </h4>
                    {isPdpaMode && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        PDPA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    HN: {isPdpaMode ? maskHN(r.hn) : r.hn} • {r.date}
                  </p>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  หมอ{r.doctor}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 text-[11px]">ชนิดฟันปลอม:</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{r.dentureType}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px]">สิทธิการรักษา:</span>
                  {(() => {
                    const cov = resolveCoverage(r.coverage);
                    const catGroup = COVERAGE_CATEGORIES.find(c => c.name === (r.coverageGroup || cov.group)) || COVERAGE_CATEGORIES[0];
                    return (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${catGroup.badgeClass}`}>
                          {r.coverageGroup || cov.group}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium text-xs truncate max-w-[120px]">
                          {cov.subItem}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-[11px] text-zinc-400">ค่าใช้จ่าย LAB:</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ฿{r.labCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => onEditRecord(r)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`ต้องการลบรายการ ${r.patientName} หรือไม่?`)) {
                        onDeleteRecord(r.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {filteredRecords.length > 0 && (
          <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                รวมจำนวนเงินแถวสุดท้าย ({filteredRecords.length} ราย):
              </span>
              <span className="font-bold text-blue-700 dark:text-blue-300 font-mono text-sm">
                ฿{totalFilteredTreatment.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">
              คำอ่าน: {thaiBahtText(totalFilteredTreatment)}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
