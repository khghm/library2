import type { Chapter, Para } from './core';
import { readingWords } from './core';

/* ================================================================== */
/*  Text noise cleaning                                                */
/* ================================================================== */

const ALWAYS_NOISE = /[#*_|\\+^~`$]/g;

export function cleanNoise(input: string): string {
  let t = input;
  t = t.replace(ALWAYS_NOISE, '');
  t = t.replace(/([\p{L}\p{N}])\/{2,}(?=[\p{L}\p{N}])/gu, '$1/');
  t = t.replace(/(^|[^\p{L}\p{N}])\/+(?=[\p{L}\p{N}])/gu, '$1');
  t = t.replace(/\/+(?![\p{L}\p{N}])/gu, '');
  t = t.replace(/-{2,}/g, '');
  t = t.replace(/(^|[^\p{L}\p{N}])-+(?=[\p{L}\p{N}])/gu, '$1');
  t = t.replace(/-+(?![\p{L}\p{N}])/gu, '');
  t = t.replace(/!{2,}/g, '!');
  t = t.replace(/(^|[^\p{L}\p{N}])!+/gu, '$1');
  t = t.replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

export function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.length <= 3 && /^[۰-۹0-9.,،·\s]+$/.test(t)) return true;
  return /^[\s#*_|\\/+\-$!؟?~^`.,:;=•·…]+$/.test(t);
}

function finalize(chapters: Chapter[], clean: boolean): Chapter[] {
  if (!clean) return chapters.filter((c) => c.paras.length > 0);
  return chapters
    .map((c) => ({
      title: cleanNoise(c.title) || c.title,
      paras: c.paras
        .map((p) => ({ ...p, text: cleanNoise(p.text) }))
        .filter((p) => p.text.replace(/\s+/g, '').length > 0),
    }))
    .filter((c) => c.paras.length > 0);
}

/* ================================================================== */
/*  Heading detection                                                  */
/* ================================================================== */

const SOLO_HEADINGS =
  /^(مقدمه|پیشگفتار|درآمد|سرآغاز|دیباچه|آغاز|خاتمه|مؤخره|سخن پایانی|پیوست|پیوست‌ها|منابع|مآخذ|فهرست مطالب|فهرست|یادداشت مؤلف|یادداشت مترجم|دربارهٔ مؤلف|درباره مؤلف)$/;

const SECTION_WORDS = /^(فصل|بخش|باب|قسمت|پرده|گفتار|مجلس|درس|مقاله)\s+/;
const LATIN_SECTIONS = /^(chapter|part|preface|introduction|appendix|book|section)\s*[.:ـ]?\s*/i;
const NUMBERED = /^[([]?\s*[۰-۹0-9]+\s*[.):ـ\-–—]\s*\p{L}/u;
const ROMAN = /^\(?[IVXLC]+\)?\s*[.):]?\s*$/;

function textHeading(t: string): boolean {
  if (!t || t.length > 60) return false;
  return (
    SECTION_WORDS.test(t) ||
    SOLO_HEADINGS.test(t) ||
    LATIN_SECTIONS.test(t) ||
    NUMBERED.test(t) ||
    ROMAN.test(t)
  );
}

function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (/^#{1,4}\s/.test(t)) return true;
  return textHeading(t);
}

function stripMdHeading(line: string): string {
  return line.trim().replace(/^#{1,4}\s+/, '').replace(/[*_`]/g, '');
}

export function isGenericTitle(title: string): boolean {
  return title === 'متن کتاب' || title === 'آغاز کتاب';
}

/* ================================================================== */
/*  Plain text / markdown / html → chapters                            */
/* ================================================================== */

export function textToChapters(raw: string, clean = true): Chapter[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let buffer: string[] = [];

  const flushPara = () => {
    if (buffer.length && current) {
      const text = buffer.join('\n').trim();
      if (text) {
        const parts = text.split('\n');
        const isVerse = parts.length > 1 && parts.length <= 14 && parts.every((l) => l.trim().length < 45);
        current.paras.push({ text, k: isVerse ? 'v' : 'p' });
      }
      buffer = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (looksLikeHeading(t)) {
      flushPara();
      current = { title: stripMdHeading(t).slice(0, 60), paras: [] };
      chapters.push(current);
      continue;
    }
    if (!t || (clean && isNoiseLine(line))) {
      flushPara();
      continue;
    }
    if (!current) {
      current = { title: 'آغاز کتاب', paras: [] };
      chapters.push(current);
    }
    buffer.push(t);
  }
  flushPara();

  const out = chapters.filter((c) => c.paras.length > 0);
  if (out.length === 0) {
    const body = clean ? cleanNoise(raw) : raw.trim();
    return [{ title: 'متن کتاب', paras: [{ text: body || '—', k: 'p' }] }];
  }
  return finalize(out, clean);
}

export function inlineMd(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--pg-line);padding:0 .3em;border-radius:4px">$1</code>');
}

export function mdToChapters(md: string, clean = true): Chapter[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!current) return;
    const text = buffer.join('\n').trim();
    if (text) {
      const parts = text.split(/\n{2,}/);
      for (const part of parts) {
        const t = part.trim();
        if (!t) continue;
        let k: Para['k'] = 'p';
        if (t.startsWith('> ')) k = 'q';
        else if (/^[-•]\s/.test(t) || t.split('\n').every((l) => /^[-•]\s/.test(l.trim()))) k = 'li';
        current.paras.push({ text: t.replace(/^>\s?/gm, '').replace(/^[-•]\s/gm, ''), k });
      }
    }
    buffer = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (/^#{1,4}\s/.test(t)) {
      flush();
      current = { title: stripMdHeading(t).slice(0, 60), paras: [] };
      chapters.push(current);
      continue;
    }
    if (clean && isNoiseLine(line)) {
      flush();
      continue;
    }
    if (!current) {
      current = { title: 'آغاز کتاب', paras: [] };
      chapters.push(current);
    }
    buffer.push(line);
  }
  flush();
  const out = chapters.filter((c) => c.paras.length > 0);
  if (out.length === 0) {
    const body = clean ? cleanNoise(md) : md.trim();
    return [{ title: 'متن کتاب', paras: [{ text: body || '—', k: 'p' }] }];
  }
  return finalize(out, clean);
}

