/**
 * PDF Text Extraction Test Script
 * Tests the PDF "جوان و انتخاب بزرگ.pdf" to verify text extraction quality
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// Import normalization functions from parsers.ts (reimplemented for Node.js)
const FORM_B_TABLE = [
  [0xfe70, 2, 0x064b], [0xfe72, 1, 0x064c], [0xfe74, 1, 0x064d],
  [0xfe76, 2, 0x064e], [0xfe78, 2, 0x064f], [0xfe7a, 2, 0x0650],
  [0xfe7c, 2, 0x0651], [0xfe7e, 2, 0x0652],
  [0xfe80, 1, 0x0621], [0xfe81, 2, 0x0622], [0xfe83, 2, 0x0623],
  [0xfe85, 2, 0x0624], [0xfe87, 2, 0x0625], [0xfe89, 2, 0x0626],
  [0xfe8b, 2, 0x0627], [0xfe8d, 2, 0x0628], [0xfe8f, 2, 0x0629],
  [0xfe91, 4, 0x062a], [0xfe95, 4, 0x062b], [0xfe99, 4, 0x062c],
  [0xfe9d, 4, 0x062d], [0xfea1, 4, 0x062e], [0xfea5, 2, 0x062f],
  [0xfea7, 2, 0x0630], [0xfea9, 2, 0x0631], [0xfeab, 2, 0x0632],
  [0xfead, 4, 0x0633], [0xfeb1, 4, 0x0634], [0xfeb5, 4, 0x0635],
  [0xfeb9, 4, 0x0636], [0xfebd, 4, 0x0637], [0xfec1, 4, 0x0638],
  [0xfec5, 4, 0x0639], [0xfec9, 4, 0x063a],
  [0xfed1, 4, 0x0641], [0xfed5, 4, 0x0642], [0xfed9, 4, 0x0643],
  [0xfedd, 4, 0x0644], [0xfee1, 4, 0x0645], [0xfee5, 4, 0x0646],
  [0xfee9, 4, 0x0647], [0xfeed, 2, 0x0648], [0xfeef, 2, 0x0649],
  [0xfef1, 4, 0x064a],
];

const FORM_A_TABLE = [
  [0xfb50, 2, 0x0671], [0xfb52, 4, 0x067b], [0xfb56, 4, 0x067e],
  [0xfb5a, 4, 0x0680], [0xfb5e, 4, 0x0679], [0xfb62, 4, 0x067a],
  [0xfb66, 4, 0x067f], [0xfb6a, 4, 0x06a4], [0xfb6e, 4, 0x06a6],
  [0xfb72, 4, 0x0684], [0xfb76, 4, 0x0683], [0xfb7a, 4, 0x0686],
  [0xfb7e, 4, 0x0687], [0xfb82, 4, 0x068d], [0xfb86, 2, 0x068c],
  [0xfb8a, 2, 0x0698], [0xfb8c, 2, 0x0691], [0xfb8e, 4, 0x06a9],
  [0xfb92, 4, 0x06af], [0xfb96, 4, 0x06b3], [0xfb9a, 4, 0x06b1],
  [0xfb9e, 4, 0x06ba], [0xfba4, 4, 0x06c1], [0xfbae, 2, 0x06d2],
  [0xfbfc, 4, 0x06cc],
];

const FORM_LIGATURES = {
  0xfef5: '\u0644\u0627', 0xfef6: '\u0644\u0627',
  0xfef7: '\u0644\u0625', 0xfef8: '\u0644\u0625',
  0xfef9: '\u0644\u0623', 0xfefa: '\u0644\u0623',
  0xfefb: '\u0644\u0622', 0xfefc: '\u0644\u0622',
  0xfdf2: '\u0627\u0644\u0644\u0647',
  0xfdfc: '\u0631\u06cc\u0627\u0644',
  0xfdfd: '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u06cc\u0645',
};

let FORMS_MAP = null;
function formsMap() {
  if (!FORMS_MAP) {
    FORMS_MAP = new Map();
    for (const [start, count, base] of [...FORM_B_TABLE, ...FORM_A_TABLE]) {
      for (let i = 0; i < count; i++) FORMS_MAP.set(start + i, String.fromCodePoint(base));
    }
    for (const [cp, s] of Object.entries(FORM_LIGATURES)) FORMS_MAP.set(Number(cp), s);
  }
  return FORMS_MAP;
}

function normalizePdfText(s) {
  const map = formsMap();
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0) || 0;
    if (cp === 0x0640) continue;
    if (cp === 0x200d) continue;
    if (cp >= 0xe000 && cp <= 0xf8ff) continue;

    let mapped = map.get(cp);

    if (!mapped && ((cp >= 0xfe70 && cp <= 0xfeff) || (cp >= 0xfb50 && cp <= 0xfdff))) {
      const normalized = ch.normalize('NFKC');
      out += normalized;
      continue;
    }

    out += mapped ?? ch;
  }
  return out;
}

function repairMojibakeLine(line) {
  if (!/[\u0080-\u00FF]/.test(line)) return line;
  const bytes = [];
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    if (code > 0xff) return line;
    bytes.push(code);
  }
  const buf = new Uint8Array(bytes);
  for (const enc of ['utf-8', 'windows-1256']) {
    try {
      const dec = new TextDecoder(enc, { fatal: true }).decode(buf);
      if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(dec) && !dec.includes('\uFFFD')) return dec;
    } catch {
      /* try next */
    }
  }
  return line;
}

