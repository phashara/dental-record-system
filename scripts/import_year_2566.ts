import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { normalizeDoctorName, resolveCoverage, DentureRecord } from '../src/types';
import firebaseConfig from '../firebase-applet-config.json';

const MONTH_MAP: Record<string, { num: string; days: number; name: string }> = {
  'มค66': { num: '01', days: 31, name: 'มกราคม 2566' },
  'กพ66': { num: '02', days: 28, name: 'กุมภาพันธ์ 2566' },
  'มีค66': { num: '03', days: 31, name: 'มีนาคม 2566' },
  'เมย66': { num: '04', days: 30, name: 'เมษายน 2566' },
  'พค66': { num: '05', days: 31, name: 'พฤษภาคม 2566' },
  'มิย66': { num: '06', days: 30, name: 'มิถุนายน 2566' },
  'กค66': { num: '07', days: 31, name: 'กรกฎาคม 2566' },
  'สค66': { num: '08', days: 31, name: 'สิงหาคม 2566' },
  'กย66': { num: '09', days: 30, name: 'กันยายน 2566' },
  'ตค66': { num: '10', days: 31, name: 'ตุลาคม 2566' },
  'พย66': { num: '11', days: 30, name: 'พฤศจิกายน 2566' },
  'ธค66': { num: '12', days: 31, name: 'ธันวาคม 2566' },
};

async function main() {
  const archivePath = path.join(process.cwd(), 'data', 'denture_records_archive_274.json');
  if (!fs.existsSync(archivePath)) {
    console.error('Archive file not found');
    process.exit(1);
  }

  const rawArchive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  const allArchive = rawArchive.records || rawArchive;
  const raw2566 = allArchive.filter((r: any) => r.note && r.note.includes('66'));

  console.log(`Found ${raw2566.length} records for year 2566 in archive.`);

  // Standardize 2566 records
  const standardized2566: DentureRecord[] = raw2566.map((r: any, idx: number) => {
    // Note format: "งวด มค66 ลำดับ 1"
    const noteParts = (r.note || '').split(' ');
    const mTag = noteParts[1] || 'มค66';
    const seq = noteParts[3] || String(idx + 1);
    const mInfo = MONTH_MAP[mTag] || { num: '01', days: 31, name: 'มกราคม 2566' };

    // Extract day from original date if possible
    let day = 15;
    if (r.date) {
      const parts = r.date.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d) && d >= 1) {
          day = Math.min(mInfo.days, Math.max(1, d));
        }
      }
    }

    const dateIso = `2023-${mInfo.num}-${String(day).padStart(2, '0')}`;
    const cleanDoc = normalizeDoctorName(r.doctor);
    const cov = resolveCoverage(r.coverage);

    return {
      id: `rec-2566-${mTag}-${String(seq).padStart(3, '0')}`,
      hn: r.hn,
      patientName: r.patientName,
      age: r.age ? String(r.age) : '60',
      gender: r.gender || (r.patientName.includes('นาง') || r.patientName.includes('น.ส.') ? 'หญิง' : 'ชาย'),
      date: dateIso,
      doctor: cleanDoc,
      dentureType: r.dentureType,
      denturePosition: r.denturePosition || (r.dentureType.includes('/') || r.dentureType === 'CD' ? 'บน-ล่าง' : 'ชิ้นเดียว'),
      coverage: cov.fullDisplay,
      coverageGroup: cov.group,
      labCost: Number(r.labCost) || 0,
      treatmentFee: Number(r.treatmentFee) || 0,
      diagnosis: r.diagnosis || 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
      status: 'เสร็จสิ้น (Completed)',
      source: `เวชระเบียน รพ.พยุหะคีรี (${mInfo.name})`,
      note: `งวด: ${mTag} ลำดับ: ${seq} | วันที่บันทึกเดิม: ${r.date}`,
      createdAt: new Date().toISOString()
    };
  });

  // Load existing database records
  const localFile = path.join(process.cwd(), 'data', 'denture_records.json');
  let currentRecords: DentureRecord[] = [];
  if (fs.existsSync(localFile)) {
    const parsed = JSON.parse(fs.readFileSync(localFile, 'utf8'));
    currentRecords = Array.isArray(parsed) ? parsed : (parsed.records || []);
  }

  // Keep non-2566 records (e.g. 2569)
  const non2566 = currentRecords.filter(r => !r.date.startsWith('2023-'));
  console.log(`Retaining ${non2566.length} existing records from other years (e.g. 2569).`);

  const combined = [...non2566, ...standardized2566];
  fs.writeFileSync(localFile, JSON.stringify(combined, null, 2));
  console.log(`Local denture_records.json written with ${combined.length} total records.`);

  // Sync to Firestore
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    // Delete previous 2023 records in Firestore to avoid stale IDs
    console.log('Querying existing Firestore records to clean up year 2023...');
    const snapshot = await getDocs(collection(db, 'denture_records'));
    const toDelete: string[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.date && data.date.startsWith('2023-')) {
        toDelete.push(docSnap.id);
      }
    });

    console.log(`Found ${toDelete.length} old 2023 records in Firestore to replace.`);
    // Delete in batches of 400
    for (let i = 0; i < toDelete.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = toDelete.slice(i, i + 400);
      for (const id of chunk) {
        batch.delete(doc(db, 'denture_records', id));
      }
      await batch.commit();
    }

    // Write new 206 records in batches of 400
    console.log(`Uploading ${standardized2566.length} standardized records to Firestore...`);
    for (let i = 0; i < standardized2566.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = standardized2566.slice(i, i + 400);
      for (const record of chunk) {
        batch.set(doc(db, 'denture_records', record.id), record);
      }
      await batch.commit();
      console.log(`  Committed batch chunk ${i + chunk.length}/${standardized2566.length}`);
    }

    console.log('✅ Firestore sync complete!');
    process.exit(0);
  } catch (err) {
    console.error('Firestore sync error:', err);
    process.exit(1);
  }
}

main();
