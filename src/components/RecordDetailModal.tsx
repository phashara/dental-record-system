import React, { useState } from 'react';
import { X, Printer, Calendar, User, FileText, DollarSign, Activity, Stethoscope, CheckCircle2, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { DentureRecord, DOCTORS_LIST, COVERAGE_CATEGORIES, resolveCoverage, maskPatientName, maskHN } from '../types';

interface RecordDetailModalProps {
  record: DentureRecord | null;
  onClose: () => void;
  onEdit: (record: DentureRecord) => void;
  onDelete?: (id: string) => void;
  isPdpaMode?: boolean;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onEdit,
  onDelete,
  isPdpaMode = false,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  if (!record) return null;

  const doctorInfo = DOCTORS_LIST.find(d => record.doctor?.includes(d.name)) || {
    name: record.doctor,
    fullName: `ทญ.${record.doctor}`,
    color: 'bg-blue-600',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Nav Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              OPDCARD / ชาร์ตทันตกรรม
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              HN: {isPdpaMode ? maskHN(record.hn) : record.hn}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {isPdpaMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                PDPA MASKED
              </span>
            )}
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title="พิมพ์เอกสาร"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Hospital Styled OPD Card Document */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-zinc-800 dark:text-zinc-200 print:text-black">
          
          {/* Hospital Header Header Banner */}
          <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-5 space-y-1">
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-1">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
              ใบตรวจรักษาผู้ป่วยนอก (OPDCARD) รพ.พยุหะคีรี
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              กลุ่มงานทันตกรรม • ระบบเวชระเบียนและทะเบียนฟันปลอม
            </p>
          </div>

          {/* Patient Info Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                ข้อมูลผู้รับบริการ
              </span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                HN: {isPdpaMode ? maskHN(record.hn) : record.hn}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">ชื่อ - สกุล:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {isPdpaMode ? maskPatientName(record.patientName) : record.patientName}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">อายุ:</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {record.age ? `${record.age} ปี` : 'ไม่ระบุ'} ({record.gender || 'ไม่ระบุ'})
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">วันที่รับบริการ:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                  {record.date}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-zinc-400 block text-[11px] mb-1">สิทธิการรักษา (7 หมวดสิทธิ):</span>
                {(() => {
                  const cov = resolveCoverage(record.coverage);
                  const catGroup = COVERAGE_CATEGORIES.find(c => c.name === (record.coverageGroup || cov.group)) || COVERAGE_CATEGORIES[0];
                  return (
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${catGroup.badgeClass}`}>
                        {record.coverageGroup || cov.group}
                      </span>
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {cov.subItem}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Dental Treatment & Denture Specs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
              รายการทันตกรรมและฟันปลอม
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">ชนิดฟันปลอม:</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {record.dentureType}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ตำแหน่ง: {record.denturePosition || 'ไม่ระบุ'}
                </p>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">การวินิจฉัย (Diagnosis):</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {record.diagnosis || 'K081 Loss of teeth due to accident/extraction'}
                </p>
              </div>
            </div>

            {/* Handwritten Note / Formula */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center space-x-1 mb-1">
                <span>บันทึกลายมือแพทย์ (Dental Note) & สูตรคำนวณ:</span>
              </span>
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 font-mono text-xs">
                {record.note || 'ไม่มีบันทึกเพิ่มเติม'}
              </div>
            </div>
          </div>

          {/* Financials & LAB Fee Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block border-b border-emerald-200/80 dark:border-emerald-800/40 pb-2">
              ค่าใช้จ่ายและค่าแลป (LAB Fee Breakdown)
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                  ค่าใช้จ่าย LAB (บาท) ✍️
                </span>
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  ฿{record.labCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                  รวมค่าใช้จ่ายทั้งสิ้น (บาท)
                </span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  ฿{record.treatmentFee?.toLocaleString('th-TH', { minimumFractionDigits: 0 }) || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Attending Dentist Signature Section */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-2xl ${doctorInfo.color} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                {doctorInfo.name.charAt(0)}
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">ทันตแพทย์ผู้ตรวจรักษา:</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {doctorInfo.fullName} ({doctorInfo.name})
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{record.status || 'เสร็จสิ้น'}</span>
              </span>
            </div>
          </div>

          {/* Meta footer info */}
          <div className="text-[11px] text-zinc-400 text-center pt-2">
            ที่มาข้อมูล: {record.source || 'OPD Card Scan'} • รหัสรายการ: {record.id}
          </div>

        </div>

        {/* Modal Bottom Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              แก้ไขข้อมูลนี้
            </button>
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบรายการนี้</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            ปิด
          </button>
        </div>

        {/* Delete Confirmation Overlay inside Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">ยืนยันการลบข้อมูล</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  ต้องการลบข้อมูลของ <strong>{record.patientName}</strong> (HN: {record.hn}) ชนิด {record.dentureType} ใช่หรือไม่?
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (onDelete) {
                      onDelete(record.id);
                    }
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ยืนยันลบ</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
