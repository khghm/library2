import type { Chapter, Para } from './core';

/** detect chapter boundaries in plain text lines */
function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  if (/^#{1,3}\s/.test(t)) return true;
  if (/^(فصل|بخش|باب|قسمت|پرده|گفتار)\s/.test(t)) return true;
  if (/^(chapter|part)\s/i.test(t)) return true;
  return false;
}

function stripMdHeading(line: string): string {
  return line.trim().replace(/^#{1,4}\s+/, '');
}

export function textToChapters(raw: string): Chapter[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let buffer: string[] = [];

  const flushPara = () => {
    if (buffer.length && current) {
      const text = buffer.join('\n').trim();
      if (text) {
        const isVerse = text.split('\n').length > 1 && text.split('\n').every((l) => l.trim().length < 60);
        current.paras.push({ text, k: isVerse ? 'v' : 'p' });
      }
      buffer = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (t === '---' || t === '***') {
      flushPara();
      continue;
    }
    if (looksLikeHeading(t)) {
      flushPara();
      current = { title: stripMdHeading(t), paras: [] };
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
    if (/^#{1,3}\s/.test(line.trim())) {
      flush();
      current = { title: stripMdHeading(line), paras: [] };
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

  const walk = (root: Element) => {
    Array.from(root.children).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim();
      if (['h1', 'h2', 'h3'].includes(tag)) {
        if (text) {
          current = { title: text.slice(0, 60), paras: [] };
          chapters.push(current);
        }
      } else if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
        if (text) ensure().paras.push({ text, k: tag === 'blockquote' ? 'q' : 'p' });
      } else if (tag === 'ul' || tag === 'ol') {
        Array.from(el.querySelectorAll('li')).forEach((li) => {
          const t = (li.textContent || '').trim();
          if (t) ensure().paras.push({ text: t, k: 'li' });
        });
      } else if (tag === 'pre') {
        if (text) ensure().paras.push({ text, k: 'v' });
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
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const buf = await file.arrayBuffer();
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
    return textToChapters(pages.join('\n\n'));
  }
  return textToChapters(await file.text());
}

export const ACCEPTED = '.txt,.md,.markdown,.html,.htm,.docx,.pdf,.text,.rtf';

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
    const t = line.trim();
    if (t && (t.startsWith('#') || /^(فصل|بخش|باب|قسمت|پرده|گفتار)\s/.test(t) || /^(chapter|part)\s/i.test(t))) {
      starts.push({ title: t.replace(/^#{1,4}\s+/, '').slice(0, 60), start: offset });
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