function repairMojibake(text) {
  return text.split('\n').map(repairMojibakeLine).join('\n');
}

// Quality check with custom font encoding detection
function arabicTextQualityEnhanced(text, rawText) {
  const tokens = text.split(/\s+/).filter(Boolean).map(normalizeArabicToken).filter((t) => t.length >= 2);
  if (tokens.length < 15) return tokens.length === 0 ? 0 : 0.5;

  // Check for custom font encoding
  if (rawText && hasCustomFontEncoding(rawText, text)) {
    return 0; // Force OCR fallback
  }

  let hits = 0;
  for (const t of tokens) if (COMMON_WORDS.has(t)) hits++;
  return hits / tokens.length;
}

function hasCustomFontEncoding(rawText, normalizedText) {
  // Count presentation forms in raw text
  const presentationForms = (rawText.match(/[\uFE70-\uFEFF]/g) || []).length;
  const totalChars = rawText.replace(/\s/g, '').length;

  if (totalChars < 100) return false;
  const presentationRatio = presentationForms / totalChars;

  // If more than 40% of chars are presentation forms, likely custom encoding
  if (presentationRatio < 0.4) return false;

  // Check if normalized text has proper Persian word structure
  const words = normalizedText.match(/[\u0600-\u06FF]{3,}/g) || [];
  if (words.length < 10) return false;

  // Check for proper word endings (more strict pattern)
  const properEndings = /(ی|ان|ها|تر|ترین|مان|تان|شان|گی|ین|ون|یان|ایی)$/;
  const wordsWithEndings = words.filter(w => properEndings.test(w));
  const endingRatio = wordsWithEndings.length / words.length;

  // Check for garbled text indicators
  // Garbled text often has words with too many consecutive consonants
  const garbledWords = words.filter(w => {
    const consonants = w.match(/[\u0621-\u063A\u0641-\u064A]/g) || [];
    return consonants.length >= 4;
  });
  const garbledRatio = garbledWords.length / words.length;

  // If many presentation forms and few proper endings, it's garbled
  return endingRatio < 0.15 || garbledRatio > 0.4;
}

/* =================================================================
   Quality check
   ================================================================= */

