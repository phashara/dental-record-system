import React, { useState } from 'react';
import { 
  Camera, 
  Plus, 
  Moon, 
  Sun, 
  Download, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Stethoscope, 
  Github, 
  EyeOff, 
  Eye, 
  Database, 
  Lock, 
  FileText, 
  FileSpreadsheet,
  Menu,
  X,
  Layers,
  Users,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Shield,
  Sparkles,
  Type
} from 'lucide-react';
import { ViewTab } from '../types';

interface HeaderProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenScanner: () => void;
  onOpenPdfUpload: () => void;
  onOpenExcelImport: () => void;
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
  fontFamily?: 'ios' | 'prompt' | 'ibm';
  onChangeFontFamily?: (font: 'ios' | 'prompt' | 'ibm') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenScanner,
  onOpenPdfUpload,
  onOpenExcelImport,
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
  fontFamily = 'ios',
  onChangeFontFamily,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: ViewTab) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/60 dark:border-zinc-800/60 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Brand & Identity */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 ring-1 ring-black/5 shrink-0">
                <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                    ระบบทะเบียนฟันปลอม
                  </h1>
                  <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="hidden sm:inline-flex text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    รพ.พยุหะคีรี
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>กลุ่มงานทันตกรรม</span>
                  <span>·</span>
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{recordCount} เคส</span>
                  <span className="hidden md:inline">·</span>
                  <span className="hidden md:inline-flex items-center space-x-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{isOnline ? 'Cloud ซิงค์สด' : 'ออฟไลน์'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop iOS Segmented Navigation Pill */}
            <nav className="hidden lg:flex items-center p-1 bg-zinc-100/90 dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-inner">
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
                onClick={() => onTabChange('trends')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 ${
                  currentTab === 'trends'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="วิเคราะห์แนวโน้ม 4 ปีย้อนหลัง & พยากรณ์ปี 2570"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>แนวโน้มรายปี</span>
              </button>
              <button
                onClick={() => onTabChange('doctors')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  currentTab === 'doctors'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                ทันตแพทย์ (8 ท่าน)
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

            {/* Desktop Action Tools */}
            <div className="hidden lg:flex items-center space-x-2">
              {/* PDPA Privacy Toggle */}
              <button
                onClick={onTogglePdpaMode}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isPdpaMode
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title={isPdpaMode ? 'โหมด PDPA เปิดอยู่ (ซ่อนชื่อคนไข้และ HN)' : 'เปิดโหมด PDPA'}
              >
                {isPdpaMode ? <EyeOff className="w-3.5 h-3.5 text-emerald-600" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isPdpaMode ? 'PDPA ซ่อนชื่อ' : 'PDPA'}</span>
              </button>

              {/* Data Management */}
              <button
                onClick={onOpenDataManagement}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 transition-colors"
                title="ศูนย์จัดการข้อมูล สำรอง กู้คืน"
              >
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>

              {/* Lock Screen */}
              <button
                onClick={onLockScreen}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 transition-colors"
                title="ล็อคหน้าจอ Passcode (0723)"
              >
                <Lock className="w-4 h-4 text-amber-500" />
              </button>

              {/* Sync */}
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 transition-colors"
                title="ซิงค์ข้อมูลกับ Firebase"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Dark Mode */}
              <button
                onClick={onToggleDark}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 transition-colors"
                aria-label="เปลี่ยนโหมดสี"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
              </button>

              {/* Font Family Selector (Desktop) */}
              {onChangeFontFamily && (
                <button
                  onClick={() => {
                    if (fontFamily === 'ios') onChangeFontFamily('prompt');
                    else if (fontFamily === 'prompt') onChangeFontFamily('ibm');
                    else onChangeFontFamily('ios');
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-800 flex items-center space-x-1.5 transition-colors"
                  title="เปลี่ยนรูปแบบฟอนต์ (iOS Modern / Prompt / IBM Plex)"
                >
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden xl:inline">
                    {fontFamily === 'ios' ? 'ฟอนต์ iOS' : fontFamily === 'prompt' ? 'ฟอนต์ Prompt' : 'ฟอนต์ IBM'}
                  </span>
                </button>
              )}

              {/* Excel Import */}
              <button
                onClick={onOpenExcelImport}
                className="flex items-center space-x-1 px-3 py-2 rounded-2xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 active:scale-[0.98] transition-all"
                title="นำเข้า Excel (.xlsx / .csv)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Excel</span>
              </button>

              {/* PDF Batch */}
              <button
                onClick={onOpenPdfUpload}
                className="flex items-center space-x-1 px-3 py-2 rounded-2xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 active:scale-[0.98] transition-all"
                title="อัปโหลดเวชระเบียน PDF"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>PDF</span>
              </button>

              {/* Camera Scanner */}
              <button
                onClick={onOpenScanner}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-sm shadow-blue-500/20 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>ถ่ายรูปสแกน</span>
              </button>

              {/* Manual Add */}
              <button
                onClick={onOpenAddModal}
                className="flex items-center space-x-1 px-3 py-2 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>คีย์มือ</span>
              </button>
            </div>

            {/* Mobile / Tablet Top Bar Actions */}
            <div className="flex lg:hidden items-center space-x-2">
              {/* Quick Camera Action */}
              <button
                onClick={onOpenScanner}
                className="flex items-center space-x-1 px-3 py-2 rounded-2xl text-xs font-semibold text-white bg-blue-600 active:scale-95 shadow-xs transition-transform"
                title="สแกนกล้อง"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[11px]">สแกน</span>
              </button>

              {/* iOS Hamburger Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 active:scale-90 border border-zinc-200/60 dark:border-zinc-700/60 transition-all shadow-xs"
                aria-label="เปิดเมนู"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                ) : (
                  <Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* iOS 18-Style Mobile Hamburger Drawer & Navigation Sheet */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Frosted Glass Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-2xl border-l border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between overflow-y-auto transform transition-transform ease-out">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                    ระบบทะเบียนฟันปลอม
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    รพ.พยุหะคีรี • {recordCount} เคส
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="p-5 space-y-6 flex-1">
              
              {/* Section 1: Main Navigation Views */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block px-1">
                  เมนูหลัก (Navigation)
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      currentTab === 'dashboard'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${currentTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold block">แดชบอร์ด & สถิติภาพรวม</span>
                        <span className="text-[10px] text-zinc-400">สรุปเคส และ ส่วนต่างสุทธิ (Net Margin)</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick('records')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      currentTab === 'records'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${currentTab === 'records' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold block">ทะเบียนและประวัติคนไข้</span>
                        <span className="text-[10px] text-zinc-400">ค้นหา กรองสิทธิ และแก้ไขข้อมูล</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick('trends')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      currentTab === 'trends'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${currentTab === 'trends' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold block">📈 วิเคราะห์แนวโน้มรายปี & คาดการณ์</span>
                        <span className="text-[10px] text-zinc-400">เปรียบเทียบ 4 ปี และพยากรณ์งบแลป 2570</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick('doctors')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      currentTab === 'doctors'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${currentTab === 'doctors' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold block">ภาระงานทันตแพทย์ (8 ท่าน)</span>
                        <span className="text-[10px] text-zinc-400">สถิติเคสและผลงานแพทย์ (ปัจจุบัน & อดีต)</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick('lab')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      currentTab === 'lab'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${currentTab === 'lab' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold block">สรุปและตรวจเช็คค่าแลป LAB</span>
                        <span className="text-[10px] text-zinc-400">ยอดส่งแลป & เบิกจ่ายตามสิทธิ</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Section 2: AI & Input Tools */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block px-1">
                  เครื่องมือบันทึก & สแกน (AI Tools)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenScanner();
                    }}
                    className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-left active:scale-95 transition-all"
                  >
                    <Camera className="w-5 h-5 mb-1.5 text-blue-600" />
                    <span className="text-xs font-bold block">ถ่ายรูปสแกน AI</span>
                    <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70">กล้องมือถือ / อัลบั้ม</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenPdfUpload();
                    }}
                    className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-left active:scale-95 transition-all"
                  >
                    <FileText className="w-5 h-5 mb-1.5 text-indigo-600" />
                    <span className="text-xs font-bold block">อัปโหลด PDF</span>
                    <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">สแกนหลายหน้าพร้อมกัน</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenExcelImport();
                    }}
                    className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 text-left active:scale-95 transition-all"
                  >
                    <FileSpreadsheet className="w-5 h-5 mb-1.5 text-emerald-600" />
                    <span className="text-xs font-bold block">นำเข้า Excel</span>
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">.xlsx / .csv ทุกปี</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAddModal();
                    }}
                    className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-left active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5 mb-1.5 text-zinc-600 dark:text-zinc-400" />
                    <span className="text-xs font-bold block">คีย์เพิ่มคนไข้</span>
                    <span className="text-[10px] text-zinc-400">กรอกฟอร์มทีละราย</span>
                  </button>
                </div>
              </div>

              {/* Section 3: Data Management & Settings */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block px-1">
                  การจัดการระบบ & ความปลอดภัย
                </span>
                
                {/* PDPA Switch Card */}
                <div 
                  onClick={onTogglePdpaMode}
                  className="cursor-pointer p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPdpaMode ? 'bg-emerald-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                      {isPdpaMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        โหมดคุ้มครองข้อมูล PDPA
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {isPdpaMode ? 'ซ่อนชื่อคนไข้และเลข HN' : 'แสดงข้อมูลตามจริง'}
                      </span>
                    </div>
                  </div>
                  {/* iOS Style Switch Pill */}
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${isPdpaMode ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isPdpaMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Dark Mode Switch Card */}
                <div 
                  onClick={onToggleDark}
                  className="cursor-pointer p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        โหมดการแสดงผล (Theme)
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {isDark ? 'โหมดมืด (Dark Mode)' : 'โหมดสว่าง (Light Mode)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">
                    {isDark ? 'เปิด' : 'ปิด'}
                  </span>
                </div>

                {/* Font Family Selector Card */}
                {onChangeFontFamily && (
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Type className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                            รูปแบบตัวอักษร (Font Style)
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {fontFamily === 'ios' ? '📱 iOS Modern (ไม่มีหัว แบบ Apple)' : fontFamily === 'prompt' ? '🅰️ Prompt (โมเดิร์นคลีน)' : '💻 IBM Plex (คมชัดสูง)'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-xl">
                      <button
                        onClick={() => onChangeFontFamily('ios')}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all text-center ${
                          fontFamily === 'ios'
                            ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-300 shadow-xs ring-1 ring-black/5'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                        }`}
                      >
                        iOS Modern
                      </button>
                      <button
                        onClick={() => onChangeFontFamily('prompt')}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all text-center ${
                          fontFamily === 'prompt'
                            ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-300 shadow-xs ring-1 ring-black/5'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                        }`}
                      >
                        Prompt
                      </button>
                      <button
                        onClick={() => onChangeFontFamily('ibm')}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all text-center ${
                          fontFamily === 'ibm'
                            ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-300 shadow-xs ring-1 ring-black/5'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                        }`}
                      >
                        IBM Plex
                      </button>
                    </div>
                  </div>
                )}

                {/* Data Backup & Restore */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenDataManagement();
                  }}
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        ศูนย์จัดการและสำรองข้อมูล
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Backup / Restore ฐานข้อมูล รพ.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Lock Screen */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLockScreen();
                  }}
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        ล็อคหน้าจอ Passcode
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        รหัสผ่านปลดล็อค: 0723
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Sync & Export Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={onSync}
                    disabled={isSyncing}
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                    <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Cloud'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onExportCsv();
                    }}
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ส่งออก CSV</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{isOnline ? 'Firebase Cloud Connected' : 'Local Offline Mode'}</span>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenGitHubModal();
                  }}
                  className="hover:underline flex items-center space-x-1"
                >
                  <Github className="w-3 h-3" />
                  <span>GitHub & PDPA</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
