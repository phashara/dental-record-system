import React from 'react';
import { Camera, Plus, Moon, Sun, Download, RefreshCw, Wifi, WifiOff, Stethoscope, ShieldCheck, Github, EyeOff, Eye, Database, Lock } from 'lucide-react';
import { ViewTab } from '../types';

interface HeaderProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenScanner: () => void;
  onOpenAddModal: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  isOnline: boolean;
  onSync: () => void;
  isSyncing: boolean;
  onExportCsv: () => void;
  recordCount: number;
  isPdpaMode: boolean;
  onTogglePdpaMode: () => void;
  onOpenGitHubModal: () => void;
  onOpenDataManagement: () => void;
  onLockScreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenScanner,
  onOpenAddModal,
  isDark,
  onToggleDark,
  isOnline,
  onSync,
  isSyncing,
  onExportCsv,
  recordCount,
  isPdpaMode,
  onTogglePdpaMode,
  onOpenGitHubModal,
  onOpenDataManagement,
  onLockScreen,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 dark:bg-zinc-950/85 border-b border-zinc-200/70 dark:border-zinc-800/70 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand & Hospital Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5">
              <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
                  ระบบทะเบียนฟันปลอม
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                  AI OCR • รพ.พยุหะคีรี
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                กลุ่มงานทันตกรรม • {recordCount} รายการในระบบ
              </p>
            </div>
          </div>

          {/* iOS Segmented Navigation Bar */}
          <nav className="hidden lg:flex items-center p-1 bg-zinc-100/90 dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              แดชบอร์ด
            </button>
            <button
              onClick={() => onTabChange('records')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                currentTab === 'records'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              ทะเบียนและประวัติ
            </button>
            <button
              onClick={() => onTabChange('doctors')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                currentTab === 'doctors'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              ทันตแพทย์ (5 ท่าน)
            </button>
            <button
              onClick={() => onTabChange('lab')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                currentTab === 'lab'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              สรุปค่าใช้จ่าย LAB
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Firebase Cloud Firestore Real-time status badge */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
              }`}
              title={isOnline ? 'เชื่อมต่อ Firebase Cloud Firestore เรียลไทม์ ซิงค์สดทุกอุปกรณ์' : 'โหมดออฟไลน์ ข้อมูลบันทึกในเครื่อง'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud ซิงค์สด</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>ออฟไลน์</span>
                </>
              )}
            </div>

            {/* PDPA Privacy Protection Toggle */}
            <button
              onClick={onTogglePdpaMode}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                isPdpaMode
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={isPdpaMode ? 'โหมด PDPA เปิดอยู่ (ซ่อนชื่อคนไข้และ HN)' : 'คลิกเพื่อเปิดโหมด PDPA ปิดบังชื่อคนไข้'}
            >
              {isPdpaMode ? <EyeOff className="w-3.5 h-3.5 text-emerald-600" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">
                {isPdpaMode ? 'PDPA ซ่อนชื่อ' : 'PDPA ปิด'}
              </span>
            </button>

            {/* Data Management Center */}
            <button
              onClick={onOpenDataManagement}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700 transition-colors"
              title="ศูนย์บริหารจัดการข้อมูล สำรอง กู้คืน และรายงาน รพ."
            >
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">จัดการข้อมูล</span>
            </button>

            {/* iPhone Passcode Lock Screen */}
            <button
              onClick={onLockScreen}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700 transition-colors"
              title="ล็อคหน้าจอ (ปลดล็อครหัส 0723)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden lg:inline">ล็อคหน้าจอ</span>
            </button>

            {/* GitHub & PDPA Security Guide */}
            <button
              onClick={onOpenGitHubModal}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700 transition-colors"
              title="คำแนะนำเตรียม Public สู่ GitHub & คุ้มครองข้อมูลคนไข้ PDPA"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">GitHub & PDPA</span>
            </button>

            {/* Sync button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="ซิงค์ข้อมูลกับเซิร์ฟเวอร์"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Export CSV button */}
            <button
              onClick={onExportCsv}
              className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title="ส่งออกรายงาน Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>

            {/* Dark Mode toggle */}
            <button
              onClick={onToggleDark}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="เปลี่ยนโหมดสี"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            {/* Primary iOS action: Scan Camera */}
            <button
              onClick={onOpenScanner}
              className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm shadow-blue-500/20 transition-all duration-150"
            >
              <Camera className="w-4 h-4" />
              <span>ถ่ายรูปสแกน</span>
            </button>

            {/* Secondary iOS action: Manual add */}
            <button
              onClick={onOpenAddModal}
              className="hidden sm:flex items-center space-x-1 px-3 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>คีย์มือ</span>
            </button>
          </div>
        </div>

        {/* Mobile iOS Segmented Bar */}
        <div className="lg:hidden pb-3">
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`py-1.5 text-center text-xs font-medium rounded-lg transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              แดชบอร์ด
            </button>
            <button
              onClick={() => onTabChange('records')}
              className={`py-1.5 text-center text-xs font-medium rounded-lg transition-all ${
                currentTab === 'records'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              ทะเบียน
            </button>
            <button
              onClick={() => onTabChange('doctors')}
              className={`py-1.5 text-center text-xs font-medium rounded-lg transition-all ${
                currentTab === 'doctors'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              หมอ 5 คน
            </button>
            <button
              onClick={() => onTabChange('lab')}
              className={`py-1.5 text-center text-xs font-medium rounded-lg transition-all ${
                currentTab === 'lab'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              ค่าแลป
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
