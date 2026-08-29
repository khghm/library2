import { useRef, useState } from 'react';
import type { Book } from '../lib/core';
import { COVER_PALETTE, cx, fileToCoverDataUrl } from '../lib/core';
import { Cover } from './BookCard';
import { IconClose, IconImage } from './Icons';

interface Props {
  title: string;
  author: string;
  category: string;
  cover?: string;
  coverColor: string;
  onCover: (dataUrl?: string) => void;
  onColor: (c: string) => void;
  toast: (m: string) => void;
  accent?: 'gold' | 'turq';
}

export default function CoverPicker({ title, author, category, cover, coverColor, onCover, onColor, toast, accent = 'turq' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const gold = accent === 'gold';

  const preview: Book = {
    id: 'preview',
    title: title || 'عنوان کتاب',
    author: author || 'نویسنده',
    category,
    desc: '',
    cover,
    coverColor,
    minutes: 0,
    year: '',
    pages: 0,
    tags: [],
    chapters: [],
  };

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await fileToCoverDataUrl(file);
      onCover(dataUrl);
      toast('تصویر جلد بارگذاری و به نسبتِ کتاب برش خورد');
    } catch {
      toast('این فایل تصویری نیست یا خوانده نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-night-500/70 bg-night-900/40 p-4">
      <span className={cx('mb-3 flex items-center gap-2 text-xs font-bold', gold ? 'text-gold-400' : 'text-turq-400')}>
        <IconImage size={15} /> تصویر جلد کتاب
      </span>
      <div className="flex flex-wrap items-start gap-5">
        {/* live preview */}
        <div className="relative w-28 shrink-0">
          <div className="aspect-[2/3] w-28 overflow-hidden rounded-md shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-1">
            <Cover book={preview} />
          </div>
          {cover && (
            <button
              onClick={() => onCover(undefined)}
              title="حذف تصویر جلد"
              className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white shadow-md transition-transform hover:scale-110"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={cx(
                'flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition-all',
                gold
                  ? 'bg-gold-500 text-night-900 hover:bg-gold-400'
                  : 'bg-turq-500 text-night-900 hover:bg-turq-400',
                busy && 'opacity-50',
              )}
            >
              {busy ? (
                <span className="spin-slow h-4 w-4 rounded-full border-2 border-night-900/30 border-t-night-900" style={{ animationDuration: '1s' }} />
              ) : (
                <IconImage size={15} />
              )}
              {cover ? 'تغییر تصویر جلد' : 'بارگذاری تصویر جلد'}
            </button>
            {cover && (
              <button
                onClick={() => onCover(undefined)}
                className="rounded-md border border-night-500 px-3.5 py-2 text-xs text-mist-400 transition-colors hover:border-rose-500/50 hover:text-rose-500"
              >
                حذف تصویر
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pick(f);
                e.target.value = '';
              }}
            />
          </div>

          <p className="mt-2.5 text-[11px] leading-5 text-mist-500">
            تصویر به‌طور خودکار به نسبت ۲ به ۳ (مثل جلد کتاب) برش می‌خورد و فشرده می‌شود.
          </p>

          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-mist-500">
              {cover ? 'رنگ زمینهٔ جلد (برای بازگشت به جلد گرافیکی):' : 'یا یکی از رنگ‌های جلد گرافیکی:'}
            </p>
            <div className="flex items-center gap-2">
              {COVER_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onColor(c);
                    if (cover) onCover(undefined);
                  }}
                  className={cx(
                    'h-8 w-8 rounded-md transition-transform hover:scale-110',
                    !cover && coverColor === c && 'ring-2 ring-offset-2 ring-offset-night-900',
                  )}
                  style={{ background: `linear-gradient(160deg, ${c}, #101d33)`, ['--tw-ring-color' as string]: gold ? '#e3b341' : '#3fc8b4' }}
                  aria-label={`رنگ جلد ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
