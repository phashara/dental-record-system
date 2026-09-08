import { DentureRecord, resolveCoverage, maskPatientName, maskHN } from '../types';
import { thaiBahtText } from './bahtText';

const LOCAL_STORAGE_KEY = 'denture_records_cache_v3';
const OFFLINE_QUEUE_KEY = 'denture_offline_queue_v1';

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

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.syncQueueWithServer();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notify();
      });
    }
  }

  public static getInstance(): DentureStorageService {
    if (!DentureStorageService.instance) {
      DentureStorageService.instance = new DentureStorageService();
    }
    return DentureStorageService.instance;
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

  public async fetchAllRecords(): Promise<DentureRecord[]> {
    if (this.isOnlineStatus) {
      try {
        const res = await fetch('/api/records');
        if (res.ok) {
          const json = await res.json();
          const serverRecords: DentureRecord[] = (json.records || []).map((r: DentureRecord) => this.normalizeRecordCoverage(r));
          this.setLocalRecords(serverRecords);
          return serverRecords;
        }
      } catch (err) {
        console.warn('Network error fetching from server, falling back to local cache', err);
      }
    }
    return this.getLocalRecords();
  }

  public async saveRecord(record: DentureRecord): Promise<DentureRecord> {
    const local = this.getLocalRecords();
    const existingIndex = local.findIndex(r => r.id === record.id);

    if (existingIndex >= 0) {
      local[existingIndex] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      local.unshift({ ...record, createdAt: record.createdAt || new Date().toISOString() });
    }
    this.setLocalRecords(local);

    if (this.isOnlineStatus) {
      try {
        const method = existingIndex >= 0 ? 'PUT' : 'POST';
        const url = existingIndex >= 0 ? `/api/records/${record.id}` : '/api/records';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.record) {
            record = { ...record, ...data.record, synced: true };
            const updated = this.getLocalRecords().map(r => r.id === record.id ? { ...record, synced: true } : r);
            this.setLocalRecords(updated);
          }
        }
      } catch (err) {
        console.warn('Could not sync to server immediately, queued for later', err);
        this.addToOfflineQueue({ action: existingIndex >= 0 ? 'update' : 'create', record });
      }
    } else {
      this.addToOfflineQueue({ action: existingIndex >= 0 ? 'update' : 'create', record: { ...record, synced: false } });
    }

    return record;
  }

  public async saveBatchRecords(recordsToAdd: DentureRecord[]): Promise<void> {
    const current = this.getLocalRecords();
    const map = new Map(current.map(r => [r.id, r]));
    recordsToAdd.forEach(r => map.set(r.id, r));
    const combined = Array.from(map.values()).sort((a, b) => {
      return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
    });
    this.setLocalRecords(combined);

    if (this.isOnlineStatus) {
      try {
        await fetch('/api/records/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: recordsToAdd }),
        });
      } catch (e) {
        console.warn('Offline batch queued', e);
        recordsToAdd.forEach(r => this.addToOfflineQueue({ action: 'create', record: r }));
      }
    } else {
      recordsToAdd.forEach(r => this.addToOfflineQueue({ action: 'create', record: r }));
    }
  }

  public async deleteRecord(id: string): Promise<void> {
    const local = this.getLocalRecords().filter(r => r.id !== id);
    this.setLocalRecords(local);

    if (this.isOnlineStatus) {
      try {
        await fetch(`/api/records/${id}`, { method: 'DELETE' });
      } catch (e) {
        this.addToOfflineQueue({ action: 'delete', record: { id } as any });
      }
    } else {
      this.addToOfflineQueue({ action: 'delete', record: { id } as any });
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

  public async syncQueueWithServer(): Promise<number> {
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
            await fetch('/api/records', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.record),
            });
            syncedCount++;
          } else if (item.action === 'delete') {
            await fetch(`/api/records/${item.record.id}`, { method: 'DELETE' });
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
      console.error('Error syncing queue', e);
      return 0;
    }
  }

  public async batchAddRecords(incoming: DentureRecord[]): Promise<void> {
    const local = this.getLocalRecords();
    const map = new Map<string, DentureRecord>(local.map(r => [r.id, r]));
    incoming.forEach(item => {
      const normalized = this.normalizeRecordCoverage(item);
      map.set(normalized.id, normalized);
    });
    const updated = Array.from(map.values());
    this.setLocalRecords(updated);

    if (this.isOnlineStatus) {
      try {
        await fetch('/api/records/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: incoming }),
        });
      } catch (e) {
        console.warn('Could not sync batch to server', e);
      }
    }
  }

  public async resetToHospitalOfficialData(): Promise<DentureRecord[]> {
    try {
      const res = await fetch('/api/records?refresh=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const serverRecords: DentureRecord[] = (json.records || []).map((r: DentureRecord) => this.normalizeRecordCoverage(r));
        this.setLocalRecords(serverRecords);
        return serverRecords;
      }
    } catch (e) {
      console.error('Error reloading official data', e);
    }
    return this.getLocalRecords();
  }

  public async clearAllRecords(): Promise<void> {
    this.setLocalRecords([]);
    if (this.isOnlineStatus) {
      try {
        await fetch('/api/records/clear', { method: 'POST' });
      } catch (e) {
        console.warn('Could not clear server records', e);
      }
    }
  }

  public async restoreRetrospectiveArchive(): Promise<DentureRecord[]> {
    try {
      const res = await fetch('/api/records/restore-archive', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const serverRecords: DentureRecord[] = (json.records || []).map((r: DentureRecord) => this.normalizeRecordCoverage(r));
        this.setLocalRecords(serverRecords);
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
      : (filterOpts.startDate && filterOpts.endDate)
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

      // 3. สรุปผลเบื้องต้นกำกับแต่ละตาราง
      lines.push(`"================================================================================="`);
      lines.push(`"ตารางสิทธิการรักษา: ${covKey}"`);
      lines.push(`"สรุปผลเบื้องต้น: จำนวนผู้รับบริการ ${groupCount} ราย | รวมจำนวนเงิน ${groupAmount.toLocaleString('th-TH')} บาท | เฉลี่ย ${Number(groupAvg).toLocaleString('th-TH')} บาท/ราย | ทันตแพทย์: ${doctorSummary}"`);
      lines.push(`"---------------------------------------------------------------------------------"`);

      // 2. Table Columns requested by user:
      // ลำดับ | รหัส | ชื่อ - สกุล | HN | สิทธิการรักษา | ทันตแพทย์ | วัน Insert | จำนวนเงิน (บาท)
      lines.push(`"ลำดับ","รหัส","ชื่อ - สกุล","HN","สิทธิการรักษา","ทันตแพทย์","วัน Insert","จำนวนเงิน (บาท)"`);

      list.forEach((r, idx) => {
        const pName = anonymize ? maskPatientName(r.patientName || '') : (r.patientName || '');
        const pHn = anonymize ? maskHN(r.hn || '') : (r.hn || '');
        const rCode = r.id || `R${String(idx + 1).padStart(3, '0')}`;
        const amount = (r.treatmentFee || r.labCost || 0);

        lines.push([
          idx + 1,
          `"${rCode}"`,
          `"${pName.replace(/"/g, '""')}"`,
          `"${pHn}"`,
          `"${(r.coverage || covKey).replace(/"/g, '""')}"`,
          `"${(r.doctor || '').replace(/"/g, '""')}"`,
          `"${r.date || ''}"`,
          amount.toFixed(2)
        ].join(','));
      });

      // รวมจำนวนเงินแถวสุดท้ายพร้อมใส่ คำอ่าน
      lines.push([
        '""',
        '""',
        '""',
        '""',
        '""',
        `"รวมจำนวนเงิน ${covKey}"`,
        `"รวม ${groupCount} เคส"`,
        groupAmount.toFixed(2),
        `"คำอ่าน: ${bahtText}"`
      ].join(','));

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
    const dateSuffix = filterOpts.startDate && filterOpts.endDate 
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