const COMMON_WORDS_RAW = [
  'انسان', 'مردم', 'جهان', 'دنیا', 'آخرت', 'زندگی', 'مرگ', 'حیات', 'روح', 'نفس', 'بدن', 'قلب', 'عقل', 'علم', 'جهل', 'ایمان', 'کفر', 'گناه', 'ثواب', 'خیر', 'شر', 'خوب', 'بد', 'زیبا', 'بزرگ', 'کوچک', 'زیاد', 'کم', 'روز', 'شب', 'سال', 'ماه', 'هفته', 'ساعت', 'امروز', 'فردا', 'دیروز', 'خدا', 'پروردگار', 'پیامبر', 'قرآن', 'نماز', 'روزه', 'دعا', 'صبر', 'شکر', 'توکل', 'اخلاق', 'رفتار', 'کردار', 'گفتار', 'کردن', 'شدن', 'بودن', 'داشتن', 'خواستن', 'توانستن', 'دانستن', 'دیدن', 'شنیدن', 'رفتن', 'آمدن', 'گرفتن', 'دادن', 'خانه', 'مدرسه', 'دانشگاه', 'مسجد', 'شهر', 'روستا', 'کشور', 'ایران', 'اسلام', 'مسلمان', 'مؤمن', 'کتاب', 'کتابخانه', 'نویسنده', 'نوشته', 'خواندن', 'خواننده', 'دانش', 'دانشمند', 'معلم', 'شاگرد', 'دانشجو', 'پدر', 'مادر', 'فرزند', 'جوان', 'پیر', 'مرد', 'زن', 'کودک', 'نوجوان', 'بزرگسال', 'دوست', 'دشمن', 'همسایه', 'جامعه', 'فرهنگ', 'تمدن', 'تاریخ', 'ادب', 'ادبیات', 'شعر', 'شاعر', 'نثر', 'هنر', 'کار', 'کوشش', 'تلاش', 'کوشش', 'امید', 'یأس', 'ناامیدی', 'شادی', 'غم', 'اندوه', 'رنج', 'درد', 'عشق', 'محبت', 'مهربانی', 'بخشش', 'گذشت', 'عدالت', 'ظلم', 'حق', 'باطل', 'حقیقت', 'واقعیت', 'آزادی', 'بردگی', 'انتخاب', 'اراده', 'تصمیم', 'عقل', 'فکر', 'اندیشه', 'تفکر', 'ذهن', 'معنا', 'مفهوم', 'هدف', 'مقصد', 'راه', 'مسیر', 'سفر', 'مسافرت', 'منزل', 'مقام', 'مرتبه', 'درجه', 'مرحله', 'قدم', 'گام',
  'في', 'من', 'على', 'إلى', 'عن', 'أن', 'إن', 'كان', 'لا', 'ما', 'هو', 'هي', 'هم', 'الذي', 'التي', 'الذين', 'هذا', 'هذه', 'ذلك', 'تلك', 'ثم', 'أو', 'بل', 'لكن', 'حتى', 'إذا', 'إذ', 'قد', 'لقد', 'مع', 'بين', 'عند', 'فوق', 'تحت', 'كل', 'بعض', 'غير', 'الله', 'رسول', 'قال', 'يقول', 'الناس', 'الإنسان', 'الدنيا', 'الآخرة', 'الجنة', 'يوم', 'علم', 'كتاب', 'قلب', 'روح', 'نفس', 'عقل', 'حق', 'باطل', 'خير', 'شر', 'كبير', 'صغير', 'كثير', 'قليل',
];

