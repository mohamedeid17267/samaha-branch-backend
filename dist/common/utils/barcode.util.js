"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARABIC_TO_ENGLISH_KEY_MAP = void 0;
exports.convertArabicKeyboardToEnglish = convertArabicKeyboardToEnglish;
exports.cleanBarcode = cleanBarcode;
exports.ARABIC_TO_ENGLISH_KEY_MAP = {
    '\uFEF5': 'b',
    '\uFEF6': 'b',
    '\uFEF7': 'g',
    '\uFEF8': 'g',
    '\uFEF9': 't',
    '\uFEFA': 't',
    '\uFEFB': 'b',
    '\uFEFC': 'b',
    'لآ': 'b',
    'لأ': 'g',
    'لإ': 't',
    'لا': 'b',
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
function convertArabicKeyboardToEnglish(str) {
    if (!str)
        return '';
    let res = str.replace(/لآ|لأ|لإ|لا/g, (m) => exports.ARABIC_TO_ENGLISH_KEY_MAP[m] || m);
    let out = '';
    for (const ch of res) {
        out += exports.ARABIC_TO_ENGLISH_KEY_MAP[ch] !== undefined ? exports.ARABIC_TO_ENGLISH_KEY_MAP[ch] : ch;
    }
    return out;
}
function cleanBarcode(rawCode) {
    if (!rawCode)
        return '';
    return convertArabicKeyboardToEnglish(rawCode.trim()).toUpperCase();
}
//# sourceMappingURL=barcode.util.js.map