function isBoldHeading(el: Element): boolean {
  const text = (el.textContent || '').trim();
  if (!text || text.length > 60) return false;
  const strong = el.querySelector('strong, b');
  return !!strong && text === (strong.textContent || '').trim() && el.children.length <= 2;
}

export function htmlToChapters(html: string, clean = true): Chapter[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;

  const ensure = () => {
    if (!current) {
      current = { title: 'آغاز کتاب', paras: [] };
      chapters.push(current);
    }
    return current;
  };

  const addHeading = (raw: string) => {
    const title = stripMdHeading(raw).replace(/\s+/g, ' ').slice(0, 60);
    current = { title: title || 'بخش بدون عنوان', paras: [] };
    chapters.push(current);
  };

  const hasRealHeadings = !!body.querySelector('h1, h2, h3, h4, h5, h6');

  const walk = (root: Element) => {
    Array.from(root.children).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim();
      if (/^h[1-6]$/.test(tag)) {
        if (text) addHeading(text);
      } else if (tag === 'p') {
        if (!text) return;
        if (!hasRealHeadings && (textHeading(text) || isBoldHeading(el))) {
          addHeading(text);
        } else {
          ensure().paras.push({ text, k: 'p' });
        }
      } else if (tag === 'div' || tag === 'blockquote' || tag === 'section' || tag === 'article') {
        if (text) ensure().paras.push({ text, k: tag === 'blockquote' ? 'q' : 'p' });
      } else if (tag === 'ul' || tag === 'ol') {
        Array.from(el.querySelectorAll('li')).forEach((li) => {
          const t = (li.textContent || '').trim();
          if (t) ensure().paras.push({ text: t, k: 'li' });
        });
      } else if (tag === 'pre') {
        if (text) ensure().paras.push({ text, k: 'v' });
      } else if (tag === 'table') {
        if (text) ensure().paras.push({ text: text.replace(/\s+/g, ' '), k: 'p' });
      } else if (el.children.length > 0) {
        walk(el);
      } else if (text) {
        ensure().paras.push({ text, k: 'p' });
      }
    });
    if (root.children.length === 0 && (root.textContent || '').trim()) {
      ensure().paras.push({ text: (root.textContent || '').trim(), k: 'p' });
    }
  };

  walk(body);
  const out = chapters.filter((c) => c.paras.length > 0);
  return out.length ? finalize(out, clean) : textToChapters(body.textContent || '', clean);
}

