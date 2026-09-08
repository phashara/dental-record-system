import React from 'react';
import { X, ShieldCheck, Github, Lock, AlertTriangle, Key, CheckCircle, FileText, ExternalLink, EyeOff } from 'lucide-react';

interface GitHubAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPdpaMode: boolean;
  onTogglePdpaMode: () => void;
}

export const GitHubAndPrivacyModal: React.FC<GitHubAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  isPdpaMode,
  onTogglePdpaMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>เตรียม Public สู่ GitHub & ความปลอดภัยข้อมูล PDPA</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                แนวทางปฏิบัติสำหรับกลุ่มงานทันตกรรม โรงพยาบาล
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          
          {/* Quick Action: PDPA Masking Switch */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                  โหมดแสดงผล PDPA (ซ่อนชื่อคนไข้และ HN)
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {isPdpaMode 
                    ? 'เปิดใช้งานอยู่: ปิดบังชื่อคนไข้และ HN บนหน้าจอและตอนถ่ายทอดสด/นำเสนอ' 
                    : 'ปิดอยู่: แสดงชื่อเต็มคนไข้ (เหมาะสำหรับแพทย์ตรวจการรักษาภายใน รพ.)'}
                </p>
              </div>
            </div>
            <button
              onClick={onTogglePdpaMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isPdpaMode
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300'
              }`}
            >
              {isPdpaMode ? 'เปิดอยู่ (Active)' : 'กดเพื่อเปิด'}
            </button>
          </div>

          {/* Section 1: วิธีนำขึ้น GitHub */}
          <div className="space-y-3">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 text-sm">
              <Github className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              <span>1. ขั้นตอนการนำโปรเจกต์ขึ้น GitHub (ทำอย่างไรต่อ)</span>
            </h3>
            
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-xs font-bold flex items-center justify-center mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    คลิกเมนูการตั้งค่า (Settings / Export) ใน AI Studio
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    ที่มุมขวาบนของหน้าต่าง Google AI Studio จะมีปุ่ม <strong>Settings</strong> หรือ <strong>Export</strong> คุณสามารถเลือก <strong>"Export to GitHub"</strong> หรือ <strong>"Download ZIP"</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-xs font-bold flex items-center justify-center mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    เลือกประเภท Repository: Public หรือ Private
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <strong>ข้อแนะนำสำคัญ:</strong> หากเป็นการสาธิตระบบหรือ Open-source สามารถตั้งเป็น <strong>Public</strong> ได้ (เพราะข้อมูลในตัวอย่างผ่านการ Sanitize แล้ว) แต่หากมีการบันทึกคนไข้จริงของโรงพยาบาล แนะนำให้เลือก <strong>Private</strong> เสมอ
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-xs font-bold flex items-center justify-center mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    การโคลนและรันโปรเจกต์บนเครื่องตนเอง (Local Server)
                  </p>
                  <div className="mt-1 p-2.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-xs space-y-1">
                    <p className="text-zinc-400"># 1. ติดตั้งแพ็กเกจ</p>
                    <p>npm install</p>
                    <p className="text-zinc-400"># 2. ตั้งค่าไฟล์ .env จาก .env.example</p>
                    <p>cp .env.example .env</p>
                    <p className="text-zinc-400"># 3. ใส่ GEMINI_API_KEY ของตนเองในไฟล์ .env</p>
                    <p className="text-zinc-400"># 4. รันระบบ</p>
                    <p>npm run dev</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: การปกป้องข้อมูลคนไข้ (PDPA Protection) */}
          <div className="space-y-3">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 text-sm">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>2. มาตรการปกป้องข้อมูลคนไข้ (PDPA & PHI Protection) ที่ระบบเตรียมไว้ให้แล้ว</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>ลบข้อมูลชื่อจริงใน Code แล้ว (Sanitized)</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  ไฟล์โค้ดและข้อมูลตัวอย่างทั้งหมดถูกเปลี่ยนเป็น <strong>"ผู้ป่วยจำลอง (นามสมมุติ)"</strong> และ HN ถูก Mask ปิดบังเลขกลาง 4 หลัก ไม่สามารถสืบค้นย้อนกลับถึงตัวบุคคลได้
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>ป้องกันผ่าน .gitignore</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  เพิ่มการละเว้นไฟล์ฐานข้อมูลจริง, โฟลเดอร์รูปสแกน <code>uploads/</code>, <code>data/*.private.json</code> เพื่อไม่ให้หลุดขึ้น GitHub เวลา push โค้ด
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>ระบบซ่อนชื่อแบบไดนามิก (PDPA Mode)</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  หน้าจอแดชบอร์ด ตาราง และหน้ารายละเอียด มีฟังก์ชันปิดบังชื่อ (เช่น <code>นาง อ*** บ***</code>) และ HN (เช่น <code>68****696</code>) เพื่อความปลอดภัยเวลาฉายขึ้นโปรเจกเตอร์
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>ตัวเลือก Export CSV แบบนิรนาม</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  เวลาดาวน์โหลดรายงาน สามารถเลือกโหมดส่งออกข้อมูลเพื่อสถิติงานวิจัย โดยตัดข้อมูลอัตลักษณ์บุคคลออกตามมาตรฐาน PDPA
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: การปกป้อง API Key */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
            <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center space-x-2 text-xs sm:text-sm">
              <Key className="w-4 h-4 text-amber-600" />
              <span>3. ห้ามเผยแพร่ Gemini API Key เด็ดขาด</span>
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              ในระบบนี้ API Key ถูกเก็บไว้ที่ Server-side เท่านั้น และไฟล์ <code>.env</code> ถูกบันทึกไว้ใน <code>.gitignore</code> แล้วเรียบร้อย เมื่อนำขึ้น GitHub ให้ใช้ระบบ <strong>GitHub Secrets</strong> หรือใส่ไว้ใน Environment Variables ของ Cloud Provider เท่านั้น
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>มาตรฐาน พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            เข้าใจและปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
