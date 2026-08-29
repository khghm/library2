import type { Chapter, Para } from './core';
import { readingWords } from './core';

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

/** a line is a heading candidate when it is short AND matches a pattern */
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

export function textToChapters(raw: string): Chapter[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let buffer: string[] = [];

  const flushPara = () => {
    if (buffer.length && current) {
      const text = buffer.join('\n').trim();
      if (text) {
        const parts = text.split('\n');
        const isVerse = parts.length > 1 && parts.every((l) => l.trim().length < 60);
        current.paras.push({ text, k: isVerse ? 'v' : 'p' });
      }
      buffer = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (t === '---' || t === '***' || t === '___') {
      flushPara();
      continue;
    }
    if (looksLikeHeading(t)) {
      flushPara();
      current = { title: stripMdHeading(t).slice(0, 60), paras: [] };
      chapters.push(current);
      continue;
    }
    if (!t) {
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
    return [{ title: 'متن کتاب', paras: [{ text: raw.trim() || '—', k: 'p' }] }];
  }
  return out;
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

export function mdToChapters(md: string): Chapter[] {
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
    if (!current) {
      current = { title: 'آغاز کتاب', paras: [] };
      chapters.push(current);
    }
    buffer.push(line);
  }
  flush();
  const out = chapters.filter((c) => c.paras.length > 0);
  return out.length ? out : [{ title: 'متن کتاب', paras: [{ text: md.trim() || '—', k: 'p' }] }];
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

export function htmlToChapters(html: string): Chapter[] {
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
  return out.length ? out : textToChapters(body.textContent || '');
}

/* ------------------------------------------------------------------ */
/*  pdf → chapters                                                     */
/* ------------------------------------------------------------------ */

async function pdfToChapters(buf: ArrayBuffer): Promise<Chapter[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = '';
      }
      line += item.str + ' ';
      lastY = y;
    }
    lines.push(line);
    pages.push(lines.join('\n'));
  }

  const text = pages.join('\n\n');
  if (!text.replace(/\s+/g, '')) {
    throw new Error('scanned-pdf');
  }
  return textToChapters(text);
}

/* ------------------------------------------------------------------ */
/*  dispatcher                                                         */
/* ------------------------------------------------------------------ */

export async function parseFile(file: File): Promise<Chapter[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return mdToChapters(await file.text());
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return htmlToChapters(await file.text());
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const buf = await file.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });
    return htmlToChapters(res.value);
  }
  if (name.endsWith('.pdf')) {
    return pdfToChapters(await file.arrayBuffer());
  }
  return textToChapters(await file.text());
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
