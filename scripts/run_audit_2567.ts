import fs from 'fs';
import { parseMatrixData } from '../src/lib/matrixParser';
import { normalizeDoctorName, resolveCoverage } from '../src/types';

const raw = fs.readFileSync('./scripts/raw_2567_to_audit.txt', 'utf8');

const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

let currentMonth = '';
const rows: any[] = [];
const anomalies: { type: string; month: string; lineNo: number; text: string; details: any }[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('รหัส') || line.startsWith(',,,,,UC') || line.startsWith(',,,,,30 บาท')) {
    continue;
  }
  if (/^[มกพตธ].*\.-67/.test(line)) {
    currentMonth = line.replace(/,.*$/, '').trim();
    continue;
  }

  // Parse CSV line
  // Note: Handle quotes in CSV
  const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
  const cols: string[] = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match.index === regex.lastIndex) regex.lastIndex++;
    cols.push((match[1] !== undefined ? match[1] : match[2] || '').trim());
  }
  // Trim trailing empty string if regex produced extra
  if (cols.length > 27) cols.splice(27);

  const seq = cols[0];
  const title = cols[1];
  const fname = cols[2];
  const lname = cols[3];
  const hn = cols[4];

  // 18 coverage columns: indices 5 to 22
  const covCols = cols.slice(5, 23);
  const doc = cols[23];
  const dateStr = cols[24];
  const service = cols[25];
  const labStr = cols[26];

  // Audit 1: Missing names or HN
  if (!hn || hn.length < 7) {
    anomalies.push({ type: 'HN_SUSPICIOUS', month: currentMonth, lineNo: i + 1, text: line, details: { hn, name: `${title} ${fname} ${lname}` } });
  } else if (hn.length > 9) {
    anomalies.push({ type: 'HN_TOO_LONG', month: currentMonth, lineNo: i + 1, text: line, details: { hn, length: hn.length, name: `${title} ${fname} ${lname}` } });
  }

  // Audit 2: Coverage columns
  const activeCovs = covCols.map((c, idx) => ({ idx, val: c })).filter(c => c.val !== '' && c.val !== undefined);
  if (activeCovs.length === 0) {
    anomalies.push({ type: 'NO_TREATMENT_FEE_OR_COVERAGE', month: currentMonth, lineNo: i + 1, text: line, details: { name: `${title} ${fname} ${lname}` } });
  } else if (activeCovs.length > 1) {
    anomalies.push({ type: 'MULTIPLE_COVERAGES', month: currentMonth, lineNo: i + 1, text: line, details: { activeCovs, name: `${title} ${fname} ${lname}` } });
  }

  // Audit 3: Lab cost
  const cleanLab = (labStr || '').replace(/,/g, '').trim();
  const labNum = parseFloat(cleanLab);
  if (isNaN(labNum)) {
    anomalies.push({ type: 'INVALID_LAB_COST', month: currentMonth, lineNo: i + 1, text: line, details: { labStr, name: `${title} ${fname} ${lname}` } });
  } else if (labNum < 0) {
    anomalies.push({ type: 'NEGATIVE_LAB_COST', month: currentMonth, lineNo: i + 1, text: line, details: { labNum, name: `${title} ${fname} ${lname}` } });
  } else if (labNum === 0) {
    anomalies.push({ type: 'ZERO_LAB_COST', month: currentMonth, lineNo: i + 1, text: line, details: { service, name: `${title} ${fname} ${lname}` } });
  }

  // Audit 4: Date check
  if (!dateStr) {
    anomalies.push({ type: 'MISSING_DATE', month: currentMonth, lineNo: i + 1, text: line, details: { name: `${title} ${fname} ${lname}` } });
  } else {
    const dparts = dateStr.split('/');
    if (dparts.length !== 3) {
      anomalies.push({ type: 'INVALID_DATE_FORMAT', month: currentMonth, lineNo: i + 1, text: line, details: { dateStr, name: `${title} ${fname} ${lname}` } });
    } else {
      const yr = parseInt(dparts[2], 10);
      if (yr === 2566) {
        anomalies.push({ type: 'DATE_YEAR_2566_IN_2567_FILE', month: currentMonth, lineNo: i + 1, text: line, details: { dateStr, name: `${title} ${fname} ${lname}` } });
      } else if (yr !== 2567) {
        anomalies.push({ type: 'DATE_UNEXPECTED_YEAR', month: currentMonth, lineNo: i + 1, text: line, details: { dateStr, name: `${title} ${fname} ${lname}` } });
      }
    }
  }

  // Audit 5: Doctor check
  const cleanDoc = normalizeDoctorName(doc);

  // Audit 6: Service / Denture type check
  if (!service) {
    anomalies.push({ type: 'MISSING_SERVICE', month: currentMonth, lineNo: i + 1, text: line, details: { name: `${title} ${fname} ${lname}` } });
  }

  rows.push({
    month: currentMonth,
    seq,
    fullName: `${title} ${fname} ${lname}`,
    hn,
    doc: cleanDoc,
    rawDoc: doc,
    dateStr,
    service,
    labNum,
    activeCovs
  });
}

console.log('=== AUDIT REPORT FOR YEAR 2567 DATA ===');
console.log('Total records parsed:', rows.length);

const monthCounts: Record<string, number> = {};
rows.forEach(r => {
  monthCounts[r.month] = (monthCounts[r.month] || 0) + 1;
});
console.log('Month counts:', monthCounts);

const docCounts: Record<string, number> = {};
rows.forEach(r => {
  docCounts[r.doc] = (docCounts[r.doc] || 0) + 1;
});
console.log('Doctor counts:', docCounts);

console.log('\n--- ANOMALIES & ISSUES FOUND (' + anomalies.length + ' issues) ---');
anomalies.forEach((a, i) => {
  console.log(`${i + 1}. [${a.type}] in ${a.month}: ${JSON.stringify(a.details)}`);
});
