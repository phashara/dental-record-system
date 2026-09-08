import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TableView } from './components/TableView';
import { DoctorsView } from './components/DoctorsView';
import { LabCostSummaryView } from './components/LabCostSummaryView';
import { CameraScannerModal } from './components/CameraScannerModal';
import { RecordDetailModal } from './components/RecordDetailModal';
import { RecordFormModal } from './components/RecordFormModal';
import { GitHubAndPrivacyModal } from './components/GitHubAndPrivacyModal';
import { IPhoneLockScreen } from './components/IPhoneLockScreen';
import { DataManagementModal } from './components/DataManagementModal';
import { DentureRecord, ViewTab } from './types';
import { dentureStorage } from './lib/storage';
import {
  WifiOff,
  CheckCircle2,
  Layers,
  Users,
  DollarSign,
  Camera,
  FileText,
} from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<DentureRecord[]>([]);
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('denture_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // iPhone Style Passcode Lock (PIN 0723)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('denture_unlocked_0723') !== 'true';
    }
    return true;
  });

  // Data Management Modal State
  const [isDataManagementOpen, setIsDataManagementOpen] = useState<boolean>(false);

  // PDPA Privacy Mode State
  const [isPdpaMode, setIsPdpaMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('denture_pdpa_mode');
      return saved === 'true';
    }
    return false;
  });

  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(dentureStorage.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleUnlock = () => {
    sessionStorage.setItem('denture_unlocked_0723', 'true');
    setIsLocked(false);
    showToast('🔓 ปลดล็อคระบบสำเร็จ ยินดีต้อนรับสู่ระบบทะเบียนฟันปลอม');
  };

  const handleLock = () => {
    sessionStorage.removeItem('denture_unlocked_0723');
    setIsLocked(true);
  };

  const handleTogglePdpaMode = () => {
    setIsPdpaMode(prev => {
      const next = !prev;
      localStorage.setItem('denture_pdpa_mode', String(next));
      showToast(next ? '🛡️ เปิดโหมดคุ้มครองข้อมูล PDPA (ซ่อนชื่อและ HN)' : '👁️ ปิดโหมด PDPA (แสดงชื่อเต็ม)');
      return next;
    });
  };

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<DentureRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<DentureRecord | null>(null);

  // Doctor filter for TableView
  const [tableDoctorFilter, setTableDoctorFilter] = useState<string>('all');

  // Sync theme with DOM
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('denture_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('denture_theme', 'light');
    }
  }, [isDark]);

  // Subscribe to storage changes & initial fetch
  useEffect(() => {
    const unsubscribe = dentureStorage.subscribe((updatedRecords, onlineStatus) => {
      setRecords(updatedRecords);
      setIsOnline(onlineStatus);
    });

    dentureStorage.fetchAllRecords().then(initial => {
      setRecords(initial);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleToggleDark = () => {
    setIsDark(prev => !prev);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const count = await dentureStorage.syncQueueWithServer();
      const updated = await dentureStorage.fetchAllRecords();
      setRecords(updated);
      showToast(count > 0 ? `ซิงค์สำเร็จ ${count} รายการ` : 'ข้อมูลเป็นปัจจุบันแล้ว');
    } catch (e) {
      showToast('ไม่สามารถซิงค์ได้ในขณะนี้');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveRecordsFromScanner = async (newRecords: DentureRecord[]) => {
    await dentureStorage.saveBatchRecords(newRecords);
    const updated = dentureStorage.getLocalRecords();
    setRecords(updated);
    showToast(`บันทึกข้อมูลสำเร็จ ${newRecords.length} รายการ`);
    setCurrentTab('records');
  };

  const handleSaveSingleRecord = async (record: DentureRecord) => {
    await dentureStorage.saveRecord(record);
    const updated = dentureStorage.getLocalRecords();
    setRecords(updated);
    showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
  };

  const handleDeleteRecord = async (id: string) => {
    await dentureStorage.deleteRecord(id);
    const updated = dentureStorage.getLocalRecords();
    setRecords(updated);
    showToast('ลบรายการเรียบร้อยแล้ว');
  };

  const handleBatchDeleteRecords = async (ids: string[]) => {
    await dentureStorage.batchDeleteRecords(ids);
    const updated = dentureStorage.getLocalRecords();
    setRecords(updated);
    showToast(`ลบข้อมูลเรียบร้อยแล้ว ${ids.length} รายการ`);
  };

  const handleSelectDoctorFilter = (docName: string) => {
    setTableDoctorFilter(docName);
    setCurrentTab('records');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200 flex flex-col font-sans antialiased">
      {/* Offline Status Top Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4" />
          <span>
            ขณะนี้กำลังใช้งานในโหมดออฟไลน์ (Offline Mode) ข้อมูลจะถูกบันทึกไว้ในเครื่อง
            และซิงค์อัตโนมัติเมื่อต่ออินเทอร์เน็ต
          </span>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header & Navigation */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAddModal={() => {
          setEditingRecord(null);
          setIsAddModalOpen(true);
        }}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        isOnline={isOnline}
        onSync={handleSync}
        isSyncing={isSyncing}
        onExportCsv={() => dentureStorage.exportToCsv(isPdpaMode)}
        recordCount={records.length}
        isPdpaMode={isPdpaMode}
        onTogglePdpaMode={handleTogglePdpaMode}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenDataManagement={() => setIsDataManagementOpen(true)}
        onLockScreen={handleLock}
      />

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {currentTab === 'dashboard' && (
          <DashboardView
            records={records}
            onSelectDoctorFilter={handleSelectDoctorFilter}
            onViewRecord={r => setSelectedRecordForDetail(r)}
            onOpenScanner={() => setIsScannerOpen(true)}
            isPdpaMode={isPdpaMode}
          />
        )}

        {currentTab === 'records' && (
          <TableView
            records={records}
            onViewRecord={r => setSelectedRecordForDetail(r)}
            onEditRecord={r => {
              setEditingRecord(r);
              setIsAddModalOpen(true);
            }}
            onDeleteRecord={handleDeleteRecord}
            onBatchDeleteRecords={handleBatchDeleteRecords}
            selectedDoctorFilter={tableDoctorFilter}
            onClearDoctorFilter={() => setTableDoctorFilter('all')}
            onExportCsv={() => dentureStorage.exportToCsv(isPdpaMode)}
            isPdpaMode={isPdpaMode}
          />
        )}

        {currentTab === 'doctors' && (
          <DoctorsView
            records={records}
            onViewRecord={r => setSelectedRecordForDetail(r)}
            onFilterDoctorInTable={handleSelectDoctorFilter}
            isPdpaMode={isPdpaMode}
          />
        )}

        {currentTab === 'lab' && (
          <LabCostSummaryView
            records={records}
            onViewRecord={r => setSelectedRecordForDetail(r)}
            onExportCsv={() => dentureStorage.exportToCsv(isPdpaMode)}
            isPdpaMode={isPdpaMode}
          />
        )}
      </main>

      {/* Mobile iOS Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl bg-white/90 dark:bg-zinc-950/90 border-t border-zinc-200/70 dark:border-zinc-800/70 px-4 py-2">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              currentTab === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Layers className="w-5 h-5 mb-0.5" />
            <span>แดชบอร์ด</span>
          </button>

          <button
            onClick={() => setCurrentTab('records')}
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              currentTab === 'records'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>ทะเบียน</span>
          </button>

          {/* Quick Center Camera Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg active:scale-95 transition-transform"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCurrentTab('doctors')}
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              currentTab === 'doctors'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>หมอ 5 คน</span>
          </button>

          <button
            onClick={() => setCurrentTab('lab')}
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
              currentTab === 'lab'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <DollarSign className="w-5 h-5 mb-0.5" />
            <span>ค่าแลป</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveRecords={handleSaveRecordsFromScanner}
      />

      <RecordDetailModal
        record={selectedRecordForDetail}
        onClose={() => setSelectedRecordForDetail(null)}
        onEdit={r => {
          setSelectedRecordForDetail(null);
          setEditingRecord(r);
          setIsAddModalOpen(true);
        }}
        onDelete={handleDeleteRecord}
        isPdpaMode={isPdpaMode}
      />

      <RecordFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveSingleRecord}
        editingRecord={editingRecord}
      />

      <GitHubAndPrivacyModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        isPdpaMode={isPdpaMode}
        onTogglePdpaMode={handleTogglePdpaMode}
      />

      {/* Hospital Data Management Center Modal */}
      <DataManagementModal
        isOpen={isDataManagementOpen}
        onClose={() => setIsDataManagementOpen(false)}
        records={records}
        onRecordsUpdated={async () => {
          const up = dentureStorage.getLocalRecords();
          setRecords(up);
        }}
        onOpenLockScreen={handleLock}
      />

      {/* iPhone Passcode Lock Screen (Passcode: 0723) */}
      <IPhoneLockScreen isLocked={isLocked} onUnlock={handleUnlock} />
    </div>
  );
}