/* ================================================================== */
/*  PDF → chapters                                                     */
/*                                                                     */
/*  A two-stage strategy:                                              */
/*   1) Fast path — pdf.js text extraction, cleaned and normalized.    */
/*   2) Fallback — if the extracted text fails a Persian/Arabic        */
/*      quality check (broken ToUnicode fonts, scanned pages), the     */
/*      pages are rendered to images and read with OCR.                */
/* ================================================================== */

/** Arabic Presentation Forms-B → base letter. [start, count, base] */
const FORM_B_TABLE: Array<[number, number, number]> = [
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

/** Arabic Presentation Forms-A → base letter (common Persian/Arabic). */
const FORM_A_TABLE: Array<[number, number, number]> = [
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

const FORM_LIGATURES: Record<number, string> = {
  0xfef5: '\u0644\u0627', 0xfef6: '\u0644\u0627',
  0xfef7: '\u0644\u0625', 0xfef8: '\u0644\u0625',
  0xfef9: '\u0644\u0623', 0xfefa: '\u0644\u0623',
  0xfefb: '\u0644\u0622', 0xfefc: '\u0644\u0622',
  0xfdf2: '\u0627\u0644\u0644\u0647',
  0xfdfc: '\u0631\u06cc\u0627\u0644',
  0xfdfd: '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u06cc\u0645',
};

let FORMS_MAP: Map<number, string> | null = null;
function formsMap(): Map<number, string> {
  if (!FORMS_MAP) {
    FORMS_MAP = new Map();
    for (const [start, count, base] of [...FORM_B_TABLE, ...FORM_A_TABLE]) {
      for (let i = 0; i < count; i++) FORMS_MAP.set(start + i, String.fromCodePoint(base));
    }
    for (const [cp, s] of Object.entries(FORM_LIGATURES)) FORMS_MAP.set(Number(cp), s);
  }
  return FORMS_MAP;
}

function isCombiningMark(cp: number): boolean {
  return (
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) ||
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06dc) ||
    (cp >= 0x08d3 && cp <= 0x08ff) ||
    (cp >= 0xfe00 && cp <= 0xfe0f)
  );
}

/** Presentation forms → base letters; drop tatweel / ZWJ / PUA symbols. */
function normalizePdfText(s: string): string {
  const map = formsMap();
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0) || 0;
    if (cp === 0x0640) continue; // tatweel (justification artifact)
    if (cp === 0x200d) continue; // ZWJ
    if (cp >= 0xe000 && cp <= 0xf8ff) continue; // Private Use Area font symbols
    
    // Try lookup in our mapping table first
    let mapped = map.get(cp);
    
    // If not found and it's an Arabic presentation form, use Unicode NFKC normalization
    // This handles non-standard or extended presentation forms not in our tables
    if (!mapped && ((cp >= 0xfe70 && cp <= 0xfeff) || (cp >= 0xfb50 && cp <= 0xfdff))) {
      const normalized = ch.normalize('NFKC');
      // NFKC may expand ligatures to multiple characters, which is correct
      out += normalized;
      continue;
    }
    
    out += mapped ?? ch;
  }
  return out;
}

