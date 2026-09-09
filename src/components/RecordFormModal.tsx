import React, { useState, useEffect } from 'react';
import { X, Check, FileText, Sparkles, Layers } from 'lucide-react';
import { DentureRecord, DOCTORS_LIST, COVERAGE_CATEGORIES, resolveCoverage, classifyDentureType, normalizeDoctorName } from '../types';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: DentureRecord) => void;
  editingRecord?: DentureRecord | null;
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
}) => {
  const [formData, setFormData] = useState<Partial<DentureRecord>>({
    hn: '',
    patientName: '',
    age: '',
    gender: 'หญิง',
    date: new Date().toISOString().split('T')[0],
    doctor: DOCTORS_LIST[0]?.name || 'กนกวรรณ',
    dentureType: 'CD',
    denturePosition: 'บนและล่าง',
    coverage: 'UC 30 บาท',
    labCost: 0,
    treatmentFee: 0,
    diagnosis: 'K081 Loss of teeth due to accident / extraction',
    note: '',
    status: 'เสร็จสิ้น (Completed)',
    source: 'Manual Entry'
  });

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        ...editingRecord,
        doctor: normalizeDoctorName(editingRecord.doctor),
      });
    } else {
      setFormData({
        hn: '',
        patientName: '',
        age: '',
        gender: 'หญิง',
        date: new Date().toISOString().split('T')[0],
        doctor: DOCTORS_LIST[0]?.name || 'กนกวรรณ',
        dentureType: 'CD (ฟันเทียมทั้งปาก)',
        denturePosition: 'บนและล่าง',
        coverage: 'UC 30 บาท',
        labCost: 0,
        treatmentFee: 0,
        diagnosis: 'K081 Loss of teeth due to accident / extraction',
        note: '',
        status: 'เสร็จสิ้น (Completed)',
        source: 'Manual Entry'
      });
    }
  }, [editingRecord, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.hn) {
      alert('กรุณากรอก HN และชื่อ-สกุล ผู้ป่วย');
      return;
    }

    const resolvedCoverage = resolveCoverage(formData.coverage);

    const recordToSave: DentureRecord = {
      id: editingRecord?.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hn: formData.hn || '',
      patientName: formData.patientName || '',
      age: formData.age || '',
      gender: formData.gender as any || 'หญิง',
      date: formData.date || new Date().toISOString().split('T')[0],
      doctor: normalizeDoctorName(formData.doctor),
      dentureType: formData.dentureType || 'CD',
      denturePosition: formData.denturePosition || 'บนและล่าง',
      coverageGroup: resolvedCoverage.group,
      coverage: resolvedCoverage.subItem,
      labCost: Number(formData.labCost) || 0,
      treatmentFee: Number(formData.treatmentFee) || 0,
      diagnosis: formData.diagnosis || 'K081 Loss of teeth',
      note: formData.note || '',
      status: formData.status as any || 'เสร็จสิ้น (Completed)',
      source: editingRecord ? editingRecord.source : 'Manual Entry',
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false
    };

    onSave(recordToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {editingRecord ? 'แก้ไขข้อมูลทะเบียนฟันปลอม' : 'เพิ่มทะเบียนฟันปลอมใหม่'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                HN (เลขประจำตัวผู้ป่วย) *
              </label>
              <input
                type="text"
                required
                value={formData.hn}
                onChange={e => setFormData({ ...formData, hn: e.target.value })}
                placeholder="เช่น 680020696"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                ชื่อ-นามสกุล ผู้ป่วย *
              </label>
              <input
                type="text"
                required
                value={formData.patientName}
                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                placeholder="เช่น นางอารี บุตรน้อย"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                อายุ (ปี)
              </label>
              <input
                type="text"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                placeholder="เช่น 64"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                เพศ
              </label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="หญิง">หญิง</option>
                <option value="ชาย">ชาย</option>
                <option value="ไม่ระบุ">ไม่ระบุ</option>
              </select>
            </div>

            {/* Doctor Selection (5 doctors) */}
            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                ทันตแพทย์ผู้รักษา (5 ท่าน) *
              </label>
              <select
                value={normalizeDoctorName(formData.doctor)}
                onChange={e => setFormData({ ...formData, doctor: normalizeDoctorName(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-blue-700 dark:text-blue-300 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {DOCTORS_LIST.map(doc => (
                  <option key={doc.name} value={doc.name}>
                    {doc.fullName} ({doc.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                วันที่ให้บริการ / Insert
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-zinc-600 dark:text-zinc-300">
                  ชนิดฟันปลอม *
                </label>
                {(() => {
                  const classification = classifyDentureType(formData.dentureType);
                  return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      หมวด: {classification.categoryTitle}
                    </span>
                  );
                })()}
              </div>
              <input
                type="text"
                value={formData.dentureType}
                onChange={e => setFormData({ ...formData, dentureType: e.target.value })}
                placeholder="เช่น CD, APD/APD, UTP, LTP, ซ่อม"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {/* Quick learned denture type chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: 'CD (ทั้งปาก)', code: 'CD', pos: 'บนและล่าง' },
                  { label: 'CD/CD', code: 'CD/CD', pos: 'บนและล่าง' },
                  { label: 'APD (ฐานพลาสติก)', code: 'APD', pos: 'บน (Upper)' },
                  { label: 'APD/APD', code: 'APD/APD', pos: 'บนและล่าง' },
                  { label: 'CD/APD', code: 'CD/APD', pos: 'บน CD / ล่าง APD' },
                  { label: 'UTP (ชั่วคราวบน)', code: 'UTP', pos: 'บน (Upper)' },
                  { label: 'LTP (ชั่วคราวล่าง)', code: 'LTP', pos: 'ล่าง (Lower)' },
                  { label: 'RPD (โครงโลหะ)', code: 'RPD', pos: 'บนและล่าง' },
                  { label: 'ซ่อม (Repair)', code: 'ซ่อม', pos: 'ชิ้นเดิม' },
                ].map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      dentureType: item.code,
                      denturePosition: prev.denturePosition || item.pos
                    }))}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-zinc-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                ตำแหน่งฟันปลอม
              </label>
              <input
                type="text"
                value={formData.denturePosition}
                onChange={e => setFormData({ ...formData, denturePosition: e.target.value })}
                placeholder="เช่น บนและล่าง, บน (Upper), ล่าง (Lower)"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-zinc-600 dark:text-zinc-300">
                  สิทธิการรักษา (7 หมวดสิทธิ) *
                </label>
                {(() => {
                  const res = resolveCoverage(formData.coverage);
                  const cat = COVERAGE_CATEGORIES.find(c => c.name === res.group) || COVERAGE_CATEGORIES[0];
                  return (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cat.badgeClass}`}>
                      หมวด: {res.group}
                    </span>
                  );
                })()}
              </div>
              <select
                value={formData.coverage}
                onChange={e => setFormData({ ...formData, coverage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {COVERAGE_CATEGORIES.map((cat, idx) => (
                  <optgroup key={cat.id} label={`${idx + 1}. ${cat.name}`}>
                    {cat.items.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                ค่าใช้จ่าย LAB (บาท) ✍️
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.labCost}
                onChange={e => setFormData({ ...formData, labCost: parseFloat(e.target.value) || 0 })}
                placeholder="เช่น 1323.00"
                className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                รวมค่ารักษาทั้งสิ้น (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.treatmentFee}
                onChange={e => setFormData({ ...formData, treatmentFee: parseFloat(e.target.value) || 0 })}
                placeholder="เช่น 3000"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                การวินิจฉัย (Diagnosis)
              </label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="เช่น K081 Loss of teeth"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              Dental Note / ลายมือแพทย์ / หมายเหตุ
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              placeholder="เช่น Tx. insert upper APD / ค่าแลป = 300+1023 = 1323"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold transition-all shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกข้อมูล</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
