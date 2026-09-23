import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { parseMatrixData } from '../src/lib/matrixParser';
import firebaseConfig from '../firebase-applet-config.json';

const raw = `รหัส,ชื่อ-สกุล,,,HN,สิทธิการรักษา,,,,,,,,,,,,,,,,ทันตแพทย์,วันที่ Insert,ให้บริการ, หมายเหตุ  
,,,,,UC,,,,,,,,,ใช้สิทธิจ่ายตรง,,พรบ.,ชำระเงินเอง,,,อื่นๆ,,,,
,,,,,30 บาท,อสม/ครอบครัว อสม,ผู้พิการ,สอย.,ผู้นำศาสนา,ครอบครัวทหารผ่านศึก,รายได้น้อย, บัตรผู้นำชุมชน ,บัตรทองฟรี,ต้นสังกัด(ระบบจ่ายตรง),เบิกจ่ายตรง กทม./อปท.,พรบ. ,เบิกต้นสังกัด/รัฐวิสาหกิจ,ชำระเงินเอง,ประกันสังคม,ฟรี,,,,
ม.ค.-66,,,,,,,,,,,,,,,,,,,,,,,,
1,นาง,ประชุม,คณานนท์,530052167,,,," 4,450 ",,,,,,,,,,,,,กนกวรรณ,28/12/23,CD,"  2,660.90 "
2,นาง,ย้อย,คงหอม,610103523,,,," 4,450 ",,,,,,,,,,,,,กนกวรรณ,28/12/23,CD,"  2,575.30 "
3,นาย,สนั่น,ทองแท้,510038905,,,," 4,400 ",,,,,,,,,,,,,กนกวรรณ,16/1/23,CD,"  2,660.90 "
4,นาง,อรพินท์,เรืองสถาน,510036122,," 4,400 ",,,,,,,,,,,,,,,กนกวรรณ,17/1/23,CD,"  2,575.30 "
5,นาง,อรัญญา,ช่อรัก,630005532," 2,600 ",,,,,,,,,,,,,,,,กนกวรรณ,18/1/23,APD/APD,"  2,600.00 "
6,นาง,รำเพย,วงษ์บุญรอด,550065131,," 3,050 ",,,,,,,,,,,,,,,สุนิษา,5/1/22,APD/APD,"  1,256.18 "
7,นาง,จันเพ็ง,ทำนิน,530056588,,,,,,,,,," 3,000",,,,,,,ศศิมนต์,20/12/22,APD/APD,"  1,170.98 "
8,นาง,ฉันทจิต,วงศ์วัชรานนท์,570083312,,,,,,,,,," 3,000",,,,,,,ศศิมนต์,22/12/22,APD/APD,"  1,325.06 "
9,นาง,งามจิต,กลั่นทอง,490017706,,,,,,,,,, 550,,,,,,,วีรยา,22/12/22,APD/-,  300.00 
10,นาง,อรุณ,อินชู,490009088,,,,,,,,,,,,,, 450 ,,,วีรยา,29/12/22, ซ่อม ,  300.00 
11,นาย,ใย,สุ่มประดิษฐ์,490012136,,,,,,,,,,,,,, 500 ,,,บุณยาพร,22/12/22, ซ่อม ,  300.00 
12,นางสาว ,กิมวา,บุญส่ง,490015315,,,," 3,750 ",,,,,,,,,,,,,บุณยาพร,4/1/23,CD/TP,"  2,300.90 "
13,นาย,ไพฑูรย์,หอมจันทร์,490003587,,,,,,,,,," 4,050",,,,,,,บุณยาพร,9/1/23,APD/APD,"  2,099.74 "
14,นาง,ประเชิญ,เรืองบุตร,490012408,,,," 3,050 ",,,,,,,,,,,,,บุณยาพร,9/1/23,APD/APD,"  1,907.14 "
15,นาย,สุรพงษ์,โล่ห์ทวีมงคล,490014441,,,,,,,,,," 4,050",,,,,,,บุณยาพร,19/1/23,APD/APD,"  2,245.30 "`;

async function main() {
  const result = parseMatrixData(raw);
  const janRecords = result.months['ม.ค.-66'] || [];
  console.log(`Parsed ${janRecords.length} records for ม.ค.-66`);
  janRecords.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.patientName} (${r.hn}) -> Date: ${r.date} | Note: ${r.note}`);
  });

  // Update local file
  const localFile = path.join(process.cwd(), 'data', 'denture_records.json');
  let currentRecords: any[] = [];
  if (fs.existsSync(localFile)) {
    currentRecords = JSON.parse(fs.readFileSync(localFile, 'utf8'));
  }

  // Keep records that are NOT from previously imported ม.ค.-66
  const keptRecords = currentRecords.filter(r => !(r.source || '').includes('ม.ค.-66'));
  console.log(`Retaining ${keptRecords.length} records (e.g. Year 2569)`);

  const combined = [...keptRecords, ...janRecords];
  fs.writeFileSync(localFile, JSON.stringify(combined, null, 2));
  console.log(`Local JSON updated. Total records now: ${combined.length}`);

  // Push to Firestore
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    
    // First, delete any old rec-matrix records from Firestore if needed
    const oldJanRecords = currentRecords.filter(r => (r.source || '').includes('ม.ค.-66'));
    const deleteBatch = writeBatch(db);
    for (const oldR of oldJanRecords) {
      deleteBatch.delete(doc(db, 'denture_records', oldR.id));
    }
    await deleteBatch.commit();

    // Now write the new records
    const batch = writeBatch(db);
    for (const record of janRecords) {
      const ref = doc(db, 'denture_records', record.id);
      batch.set(ref, record);
    }

    await batch.commit();
    console.log(`Successfully committed ${janRecords.length} updated records to Firestore collection 'denture_records'!`);
    process.exit(0);
  } catch (err) {
    console.error('Firestore batch write error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