function normalizeArabicToken(w) {
  return w
    .replace(/[\u0640\u200c\u200d\ufeff]/g, '')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc]/g, '')
    .replace(/[.,،؛:;!؟?"'«»()[\]{}ـ–—…٪٪\d۰-۹]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ك/g, 'ک')
    .trim();
}

const COMMON_WORDS = new Set();
for (const w of COMMON_WORDS_RAW) {
  const n = normalizeArabicToken(w);
  if (n.length >= 2) COMMON_WORDS.add(n);
}

function arabicTextQuality(text) {
  const tokens = text.split(/\s+/).filter(Boolean).map(normalizeArabicToken).filter((t) => t.length >= 2);
  if (tokens.length < 15) return tokens.length === 0 ? 0 : 0.5;
  let hits = 0;
  for (const t of tokens) if (COMMON_WORDS.has(t)) hits++;
  return hits / tokens.length;
}

async function testPdf(pdfPath) {
  console.log('='.repeat(60));
  console.log('PDF Text Extraction Test');
  console.log('='.repeat(60));
  console.log(`\nFile: ${pdfPath}`);

  if (!fs.existsSync(pdfPath)) {
    console.error('\n❌ ERROR: File not found!');
    return;
  }

  const stats = fs.statSync(pdfPath);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);

  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(dataBuffer);
    const pdfParser = new PDFParse(uint8Array);
    const pdfData = await pdfParser.getText();

    console.log(`\n📄 PDF Info:`);
    console.log(`  Pages: ${pdfData.numpages}`);
    console.log(`  Title: ${pdfData.info?.Title || 'N/A'}`);
    console.log(`  Author: ${pdfData.info?.Author || 'N/A'}`);

    let rawText = pdfData.text;
    console.log(`\n📊 Raw Text Stats:`);
    console.log(`  Characters: ${rawText.length}`);
    console.log(`  Words: ${rawText.split(/\s+/).filter(Boolean).length}`);

    // Apply normalization
    const normalizedText = repairMojibake(normalizePdfText(rawText));

    console.log(`\n🔧 After Normalization:`);
    console.log(`  Characters: ${normalizedText.length}`);
    console.log(`  Words: ${normalizedText.split(/\s+/).filter(Boolean).length}`);

    // Quality check (original)
    const quality = arabicTextQuality(normalizedText);
    console.log(`\n✅ Quality Score: ${(quality * 100).toFixed(2)}%`);
    console.log(`   Threshold: 3.00%`);

    if (quality >= 0.03) {
      console.log(`   Result: ✅ PASSED - Text layer is readable Persian/Arabic`);
    } else if (quality >= 0.01) {
      console.log(`   Result: ⚠️ MARGINAL - May need OCR for better results`);
    } else {
      console.log(`   Result: ❌ FAILED - Text layer is broken, OCR recommended`);
    }

    // Quality check (enhanced with custom font detection)
    const enhancedQuality = arabicTextQualityEnhanced(normalizedText, rawText);
    console.log(`\n🔍 Enhanced Quality Score: ${(enhancedQuality * 100).toFixed(2)}%`);
    console.log(`   (with custom font encoding detection)`);

    if (enhancedQuality >= 0.03) {
      console.log(`   Result: ✅ PASSED - Text is readable`);
    } else if (enhancedQuality >= 0.01) {
      console.log(`   Result: ⚠️ MARGINAL - OCR recommended`);
    } else {
      console.log(`   Result: ❌ FAILED - Custom font encoding detected, OCR REQUIRED`);
    }

    // Show sample text
    console.log(`\n📝 Sample Text (first 500 chars):`);
    console.log('-'.repeat(60));
    const sample = normalizedText.slice(0, 500);
    console.log(sample);
    console.log('-'.repeat(60));

    // Show raw sample for comparison
    console.log(`\n📝 Raw Text Sample (first 300 chars):`);
    console.log('-'.repeat(60));
    console.log(rawText.slice(0, 300));
    console.log('-'.repeat(60));

    // Check for common issues
    console.log(`\n🔍 Diagnostics:`);

    const hasArabic = /[\u0600-\u06FF]/.test(normalizedText);
    console.log(`  Arabic script detected: ${hasArabic ? '✅' : '❌'}`);

    const hasMojibakePatterns = /Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|à|á|â|ã|ä|å|æ|ç|è|é|ê|ë/.test(rawText);
    console.log(`  Mojibake patterns: ${hasMojibakePatterns ? '⚠️ Found (attempting repair)' : '✅ None'}`);

    const hasPresentationForms = /[\uFE70-\uFEFF]/.test(rawText);
    console.log(`  Presentation forms: ${hasPresentationForms ? '✅ Found (normalizing)' : 'ℹ️ None'}`);

    // Check for Persian-specific characters that indicate proper Persian text
    const persianSpecific = /[\u067E\u0686\u0698\u06A9\u06AF\u06CC]/g;
    const persianSpecificCount = (normalizedText.match(persianSpecific) || []).length;
    console.log(`  Persian-specific chars (گ، چ، پ، ژ، ک، ی): ${persianSpecificCount}`);

    // Count presentation forms in raw text
    const presentationForms = (rawText.match(/[\uFE70-\uFEFF]/g) || []).length;
    const totalChars = rawText.replace(/\s/g, '').length;
    const presentationRatio = totalChars > 0 ? presentationForms / totalChars : 0;
    console.log(`  Presentation forms: ${presentationForms} (${(presentationRatio * 100).toFixed(1)}% of total)`);

    // Check what the raw text looks like for first few chars
    console.log(`\n  Raw text char codes (first 20):`);
    for (let i = 0; i < Math.min(20, rawText.length); i++) {
      const code = rawText.codePointAt(i);
      if (code > 0x80) {
        console.log(`    [${i}] U+${code.toString(16).toUpperCase().padStart(4, '0')} ${rawText[i]}`);
      }
    }

    // Check if text is actually readable Persian
    const persianWordPattern = /[\u0600-\u06FF]{3,}/g;
    const words = normalizedText.match(persianWordPattern) || [];
    const readableWords = words.filter(w => w.length >= 3 && w.length <= 20);
    console.log(`\n  Total words found: ${words.length}`);
    console.log(`  Words of normal length (3-20 chars): ${readableWords.length}`);

    // Check for garbled text patterns
    // In garbled text, we see unusual letter combinations
    const unusualPatterns = /[\u0621-\u063A]{5,}/g;
    const unusualWords = normalizedText.match(unusualPatterns) || [];
    const garbledIndicators = unusualWords.filter(w => {
      // Check if word has too many consecutive consonants (unusual in Persian)
      const consonants = w.match(/[\u0621-\u063A\u0641-\u064A]/g) || [];
      return consonants.length > 4;
    });
    console.log(`  Potentially garbled words: ${garbledIndicators.length}`);

    // Show some sample words
    if (readableWords.length > 0) {
      console.log(`\n  Sample words: ${readableWords.slice(0, 20).join('، ')}`);
    }

    // Final verdict
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FINAL VERDICT:`);

    const looksGarbled = enhancedQuality < 0.03 || hasCustomFontEncoding(rawText, normalizedText);

    if (enhancedQuality >= 0.03 && !looksGarbled) {
      console.log('✅ Text extraction SUCCESSFUL - Text is readable Persian');
      console.log('   The PDF Lab should display this text correctly.');
    } else {
      console.log('❌ Text extraction FAILED - Text is GARBLED/UNREADABLE');
      console.log('');
      console.log('   Root cause:');
      console.log('   - This PDF uses Arabic Presentation Forms (FE70-FEFF)');
      console.log('   - The font uses CUSTOM encoding (not Unicode standard)');
      console.log('   - Normalization maps them to wrong base characters');
      console.log('');
      console.log('   Example:');
      console.log('   Raw:        "ﺑﺰﺭگ ﺍﻧﺘﺨﺎﺏ ﻭ ﺟﻮﺍﻥ"');
      console.log('   Expected:   "بزرگ انتخاب و جوان"');
      console.log('   Got:        "تسسگ بنثذبة و حوبن"');
      console.log('');
      console.log('   Solution: OCR is REQUIRED for this PDF.');
      console.log('   The PDF Lab will automatically use OCR fallback.');
    }
    console.log('='.repeat(60));

    console.log(`\n${'='.repeat(60)}`);
    console.log('Test Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR during parsing:', error.message);
    console.error(error.stack);
  }
}

// Run the test
const pdfPath = path.resolve(__dirname, 'جوان و انتخاب بزرگ.pdf');
testPdf(pdfPath);
