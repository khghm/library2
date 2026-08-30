import { useEffect, useMemo, useState } from 'react';
import type { Book, Review } from '../lib/core';
import { faDigits, faNum, timeAgo, uid } from '../lib/core';
import { Cover } from './BookCard';
import { IconBookmark, IconClock, IconClose, IconLayers, IconOpenBook, IconPencil, IconQuote, IconStar, IconTrash } from './Icons';

interface Props {
  book: Book;
  reviews: Review[];
  inShelf: boolean;
  onClose: () => void;
  onRead: (b: Book, chapter?: number) => void;
  onToggleShelf: (id: string) => void;
  onAddReview: (r: Review) => void;
  onDeleteReview: (id: string) => void;
  onEdit: (b: Book) => void;
  onDeleteBook?: (id: string) => void;
}

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(i)}
          className={onChange ? 'transition-transform hover:scale-125' : ''}
        >
          <IconStar size={onChange ? 22 : 15} filled={i <= (hover || value)} className={(hover || value) >= i ? 'text-gold-400' : 'text-mist-500/40'} />
        </button>
      ))}
    </div>
  );
}

export default function BookModal({ book, reviews, inShelf, onClose, onRead, onToggleShelf, onAddReview, onDeleteReview, onEdit, onDeleteBook }: Props) {
  const [tab, setTab] = useState<'about' | 'reviews'>('about');
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const bookReviews = useMemo(() => reviews.filter((r) => r.bookId === book.id).sort((a, b) => b.date - a.date), [reviews, book.id]);
  const avg = bookReviews.length ? bookReviews.reduce((a, r) => a + r.rating, 0) / bookReviews.length : 0;

  const submit = () => {
    if (!text.trim()) return;
    onAddReview({ id: uid(), bookId: book.id, name: name.trim() || 'خوانندهٔ ناشناس', rating, text: text.trim(), date: Date.now() });
    setText('');
    setName('');
    setRating(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="pop-in relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-night-500/60 bg-night-800 shadow-[0_40px_90px_rgba(0,0,0,0.6)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header band */}
        <div className="flex items-center justify-between border-b border-night-600 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-mist-500">
            <span className="rounded bg-night-700 px-2 py-0.5 text-mist-300">{book.category}</span>
            <span>{book.year}</span>
            {book.uploaded && <span className="rounded bg-turq-500/15 px-2 py-0.5 font-bold text-turq-400">منتشرشده در درگاه نویسندگان</span>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-mist-500 transition-colors hover:bg-night-700 hover:text-mist-100" aria-label="بستن">
            <IconClose size={19} />
          </button>
        </div>

        <div className="grid gap-6 overflow-y-auto p-5 sm:grid-cols-[200px_1fr] sm:p-6">
          {/* cover side */}
          <div>
            <div className="aspect-[2/3] w-44 sm:w-full">
              <Cover book={book} />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => onRead(book)}
                className="flex items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-bold text-night-900 transition-all hover:bg-gold-400 hover:shadow-[0_10px_26px_rgba(227,179,65,0.25)]"
              >
                <IconOpenBook size={18} /> شروع مطالعه
              </button>
              <button
                onClick={() => onToggleShelf(book.id)}
                className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                  inShelf ? 'border-gold-500/50 bg-gold-500/10 text-gold-400' : 'border-night-500 text-mist-400 hover:border-gold-500/40 hover:text-gold-400'
                }`}
              >
                <IconBookmark size={17} filled={inShelf} /> {inShelf ? 'در قفسهٔ شماست' : 'افزودن به قفسهٔ من'}
              </button>
              <button
                onClick={() => onEdit(book)}
                className="flex items-center justify-center gap-2 rounded-md border border-night-500 px-4 py-2.5 text-sm font-medium text-mist-400 transition-colors hover:border-gold-500/40 hover:text-gold-400"
              >
                <IconPencil size={16} /> ویرایش مشخصات و متن
              </button>
              {book.uploaded && onDeleteBook && (
                <button
                  onClick={() => onDeleteBook(book.id)}
                  className="flex items-center justify-center gap-2 rounded-md border border-rose-500/40 px-4 py-2 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
                >
                  <IconTrash size={15} /> حذف این اثر
                </button>
              )}
            </div>
          </div>

          {/* info side */}
          <div className="min-w-0">
            <h2 className="font-display text-3xl leading-10 text-mist-100">{book.title}</h2>
            <p className="mt-0.5 text-sm font-light text-mist-400">
              {book.uploaded ? 'به قلم ' : 'اثر '}
              <span className="font-medium text-gold-400">{book.author}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-mist-500">
              <span className="flex items-center gap-1.5"><IconClock size={14} className="text-turq-400" /> {faNum(book.minutes)} دقیقه مطالعه</span>
              <span className="flex items-center gap-1.5"><IconLayers size={14} className="text-turq-400" /> {faNum(book.chapters.length)} فصل</span>
              <span>{faNum(book.pages)} صفحه</span>
              <span className="flex items-center gap-1 text-gold-500">
                <IconStar size={14} filled /> {avg ? faDigits(avg.toFixed(1)) : '—'}
                <span className="text-mist-500">({faNum(bookReviews.length)} نقد)</span>
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {book.tags.map((t) => (
                <span key={t} className="rounded-full border border-night-500 px-2.5 py-0.5 text-[11px] text-mist-400">#{t}</span>
              ))}
            </div>

            {/* tabs */}
            <div className="mt-5 flex gap-1 border-b border-night-600">
              {([['about', 'دربارهٔ کتاب'], ['reviews', `نقدها (${faNum(bookReviews.length)})`]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${tab === k ? 'text-gold-400' : 'text-mist-500 hover:text-mist-200'}`}
                >
                  {label}
                  {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-500" />}
                </button>
              ))}
            </div>

            {tab === 'about' ? (
              <div className="py-4">
                <p className="text-sm leading-7 text-mist-300">{book.desc}</p>
                <h4 className="mt-5 mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-mist-500">
                  <span className="h-3 w-0.5 rounded bg-gold-500" /> فهرست فصل‌ها
                </h4>
                <ol className="space-y-1">
                  {book.chapters.map((c, i) => (
                    <li key={i}>
                      <button
                        onClick={() => onRead(book, i)}
                        className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-right text-sm text-mist-300 transition-colors hover:bg-night-700 hover:text-gold-400"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-night-700 text-[11px] font-bold text-gold-500 transition-colors group-hover:bg-gold-500 group-hover:text-night-900">
                            {faNum(i + 1)}
                          </span>
                          {c.title}
                        </span>
                        <span className="text-[11px] text-mist-500">{faNum(c.paras.length)} بند</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="py-4">
                {/* review form */}
                <div className="rounded-lg border border-night-500/70 bg-night-900/50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-mist-200">
                    <IconQuote size={17} className="text-gold-500" /> نقد خود را بنویسید
                  </p>
                  <div className="mb-2.5 flex flex-wrap items-center gap-3">
                    <Stars value={rating} onChange={setRating} />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="نام شما (اختیاری)"
                      className="w-44 rounded-md border border-night-500 bg-night-800 px-3 py-1.5 text-xs text-mist-100 placeholder:text-mist-500 focus:border-gold-500/50 focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder="این کتاب برای شما چه کرد؟"
                    className="w-full resize-none rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm leading-6 text-mist-100 placeholder:text-mist-500 focus:border-gold-500/50 focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={submit}
                      disabled={!text.trim()}
                      className="rounded-md bg-gold-500 px-5 py-1.5 text-sm font-bold text-night-900 transition-all enabled:hover:bg-gold-400 disabled:opacity-40"
                    >
                      ثبت نقد
                    </button>
                  </div>
                </div>

                {/* review list */}
                <div className="mt-4 space-y-3">
                  {bookReviews.length === 0 && <p className="py-6 text-center text-sm text-mist-500">اولین منتقدِ این کتاب باشید.</p>}
                  {bookReviews.map((r) => (
                    <div key={r.id} className="group rounded-lg border border-night-600 bg-night-900/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-night-500 to-night-700 font-display text-sm text-gold-400 ring-1 ring-gold-500/20">
                            {r.name.trim()[0] || '؟'}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-mist-200">{r.name}</p>
                            <p className="text-[10px] text-mist-500">{timeAgo(r.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-gold-500" dir="ltr">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <IconStar key={i} size={12} filled={r.rating >= i} className={r.rating >= i ? '' : 'opacity-30'} />
                            ))}
                          </div>
                          <button onClick={() => onDeleteReview(r.id)} className="rounded p-1 text-mist-500 opacity-0 transition-all hover:bg-rose-500/15 hover:text-rose-500 group-hover:opacity-100" aria-label="حذف نقد">
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2.5 text-sm leading-7 text-mist-300">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
