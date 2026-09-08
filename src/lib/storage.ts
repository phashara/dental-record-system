import { DentureRecord, resolveCoverage, maskPatientName, maskHN } from '../types';
import { thaiBahtText } from './bahtText';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'denture_records_cache_v4';
const OFFLINE_QUEUE_KEY = 'denture_offline_queue_v2';
const FIRESTORE_COLLECTION = 'denture_records';

export interface ExportFilterOptions {
  anonymize?: boolean;
  startDate?: string;
  endDate?: string;
  year?: string; // 'all', '2569', '2568', '2567', '2566', etc.
  month?: string; // 'all', '01'..'12'
  periodLabel?: string;
}

export class DentureStorageService {
  private static instance: DentureStorageService;
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: ((records: DentureRecord[], isOnline: boolean) => void)[] = [];
  private firestoreUnsubscribe: Unsubscribe | null = null;
  private isSeeding: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.syncQueueWithFirestore();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notify();
      });

      // Initialize real-time Cloud Firestore synchronization
      this.initFirestoreRealtimeListener();
    }
  }

  public static getInstance(): DentureStorageService {
    if (!DentureStorageService.instance) {
      DentureStorageService.instance = new DentureStorageService();
    }
    return DentureStorageService.instance;
  }

  // Setup real-time listener for Firestore collection
  private initFirestoreRealtimeListener() {
    try {
      if (this.firestoreUnsubscribe) {
        this.firestoreUnsubscribe();
      }

      const recordsCol = collection(db, FIRESTORE_COLLECTION);
      this.firestoreUnsubscribe = onSnapshot(
        recordsCol,
        snapshot => {
          if (!snapshot.empty) {
            const list: DentureRecord[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as DentureRecord;
              list.push(this.normalizeRecordCoverage({ ...data, id: data.id || docSnap.id }));
            });

            // Sort newest date / createdAt first
            list.sort((a, b) => {
              const tA = new Date(b.date || b.createdAt || 0).getTime();
              const tB = new Date(a.date || a.createdAt || 0).getTime();
              return tA - tB;
            });

            this.setLocalRecords(list);
          } else {
            // If firestore is empty, only seed if never initialized before
            const hasInit = localStorage.getItem('denture_initialized');
            const userCleared = localStorage.getItem('denture_user_cleared');
            if (!hasInit && !userCleared) {
              this.seedFirestoreFromInitialData();
            } else {
              this.setLocalRecords([]);
            }
          }
        },
        error => {
          console.warn('Firestore onSnapshot listener error:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, FIRESTORE_COLLECTION);
          } catch (e) {
            // Logged
          }
        }
      );
    } catch (err) {
      console.warn('Could not initialize Firestore real-time listener:', err);
    }
  }

  public subscribe(listener: (records: DentureRecord[], isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const records = this.getLocalRecords();
    this.listeners.forEach(cb => cb(records, this.isOnlineStatus));
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  // Normalizes coverage into the 5 specified categories & sub-items
  private normalizeRecordCoverage(r: DentureRecord): DentureRecord {
    const res = resolveCoverage(r.coverage);
    return {
      ...r,
      coverageGroup: r.coverageGroup || res.group,
      coverage: res.subItem,
    };
  }

  public getLocalRecords(): DentureRecord[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const parsed: DentureRecord[] = JSON.parse(data);
        return parsed.map(r => this.normalizeRecordCoverage(r));
      }
    } catch (e) {
      console.error('Error parsing local records', e);
    }
    return [];
  }

  public setLocalRecords(records: DentureRecord[]) {
    try {
      const normalized = records.map(r => this.normalizeRecordCoverage(r));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      this.notify();
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  // Fetch all records from Firestore (with fallbacks to API and local cache)
  public async fetchAllRecords(): Promise<DentureRecord[]> {
    if (this.isOnlineStatus) {
      try {
        const recordsCol = collection(db, FIRESTORE_COLLECTION);
        const snapshot = await getDocs(recordsCol);

        if (!snapshot.empty) {
          const list: DentureRecord[] = [];
          snapshot.forEach(d => {
            const r = d.data() as DentureRecord;
            list.push(this.normalizeRecordCoverage({ ...r, id: r.id || d.id }));
          });

          list.sort((a, b) => {
            const tA = new Date(b.date || b.createdAt || 0).getTime();
            const tB = new Date(a.date || a.createdAt || 0).getTime();
            return tA - tB;
          });

          this.setLocalRecords(list);
          return list;
        } else {
          // Firestore is currently empty, seed from official dataset
          return await this.seedFirestoreFromInitialData();
        }
      } catch (firestoreErr) {
        console.warn('Firestore fetch failed, checking server API fallback...', firestoreErr);
        try {
          handleFirestoreError(firestoreErr, OperationType.GET, FIRESTORE_COLLECTION);
        } catch (e) {
          // Fallback proceeds
        }

        try {
          const res = await fetch('/api/records');
          if (res.ok) {
            const json = await res.json();
            const serverRecords: DentureRecord[] = (json.records || []).map((r: DentureRecord) =>
              this.normalizeRecordCoverage(r)
            );
            this.setLocalRecords(serverRecords);
            return serverRecords;
          }
        } catch (apiErr) {
          console.warn('API fallback error:', apiErr);
        }
      }
    }
    return this.getLocalRecords();
  }

  // Seed Firestore if database is initially empty
  private async seedFirestoreFromInitialData(): Promise<DentureRecord[]> {
    if (this.isSeeding) return this.getLocalRecords();
    this.isSeeding = true;
    try {
      let seedData: DentureRecord[] = this.getLocalRecords();

      if (seedData.length === 0) {
        // Try to load initial seed from API or archive
        try {
          const res = await fetch('/api/records');
          if (res.ok) {
            const json = await res.json();
            seedData = (json.records || []).map((r: any) => this.normalizeRecordCoverage(r));
          }
        } catch (e) {
          // Ignored
        }
      }

      if (seedData.length > 0) {
        console.log(`Seeding ${seedData.length} records into Firebase Cloud Firestore...`);
        // Batch upload in chunks of 450 (Firestore limit is 500 ops per batch)
        const CHUNK_SIZE = 400;
        for (let i = 0; i < seedData.length; i += CHUNK_SIZE) {
          const chunk = seedData.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const itemRef = doc(db, FIRESTORE_COLLECTION, item.id);
            batch.set(itemRef, item);
          }
          await batch.commit();
        }
        console.log('Firebase Cloud Firestore initial seeding complete.');
      }
      return seedData;
    } catch (err) {
      console.warn('Seeding Firestore error:', err);
      return this.getLocalRecords();
    } finally {
      this.isSeeding = false;
    }
  }

  // Save or update record (Dual sync: LocalStorage + Firestore + API)
  public async saveRecord(record: DentureRecord): Promise<DentureRecord> {
    record = this.normalizeRecordCoverage(record);
    if (!record.id) {
      record.id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const local = this.getLocalRecords();
    const existingIndex = local.findIndex(r => r.id === record.id);

    const recordWithMeta: DentureRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      createdAt: record.createdAt || (existingIndex >= 0 ? local[existingIndex].createdAt : new Date().toISOString()),
      synced: false,
    };

    if (existingIndex >= 0) {
      local[existingIndex] = recordWithMeta;
    } else {
      local.unshift(recordWithMeta);
    }
    this.setLocalRecords(local);

    // Save directly to Firebase Firestore
    if (this.isOnlineStatus) {
      try {
        const docRef = doc(db, FIRESTORE_COLLECTION, recordWithMeta.id);
        await setDoc(docRef, { ...recordWithMeta, synced: true });

        // Update local status as synced
        const updated = this.getLocalRecords().map(r =>
          r.id === recordWithMeta.id ? { ...recordWithMeta, synced: true } : r
        );
        this.setLocalRecords(updated);
        recordWithMeta.synced = true;
      } catch (err) {
        console.warn('Firestore write failed, queuing for sync:', err);
        try {
          handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTION}/${recordWithMeta.id}`);
        } catch (e) {
          // Handled
        }
        this.addToOfflineQueue({
          action: existingIndex >= 0 ? 'update' : 'create',
          record: recordWithMeta,
        });
      }

      // Also notify local API server for backup
      try {
        fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordWithMeta),
        }).catch(() => {});
      } catch (e) {}
    } else {
      this.addToOfflineQueue({
        action: existingIndex >= 0 ? 'update' : 'create',
        record: recordWithMeta,
      });
    }

    return recordWithMeta;
  }

  // Save batch records (atomic Firestore batch)
  public async saveBatchRecords(recordsToAdd: DentureRecord[]): Promise<void> {
    const normalized = recordsToAdd.map(r => {
      const norm = this.normalizeRecordCoverage(r);
      if (!norm.id) {
        norm.id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      }
      return norm;
    });

    const current = this.getLocalRecords();
    const map = new Map(current.map(r => [r.id, r]));
    normalized.forEach(r => map.set(r.id, r));
    const combined = Array.from(map.values()).sort((a, b) => {
      return new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime();
    });
    this.setLocalRecords(combined);

    if (this.isOnlineStatus) {
      try {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < normalized.length; i += CHUNK_SIZE) {
          const chunk = normalized.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const itemRef = doc(db, FIRESTORE_COLLECTION, item.id);
            batch.set(itemRef, { ...item, synced: true });
          }
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore batch write failed, queuing for offline sync:', e);
        try {
          handleFirestoreError(e, OperationType.WRITE, FIRESTORE_COLLECTION);
        } catch (err) {}
        normalized.forEach(r => this.addToOfflineQueue({ action: 'create', record: r }));
      }

      // Backup to local API
      try {
        fetch('/api/records/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: normalized }),
        }).catch(() => {});
      } catch (e) {}
    } else {
      normalized.forEach(r => this.addToOfflineQueue({ action: 'create', record: r }));
    }
  }

  public async batchAddRecords(incoming: DentureRecord[]): Promise<void> {
    return this.saveBatchRecords(incoming);
  }

  // Delete record from Firestore and local cache
  public async deleteRecord(id: string): Promise<void> {
    localStorage.setItem('denture_initialized', 'true');
    const local = this.getLocalRecords().filter(r => r.id !== id);
    this.setLocalRecords(local);

    if (this.isOnlineStatus) {
      try {
        const docRef = doc(db, FIRESTORE_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Firestore delete failed:', e);
        try {
          handleFirestoreError(e, OperationType.DELETE, `${FIRESTORE_COLLECTION}/${id}`);
        } catch (err) {}
        this.addToOfflineQueue({ action: 'delete', record: { id } as any });
      }

      try {
        await fetch(`/api/records/${id}`, { method: 'DELETE' }).catch(() => {});
      } catch (e) {}
    } else {
      this.addToOfflineQueue({ action: 'delete', record: { id } as any });
    }
  }

  // Batch delete multiple records from Firestore and local cache
  public async batchDeleteRecords(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    localStorage.setItem('denture_initialized', 'true');
    const idSet = new Set(ids);
    const local = this.getLocalRecords().filter(r => !idSet.has(r.id));
    this.setLocalRecords(local);

    if (this.isOnlineStatus) {
      try {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            const docRef = doc(db, FIRESTORE_COLLECTION, id);
            batch.delete(docRef);
          });
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore batch delete failed:', e);
        ids.forEach(id => {
          this.addToOfflineQueue({ action: 'delete', record: { id } as any });
        });
      }

      // Also notify local API in one batch call
      try {
        await fetch('/api/records/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }).catch(() => {});
      } catch (e) {}
    } else {
      ids.forEach(id => {
        this.addToOfflineQueue({ action: 'delete', record: { id } as any });
      });
    }
  }

  private addToOfflineQueue(item: { action: 'create' | 'update' | 'delete'; record: DentureRecord }) {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push(item);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Error saving offline queue', e);
    }
  }

  public async syncQueueWithFirestore(): Promise<number> {
    try {
      const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueStr) return 0;
      const queue: { action: 'create' | 'update' | 'delete'; record: DentureRecord }[] = JSON.parse(queueStr);
      if (queue.length === 0) return 0;

      let syncedCount = 0;
      const remainingQueue = [];

      for (const item of queue) {
        try {
          if (item.action === 'create' || item.action === 'update') {
            await setDoc(doc(db, FIRESTORE_COLLECTION, item.record.id), {
              ...item.record,
              synced: true,
            });
            syncedCount++;
          } else if (item.action === 'delete') {
            await deleteDoc(doc(db, FIRESTORE_COLLECTION, item.record.id));
            syncedCount++;
          }
        } catch (e) {
          remainingQueue.push(item);
        }
      }

      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
      await this.fetchAllRecords();
      return syncedCount;
    } catch (e) {
      console.error('Error syncing queue with Firestore', e);
      return 0;
    }
  }

  public async syncQueueWithServer(): Promise<number> {
    return this.syncQueueWithFirestore();
  }

  public async resetToHospitalOfficialData(): Promise<DentureRecord[]> {
    return this.restoreRetrospectiveArchive();
  }

  public async clearAllRecords(): Promise<void> {
    localStorage.setItem('denture_user_cleared', 'true');
    localStorage.setItem('denture_initialized', 'true');
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    this.setLocalRecords([]);

    if (this.isOnlineStatus) {
      try {
        const snap = await getDocs(collection(db, FIRESTORE_COLLECTION));
        const docs = snap.docs;
        const CHUNK_SIZE = 400;
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore clear error', e);
      }

      try {
        await fetch('/api/records/clear', { method: 'POST' }).catch(() => {});
      } catch (e) {}
    }
  }

  public async restoreRetrospectiveArchive(): Promise<DentureRecord[]> {
    try {
      const res = await fetch('/api/records/restore-archive', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const serverRecords: DentureRecord[] = (json.records || []).map((r: DentureRecord) =>
          this.normalizeRecordCoverage(r)
        );
        this.setLocalRecords(serverRecords);

        // Upload to Cloud Firestore
        await this.saveBatchRecords(serverRecords);
        return serverRecords;
      }
    } catch (e) {
      console.error('Error restoring archive', e);
    }
    return this.getLocalRecords();
  }

  public exportToJson(): void {
    const records = this.getLocalRecords();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `denture_records_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public exportToCsv(options: boolean | ExportFilterOptions = false): void {
    const anonymize = typeof options === 'boolean' ? options : !!options.anonymize;
    const filterOpts: ExportFilterOptions = typeof options === 'object' ? options : {};

    let records = this.getLocalRecords();

    // Date / Period filtering
    if (filterOpts.startDate && filterOpts.endDate) {
      records = records.filter(r => {
        if (!r.date) return false;
        return r.date >= filterOpts.startDate! && r.date <= filterOpts.endDate!;
      });
    } else if (filterOpts.year && filterOpts.year !== 'all') {
      const bYear = parseInt(filterOpts.year, 10);
      const cYear = bYear > 2500 ? bYear - 543 : bYear;
      records = records.filter(r => r.date && r.date.startsWith(String(cYear)));
    }

    if (filterOpts.month && filterOpts.month !== 'all') {
      records = records.filter(r => {
        if (!r.date) return false;
        const parts = r.date.split('-');
        return parts[1] === filterOpts.month;
      });
    }

    // Group records by Coverage
    const grouped: Record<string, DentureRecord[]> = {};
    records.forEach(r => {
      const covKey = r.coverage || r.coverageGroup || 'สิทธิอื่นๆ';
      if (!grouped[covKey]) {
        grouped[covKey] = [];
      }
      grouped[covKey].push(r);
    });

    const lines: string[] = [];
    let grandTotalAmount = 0;
    let grandTotalCount = 0;

    // Report Header
    const periodText = filterOpts.periodLabel
      ? filterOpts.periodLabel
      : filterOpts.startDate && filterOpts.endDate
      ? `ระหว่างวันที่ ${filterOpts.startDate} ถึง ${filterOpts.endDate}`
      : filterOpts.year && filterOpts.year !== 'all'
      ? `ประจำปี พ.ศ. ${filterOpts.year}`
      : 'ข้อมูลทั้งหมด (All Records)';

    lines.push(`"รายงานทะเบียนผู้ป่วยฟันปลอม จำแนกแยกตามสิทธิการรักษา - โรงพยาบาลพยุหะคีรี"`);
    lines.push(`"ช่วงเวลาข้อมูลที่เลือกส่งออก: ${periodText}"`);
    lines.push(`"วันที่พิมพ์รายงาน: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}"`);
    lines.push(`"โหมดรายงาน: ${anonymize ? 'นิรนาม (PDPA De-identified)' : 'ฉบับสมบูรณ์สำหรับโรงพยาบาล'}"`);
    lines.push('');

    // Iterate through each coverage group
    Object.keys(grouped).sort().forEach(covKey => {
      const list = grouped[covKey];
      const groupCount = list.length;
      const groupAmount = list.reduce((sum, r) => sum + (r.treatmentFee || r.labCost || 0), 0);
      const groupAvg = groupCount > 0 ? (groupAmount / groupCount).toFixed(2) : '0';
      const bahtText = thaiBahtText(groupAmount);

      grandTotalCount += groupCount;
      grandTotalAmount += groupAmount;

      // Doctor list for this group
      const docSet = new Set(list.map(r => r.doctor).filter(Boolean));
      const doctorSummary = Array.from(docSet).join(', ') || 'ไม่ระบุ';

      // สรุปผลเบื้องต้นกำกับแต่ละตาราง
      lines.push(`"================================================================================="`);
      lines.push(`"ตารางสิทธิการรักษา: ${covKey}"`);
      lines.push(
        `"สรุปผลเบื้องต้น: จำนวนผู้รับบริการ ${groupCount} ราย | รวมจำนวนเงิน ${groupAmount.toLocaleString(
          'th-TH'
        )} บาท | เฉลี่ย ${Number(groupAvg).toLocaleString('th-TH')} บาท/ราย | ทันตแพทย์: ${doctorSummary}"`
      );
      lines.push(`"---------------------------------------------------------------------------------"`);

      // Table Columns requested by user:
      // ลำดับ | รหัส | ชื่อ - สกุล | HN | สิทธิการรักษา | ทันตแพทย์ | วัน Insert | จำนวนเงิน (บาท)
      lines.push(`"ลำดับ","รหัส","ชื่อ - สกุล","HN","สิทธิการรักษา","ทันตแพทย์","วัน Insert","จำนวนเงิน (บาท)"`);

      list.forEach((r, idx) => {
        const pName = anonymize ? maskPatientName(r.patientName || '') : r.patientName || '';
        const pHn = anonymize ? maskHN(r.hn || '') : r.hn || '';
        const rCode = r.id || `R${String(idx + 1).padStart(3, '0')}`;
        const amount = r.treatmentFee || r.labCost || 0;

        lines.push(
          [
            idx + 1,
            `"${rCode}"`,
            `"${pName.replace(/"/g, '""')}"`,
            `"${pHn}"`,
            `"${(r.coverage || covKey).replace(/"/g, '""')}"`,
            `"${(r.doctor || '').replace(/"/g, '""')}"`,
            `"${r.date || ''}"`,
            amount.toFixed(2),
          ].join(',')
        );
      });

      // รวมจำนวนเงินแถวสุดท้ายพร้อมใส่ คำอ่าน
      lines.push(
        [
          '""',
          '""',
          '""',
          '""',
          '""',
          `"รวมจำนวนเงิน ${covKey}"`,
          `"รวม ${groupCount} เคส"`,
          groupAmount.toFixed(2),
          `"คำอ่าน: ${bahtText}"`,
        ].join(',')
      );

      lines.push('');
    });

    // Grand Total Section
    lines.push(`"================================================================================="`);
    lines.push(`"สรุปผลรวมทุกสิทธิการรักษา"`);
    lines.push(`"จำนวนผู้รับบริการทั้งหมด: ${grandTotalCount} ราย"`);
    lines.push(`"รวมจำนวนเงินทั้งสิ้น: ${grandTotalAmount.toLocaleString('th-TH')} บาท"`);
    lines.push(`"คำอ่านจำนวนเงินรวมทั้งสิ้น: ${thaiBahtText(grandTotalAmount)}"`);
    lines.push(`"================================================================================="`);

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = anonymize ? 'รายงานฟันปลอม_แยกตามสิทธิ_PDPA' : 'รายงานฟันปลอม_แยกตามสิทธิ_รพ';
    const dateSuffix =
      filterOpts.startDate && filterOpts.endDate
        ? `${filterOpts.startDate}_ถึง_${filterOpts.endDate}`
        : filterOpts.year && filterOpts.year !== 'all'
        ? `ปี_${filterOpts.year}`
        : new Date().toISOString().split('T')[0];
    a.download = `${prefix}_${dateSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const dentureStorage = DentureStorageService.getInstance();