/** Repair "UTF-8 read as Latin-1" mojibake (Ø³Ù„Ø§Ù… → سلام). */
function repairMojibakeLine(line: string): string {
  if (!/[\u0080-\u00FF]/.test(line)) return line;
  const bytes: number[] = [];
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

function repairMojibake(text: string): string {
  return text.split('\n').map(repairMojibakeLine).join('\n');
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height?: number;
  hasEOL?: boolean;
}

interface Placed {
  str: string;
  left: number;
  right: number;
  y: number;
  size: number;
}

/**
 * Group raw pdf.js items into visual lines and rebuild each line in reading
 * order. pdf.js already returns items in a sensible order for well-formed
 * PDFs; the spatial sort below is a *safe* correction that is a no-op for
 * logical-order files (items already flow right-to-left) and fixes files
 * whose stream stores glyphs in visual order.
 */
function extractPdfLines(items: PdfTextItem[]): string[] {
  const pos: Placed[] = [];
  for (const it of items) {
    if (!it || typeof it.str !== 'string' || it.str === '') continue;
    const size =
      Math.hypot(it.transform[1], it.transform[3]) ||
      Math.abs(it.transform[0]) ||
      it.height ||
      10;
    const w = it.width > 0 ? it.width : it.str.length * size * 0.42;
    const mirrored = it.transform[0] < 0;
    pos.push({
      str: it.str, // kept raw — normalization happens after ordering is settled
      left: mirrored ? it.transform[4] - w : it.transform[4],
      right: mirrored ? it.transform[4] : it.transform[4] + w,
      y: it.transform[5],
      size,
    });
  }
  if (pos.length === 0) return [];

  pos.sort((p, q) => q.y - p.y); // top of page first (PDF y grows upward)

  const lines: string[] = [];
  let i = 0;
  while (i < pos.length) {
    const lineItems: Placed[] = [pos[i]];
    const lineY = pos[i].y;
    const lineSize = pos[i].size;
    let j = i + 1;
    while (j < pos.length && Math.abs(pos[j].y - lineY) <= lineSize * 0.6) {
      lineItems.push(pos[j]);
      j++;
    }
    i = j;

    /* direction: mostly Arabic script → right-to-left reading order */
    let arabic = 0;
    let total = 0;
    for (const it of lineItems) {
      for (const ch of it.str) {
        total++;
        const cp = ch.codePointAt(0) || 0;
        if (
          (cp >= 0x0600 && cp <= 0x06ff) ||
          (cp >= 0x0750 && cp <= 0x077f) ||
          (cp >= 0xfb50 && cp <= 0xfdff) ||
          (cp >= 0xfe70 && cp <= 0xfeff)
        ) {
          arabic++;
        }
      }
    }
    const rtl = total > 0 && arabic > total * 0.4;

    /* restore reading order from real positions. For an already-correct
       logical RTL line the items sit at decreasing x, so "rightmost first"
       reproduces the existing order exactly (a no-op). For a visual-order
       line it reverses them into the correct order. */
    if (rtl) lineItems.sort((p, q) => q.left - p.left);
    else lineItems.sort((p, q) => p.left - q.left);

    let line = '';
    for (let k = 0; k < lineItems.length; k++) {
      const cur = lineItems[k];
      if (k > 0) {
        const prev = lineItems[k - 1];
        const gap = rtl ? prev.left - cur.right : cur.left - prev.right;
        if (gap > cur.size * 0.18) line += ' ';
      }
      line += cur.str;
    }
    const t = line.replace(/\s{2,}/g, ' ').replace(/\u00A0/g, ' ').trim();
    if (t) lines.push(t);
  }
  return lines;
}

/**
 * Quality check: a real Persian/Arabic text always contains a handful of
 * very frequent short words. A PDF whose font ToUnicode map is broken yields
 * Arabic-looking letters that never form these words, so we can detect it
 * and fall back to OCR instead of showing garbage.
 */
const PERSIAN_STOPWORDS = [
  'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'است', 'برای', 'آن', 'بر', 'تا', 'کرد', 'می', 'ها', 'خود', 'یا', 'هم', 'بود',
  'ال', 'في', 'من', 'على', 'ان', 'عن', 'لا', 'ما', 'هو', 'التي', 'الذي',
];

/**
 * 0..1 — how much the text looks like real Persian/Arabic prose. Real prose
 * has 15–40% high-frequency stopwords; text from a broken font encoding is
 * near 0. We count the multi-letter stopwords (strong signal, nearly
 * impossible to hit by accident) plus the ubiquitous single letters.
 */
export function arabicTextQuality(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 20) return words.length === 0 ? 0 : 0.5;
  let hits = 0;
  for (const w of words) {
    const bare = w
      .replace(/[.,،؛:!؟?؛"«»()[\]{}ـ\u064B-\u065F\u0670\u200c]/g, '')
      .replace(/^[''`]+|[''`]+$/g, '');
    if (bare && PERSIAN_STOPWORDS.includes(bare)) hits++;
  }
  return hits / words.length;
}

/** Load pdf.js with the worker running on the main thread. */
async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker) {
    await import('pdfjs-dist/build/pdf.worker.min.mjs');
  }
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'inline://main-thread';
  }
  return pdfjs;
}

