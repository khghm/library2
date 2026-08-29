import type { Chapter, Para } from './core';
import { readingWords } from './core';

/* ------------------------------------------------------------------ */
/*  text noise cleaning — strips stray symbols that pollute files      */
/*  exported from PDFs/scanners: # * _ | \ / + $ ! - and separator     */
/*  lines, while protecting legitimate uses (و/یا, exclamation marks,  */
/*  hyphenated compounds, ZWNJ)                                        */
/* ------------------------------------------------------------------ */

const ALWAYS_NOISE = /[#*_|\\+^~`$]/g;

export function cleanNoise(input: string): string {
  let t = input;
  /* control characters (except \n and \t) — common in PDF extractions;
     ZWNJ (U+200C) is deliberately preserved */
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, '');
  /* characters that are essentially always decoration/OCR noise */
  t = t.replace(ALWAYS_NOISE, '');
  /* slash: collapse mid-word runs, drop when not tightly between word chars */
  t = t.replace(/([\p{L}\p{N}])\/{2,}(?=[\p{L}\p{N}])/gu, '$1/');
  t = t.replace(/(^|[^\p{L}\p{N}])\/+(?=[\p{L}\p{N}])/gu, '$1');
  t = t.replace(/\/+(?![\p{L}\p{N}])/gu, '');
  /* hyphen: drop runs (---, --) and standalone hyphens; keep single mid-word */
  t = t.replace(/-{2,}/g, '');
  t = t.replace(/(^|[^\p{L}\p{N}])-+(?=[\p{L}\p{N}])/gu, '$1');
  t = t.replace(/-+(?![\p{L}\p{N}])/gu, '');
  /* exclamation: keep only directly after a word, collapse !!! → ! */
  t = t.replace(/!{2,}/g, '!');
  t = t.replace(/(^|[^\p{L}\p{N}])!+/gu, '$1');
  /* tidy horizontal whitespace (ZWNJ is preserved) */
  t = t.replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

/** a line made only of symbols — or a lone page number — is noise */
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

/* ------------------------------------------------------------------ */
/*  heading detection                                                  */
/* ------------------------------------------------------------------ */

/** standalone structural words that are headings by themselves */
const SOLO_HEADINGS =
  /^(مقدمه|پیشگفتار|درآمد|سرآغاز|دیباچه|آغاز|خاتمه|مؤخره|سخن پایانی|پیوست|پیوست‌ها|منابع|مآخذ|فهرست مطالب|فهرست|یادداشت مؤلف|یادداشت مترجم|دربارهٔ مؤلف|درباره مؤلف)$/;

/** classic Persian section openers: «فصل سوم»، «بخش ۲»، «گفتار یکم»… */
const SECTION_WORDS = /^(فصل|بخش|باب|قسمت|پرده|گفتار|مجلس|درس|مقاله)\s+/;

const LATIN_SECTIONS = /^(chapter|part|preface|introduction|appendix|book|section)\s*[.:ـ]?\s*/i;

/** numbered headings: «۱.»، «2)»، «۳ـ»، «(۴)» followed by a letter */
const NUMBERED = /^[([]?\s*[۰-۹0-9]+\s*[.):ـ\-–—]\s*\p{L}/u;

/** short Roman-numeral lines: «III»، «XII.» */
const ROMAN = /^\(?[IVXLC]+\)?\s*[.):]?\s*$/;

function textHeading(t: string): boolean {
  if (!t || t.length > 60) return false;
  if (SECTION_WORDS.test(t)) return true;
  if (SOLO_HEADINGS.test(t)) return true;
  if (LATIN_SECTIONS.test(t)) return true;
  if (NUMBERED.test(t)) return true;
  if (ROMAN.test(t)) return true;
  return false;
}

function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (/^#{1,4}\s/.test(t)) return true;
  return textHeading(t);
}

function stripMdHeading(line: string): string {
  return line.trim().replace(/^#{1,4}\s+/, '').replace(/[*_`]/g, '');
}

/** generic titles that get replaced by the file name during import */
export function isGenericTitle(title: string): boolean {
  return title === 'متن کتاب' || title === 'آغاز کتاب';
}

/* ------------------------------------------------------------------ */
/*  plain text → chapters                                              */
/* ------------------------------------------------------------------ */

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
        /* verse = a handful of short lines (e.g. a couplet); long blocks of
           short lines (wrapped PDF prose) stay plain paragraphs */
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

/* ------------------------------------------------------------------ */
/*  markdown → chapters                                                */
/* ------------------------------------------------------------------ */

/** minimal markdown-ish inline renderer → safe HTML string (escapes first) */
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

/* ------------------------------------------------------------------ */
/*  html / docx → chapters                                             */
/* ------------------------------------------------------------------ */

/** a paragraph that is *entirely* bold and short behaves like a heading */
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

  /* documents that already carry real heading tags are trusted as-is;
     documents without any h1–h6 fall back to pattern/bold heuristics */
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

/* ------------------------------------------------------------------ */
/*  pdf → chapters                                                     */
/* ------------------------------------------------------------------ */

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height?: number;
  hasEOL?: boolean;
}

function isArabicChar(ch: string): boolean {
  const c = ch.codePointAt(0) || 0;
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0x08a0 && c <= 0x08ff) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

interface Placed {
  str: string;
  left: number;
  right: number;
  y: number;
  size: number;
  mirrored: boolean;
}

/**
 * Rebuilds page text from raw pdf.js items, spatially — the key to fixing
 * Persian/Arabic PDFs whose content stream stores glyphs in *visual* order
 * (correct on screen, reversed in the stream). pdf.js hands items back in
 * stream order, so we:
 *   1. group items into visual lines by their y coordinate (top → bottom),
 *   2. detect each line's direction (majority Arabic script, or mirrored
 *      text matrices),
 *   3. sort the line's items by real x position — rightmost first for RTL —
 *      which restores both word order *and* letter order inside words,
 *   4. insert a space only where a genuine horizontal gap exists, so words
 *      are never split or wrongly glued.
 */
function extractPageLines(items: PdfTextItem[]): string[] {
  const pos: Placed[] = [];
  for (const it of items) {
    if (!it || typeof it.str !== 'string' || it.str.trim() === '') continue;
    const a = it.transform[0];
    const b = it.transform[1];
    const d = it.transform[3];
    const x = it.transform[4];
    const y = it.transform[5];
    const size = Math.hypot(b, d) || Math.abs(a) || it.height || 10;
    const w = it.width > 0 ? it.width : it.str.length * size * 0.42;
    const mirrored = a < 0;
    pos.push({
      str: it.str,
      left: mirrored ? x - w : x,
      right: mirrored ? x : x + w,
      y,
      size,
      mirrored,
    });
  }
  if (pos.length === 0) return [];

  // reading order: top of page first (PDF y grows upward)
  pos.sort((p, q) => q.y - p.y);

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

    // direction detection
    let arabicChars = 0;
    let totalChars = 0;
    let mirroredCount = 0;
    for (const it of lineItems) {
      if (it.mirrored) mirroredCount++;
      for (const ch of it.str) {
        totalChars++;
        if (isArabicChar(ch)) arabicChars++;
      }
    }
    const rtl = arabicChars > totalChars * 0.4 || mirroredCount > lineItems.length * 0.5;

    // restore logical order from spatial positions
    if (rtl) lineItems.sort((p, q) => q.left - p.left); // rightmost first
    else lineItems.sort((p, q) => p.left - q.left);

    // join, spacing only on real gaps
    let line = '';
    for (let k = 0; k < lineItems.length; k++) {
      const cur = lineItems[k];
      if (k > 0) {
        const prevItem = lineItems[k - 1];
        const gap = rtl ? prevItem.left - cur.right : cur.left - prevItem.right;
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
 * Repairs the classic "UTF-8 read as Latin-1" mojibake (Ø³Ù„Ø§Ù… → سلام)
 * that many PDF producers leave behind. Tries UTF-8 first, then
 * Windows-1256 for legacy Arabic encodings. Lines that already contain
 * real Arabic/Persian characters — or code points outside the byte
 * range — are left untouched.
 */
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
      /* not this encoding — try the next one */
    }
  }
  return line;
}

function repairMojibake(text: string): string {
  return text.split('\n').map(repairMojibakeLine).join('\n');
}

/* ------------------------------------------------------------------ */
/*  reversed RTL detection & repair                                    */
/* ------------------------------------------------------------------ */

/* Arabic Presentation Forms — final vs. initial code points. Used to tell
   whether a line of pre-shaped glyphs is stored in logical order (words
   begin with initial forms) or reversed (words begin with final forms).  */
const FINAL_FORMS = new Set([
  0xfe8e, 0xfe90, 0xfe94, 0xfe96, 0xfe9a, 0xfe9e, 0xfea2, 0xfea6, 0xfeaa, 0xfeac,
  0xfeae, 0xfeb0, 0xfeb2, 0xfeb6, 0xfeba, 0xfebe, 0xfec2, 0xfec6, 0xfeca, 0xfece,
  0xfed2, 0xfed6, 0xfeda, 0xfede, 0xfee2, 0xfee6, 0xfeea, 0xfeee, 0xfef0, 0xfef2,
  0xfb57, 0xfb7b, 0xfb8b, 0xfb93, 0xfef6, 0xfef8, 0xfefa, 0xfefc,
]);
const INITIAL_FORMS = new Set([
  0xfe91, 0xfe97, 0xfe9b, 0xfe9f, 0xfea3, 0xfea7, 0xfeb3, 0xfeb7, 0xfebb, 0xfebf,
  0xfec3, 0xfec7, 0xfecb, 0xfecf, 0xfed3, 0xfed7, 0xfedb, 0xfedf, 0xfee3, 0xfee7,
  0xfeeb, 0xfef3, 0xfb58, 0xfb7c, 0xfb94,
]);

const formClass = (cp: number): 'fin' | 'init' | 'other' =>
  FINAL_FORMS.has(cp) ? 'fin' : INITIAL_FORMS.has(cp) ? 'init' : 'other';

/** group a base character with its following combining marks so a reversal
    never strands a haraka away from the letter it belongs to */
function graphemeGroups(s: string): string[] {
  const groups: string[] = [];
  for (const ch of Array.from(s)) {
    const cp = ch.codePointAt(0) || 0;
    const isMark =
      (cp >= 0x064b && cp <= 0x065f) ||
      cp === 0x0670 ||
      (cp >= 0x06d6 && cp <= 0x06ed) ||
      (cp >= 0x0300 && cp <= 0x036f);
    if (isMark && groups.length) groups[groups.length - 1] += ch;
    else groups.push(ch);
  }
  return groups;
}

/**
 * Some Persian/Arabic PDFs store pre-shaped glyphs in *visual* order, so the
 * extracted string comes back reversed (correct letter shapes, wrong order).
 * A reversed line has its words starting with *final* forms; a correct line
 * has them starting with *initial* forms. We only reverse when that signal is
 * unambiguous, so already-correct text is never touched.
 */
function fixReversedLine(line: string): string {
  if (!/[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line)) return line;
  const words = line.split(/\s+/).filter(Boolean);
  let reversed = false;
  if (words.length >= 2) {
    let finStart = 0;
    let initStart = 0;
    for (const w of words) {
      const cls = formClass(w.codePointAt(0) || 0);
      if (cls === 'fin') finStart++;
      else if (cls === 'init') initStart++;
    }
    reversed = finStart > initStart && finStart >= 2;
  } else if (words.length === 1) {
    const cps = Array.from(words[0]);
    if (cps.length >= 2) {
      reversed =
        formClass(cps[0].codePointAt(0) || 0) === 'fin' &&
        formClass(cps[cps.length - 1].codePointAt(0) || 0) === 'init';
    }
  }
  if (!reversed) return line;
  return graphemeGroups(line).reverse().join('');
}

async function pdfToChapters(buf: ArrayBuffer, clean: boolean): Promise<Chapter[]> {
  const pdfjs = await import('pdfjs-dist');
  /* Load the worker engine on the main thread: the module registers
     globalThis.pdfjsWorker, so pdf.js skips spawning a separate worker
     file entirely and parses in-thread — this works in every hosting
     environment, even where module workers are blocked. */
  if (!(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker) {
    await import('pdfjs-dist/build/pdf.worker.min.mjs');
  }
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'inline://main-thread';
  }

  const pdfData = new Uint8Array(buf);
  const doc = await pdfjs.getDocument({ "data": pdfData }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines = extractPageLines(content.items as unknown as PdfTextItem[]);
    const repaired = repairMojibake(lines.join('\n'));
    pages.push(repaired.split('\n').map(fixReversedLine).join('\n'));
  }

  const text = pages.join('\n\n');
  /* scanned/image PDFs (or fonts without ToUnicode) yield no extractable text */
  if (text.replace(/\s+/g, '').length < 40) {
    throw new Error('scanned-pdf');
  }
  return textToChapters(text, clean);
}

/* ------------------------------------------------------------------ */
/*  dispatcher                                                         */
/* ------------------------------------------------------------------ */

export interface ParseOptions {
  clean?: boolean;
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
    return pdfToChapters(await file.arrayBuffer(), clean);
  }
  return textToChapters(await file.text(), clean);
}

export const ACCEPTED = '.txt,.md,.markdown,.html,.htm,.docx,.pdf,.text,.rtf';

/* ------------------------------------------------------------------ */
/*  chapter map helpers (used by the editor)                           */
/* ------------------------------------------------------------------ */

export interface ChapterSpan {
  title: string;
  start: number;
  end: number;
  words: number;
}

/** character ranges of chapters inside a serialized text — used to delete/rename chapters in the editor */
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
