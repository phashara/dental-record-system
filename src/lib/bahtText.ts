/**
 * Utility to convert numbers into Thai Baht text (คำอ่านภาษาไทย)
 * Example: 14200 -> "หนึ่งหมื่นสี่พันสองร้อยบาทถ้วน"
 * Example: 2575.30 -> "สองพันห้าร้อยเจ็ดสิบห้าบาทสามสิบสตางค์"
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertIntegerPart(numStr: string): string {
  if (!numStr || numStr === '0') return 'ศูนย์';

  let result = '';
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(i), 10);
    const pos = len - i - 1;

    if (pos >= 6 && pos % 6 === 0) {
      // Millions rollover
      if (digit !== 0) {
        if (pos % 6 === 0 && digit === 1 && len > 1 && i === len - 1) {
          result += 'เอ็ด';
        } else {
          result += THAI_DIGITS[digit];
        }
      }
      result += 'ล้าน';
      continue;
    }

    const unitPos = pos % 6;
    if (digit !== 0) {
      if (unitPos === 1) {
        // สิบ
        if (digit === 1) {
          result += 'สิบ';
        } else if (digit === 2) {
          result += 'ยี่สิบ';
        } else {
          result += THAI_DIGITS[digit] + 'สิบ';
        }
      } else if (unitPos === 0) {
        // หน่วย
        if (digit === 1 && len > 1 && numStr.charAt(i - 1) !== '0') {
          result += 'เอ็ด';
        } else {
          result += THAI_DIGITS[digit];
        }
      } else {
        result += THAI_DIGITS[digit] + THAI_UNITS[unitPos];
      }
    }
  }

  return result;
}

export function thaiBahtText(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'ศูนย์บาทถ้วน';
  }

  const num = Math.abs(Number(amount));
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const fixed = num.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  let bahtText = '';

  // Process millions if greater than 9,999,999
  if (integerPart.length > 6) {
    const millionsCount = Math.floor((integerPart.length - 1) / 6);
    let remaining = integerPart;
    for (let m = millionsCount; m >= 0; m--) {
      const chunkLen = remaining.length - m * 6;
      if (chunkLen > 0) {
        const chunk = remaining.slice(0, chunkLen);
        remaining = remaining.slice(chunkLen);
        bahtText += convertIntegerPart(chunk) + (m > 0 ? 'ล้าน' : '');
      }
    }
  } else {
    bahtText = convertIntegerPart(integerPart);
  }

  bahtText += 'บาท';

  if (decimalPart && decimalPart !== '00') {
    let satangText = '';
    const d1 = parseInt(decimalPart.charAt(0), 10);
    const d2 = parseInt(decimalPart.charAt(1), 10);

    if (d1 !== 0) {
      if (d1 === 1) {
        satangText += 'สิบ';
      } else if (d1 === 2) {
        satangText += 'ยี่สิบ';
      } else {
        satangText += THAI_DIGITS[d1] + 'สิบ';
      }
    }

    if (d2 !== 0) {
      if (d2 === 1 && d1 !== 0) {
        satangText += 'เอ็ด';
      } else {
        satangText += THAI_DIGITS[d2];
      }
    }

    bahtText += satangText + 'สตางค์';
  } else {
    bahtText += 'ถ้วน';
  }

  return bahtText;
}