/** Fast path: extract the embedded text layer. */
async function pdfTextExtract(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines = extractPdfLines(content.items as unknown as PdfTextItem[]);
    pages.push(repairMojibake(lines.map(normalizePdfText).join('\n')));
  }
  return pages.join('\n\n');
}

/** Fallback: render pages to images and read them with OCR. */
async function pdfOcrExtract(
  buf: ArrayBuffer,
  onProgress?: (pct: number, note: string) => void,
): Promise<string> {
  const pdfjs = await getPdfJs();
  const Tesseract = (await import('tesseract.js')).default;
  onProgress?.(2, 'در حال آماده‌سازی موتور بازخوانی تصویری…');
  const worker = await Tesseract.createWorker(['fas', 'ara'], 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100), 'در حال بازخوانی تصویری متن…');
      }
    },
  });

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(Math.round((i / doc.numPages) * 100), `بازخوانی صفحهٔ ${i} از ${doc.numPages}…`);
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const { data } = await worker.recognize(canvas);
    if (data.text) pages.push(data.text);
  }
  await worker.terminate();
  return pages.join('\n\n');
}

export class PdfNeedsOcrError extends Error {
  constructor() {
    super('needs-ocr');
  }
}

async function pdfToChapters(
  buf: ArrayBuffer,
  clean: boolean,
  onProgress?: (pct: number, note: string) => void,
): Promise<Chapter[]> {
  const text = await pdfTextExtract(buf);
  if (text.replace(/\s+/g, '').length < 40) {
    // no extractable text layer at all (scanned) — go straight to OCR
    onProgress?.(5, 'متن قابل استخراج نیست؛ بازخوانی تصویری…');
    const ocrText = await pdfOcrExtract(buf, onProgress);
    return textToChapters(ocrText, clean);
  }

  const quality = arabicTextQuality(text);
  if (quality < 0.03) {
    // text came out but it's not readable Persian/Arabic (broken font
    // encoding) — re-read the pages as images instead
    onProgress?.(5, 'جدول فونت این PDF استاندارد نیست؛ بازخوانی تصویری…');
    const ocrText = await pdfOcrExtract(buf, onProgress);
    return textToChapters(ocrText, clean);
  }

  return textToChapters(text, clean);
}

/* ================================================================== */
/*  Dispatcher                                                         */
/* ================================================================== */

export interface ParseOptions {
  clean?: boolean;
  onProgress?: (pct: number, note: string) => void;
}

export async function parseFile(file: File, opts?: ParseOptions): Promise<Chapter[]> {
  const clean = opts?.clean ?? true;
  const name = file.name.toLowerCase();

  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return mdToChapters(await file.text(), clean);
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return htmlToChapters(await file.text(), clean);
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const buf = await file.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });
    return htmlToChapters(res.value, clean);
  }
  if (name.endsWith('.pdf')) {
    return pdfToChapters(await file.arrayBuffer(), clean, opts?.onProgress);
  }
  return textToChapters(await file.text(), clean);
}

export const ACCEPTED = '.txt,.md,.markdown,.html,.htm,.docx,.pdf,.text,.rtf';

/* ================================================================== */
/*  Chapter map helpers (used by the editor)                           */
/* ================================================================== */

export interface ChapterSpan {
  title: string;
  start: number;
  end: number;
  words: number;
}

export function chapterSpans(text: string): ChapterSpan[] {
  const spans: ChapterSpan[] = [];
  let offset = 0;
  const lines = text.split('\n');
  const starts: { title: string; start: number }[] = [];

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      starts.push({ title: stripMdHeading(line).slice(0, 60), start: offset });
    }
    offset += line.length + 1;
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].start;
    const end = i + 1 < starts.length ? starts[i + 1].start : text.length;
    const body = text.slice(start, end);
    spans.push({
      title: starts[i].title,
      start,
      end,
      words: body.split(/\s+/).filter(Boolean).length,
    });
  }

  if (spans.length === 0 && text.trim()) {
    spans.push({ title: 'متن کتاب', start: 0, end: text.length, words: text.split(/\s+/).filter(Boolean).length });
  }
  return spans;
}

export function totalWords(chapters: Chapter[]): number {
  return chapters.reduce((a, c) => a + readingWords(c.paras), 0);
}
