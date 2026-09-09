import React, { useState } from 'react';
import { Stethoscope, DollarSign, Users, Award, ChevronRight, FileText } from 'lucide-react';
import { DentureRecord, DOCTORS_LIST, maskPatientName, maskHN, normalizeDoctorName } from '../types';

interface DoctorsViewProps {
  records: DentureRecord[];
  onViewRecord: (record: DentureRecord) => void;
  onFilterDoctorInTable: (docName: string) => void;
  isPdpaMode?: boolean;
}

export const DoctorsView: React.FC<DoctorsViewProps> = ({
  records,
  onViewRecord,
  onFilterDoctorInTable,
  isPdpaMode = false,
}) => {
  const [selectedDoctor, setSelectedDoctor] = useState<string>(DOCTORS_LIST[0]?.name || 'กนกวรรณ');

  // Compute stats for all 5 doctors
  const doctorsData = DOCTORS_LIST.map(doc => {
    const docRecords = records.filter(r => normalizeDoctorName(r.doctor) === doc.name || r.doctor?.includes(doc.name));
    const totalCases = docRecords.length;
    const totalLab = docRecords.reduce((acc, r) => acc + (r.labCost || 0), 0);
    const totalFee = docRecords.reduce((acc, r) => acc + (r.treatmentFee || 0), 0);

    // Procedure distribution
    const types: Record<string, number> = {};
    docRecords.forEach(r => {
      const t = r.dentureType || 'อื่นๆ';
      types[t] = (types[t] || 0) + 1;
    });

    return {
      ...doc,
      totalCases,
      totalLab,
      totalFee,
      avgLab: totalCases > 0 ? totalLab / totalCases : 0,
      types,
      records: docRecords,
    };
  });

  const activeDocData = doctorsData.find(d => d.name === selectedDoctor) || doctorsData[0];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <span>ทันตแพทย์ประจำคลินิกฟันปลอม (5 ท่าน)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              โรงพยาบาลพยุหะคีรี • สรุปภาระงาน หัตถการฟันปลอม และสถิติค่าใช้จ่าย LAB แต่ละท่าน
            </p>
          </div>
        </div>

        {/* Doctor Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
          {doctorsData.map(doc => (
            <button
              key={doc.name}
              onClick={() => setSelectedDoctor(doc.name)}
              className={`p-3 rounded-2xl border text-left transition-all duration-150 ${
                selectedDoctor === doc.name
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500 shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-7 h-7 rounded-xl ${doc.color} text-white flex items-center justify-center text-xs font-bold`}>
                  {doc.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {doc.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {doc.totalCases} เคส
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Doctor Deep Dive Card */}
      {activeDocData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Doctor Profile & Key Performance Indicators */}
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-2xl ${activeDocData.color} text-white flex items-center justify-center font-bold text-base shadow-sm`}>
                  {activeDocData.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {activeDocData.fullName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    ทันตแพทย์ชำนาญการ • รพ.พยุหะคีรี
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">จำนวนเคสทั้งหมด:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    {activeDocData.totalCases} เคส
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">รวมค่าใช้จ่าย LAB:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ฿{activeDocData.totalLab.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">เฉลี่ยค่าแลป/เคส:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    ฿{activeDocData.avgLab.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">รวมมูลค่าบริการ:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    ฿{activeDocData.totalFee.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onFilterDoctorInTable(activeDocData.name)}
                className="w-full mt-2 py-2.5 px-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors"
              >
                ดูทะเบียนทั้งหมดของ หมอ{activeDocData.name} →
              </button>
            </div>

            {/* Denture Types by this doctor */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                สัดส่วนชนิดฟันปลอมที่รักษา
              </h4>
              <div className="space-y-2">
                {Object.entries(activeDocData.types).map(([type, count]) => {
                  const pct = activeDocData.totalCases > 0 ? Math.round((count / activeDocData.totalCases) * 100) : 0;
                  return (
                    <div key={type} className="text-xs space-y-1">
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                        <span>{type}</span>
                        <span className="font-mono">{count} เคส ({pct}%)</span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Patient Treatment Records list for this doctor */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                ประวัติการรักษาผู้ป่วยของ หมอ{activeDocData.name} ({activeDocData.records.length} รายการ)
              </h3>
              <span className="text-xs text-zinc-400">คลิกเพื่อดู OPD Card</span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
              {activeDocData.records.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  ยังไม่มีประวัติการรักษาของทันตแพทย์ท่านนี้ในระบบ
                </div>
              ) : (
                activeDocData.records.map(r => (
                  <div
                    key={r.id}
                    onClick={() => onViewRecord(r)}
                    className="py-3.5 px-2 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 rounded-2xl cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {isPdpaMode ? maskPatientName(r.patientName) : r.patientName}
                        </span>
                        {isPdpaMode && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            PDPA
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-400">
                          HN: {isPdpaMode ? maskHN(r.hn) : r.hn}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {r.dentureType} • {r.date} • {r.coverage}
                      </p>
                      {r.note && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400/80 font-mono">
                          ✍️ {r.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                          ฿{r.labCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-zinc-400">ค่าแลป</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
