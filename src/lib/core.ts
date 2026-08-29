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
  reviews: 'mana:reviews',
  highlights: 'mana:highlights',
  bookmarks: 'mana:bookmarks',
  progress: 'mana:progress',
  settings: 'mana:settings',
  myshelf: 'mana:myshelf',
};

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
