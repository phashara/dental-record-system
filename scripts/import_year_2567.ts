import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { parseMatrixData, splitLine, parseBatchMonthToYearMonth } from '../src/lib/matrixParser';
import { DentureRecord, normalizeDoctorName, resolveCoverage, classifyDentureType } from '../src/types';
import firebaseConfig from '../firebase-applet-config.json';

const MONTH_DAYS: Record<string, number> = {
  '01': 31, '02': 29, '03': 31, '04': 30, '05': 31, '06': 30,
  '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31
};

async function main() {
  const rawPath = path.join(process.cwd(), 'scripts', 'raw_2567_to_audit.txt');
  const rawText = fs.readFileSync(rawPath, 'utf8');

  const rawLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = rawLines.map(splitLine);

  let currentMonth = '';
  const parsedRecords: DentureRecord[] = [];

  for (let r = 0; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length === 0) continue;

    const firstCell = (cols[0] || '').trim();

    // Month row (e.g. ม.ค.-67, เม.ย.-67, ส.ค.-67, etc.)
    if (firstCell.includes('-67')) {
      currentMonth = firstCell.replace(/[,;]/g, '').trim();
      continue;
    }

    // Skip headers
    if (firstCell.startsWith('รหัส') || cols.join('').includes('30 บาท') || cols.join('').includes('UC')) {
      continue;
    }

    const seq = firstCell;
    const indexNum = parseInt(seq, 10);
    if (isNaN(indexNum)) continue;

    const title = cols[1] || '';
    const fname = cols[2] || '';
    const lname = cols[3] || '';
    const hn = (cols[4] || '').trim();
    const fullName = `${title}${fname} ${lname}`.trim() || title;

    // Tail columns: doctor, date, service, labCost
    // In our CSV, the last 4 columns are:
    // [..., Doctor, Insert Date, Service, Remark/LabCost]
    // Let's find Doctor by looking at where doctor name appears
    let docIdx = -1;
    for (let c = cols.length - 1; c >= 5; c--) {
      const val = cols[c].trim();
      if (['กนกวรรณ', 'สุนิษา', 'ศศิมนต์', 'บุณยาพร', 'วีรยา', 'วรียา'].some(d => val.includes(d))) {
        docIdx = c;
        break;
      }
    }

    if (docIdx === -1) {
      docIdx = cols.length - 4; // fallback
    }

    const rawDoctor = cols[docIdx] || '';
    const rawDate = cols[docIdx + 1] || '';
    const rawService = cols[docIdx + 2] || 'CD/CD';
    const rawLabStr = cols[docIdx + 3] || '0';

    const cleanDoctor = normalizeDoctorName(rawDoctor);
    const classified = classifyDentureType(rawService);

    // Clean lab cost: support negative, decimals, comma formatting
    let cleanLabStr = rawLabStr.replace(/,/g, '').trim();
    let labCost = parseFloat(cleanLabStr);
    if (isNaN(labCost)) labCost = 0;

    // Coverage columns are between index 5 and docIdx - 1
    const coverageHeaders = [
      '30 บาท', 'อสม/ครอบครัว อสม', 'ผู้พิการ', 'สอย.', 'ผู้นำศาสนา', 'ครอบครัวทหารผ่านศึก',
      'รายได้น้อย', 'บัตรผู้นำชุมชน', 'บัตรทองฟรี', 'ต้นสังกัด(ระบบจ่ายตรง)', 'เบิกจ่ายตรง กทม./อปท.',
      'พรบ.', 'เบิกต้นสังกัด/รัฐวิสาหกิจ', 'ชำระเงินเอง', 'ประกันสังคม', 'ฟรี', 'อื่นๆ 1', 'อื่นๆ 2'
    ];

    const activeCovs: { header: string; amount: number }[] = [];
    for (let c = 5; c < docIdx; c++) {
      const val = (cols[c] || '').replace(/[,\s"']/g, '');
      const amt = parseFloat(val);
      if (!isNaN(amt) && amt > 0) {
        const hName = coverageHeaders[c - 5] || 'UC';
        activeCovs.push({ header: hName, amount: amt });
      }
    }

    // Anchor Date to 2567 batch month
    const { year: bYear, month: bMonth } = parseBatchMonthToYearMonth(currentMonth);
    let day = 15;
    const dayMatch = rawDate.match(/^(\d{1,2})/);
    if (dayMatch) {
      const parsedDay = parseInt(dayMatch[1], 10);
      if (!isNaN(parsedDay) && parsedDay >= 1) {
        day = Math.min(MONTH_DAYS[bMonth] || 30, Math.max(1, parsedDay));
      }
    }
    const isoDate = `${bYear}-${bMonth}-${String(day).padStart(2, '0')}`;

    // CHECK DUAL COVERAGE CASE (ก.ค.-67 row 32, ด.ต.ยุทธนา)
    const isDual = currentMonth === 'ก.ค.-67' && seq === '32';
    if (isDual) {
      // Create 2 records as requested by user ("มีการลง 2 สิทธิในเคสเดียวกัน บอก 2 รายการ")
      // Item 1: จ่ายตรง 1,500
      const cov1 = resolveCoverage('ต้นสังกัด (ระบบจ่ายตรง)');
      const rec1: DentureRecord = {
        id: `rec-2567-${bMonth}-${String(seq).padStart(3, '0')}-A`,
        hn,
        patientName: fullName,
        age: '60',
        gender: 'ชาย',
        date: isoDate,
        doctor: cleanDoctor,
        dentureType: classified.code,
        denturePosition: classified.positionDesc,
        coverage: cov1.fullDisplay,
        coverageGroup: cov1.group,
        labCost: labCost, // 2150
        treatmentFee: 1500,
        diagnosis: 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
        status: 'เสร็จสิ้น (Completed)',
        source: `ทะเบียนเบิกจ่าย (${currentMonth})`,
        note: `งวด: ${currentMonth} ลำดับ: 32 (ส่วนที่ 1: สิทธิเบิกต้นสังกัด 1,500 บาท) | วันที่เดิม: ${rawDate} | ${rawService}`,
        createdAt: new Date().toISOString()
      };

      // Item 2: ชำระเอง 2,500
      const cov2 = resolveCoverage('ชำระเงินเอง');
      const rec2: DentureRecord = {
        id: `rec-2567-${bMonth}-${String(seq).padStart(3, '0')}-B`,
        hn,
        patientName: fullName,
        age: '60',
        gender: 'ชาย',
        date: isoDate,
        doctor: cleanDoctor,
        dentureType: classified.code,
        denturePosition: classified.positionDesc,
        coverage: cov2.fullDisplay,
        coverageGroup: cov2.group,
        labCost: 0,
        treatmentFee: 2500,
        diagnosis: 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
        status: 'เสร็จสิ้น (Completed)',
        source: `ทะเบียนเบิกจ่าย (${currentMonth})`,
        note: `งวด: ${currentMonth} ลำดับ: 32 (ส่วนที่ 2: ส่วนเกินชำระเอง 2,500 บาท) | วันที่เดิม: ${rawDate} | ${rawService}`,
        createdAt: new Date().toISOString()
      };

      parsedRecords.push(rec1, rec2);
      continue;
    }

    // Standard record
    let rawCovName = 'UC 30 บาท';
    let fee = 0;
    if (activeCovs.length > 0) {
      rawCovName = activeCovs[0].header;
      fee = activeCovs[0].amount;
    } else {
      if (currentMonth === 'มี.ค.-67' && seq === '32') {
        rawCovName = 'สอย.';
        fee = 0; // User confirmed: "ค่ารักษาตกหล่น ไม่เป็นไรอาจเป็นการซ่อม"
      }
    }

    const resolved = resolveCoverage(rawCovName);

    let extraNote = '';
    if (labCost < 0) {
      extraNote += ` [ปรับลดยอด/คืนเงินคนไข้: ${labCost.toLocaleString()} บาท]`;
    }
    if (rawDate.includes('2566')) {
      extraNote += ` [บันทึกย้อนหลัง วันที่รักษาเดิม: ${rawDate}]`;
    }

    const record: DentureRecord = {
      id: `rec-2567-${bMonth}-${String(seq).padStart(3, '0')}`,
      hn,
      patientName: fullName,
      age: '60',
      gender: title.includes('นาย') || title.includes('พระ') || title.includes('พ.อ.') || title.includes('ร.ต.') ? 'ชาย' : 'หญิง',
      date: isoDate,
      doctor: cleanDoctor,
      dentureType: classified.code,
      denturePosition: classified.positionDesc,
      coverage: resolved.fullDisplay,
      coverageGroup: resolved.group,
      labCost: labCost,
      treatmentFee: fee,
      diagnosis: 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
      status: 'เสร็จสิ้น (Completed)',
      source: `ทะเบียนเบิกจ่าย (${currentMonth})`,
      note: `งวดเดือน: ${currentMonth} ลำดับ: ${seq} | วันที่บันทึกเดิม: ${rawDate} | บริการ: ${rawService}${extraNote}`,
      createdAt: new Date().toISOString()
    };

    parsedRecords.push(record);
  }

  console.log(`Successfully parsed ${parsedRecords.length} records for Year 2567.`);

  // Load existing records from data/denture_records.json
  const localFile = path.join(process.cwd(), 'data', 'denture_records.json');
  let currentRecords: DentureRecord[] = [];
  if (fs.existsSync(localFile)) {
    const rawData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
    currentRecords = Array.isArray(rawData) ? rawData : (rawData.records || []);
  }

  console.log(`Existing records before 2567 import: ${currentRecords.length}`);
  // Keep records that are NOT 2024 (Keep 2023 / 2566 and 2026 / 2569)
  const keptRecords = currentRecords.filter(r => !r.date.startsWith('2024-'));
  console.log(`Kept records from other years: ${keptRecords.length}`);

  const combined = [...keptRecords, ...parsedRecords];
  fs.writeFileSync(localFile, JSON.stringify(combined, null, 2));
  console.log(`Saved ${combined.length} total records to ${localFile}`);

  // Push to Firestore
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    // Clean up any existing 2024 records from Firestore first
    console.log('Querying existing 2024 records in Firestore to replace cleanly...');
    const snap = await getDocs(collection(db, 'denture_records'));
    const toDelete: string[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.date && data.date.startsWith('2024-')) {
        toDelete.push(d.id);
      }
    });

    console.log(`Found ${toDelete.length} old 2024 records to remove.`);
    for (let i = 0; i < toDelete.length; i += 400) {
      const batch = writeBatch(db);
      toDelete.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'denture_records', id)));
      await batch.commit();
    }

    // Upload new 2567 records in batches of 400
    console.log(`Uploading ${parsedRecords.length} records of year 2567 to Firestore...`);
    for (let i = 0; i < parsedRecords.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = parsedRecords.slice(i, i + 400);
      chunk.forEach(r => batch.set(doc(db, 'denture_records', r.id), r));
      await batch.commit();
      console.log(`  Committed batch ${i + chunk.length} / ${parsedRecords.length}`);
    }

    console.log('✅ Firestore sync successfully completed for Year 2567!');
    process.exit(0);
  } catch (err) {
    console.error('Firestore upload failed:', err);
    process.exit(1);
  }
}

main();
