export interface Para {
  text: string;
  k: 'p' | 'v' | 'q' | 'li' | 'h';
}

export interface Chapter {
  title: string;
  paras: Para[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  desc: string;
  cover?: string;
  coverColor?: string;
  poetry?: boolean;
  minutes: number;
  year: string;
  pages: number;
  tags: string[];
  chapters: Chapter[];
  uploaded?: boolean;
  uploader?: string;
  createdAt?: number;
}

export interface Review {
  id: string;
  bookId: string;
  name: string;
  rating: number;
  text: string;
  date: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  chapter: number;
  p: number;
  start: number;
  end: number;
  color: string;
  text: string;
  note: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapter: number;
  createdAt: number;
}

export interface Progress {
  chapter: number;
  pct: number;
  updatedAt: number;
}

export interface ReaderSettings {
  theme: 'night' | 'paper' | 'sepia';
  font: 'vazir' | 'markazi' | 'gulzar';
  size: number;
  lh: number;
  width: 'narrow' | 'normal' | 'wide';
}

export const CATEGORIES = [
  'شعر حماسی',
  'شعر غنایی',
  'عرفانی',
  'فلسفی',
  'اخلاقی و اندرزی',
  'داستان معاصر',
  'پژوهشی',
  'کودک و نوجوان',
] as const;

export const HL_COLORS: Record<string, { bg: string; name: string }> = {
  gold: { bg: 'rgba(227,179,65,0.32)', name: 'زر' },
  turq: { bg: 'rgba(63,200,180,0.30)', name: 'فیروزه' },
  rose: { bg: 'rgba(201,86,78,0.32)', name: 'لاله' },
  sky: { bg: 'rgba(111,168,220,0.32)', name: 'آسمان' },
};

/* ---------------- storage ---------------- */

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

export const KEYS = {
  uploads: 'mana:uploads',
  edits: 'mana:edits',
  reviews: 'mana:reviews',
  highlights: 'mana:highlights',
  bookmarks: 'mana:bookmarks',
  progress: 'mana:progress',
  settings: 'mana:settings',
  myshelf: 'mana:myshelf',
};

export const COVER_PALETTE = ['#7a3b3b', '#2e5e52', '#8a6a24', '#31517a', '#6b4a72', '#4a6b35'];

/* ---------------- utils ---------------- */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function faDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function faNum(n: number): string {
  return faDigits(Math.round(n).toLocaleString('en-US'));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'همین حالا';
  if (m < 60) return `${faNum(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${faNum(d)} روز پیش`;
  return `${faNum(Math.floor(d / 30))} ماه پیش`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function readingWords(paras: Para[]): number {
  return paras.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0);
}

export function bookWords(b: Book): number {
  return b.chapters.reduce((a, c) => a + readingWords(c.paras), 0);
}

/* ---------------- cover image ---------------- */

/** reads an image file, crops/resizes it to 640×960 cover ratio and returns a compact data-URL */
export function fileToCoverDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not-image'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const W = 640;
        const H = 960;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no-canvas');
        const scale = Math.max(W / img.width, H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        reject(e as Error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad-image'));
    };
    img.src = url;
  });
}

/* ---------------- serialization (book ⇄ editable text) ---------------- */

export function serializeChapters(chapters: Chapter[]): string {
  return chapters
    .map((c) => {
      const body = c.paras
        .map((p) => {
          if (p.k === 'q') return p.text.split('\n').map((l) => `> ${l}`).join('\n');
          if (p.k === 'li') return p.text.split('\n').map((l) => `- ${l}`).join('\n');
          return p.text;
        })
        .join('\n\n');
      return `## ${c.title}\n\n${body}`;
    })
    .join('\n\n');
}
