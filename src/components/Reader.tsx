import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Book, Bookmark, Highlight, Progress, ReaderSettings } from '../lib/core';
import { HL_COLORS, cx, faDigits, faNum, uid } from '../lib/core';
import { inlineMd } from '../lib/parsers';
import {
  IconBookmark, IconChevronL, IconChevronR, IconClose, IconMinus, IconMoon, IconNote,
  IconPlus, IconScroll, IconSun, IconToc, IconTrash, IconType, IconWidth,
} from './Icons';
import ReaderPages from './ReaderPages';

interface Props {
  book: Book;
  initialChapter: number;
  progress?: Progress;
  highlights: Highlight[];
  bookmarks: Bookmark[];
  settings: ReaderSettings;
  onSettings: (s: ReaderSettings) => void;
  onSaveProgress: (p: Progress) => void;
  onHighlights: (h: Highlight[]) => void;
  onBookmarks: (b: Bookmark[]) => void;
  onClose: () => void;
  toast: (msg: string) => void;
}

type Drawer = null | 'toc' | 'marks' | 'notes';

const THEMES: { k: ReaderSettings['theme']; label: string; icon: React.ReactNode }[] = [
  { k: 'night', label: 'شب', icon: <IconMoon size={15} /> },
  { k: 'paper', label: 'کاغذ', icon: <IconSun size={15} /> },
  { k: 'sepia', label: 'کهنه', icon: <IconScroll size={15} /> },
];

const FONTS: { k: ReaderSettings['font']; label: string; css: string }[] = [
  { k: 'vazir', label: 'وزیر', css: 'var(--font-body)' },
  { k: 'markazi', label: 'محرزی', css: '"Markazi Text", serif' },
  { k: 'gulzar', label: 'نستعلیق', css: '"Gulzar", serif' },
];

function getOffsetWithin(root: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;
  let n = walker.nextNode();
  while (n) {
    if (n === node) return count + offset;
    count += (n.textContent || '').length;
    n = walker.nextNode();
  }
  return count;
}

