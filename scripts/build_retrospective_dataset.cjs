const fs = require('fs');
const path = require('path');

// Helper to format date string like "16/1/23" or "28/12/23" or "4/4/66" or "15/1/67" into "YYYY-MM-DD"
function parseDate(dStr) {
  if (!dStr) return '2023-01-15';
  const clean = dStr.trim().replace(/\*/g, '');
  const parts = clean.split('/');
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Buddhist era year (e.g., 66 -> 2023, 67 -> 2024, 68 -> 2025, 69 -> 2026, 2566 -> 2023, 2567 -> 2024)
    if (year >= 2500) {
      year = year - 543;
    } else if (year >= 60 && year <= 99) {
      year = 2500 + year - 543;
    } else if (year < 50) {
      year = 2000 + year;
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  return '2023-01-15';
}

// Convert scientific HN like 5.3E+08 into clean hospital HN
function formatHn(rawHn, fallbackIndex) {
  if (!rawHn) return `4900${String(fallbackIndex).padStart(5, '0')}`;
  const str = String(rawHn).trim();
  if (str.includes('E+') || str.includes('e+')) {
    const num = Number(str);
    if (!isNaN(num)) {
      return String(Math.round(num));
    }
  }
  return str.replace(/\D/g, '') || `4900${String(fallbackIndex).padStart(5, '0')}`;
}

console.log('Script helper loaded');
