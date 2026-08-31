import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book, Bookmark, Highlight, Progress, Review } from '../lib/core';
import { cx, faDigits, faNum, timeAgo } from '../lib/core';
import BookCard, { Cover } from './BookCard';
import Shelf from './Shelf';
import { IconBookmark, IconClock, IconFeather, IconNote, IconOpenBook, IconQuote, IconShelf, IconSparkle, IconStar } from './Icons';

interface Props {
  books: Book[];
  progress: Record<string, Progress>;
  highlights: Highlight[];
  bookmarks: Bookmark[];
  reviews: Review[];
  myShelf: string[];
  query: string;
  onRead: (b: Book, chapter?: number) => void;
  onOpen: (b: Book) => void;
  onToggleShelf: (id: string) => void;
  onEdit: (b: Book) => void;
  onGoAuthors: () => void;
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('in');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx('reveal', className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function LibraryView({ books, progress, highlights, bookmarks, reviews, myShelf, query, onRead, onOpen, onToggleShelf, onEdit, onGoAuthors }: Props) {
  const [cat, setCat] = useState<string>('همه');
  const [sort, setSort] = useState<string>('rec');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const cats = useMemo(() => ['همه', ...Array.from(new Set(books.map((b) => b.category)))], [books]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = books.filter(
      (b) =>
        (cat === 'همه' || b.category === cat) &&
        (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.tags.some((t) => t.includes(query.trim()))),
    );
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'fa'));
    if (sort === 'short') list = [...list].sort((a, b) => a.minutes - b.minutes);
    if (sort === 'long') list = [...list].sort((a, b) => b.minutes - a.minutes);
    if (sort === 'new') list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [books, cat, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [cat, sort, query]);

  const continueList = useMemo(
    () =>
      Object.entries(progress)
        .filter(([, p]) => p.pct > 0.01 && p.pct < 0.995)
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .map(([id, p]) => ({ book: books.find((b) => b.id === id), p }))
        .filter((x) => x.book)
        .slice(0, 6),
    [progress, books],
  );

  const ratingOf = (id: string) => {
    const rs = reviews.filter((r) => r.bookId === id);
    return { avg: rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0, count: rs.length };
  };

  const minutesRead = useMemo(
    () => Object.entries(progress).reduce((acc, [id, p]) => acc + (books.find((b) => b.id === id)?.minutes || 0) * p.pct, 0),
    [progress, books],
  );

  const totalChapters = useMemo(() => books.reduce((a, b) => a + b.chapters.length, 0), [books]);
  const shelfBooks = myShelf.map((id) => books.find((b) => b.id === id)).filter(Boolean) as Book[];
  const myNotes = [...highlights].sort((a, b) => b.createdAt - a.createdAt);
  const myMarks = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="grid items-center gap-10 pb-16 pt-10 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pt-16">
        <div>
          <Reveal>
            <p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-turq-400">
              <span className="h-px w-8 bg-turq-400/60" /> کتابخانهٔ دیجیتال فارسی
            </p>
            <h1 className="font-display text-[44px] leading-[1.25] text-mist-100 sm:text-6xl sm:leading-[1.22]">
              هر کتاب، دری است
              <br />
              <span className="text-gold-400">هنوز باز‌نشده.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-6 max-w-md font-nastaliq text-xl leading-[2.6] text-mist-400">
              «توانا بود هر که دانا بود — ز دانش دل پیر برنا بود»
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              {[
                [faNum(books.length), 'کتاب'],
                [faNum(totalChapters), 'فصل'],
                [faNum(books.reduce((a, b) => a + b.minutes, 0)), 'دقیقه خواندنی'],
                [faNum(reviews.length), 'نقد و بررسی'],
              ].map(([n, l]) => (
                <div key={l as string} className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-gold-400">{n}</span>
                  <span className="text-xs text-mist-500">{l}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#library"
                className="group flex items-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-sm font-bold text-night-900 shadow-[0_12px_30px_rgba(227,179,65,0.22)] transition-all hover:-translate-y-0.5 hover:bg-gold-400"
              >
                <IconShelf size={18} /> قفسهٔ کتاب‌ها
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="transition-transform group-hover:translate-y-0.5"><path d="M12 4v16M5 13l7 7 7-7" /></svg>
              </a>
              <button
                onClick={onGoAuthors}
                className="flex items-center gap-2 rounded-md border border-turq-500/40 px-6 py-3 text-sm font-bold text-turq-400 transition-all hover:-translate-y-0.5 hover:border-turq-500 hover:bg-turq-500/10"
              >
                <IconFeather size={18} /> نویسنده‌اید؟ کتاب‌تان را منتشر کنید
              </button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <Shelf books={books} onOpen={onOpen} onRead={onRead} />
          <p className="mt-5 text-center text-[11px] text-mist-500">
            روی عطفِ هر کتاب کلیک کنید تا شناسنامه‌اش باز شود — دابل‌کلیک، مستقیم به صفحهٔ مطالعه
          </p>
        </Reveal>
      </section>

      {continueList.length > 0 && (
        <section className="pb-14">
          <Reveal>
            <h2 className="mb-5 flex items-center gap-3 font-display text-2xl text-mist-100">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/25"><IconOpenBook size={19} /></span>
              ادامهٔ مطالعه
            </h2>
          </Reveal>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3">
            {continueList.map(({ book, p }, i) => (
              <Reveal key={book!.id} delay={i * 70} className="snap-start">
                <button
                  onClick={() => onRead(book!, p.chapter)}
                  className="group flex w-[300px] shrink-0 items-center gap-4 rounded-lg border border-night-500/60 bg-night-800/60 p-3.5 text-right transition-all hover:-translate-y-1 hover:border-gold-500/40 hover:shadow-[0_16px_34px_rgba(0,0,0,0.4)]"
                >
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded">
                    <Cover book={book!} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg leading-6 text-mist-100 group-hover:text-gold-400">{book!.title}</p>
                    <p className="truncate text-[11px] text-mist-500">{timeAgo(p.updatedAt)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-600">
                      <div className="h-full rounded-full bg-gradient-to-l from-gold-400 to-gold-600" style={{ width: `${Math.round(p.pct * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-gold-400">{faNum(p.pct * 100)}٪ — ادامه دهید…</p>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section id="library" className="scroll-mt-24 pb-16">
        <Reveal>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-mist-100">قفسهٔ کتاب‌ها</h2>
              <p className="mt-1 text-xs text-mist-500">{faNum(filtered.length)} کتاب در این نمایش</p>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-night-500 bg-night-800 px-3 py-2 text-xs text-mist-300 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="rec">مرتب‌سازی: پیشنهادی</option>
              <option value="title">عنوان (الفبا)</option>
              <option value="short">کوتاه‌ترین</option>
              <option value="long">بلندترین</option>
              <option value="new">تازه‌منتشرشده‌ها</option>
            </select>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mb-7 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cx(
                  'rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
                  cat === c
                    ? 'border-gold-500 bg-gold-500/12 text-gold-400 shadow-[0_4px_16px_rgba(227,179,65,0.15)]'
                    : 'border-night-500 text-mist-400 hover:border-gold-500/40 hover:text-gold-400',
                )}
              >
                {c}
                {c !== 'همه' && <span className="ms-1.5 text-[10px] text-mist-500">{faNum(books.filter((b) => b.category === c).length)}</span>}
              </button>
            ))}
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-night-500 py-20 text-center">
            <p className="font-display text-2xl text-mist-400">کتابی با این مشخصات پیدا نشد</p>
            <p className="mt-2 text-sm text-mist-500">جست‌وجو یا دسته‌بندی دیگری را امتحان کنید.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {paginatedBooks.map((b, i) => (
                <Reveal key={b.id} delay={(i % 4) * 70}>
                  <BookCard
                    book={b}
                    progress={progress[b.id]}
                    rating={ratingOf(b.id).avg}
                    ratingCount={ratingOf(b.id).count}
                    inShelf={myShelf.includes(b.id)}
                    onOpen={onOpen}
                    onRead={(bk) => onRead(bk)}
                    onToggleShelf={onToggleShelf}
                    onEdit={onEdit}
                  />
                </Reveal>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-md border border-night-500 px-3 py-2 text-xs font-medium text-mist-400 transition-colors enabled:hover:border-gold-500/50 enabled:hover:text-gold-400 disabled:opacity-30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 5.5L8 12l6.5 6.5" />
                  </svg>
                  قبلی
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cx(
                          'h-9 w-9 rounded-md text-xs font-bold transition-all',
                          currentPage === pageNum
                            ? 'bg-gold-500 text-night-900'
                            : 'border border-night-500 text-mist-400 hover:border-gold-500/50 hover:text-gold-400',
                        )}
                      >
                        {faNum(pageNum)}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 rounded-md border border-night-500 px-3 py-2 text-xs font-medium text-mist-400 transition-colors enabled:hover:border-gold-500/50 enabled:hover:text-gold-400 disabled:opacity-30"
                >
                  بعدی
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.5 5.5L16 12l-6.5 6.5" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section id="desk" className="scroll-mt-24 pb-20">
        <Reveal>
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-turq-500/12 text-turq-400 ring-1 ring-turq-500/25"><IconSparkle size={20} /></span>
            <div>
              <h2 className="font-display text-3xl text-mist-100">میز مطالعهٔ شما</h2>
              <p className="text-xs text-mist-500">پیشرفت، یادداشت‌ها، نشانک‌ها و نقدهایتان — همه یک‌جا</p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Reveal className="md:col-span-2 xl:row-span-2">
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-night-500/60 bg-gradient-to-b from-night-700/70 to-night-800/70 p-6">
              <div className="girih-layer absolute inset-0 opacity-[0.06]" />
              <p className="relative flex items-center gap-2 text-xs font-bold text-mist-500"><IconClock size={15} className="text-gold-400" /> زمانِ خوانده‌شده</p>
              <p className="relative mt-4 font-display text-6xl text-gold-400">{faNum(minutesRead)}<span className="ms-2 text-xl text-mist-400">دقیقه</span></p>
              <p className="relative mt-2 text-sm text-mist-400">معادلِ حدود {faNum(minutesRead / 60)} ساعت و {faNum(Math.round(minutesRead % 60))} دقیقه غرق در کتاب</p>
              <div className="relative mt-7 space-y-3 border-t border-night-600 pt-5">
                <p className="text-xs font-bold text-mist-500">در حال خواندن:</p>
                {Object.entries(progress).filter(([, p]) => p.pct > 0.01).slice(0, 4).map(([id, p]) => {
                  const b = books.find((x) => x.id === id);
                  if (!b) return null;
                  return (
                    <button key={id} onClick={() => onRead(b, p.chapter)} className="group flex w-full items-center gap-3 text-right">
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded"><Cover book={b} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-mist-200 group-hover:text-gold-400">{b.title}</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-night-600">
                          <div className="h-full rounded-full bg-turq-500" style={{ width: `${Math.round(p.pct * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-turq-400">{faNum(p.pct * 100)}٪</span>
                    </button>
                  );
                })}
                {Object.keys(progress).length === 0 && <p className="text-xs leading-6 text-mist-500">هنوز کتابی را شروع نکرده‌اید. از قفسه یکی بردارید!</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={80} className="xl:col-span-2">
            <div className="h-full rounded-lg border border-night-500/60 bg-night-800/60 p-6">
              <p className="flex items-center gap-2 text-xs font-bold text-mist-500"><IconBookmark size={15} className="text-gold-400" /> قفسهٔ من <span className="rounded bg-night-700 px-2 py-0.5 text-[10px] text-gold-400">{faNum(shelfBooks.length)} کتاب</span></p>
              {shelfBooks.length === 0 ? (
                <p className="mt-5 text-sm leading-7 text-mist-500">روی نشانکِ هر کتاب بزنید تا به قفسهٔ شخصی‌تان بیاید.</p>
              ) : (
                <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                  {shelfBooks.map((b) => (
                    <button key={b.id} onClick={() => onOpen(b)} className="group w-24 shrink-0 text-center">
                      <div className="aspect-[2/3] overflow-hidden rounded transition-transform group-hover:-translate-y-1.5"><Cover book={b} /></div>
                      <p className="mt-1.5 truncate text-[11px] font-medium text-mist-300 group-hover:text-gold-400">{b.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="h-full rounded-lg border border-night-500/60 bg-night-800/60 p-6">
              <p className="flex items-center gap-2 text-xs font-bold text-mist-500"><IconNote size={15} className="text-turq-400" /> یادداشت‌ها و برجستگی‌ها <span className="rounded bg-night-700 px-2 py-0.5 text-[10px] text-turq-400">{faNum(highlights.length)}</span></p>
              <div className="mt-4 space-y-3">
                {myNotes.slice(0, 3).map((h) => {
                  const b = books.find((x) => x.id === h.bookId);
                  return (
                    <button key={h.id} onClick={() => b && onRead(b, h.chapter)} className="block w-full rounded-md border border-night-600 bg-night-900/40 p-3 text-right transition-colors hover:border-turq-500/40">
                      <p className="truncate text-xs text-mist-200">«{h.text}»</p>
                      <p className="mt-1 text-[10px] text-mist-500">{b?.title}{h.note ? ' — یادداشت دارد' : ''}</p>
                    </button>
                  );
                })}
                {myNotes.length === 0 && <p className="text-xs leading-6 text-mist-500">در کتابخوان، متنی را انتخاب کنید تا برجسته و یادداشت‌گذاری کنید.</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="h-full rounded-lg border border-night-500/60 bg-night-800/60 p-6">
              <p className="flex items-center gap-2 text-xs font-bold text-mist-500"><IconBookmark size={15} className="text-gold-400" /> نشانک‌های فصل‌ها <span className="rounded bg-night-700 px-2 py-0.5 text-[10px] text-gold-400">{faNum(myMarks.length)}</span></p>
              <div className="mt-4 space-y-2.5">
                {myMarks.slice(0, 4).map((m) => {
                  const b = books.find((x) => x.id === m.bookId);
                  return (
                    <button key={m.id} onClick={() => b && onRead(b, m.chapter)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-right transition-colors hover:bg-night-700">
                      <span className="font-display text-sm text-gold-400">{b?.chapters[m.chapter] ? faNum(m.chapter + 1) : '—'}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-mist-200">{b?.title}</span>
                        <span className="block truncate text-[10px] text-mist-500">{b?.chapters[m.chapter]?.title}</span>
                      </span>
                    </button>
                  );
                })}
                {myMarks.length === 0 && <p className="text-xs leading-6 text-mist-500">در کتابخوان با دکمهٔ نشانک، جای مهم را ثبت کنید.</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={240} className="md:col-span-2 xl:col-span-2">
            <div className="h-full rounded-lg border border-night-500/60 bg-night-800/60 p-6">
              <p className="flex items-center gap-2 text-xs font-bold text-mist-500"><IconQuote size={15} className="text-gold-400" /> آخرین نقدهای کتابخانه <span className="rounded bg-night-700 px-2 py-0.5 text-[10px] text-gold-400">{faNum(reviews.length)}</span></p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[...reviews].sort((a, b) => b.date - a.date).slice(0, 2).map((r) => {
                  const b = books.find((x) => x.id === r.bookId);
                  return (
                    <button key={r.id} onClick={() => b && onOpen(b)} className="rounded-md border border-night-600 bg-night-900/40 p-4 text-right transition-colors hover:border-gold-500/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-mist-200">{r.name}</span>
                        <span className="flex items-center gap-0.5 text-gold-500">
                          {[1, 2, 3, 4, 5].map((i) => <IconStar key={i} size={11} filled={r.rating >= i} className={r.rating >= i ? '' : 'opacity-30'} />)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-mist-400">{r.text}</p>
                      <p className="mt-2 text-[10px] text-mist-500">دربارهٔ «{b?.title}» · {timeAgo(r.date)}</p>
                    </button>
                  );
                })}
                {reviews.length === 0 && <p className="text-xs text-mist-500">اولین نقد را از صفحهٔ هر کتاب ثبت کنید.</p>}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-night-600/70 py-10 text-center">
        <p className="font-nastaliq text-lg leading-[2.4] text-mist-400">«یار اندر قفس است و باغ و چمن همه اوست…»</p>
        <p className="mt-3 text-[11px] text-mist-500">
          کتابخانهٔ مانا — ساخته‌شده برای خوانندگان، پژوهشگران، منتقدان و نویسندگان · قالب‌های پشتیبانی: TXT، Markdown، HTML، PDF و DOCX
        </p>
      </footer>
    </div>
  );
}