export default function Reader(props: Props) {
  const { book, initialChapter, settings, onSettings, onSaveProgress, onHighlights, onBookmarks, onClose, toast } = props;
  const [chapter, setChapter] = useState(Math.min(initialChapter, book.chapters.length - 1));
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [panel, setPanel] = useState(false);
  const [toolbar, setToolbar] = useState<{ x: number; y: number; p: number; start: number; end: number; text: string } | null>(null);
  const [popover, setPopover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [jumpTo, setJumpTo] = useState<number | null>(null);
  /* for books uploaded as a single PDF we can render the real pages —
     pixel-exact text regardless of how the font encodes it. Default to it. */
  const [mode, setMode] = useState<'text' | 'pages'>(book.originalPdf ? 'pages' : 'text');

  const surfaceRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSave = useRef(0);

  const total = book.chapters.length;
  const ch = book.chapters[chapter];
  const highlights = useMemo(() => props.highlights.filter((h) => h.bookId === book.id), [props.highlights, book.id]);
  const myBookmarks = useMemo(() => props.bookmarks.filter((b) => b.bookId === book.id), [props.bookmarks, book.id]);
  const bookmarked = myBookmarks.some((b) => b.chapter === chapter);

  const fontCss = FONTS.find((f) => f.k === settings.font)?.css || FONTS[0].css;
  const widthCls = settings.width === 'narrow' ? 'max-w-xl' : settings.width === 'wide' ? 'max-w-4xl' : 'max-w-2xl';
  const gulzarPad = settings.font === 'gulzar' ? settings.lh + 0.5 : settings.lh;

  /* ---------- progress ---------- */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const frac = max > 0 ? el.scrollTop / max : 1;
    const pct = (chapter + Math.min(1, Math.max(0, frac))) / total;
    const now = Date.now();
    if (now - lastSave.current > 600) {
      lastSave.current = now;
      onSaveProgress({ chapter, pct, updatedAt: now });
    }
  }, [chapter, total, onSaveProgress]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    onSaveProgress({ chapter, pct: chapter / total, updatedAt: Date.now() });
    setToolbar(null);
    setPopover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);

  useEffect(() => {
    if (jumpTo === null) return;
    const t = setTimeout(() => {
      const el = surfaceRef.current?.querySelector(`[data-pid="${jumpTo}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('flash-hl');
      setTimeout(() => el?.classList.remove('flash-hl'), 2400);
      setJumpTo(null);
    }, 120);
    return () => clearTimeout(t);
  }, [jumpTo, chapter]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') setChapter((c) => Math.min(total - 1, c + 1));
      if (e.key === 'ArrowRight') setChapter((c) => Math.max(0, c - 1));
      if (e.key === 'Escape') {
        setDrawer(null);
        setPanel(false);
        setToolbar(null);
        setPopover(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [total]);

  /* ---------- selection → highlight ---------- */
  const handleMouseUp = () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const anchorP = (range.startContainer.parentElement?.closest('[data-pid]') || null) as HTMLElement | null;
      const focusP = (range.endContainer.parentElement?.closest('[data-pid]') || null) as HTMLElement | null;
      if (!anchorP || anchorP !== focusP || !surfaceRef.current?.contains(anchorP)) {
        setToolbar(null);
        return;
      }
      const p = Number(anchorP.dataset.pid);
      const start = getOffsetWithin(anchorP, range.startContainer, range.startOffset);
      const end = getOffsetWithin(anchorP, range.endContainer, range.endOffset);
      if (Math.abs(end - start) < 1) return setToolbar(null);
      const rect = range.getBoundingClientRect();
      setToolbar({
        x: rect.left + rect.width / 2,
        y: rect.top,
        p,
        start: Math.min(start, end),
        end: Math.max(start, end),
        text: sel.toString().slice(0, 200),
      });
    }, 10);
  };

  const addHighlight = (color: string, withNote: boolean) => {
    if (!toolbar) return;
    const h: Highlight = {
      id: uid(), bookId: book.id, chapter, p: toolbar.p,
      start: toolbar.start, end: toolbar.end, color,
      text: toolbar.text, note: '', createdAt: Date.now(),
    };
    onHighlights([...props.highlights, h]);
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
    if (withNote) {
      setPopover({ id: h.id, x: Math.min(toolbar.x, window.innerWidth - 180), y: Math.min(toolbar.y + 54, window.innerHeight - 200) });
      setNoteDraft('');
    } else {
      toast('برجسته شد ✒');
    }
  };

  /* ---------- paragraph rendering with highlights ---------- */
  const renderPara = (text: string, idx: number, kind: string) => {
    const hls = highlights.filter((h) => h.chapter === chapter && h.p === idx).sort((a, b) => a.start - b.start);
    const nodes: React.ReactNode[] = [];
    if (hls.length === 0) {
      nodes.push(<span key="t">{text}</span>);
    } else {
      let cursor = 0;
      hls.forEach((h) => {
        const s = Math.max(h.start, cursor);
        const e = Math.min(h.end, text.length);
        if (s > cursor) nodes.push(<span key={`t${cursor}`}>{text.slice(cursor, s)}</span>);
        if (e > s) {
          nodes.push(
            <mark
              key={`h${h.id}`}
              data-hid={h.id}
              className="hl-mark"
              style={{ background: HL_COLORS[h.color]?.bg || HL_COLORS.gold.bg, boxShadow: h.note ? 'inset 0 -2px 0 rgba(227,179,65,0.65)' : 'none' }}
              onClick={(ev) => {
                ev.stopPropagation();
                setNoteDraft(h.note);
                setPopover({ id: h.id, x: Math.min(ev.clientX, window.innerWidth - 300), y: Math.min(ev.clientY + 14, window.innerHeight - 240) });
              }}
            >
              {text.slice(s, e)}
            </mark>,
          );
        }
        cursor = Math.max(cursor, e);
      });
      if (cursor < text.length) nodes.push(<span key={`tend${cursor}`}>{text.slice(cursor)}</span>);
    }

    const base: React.CSSProperties = {
      lineHeight: gulzarPad,
      fontSize: `${settings.size}px`,
      fontFamily: fontCss,
    };
    const common = { 'data-pid': idx, onMouseUp: handleMouseUp } as const;

    if (kind === 'v') {
      return (
        <p key={idx} {...common} className="my-6 whitespace-pre-line text-center font-medium" style={base}>
          {nodes}
        </p>
      );
    }
    if (kind === 'q') {
      return (
        <blockquote key={idx} {...common} className="my-5 rounded-s-md border-s-[3px] px-4 py-2 italic" style={{ ...base, borderColor: 'var(--pg-accent)', color: 'var(--pg-muted)' }}>
          {nodes}
        </blockquote>
      );
    }
    if (kind === 'li') {
      return (
        <p key={idx} {...common} className="my-3 flex gap-3" style={base}>
          <svg width="10" height="10" viewBox="0 0 10 10" className="mt-[0.55em] shrink-0" style={{ color: 'var(--pg-accent)' }} fill="currentColor">
            <rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" />
          </svg>
          <span>{nodes}</span>
        </p>
      );
    }
    return (
      <p key={idx} {...common} className="my-5 text-justify" style={base}>
        {nodes}
      </p>
    );
  };

  const pctNow = Math.round(((chapter + 1) / total) * 100);
  const remaining = Math.max(1, Math.round(book.minutes * (1 - chapter / total)));

  const updateNote = () => {
    if (!popover) return;
    onHighlights(props.highlights.map((h) => (h.id === popover.id ? { ...h, note: noteDraft } : h)));
    setPopover(null);
    toast(noteDraft.trim() ? 'یادداشت ذخیره شد' : 'یادداشت برداشته شد');
  };

  const deleteHl = () => {
    if (!popover) return;
    onHighlights(props.highlights.filter((h) => h.id !== popover.id));
    setPopover(null);
    toast('برجستگی حذف شد');
  };

  const toggleBookmark = () => {
    if (bookmarked) {
      onBookmarks(props.bookmarks.filter((b) => !(b.bookId === book.id && b.chapter === chapter)));
      toast('نشانک برداشته شد');
    } else {
      onBookmarks([...props.bookmarks, { id: uid(), bookId: book.id, chapter, createdAt: Date.now() }]);
      toast('نشانک گذاشته شد 🔖');
    }
  };

  return (
    <div className={cx('reader-pane fixed inset-0 z-50 flex flex-col')} data-rtheme={settings.theme}>
      {/* top progress line */}
      <div className="absolute inset-x-0 top-0 z-30 h-[3px]" style={{ background: 'color-mix(in srgb, var(--pg-muted) 20%, transparent)' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${pctNow}%`, background: 'var(--pg-accent)' }} />
      </div>

      {/* chrome header */}
      <header className="relative z-20 flex items-center gap-2 border-b px-3 py-2.5 sm:px-5" style={{ borderColor: 'var(--pg-line)', background: 'color-mix(in srgb, var(--pg-bg) 92%, black)' }}>
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--pg-muted)' }}>
          <IconClose size={17} /> <span className="hidden sm:inline">بازگشت</span>
        </button>
        <div className="mx-1 hidden h-5 w-px sm:block" style={{ background: 'var(--pg-line)' }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base leading-6" style={{ color: 'var(--pg-text)' }}>{book.title}</p>
          <p className="truncate text-[11px]" style={{ color: 'var(--pg-muted)' }}>
            فصل {faNum(chapter + 1)} از {faNum(total)} · {ch.title} · حدود {faNum(remaining)} دقیقه تا پایان
          </p>
        </div>

        {/* display mode: real PDF pages vs. extracted text */}
        {book.originalPdf && (
          <div className="me-1 flex items-center rounded-md border p-0.5" style={{ borderColor: 'var(--pg-line)' }}>
            <button
              onClick={() => setMode('pages')}
              className={cx('rounded px-2.5 py-1 text-[11px] font-bold transition-colors', mode === 'pages' ? '' : 'hover:bg-white/5')}
              style={mode === 'pages' ? { background: 'var(--pg-accent)', color: 'var(--pg-bg)' } : { color: 'var(--pg-muted)' }}
            >
              صفحه‌های اصلی
            </button>
            <button
              onClick={() => setMode('text')}
              className={cx('rounded px-2.5 py-1 text-[11px] font-bold transition-colors', mode === 'text' ? '' : 'hover:bg-white/5')}
              style={mode === 'text' ? { background: 'var(--pg-accent)', color: 'var(--pg-bg)' } : { color: 'var(--pg-muted)' }}
            >
              متن
            </button>
          </div>
        )}

        {/* quick controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => onSettings({ ...settings, size: Math.max(13, settings.size - 1) })} className="rounded-md p-1.5 transition-colors hover:bg-white/5" style={{ color: 'var(--pg-muted)' }} aria-label="کوچک‌تر"><IconMinus size={16} /></button>
          <span className="w-7 text-center text-xs font-bold" style={{ color: 'var(--pg-text)' }}>{faNum(settings.size)}</span>
          <button onClick={() => onSettings({ ...settings, size: Math.min(28, settings.size + 1) })} className="rounded-md p-1.5 transition-colors hover:bg-white/5" style={{ color: 'var(--pg-muted)' }} aria-label="بزرگ‌تر"><IconPlus size={16} /></button>
        </div>

        <button onClick={() => toggleBookmark()} className={cx('rounded-md p-2 transition-all', bookmarked ? 'text-[var(--pg-accent)]' : 'hover:bg-white/5')} style={bookmarked ? {} : { color: 'var(--pg-muted)' }} aria-label="نشانک">
          <IconBookmark size={18} filled={bookmarked} />
        </button>
        <button onClick={() => setPanel(!panel)} className={cx('rounded-md p-2 transition-colors hover:bg-white/5', panel ? 'text-[var(--pg-accent)]' : '')} style={panel ? {} : { color: 'var(--pg-muted)' }} aria-label="تنظیمات">
          <IconType size={18} />
        </button>
        <button onClick={() => setDrawer(drawer === 'toc' ? null : 'toc')} className={cx('rounded-md p-2 transition-colors hover:bg-white/5', drawer === 'toc' ? 'text-[var(--pg-accent)]' : '')} style={drawer === 'toc' ? {} : { color: 'var(--pg-muted)' }} aria-label="فهرست">
          <IconToc size={18} />
        </button>
        <button onClick={() => setDrawer(drawer === 'marks' ? null : 'marks')} className="relative rounded-md p-2 transition-colors hover:bg-white/5" style={{ color: 'var(--pg-muted)' }} aria-label="نشانک‌ها">
          <IconBookmark size={18} />
          {myBookmarks.length > 0 && <span className="absolute -left-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--pg-accent)] px-0.5 text-[9px] font-bold" style={{ color: 'var(--pg-bg)' }}>{faNum(myBookmarks.length)}</span>}
        </button>
        <button onClick={() => setDrawer(drawer === 'notes' ? null : 'notes')} className="relative rounded-md p-2 transition-colors hover:bg-white/5" style={{ color: 'var(--pg-muted)' }} aria-label="یادداشت‌ها">
          <IconNote size={18} />
          {highlights.length > 0 && <span className="absolute -left-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--pg-accent)] px-0.5 text-[9px] font-bold" style={{ color: 'var(--pg-bg)' }}>{faNum(highlights.length)}</span>}
        </button>
      </header>

      {/* settings strip */}
      {panel && (
        <div className="pop-in relative z-20 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b px-4 py-3 sm:px-6" style={{ borderColor: 'var(--pg-line)', background: 'color-mix(in srgb, var(--pg-bg) 96%, black)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold" style={{ color: 'var(--pg-muted)' }}>زمینه:</span>
            {THEMES.map((t) => (
              <button key={t.k} onClick={() => onSettings({ ...settings, theme: t.k })}
                className={cx('flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-all', settings.theme === t.k ? 'border-[var(--pg-accent)] text-[var(--pg-accent)]' : 'border-transparent hover:bg-white/5')}
                style={{ color: settings.theme === t.k ? 'var(--pg-accent)' : 'var(--pg-muted)' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold" style={{ color: 'var(--pg-muted)' }}>قلم:</span>
            {FONTS.map((f) => (
              <button key={f.k} onClick={() => onSettings({ ...settings, font: f.k })}
                className={cx('rounded-md border px-3 py-1 text-sm transition-all', settings.font === f.k ? 'border-[var(--pg-accent)] text-[var(--pg-accent)]' : 'border-transparent hover:bg-white/5')}
                style={{ color: settings.font === f.k ? 'var(--pg-accent)' : 'var(--pg-muted)', fontFamily: f.css }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold" style={{ color: 'var(--pg-muted)' }}>فاصلهٔ خطوط:</span>
            <input type="range" min={1.6} max={2.6} step={0.1} value={settings.lh} onChange={(e) => onSettings({ ...settings, lh: Number(e.target.value) })} className="w-28" />
          </div>
          <div className="flex items-center gap-1.5">
            <IconWidth size={15} style={{ color: 'var(--pg-muted)' }} />
            {(['narrow', 'normal', 'wide'] as const).map((w) => (
              <button key={w} onClick={() => onSettings({ ...settings, width: w })}
                className={cx('rounded-md border px-2.5 py-1 text-[11px] transition-all', settings.width === w ? 'border-[var(--pg-accent)] text-[var(--pg-accent)]' : 'border-transparent hover:bg-white/5')}
                style={{ color: settings.width === w ? 'var(--pg-accent)' : 'var(--pg-muted)' }}>
                {w === 'narrow' ? 'باریک' : w === 'normal' ? 'متوسط' : 'پهن'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* drawer */}
        {drawer && (
          <>
            <div className="absolute inset-0 z-10 bg-black/40" onClick={() => setDrawer(null)} />
            <aside className="pop-in absolute inset-y-0 right-0 z-20 flex w-[300px] max-w-[85vw] flex-col overflow-hidden border-l shadow-2xl sm:w-[340px]" style={{ background: 'var(--pg-bg)', borderColor: 'var(--pg-line)' }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--pg-line)' }}>
                <p className="font-display text-lg" style={{ color: 'var(--pg-text)' }}>
                  {drawer === 'toc' ? 'فهرست فصل‌ها' : drawer === 'marks' ? 'نشانک‌ها' : 'یادداشت‌ها و برجستگی‌ها'}
                </p>
                <button onClick={() => setDrawer(null)} style={{ color: 'var(--pg-muted)' }} className="rounded p-1 hover:bg-white/5"><IconClose size={17} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {drawer === 'toc' && (
                  <ol className="space-y-1">
                    {book.chapters.map((c, i) => (
                      <li key={i}>
                        <button
                          onClick={() => { setChapter(i); setDrawer(null); }}
                          className={cx('flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-right text-sm transition-colors', i === chapter ? 'font-bold' : 'hover:bg-white/5')}
                          style={{ color: i === chapter ? 'var(--pg-accent)' : 'var(--pg-text)', background: i === chapter ? 'color-mix(in srgb, var(--pg-accent) 12%, transparent)' : 'transparent' }}
                        >
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: i < chapter ? 'var(--pg-accent)' : 'color-mix(in srgb, var(--pg-muted) 15%, transparent)', color: i < chapter ? 'var(--pg-bg)' : 'var(--pg-muted)' }}>
                            {i < chapter ? '✓' : faNum(i + 1)}
                          </span>
                          <span className="flex-1">{c.title}</span>
                          <span className="text-[10px]" style={{ color: 'var(--pg-muted)' }}>{faNum(c.paras.length)} بند</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                {drawer === 'marks' && (
                  <div className="space-y-2">
                    {myBookmarks.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--pg-muted)' }}>هنوز نشانکی نگذاشته‌اید.</p>}
                    {myBookmarks.map((b) => (
                      <button key={b.id} onClick={() => { setChapter(b.chapter); setDrawer(null); setJumpTo(0); }}
                        className="flex w-full items-center gap-3 rounded-md border p-3 text-right transition-colors hover:bg-white/5" style={{ borderColor: 'var(--pg-line)' }}>
                        <IconBookmark size={20} filled style={{ color: 'var(--pg-accent)' }} />
                        <span>
                          <span className="block text-sm font-medium" style={{ color: 'var(--pg-text)' }}>{book.chapters[b.chapter]?.title || `فصل ${faNum(b.chapter + 1)}`}</span>
                          <span className="text-[11px]" style={{ color: 'var(--pg-muted)' }}>فصل {faNum(b.chapter + 1)} از {faNum(total)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {drawer === 'notes' && (
                  <div className="space-y-2.5">
                    {highlights.length === 0 && (
                      <p className="py-8 text-center text-sm leading-6" style={{ color: 'var(--pg-muted)' }}>
                        متنی را در صفحه انتخاب کنید تا<br />برجسته‌سازی و یادداشت فعال شود.
                      </p>
                    )}
                    {[...highlights].sort((a, b) => a.chapter - b.chapter || a.p - b.p).map((h) => (
                      <div key={h.id} className="rounded-md border p-3" style={{ borderColor: 'var(--pg-line)', background: HL_COLORS[h.color]?.bg ? 'color-mix(in srgb, var(--pg-bg) 92%, black)' : undefined }}>
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-3 w-3 shrink-0 rotate-45 rounded-[2px]" style={{ background: HL_COLORS[h.color]?.bg || HL_COLORS.gold.bg }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm" style={{ color: 'var(--pg-text)' }}>«{h.text}»</p>
                            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--pg-muted)' }}>{book.chapters[h.chapter]?.title} · بند {faNum(h.p + 1)}</p>
                            {h.note && <p className="mt-1.5 rounded bg-white/5 p-2 text-xs leading-5" style={{ color: 'var(--pg-accent)' }}>{h.note}</p>}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => { setChapter(h.chapter); setJumpTo(h.p); setDrawer(null); }} className="rounded bg-white/5 px-2.5 py-1 text-[11px] transition-colors hover:bg-white/10" style={{ color: 'var(--pg-text)' }}>پرش به متن</button>
                          <button onClick={() => { onHighlights(props.highlights.filter((x) => x.id !== h.id)); }} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#c9564e] transition-colors hover:bg-[#c9564e]/10"><IconTrash size={12} /> حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </>
        )}

        {/* reading surface */}
        {mode === 'pages' && book.originalPdf ? (
          <div className="reader-surface min-h-0 flex-1 overflow-hidden">
            <ReaderPages
              bookId={book.id}
              bookTitle={book.title}
              onProgressPct={(pct) => onSaveProgress({ chapter, pct, updatedAt: Date.now() })}
            />
          </div>
        ) : (
        <div ref={scrollRef} onScroll={handleScroll} className="reader-surface min-h-0 flex-1 overflow-y-auto">
          <div ref={surfaceRef} key={chapter} className={cx('page-in mx-auto px-5 py-10 sm:px-8 sm:py-14', widthCls)} style={{ color: 'var(--pg-text)' }}>
            {/* chapter header */}
            <header className="mb-10 text-center">
              <p className="mb-2 text-[11px] font-bold tracking-[0.2em]" style={{ color: 'var(--pg-accent)' }}>
                {book.title} · {book.author}
              </p>
              <h1 className="font-display text-3xl leading-snug sm:text-4xl">{ch.title}</h1>
              <div className="mx-auto mt-5 flex items-center justify-center gap-3" style={{ color: 'var(--pg-accent)' }}>
                <span className="h-px w-14" style={{ background: 'var(--pg-line)' }} />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                  <rect x="7" y="7" width="10" height="10" />
                  <rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)" />
                  <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
                </svg>
                <span className="h-px w-14" style={{ background: 'var(--pg-line)' }} />
              </div>
            </header>

            {ch.paras.map((pa, i) => (pa.k === 'h' ? (
              <h3 key={i} data-pid={i} onMouseUp={handleMouseUp} className="mb-4 mt-8 font-display text-2xl" style={{ color: 'var(--pg-accent)' }}>{pa.text}</h3>
            ) : (
              renderPara(pa.text, i, pa.k)
            )))}

            {/* end ornament */}
            <div className="mt-14 flex items-center justify-center gap-3" style={{ color: 'var(--pg-muted)' }}>
              <span className="h-px w-20" style={{ background: 'var(--pg-line)' }} />
              <span className="font-display text-lg" style={{ color: 'var(--pg-accent)' }}>❖</span>
              <span className="h-px w-20" style={{ background: 'var(--pg-line)' }} />
            </div>

            {/* chapter nav */}
            <footer className="mt-8 flex items-center justify-between gap-3 border-t pt-6" style={{ borderColor: 'var(--pg-line)' }}>
              <button
                onClick={() => setChapter((c) => Math.max(0, c - 1))}
                disabled={chapter === 0}
                className="flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-all enabled:hover:-translate-x-1 disabled:opacity-30"
                style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-text)' }}
              >
                <IconChevronR size={16} /> فصل پیشین
              </button>
              <span className="text-center text-[11px] font-bold" style={{ color: 'var(--pg-muted)' }}>
                {faNum(pctNow)}٪ کتاب<br />
                <span className="font-normal">کلیدهای ← → برای جابه‌جایی فصل</span>
              </span>
              <button
                onClick={() => (chapter === total - 1 ? onClose() : setChapter((c) => Math.min(total - 1, c + 1)))}
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-all hover:translate-x-[-4px]"
                style={{ background: 'var(--pg-accent)', color: 'var(--pg-bg)' }}
              >
                {chapter === total - 1 ? 'پایان کتاب — بازگشت' : 'فصل بعدی'} <IconChevronL size={16} />
              </button>
            </footer>
          </div>
        </div>
        )}
      </div>

      {/* selection toolbar */}
      {toolbar && (
        <div className="pop-in fixed z-[70] flex -translate-x-1/2 -translate-y-[115%] items-center gap-1 rounded-lg border p-1.5 shadow-2xl" style={{ left: toolbar.x, top: toolbar.y, background: 'var(--pg-bg)', borderColor: 'var(--pg-line)' }}>
          <span className="pe-1 ps-2 text-[11px] font-bold" style={{ color: 'var(--pg-muted)' }}>برجسته:</span>
          {Object.entries(HL_COLORS).map(([k, c]) => (
            <button key={k} title={c.name} onClick={() => addHighlight(k, false)} className="h-6 w-6 rounded-full border-2 border-transparent transition-transform hover:scale-125" style={{ background: c.bg, borderColor: 'color-mix(in srgb, var(--pg-text) 25%, transparent)' }} />
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: 'var(--pg-line)' }} />
          <button onClick={() => addHighlight('gold', true)} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors hover:bg-white/5" style={{ color: 'var(--pg-accent)' }}>
            <IconNote size={14} /> با یادداشت
          </button>
        </div>
      )}

      {/* note popover */}
      {popover && (
        <div className="pop-in fixed z-[75] w-[280px] -translate-x-1/2 rounded-lg border p-3 shadow-2xl" style={{ left: popover.x, top: popover.y, background: 'var(--pg-bg)', borderColor: 'var(--pg-line)' }}>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--pg-muted)' }}>
            <IconNote size={13} style={{ color: 'var(--pg-accent)' }} /> یادداشت پژوهشی
          </p>
          <textarea
            autoFocus
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="اندیشه‌تان دربارهٔ این فراز…"
            className="w-full resize-none rounded-md border p-2 text-xs leading-5 focus:outline-none"
            style={{ background: 'color-mix(in srgb, var(--pg-muted) 8%, transparent)', borderColor: 'var(--pg-line)', color: 'var(--pg-text)' }}
          />
          <div className="mt-2 flex items-center justify-between">
            <button onClick={deleteHl} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#c9564e] transition-colors hover:bg-[#c9564e]/10">
              <IconTrash size={12} /> حذف
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => setPopover(null)} className="rounded px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5" style={{ color: 'var(--pg-muted)' }}>انصراف</button>
              <button onClick={updateNote} className="rounded px-3 py-1 text-[11px] font-bold" style={{ background: 'var(--pg-accent)', color: 'var(--pg-bg)' }}>ذخیره</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
