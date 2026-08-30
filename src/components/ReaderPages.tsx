import { useCallback, useEffect, useRef, useState } from 'react';
import { getPdfJs } from '../lib/parsers';
import { getPdf } from '../lib/blobStore';
import { cx, faNum } from '../lib/core';

interface Props {
  bookId: string;
  bookTitle: string;
  onProgressPct?: (pct: number) => void;
}

interface PageInfo {
  w: number;
  h: number;
}

const MAX_CACHE = 14;

/**
 * "Original pages" mode — renders the actual PDF pages, so the text is shown
 * exactly as the PDF itself displays it (identical fonts & layout), for any
 * Persian/Arabic PDF regardless of how its text layer is encoded.
 */
export default function ReaderPages({ bookId, bookTitle, onProgressPct }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = useRef<any>(null);
  const cacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const orderRef = useRef<string[]>([]);
  const scaleRef = useRef(1);
  const lastReportRef = useRef(0);

  /* open the stored original PDF */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const blob = await getPdf(bookId);
        if (!blob || !alive) {
          if (alive) setStatus('error');
          return;
        }
        const pdfjs = await getPdfJs();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (!alive) return;
        const infos: PageInfo[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const vp = p.getViewport({ scale: 1 });
          infos.push({ w: vp.width, h: vp.height });
        }
        docRef.current = doc;
        setPages(infos);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookId]);

  /* compute the pixel scale: fit page width to the pane, then apply zoom */
  const computeScale = useCallback(() => {
    const el = scrollRef.current;
    if (!el || pages.length === 0) return 1;
    const widest = pages.reduce((m, p) => Math.max(m, p.w), 0);
    const fit = (el.clientWidth - 48) / widest;
    return Math.max(0.2, Math.min(3.5, fit * zoom));
  }, [pages, zoom]);

  const renderPage = useCallback(
    async (n: number, host: HTMLDivElement) => {
      const doc = docRef.current;
      if (!doc || host.dataset.done === '1') return;
      const scale = scaleRef.current;
      const key = `${n}@${scale.toFixed(2)}`;
      let canvas = cacheRef.current.get(key);
      if (!canvas) {
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale });
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.display = 'block';
        canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.45)';
        canvas.style.borderRadius = '4px';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        cacheRef.current.set(key, canvas);
        orderRef.current.push(key);
        if (orderRef.current.length > MAX_CACHE) {
          const old = orderRef.current.shift();
          if (old) cacheRef.current.delete(old);
        }
      }
      host.innerHTML = '';
      host.appendChild(canvas);
      host.dataset.done = '1';
    },
    [],
  );

  /* (re)layout placeholders whenever pages/zoom change */
  useEffect(() => {
    const el = scrollRef.current;
    if (status !== 'ready' || !el) return;
    const scale = computeScale();
    scaleRef.current = scale;
    cacheRef.current.clear();
    orderRef.current = [];

    el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:28px;padding:28px 16px 90px;';
    pages.forEach((p, idx) => {
      const host = document.createElement('div');
      host.dataset.page = String(idx + 1);
      host.style.width = `${Math.floor(p.w * scale)}px`;
      host.style.height = `${Math.floor(p.h * scale)}px`;
      host.style.background = 'rgba(255,255,255,0.05)';
      host.style.borderRadius = '4px';
      host.style.flexShrink = '0';
      wrap.appendChild(host);
    });
    el.appendChild(wrap);
    el.scrollTop = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const host = e.target as HTMLDivElement;
            const n = Number(host.dataset.page);
            observer.unobserve(host);
            renderPage(n, host).catch(() => undefined);
          }
        }
      },
      { root: el, rootMargin: '900px 0px' },
    );
    Array.from(wrap.children).forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [status, pages, zoom, computeScale, renderPage]);

  /* track the visible page for the progress line */
  useEffect(() => {
    const el = scrollRef.current;
    if (status !== 'ready' || !el) return;
    const onScroll = () => {
      const now = Date.now();
      if (now - lastReportRef.current < 250) return;
      lastReportRef.current = now;
      const hosts = el.querySelectorAll<HTMLElement>('[data-page]');
      const mid = el.scrollTop + el.clientHeight * 0.35;
      let cur = 1;
      hosts.forEach((h) => {
        if (h.offsetTop <= mid) cur = Number(h.dataset.page);
      });
      setCurrent(cur);
      onProgressPct?.(Math.min(1, cur / Math.max(1, pages.length)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [status, pages, onProgressPct]);

  if (status === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <span className="spin-slow h-10 w-10 rounded-full border-2 border-night-500 border-t-gold-400" style={{ animationDuration: '1.1s' }} />
        <p className="text-sm" style={{ color: 'var(--pg-muted)' }}>در حال آماده‌سازی صفحه‌های اصلی کتاب…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--pg-muted)" strokeWidth="1.4">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
        <p className="text-sm leading-7" style={{ color: 'var(--pg-muted)' }}>
          فایل اصلی این کتاب در مرورگر شما یافت نشد. حالت «متن» را امتحان کنید یا کتاب را دوباره بارگذاری کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={scrollRef} className="h-full overflow-y-auto" />
      {/* floating controls */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
        <div className="pop-in pointer-events-auto flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-xl" style={{ borderColor: 'var(--pg-line)', background: 'color-mix(in srgb, var(--pg-bg) 88%, black)' }}>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-full text-base font-bold transition-colors hover:bg-white/10"
            style={{ color: 'var(--pg-accent)' }}
            aria-label="کوچک‌نمایی"
          >
            −
          </button>
          <span className="w-12 text-center text-[11px] tabular-nums" style={{ color: 'var(--pg-muted)' }}>
            {faNum(Math.round(zoom * 100))}٪
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-full text-base font-bold transition-colors hover:bg-white/10"
            style={{ color: 'var(--pg-accent)' }}
            aria-label="بزرگ‌نمایی"
          >
            +
          </button>
          <span className={cx('ms-1 border-s ps-2 text-[11px]')} style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-muted)' }}>
            صفحهٔ {faNum(current)} از {faNum(pages.length)}
          </span>
        </div>
      </div>
      <span className="sr-only">{bookTitle}</span>
    </div>
  );
}
