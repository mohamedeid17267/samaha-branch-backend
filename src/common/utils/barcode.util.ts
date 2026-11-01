/**
 * Barcode & Keyboard Layout Normalization Utility for Slasel ERP Backend
 */

export const ARABIC_TO_ENGLISH_KEY_MAP: Record<string, string> = {
  // Unicode ligatures
  '\uFEF5': 'b',
  '\uFEF6': 'b',
  '\uFEF7': 'g',
  '\uFEF8': 'g',
  '\uFEF9': 't',
  '\uFEFA': 't',
  '\uFEFB': 'b',
  '\uFEFC': 'b',

  // Multi-character sequences
  'لآ': 'b',
  'لأ': 'g',
  'لإ': 't',
  'لا': 'b',

  // Lowercase / unshifted letters
  'ض': 'q',
  'ص': 'w',
  'ث': 'e',
  'ق': 'r',
  'ف': 't',
  'غ': 'y',
  'ع': 'u',
  'ه': 'i',
  'خ': 'o',
  'ح': 'p',
  'ج': '[',
  'د': ']',
  'ش': 'a',
  'س': 's',
  'ي': 'd',
  'ب': 'f',
  'ل': 'g',
  'ا': 'h',
  'ت': 'j',
  'ن': 'k',
  'م': 'l',
  'ك': ';',
  'ط': "'",
  'ئ': 'z',
  'ء': 'x',
  'ؤ': 'c',
  'ر': 'v',
  'ى': 'n',
  'ة': 'm',
  'و': ',',
  'ز': '.',
  'ظ': '/',
  'ذ': '`',

  // Shifted letters / diacritics
  'َ': 'q',
  'ً': 'w',
  'ُ': 'e',
  'ٌ': 'r',
  'إ': 'y',
  '‘': 'u',
  '÷': 'i',
  '×': 'o',
  '؛': 'p',
  'ِ': 'a',
  'ٍ': 's',
  'أ': 'h',
  'ـ': 'j',
  '،': 'k',
  'ْ': 'x',
  'آ': 'n',
  '’': 'm',
  '؟': '?',

  // Arabic-Indic Numerals
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',

  // Eastern Arabic-Indic Numerals
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

export function convertArabicKeyboardToEnglish(str: string): string {
  if (!str) return '';
  let res = str.replace(/لآ|لأ|لإ|لا/g, (m) => ARABIC_TO_ENGLISH_KEY_MAP[m] || m);
  let out = '';
  for (const ch of res) {
    out += ARABIC_TO_ENGLISH_KEY_MAP[ch] !== undefined ? ARABIC_TO_ENGLISH_KEY_MAP[ch] : ch;
  }
  return out;
}

export function cleanBarcode(rawCode: string): string {
  if (!rawCode) return '';
  return convertArabicKeyboardToEnglish(rawCode.trim()).toUpperCase();
}

