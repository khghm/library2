import type { Book, Progress } from '../lib/core';
import { cx, faDigits, faNum } from '../lib/core';
import { IconBookmark, IconFeather, IconOpenBook, IconPencil, IconStar } from './Icons';

export function Cover({ book, className }: { book: Book; className?: string }) {
  if (book.cover) {
    return (
      <img
        src={book.cover}
        alt={`جلد کتاب ${book.title}`}
        loading="lazy"
        className={cx('book-cover h-full w-full rounded-md object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cx('book-cover cover-svg-cover relative flex h-full w-full flex-col items-center justify-between rounded-md p-4 text-center', className)}
      style={{ background: `linear-gradient(160deg, ${book.coverColor || '#2a4568'} 0%, #101d33 130%)` }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" className="mt-2">
        <rect x="5.5" y="5.5" width="13" height="13" />
        <rect x="5.5" y="5.5" width="13" height="13" transform="rotate(45 12 12)" />
        <circle cx="12" cy="12" r="1.8" fill="rgba(255,255,255,0.85)" stroke="none" />
      </svg>
      <div>
        <p className="font-display text-lg leading-7 text-mist-100" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
          {book.title}
        </p>
        <p className="mt-1 text-[11px] font-light text-mist-200/80">{book.author}</p>
      </div>
      <p className="mb-1 text-[10px] tracking-widest text-mist-200/60">کتابخانهٔ مانا</p>
    </div>
  );
}

interface CardProps {
  book: Book;
  progress?: Progress;
  rating?: number;
  ratingCount?: number;
  inShelf: boolean;
  onOpen: (b: Book) => void;
  onRead: (b: Book) => void;
  onToggleShelf: (id: string) => void;
  onEdit?: (b: Book) => void;
}

export default function BookCard({ book, progress, rating, ratingCount, inShelf, onOpen, onRead, onToggleShelf, onEdit }: CardProps) {
  const pct = progress ? Math.round(progress.pct * 100) : 0;
  return (
    <article
      className="book-card group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-night-500/60 bg-night-800/60 p-3.5"
      onClick={() => onOpen(book)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md">
        <Cover book={book} />
        {/* hover veil */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-night-950/90 via-night-950/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(book);
            }}
            className="pop-in flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-night-900 shadow-lg transition-colors hover:bg-gold-400"
          >
            <IconOpenBook size={17} /> {progress ? 'ادامهٔ مطالعه' : 'شروع مطالعه'}
          </button>
        </div>
        {book.uploaded && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-turq-500/90 px-2 py-0.5 text-[10px] font-bold text-night-900">
            <IconFeather size={12} /> اثر نویسنده
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg leading-7 text-mist-100 transition-colors group-hover:text-gold-400">{book.title}</h3>
          <p className="truncate text-xs font-light text-mist-500">{book.author}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(book);
              }}
              aria-label="ویرایش کتاب"
              title="ویرایش مشخصات و متن کتاب"
              className="rounded-md p-1.5 text-mist-500 opacity-0 transition-all hover:bg-night-700 hover:text-gold-400 group-hover:opacity-100"
            >
              <IconPencil size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleShelf(book.id);
            }}
            aria-label="افزودن به قفسهٔ من"
            className={cx('rounded-md p-1.5 transition-all', inShelf ? 'bg-gold-500/15 text-gold-400' : 'text-mist-500 hover:bg-night-700 hover:text-gold-400')}
          >
            <IconBookmark size={18} filled={inShelf} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mist-500">
        <span className="rounded bg-night-700/80 px-2 py-0.5 text-mist-400">{book.category}</span>
        <span>{faNum(book.minutes)} دقیقه</span>
        <span>{faNum(book.pages)} صفحه</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex items-center gap-0.5 text-gold-500">
          {[1, 2, 3, 4, 5].map((i) => (
            <IconStar key={i} size={13} filled={(rating || 0) >= i - 0.3} className={i <= Math.round(rating || 0) ? '' : 'opacity-35'} />
          ))}
        </div>
        {rating ? <span className="text-[11px] text-mist-400">{faDigits(rating.toFixed(1))} · {faNum(ratingCount || 0)} نقد</span> : <span className="text-[11px] text-mist-500">هنوز نقدی ندارد</span>}
      </div>

      {progress && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-night-600">
            <div className="h-full rounded-full bg-gradient-to-l from-gold-400 to-gold-600 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-medium text-gold-400">{faNum(pct)}٪ خوانده شده</p>
        </div>
      )}
    </article>
  );
}
