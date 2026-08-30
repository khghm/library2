import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book } from '../lib/core';
import { bookWords, CATEGORIES, cx, faNum, serializeChapters } from '../lib/core';
import { chapterSpans, mdToChapters } from '../lib/parsers';
import CoverPicker from './CoverPicker';
import { IconCheck, IconClose, IconFeather, IconLayers, IconPencil, IconPlus, IconTrash } from './Icons';

interface Props {
  book: Book;
  onSave: (b: Book) => void;
  onClose: () => void;
  toast: (m: string) => void;
}

export default function BookEditor({ book, onSave, onClose, toast }: Props) {
  const [tab, setTab] = useState<'meta' | 'content'>('meta');
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [year, setYear] = useState(book.year);
  const [category, setCategory] = useState(book.category);
  const [tags, setTags] = useState(book.tags.join('، '));
  const [desc, setDesc] = useState(book.desc);
  const [cover, setCover] = useState<string | undefined>(book.cover && book.cover.startsWith('data:') ? book.cover : book.cover);
  const [coverColor, setCoverColor] = useState(book.coverColor || '#31517a');
  const [poetry, setPoetry] = useState(!!book.poetry);
  const [minutes, setMinutes] = useState(book.minutes);
  const [pages, setPages] = useState(book.pages);
  const [text, setText] = useState(() => serializeChapters(book.chapters));
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const liveChapters = useMemo(() => mdToChapters(text, false), [text]);
  const spans = useMemo(() => chapterSpans(text), [text]);
  const words = useMemo(() => liveChapters.reduce((a, c) => a + c.paras.reduce((x, p) => x + p.text.split(/\s+/).filter(Boolean).length, 0), 0), [liveChapters]);

  const insertAtCursor = (snippet: string) => {
    const ta = taRef.current;
    if (!ta) {
      setText((t) => t + snippet);
      return;
    }
    const s = ta.selectionStart ?? text.length;
    const e = ta.selectionEnd ?? s;
    const next = text.slice(0, s) + snippet + text.slice(e);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = s + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const removeChapter = (start: number, end: number) => {
    const next = (text.slice(0, start) + text.slice(end)).replace(/\n{3,}/g, '\n\n').trim();
    setText(next);
    toast('فصل حذف شد — برای ذخیرهٔ نهایی دکمهٔ ثبت را بزنید');
  };

  const recompute = () => {
    setMinutes(Math.max(2, Math.round(words / 190)));
    setPages(Math.max(4, Math.round(words / 230)));
    toast(`بر اساس ${faNum(words)} واژهٔ متن، زمان و صفحات دوباره محاسبه شد`);
  };

  const save = () => {
    if (!title.trim()) return toast('عنوان کتاب نمی‌تواند خالی باشد.');
    if (!author.trim()) return toast('نام نویسنده لازم است.');
    const chapters = mdToChapters(text, false).filter((c) => c.paras.length > 0);
    if (chapters.length === 0) return toast('متن کتاب خالی است؛ دست‌کم یک فصل با چند سطر بنویسید.');
    onSave({
      ...book,
      title: title.trim(),
      author: author.trim(),
      year: year.trim(),
      category,
      tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean).slice(0, 8),
      desc: desc.trim() || book.desc,
      cover,
      coverColor,
      poetry,
      minutes,
      pages,
      chapters,
      uploaded: book.uploaded || undefined,
      uploader: book.uploaded ? author.trim() : book.uploader,
    });
  };

  const inputCls =
    'w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-night-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="pop-in relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-gold-500/20 bg-night-800 shadow-[0_40px_100px_rgba(0,0,0,0.65)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-night-600 bg-night-900/60 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/25">
              <IconPencil size={17} />
            </span>
            <div>
              <h2 className="font-display text-xl leading-6 text-mist-100">ویرایش «{book.title}»</h2>
              <p className="text-[11px] text-mist-500">
                {faNum(book.chapters.length)} فصل · {faNum(bookWords(book))} واژه — تغییرات پس از ثبت، جای نسخهٔ پیشین را می‌گیرند
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-mist-500 transition-colors hover:bg-night-700 hover:text-mist-100" aria-label="بستن">
            <IconClose size={19} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-night-600 px-5">
          {([['meta', 'مشخصات و جلد'], ['content', `محتوای کتاب (${faNum(liveChapters.length)} فصل)`]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cx('relative px-4 py-2.5 text-sm font-medium transition-colors', tab === k ? 'text-gold-400' : 'text-mist-500 hover:text-mist-200')}
            >
              {label}
              {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-500" />}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === 'meta' ? (
            <div className="space-y-5">
              <CoverPicker
                title={title}
                author={author}
                category={category}
                cover={cover}
                coverColor={coverColor}
                onCover={setCover}
                onColor={setCoverColor}
                toast={toast}
                accent="gold"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">عنوان کتاب *</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">نام نویسنده *</span>
                  <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">سال / دوره</span>
                  <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="مثلاً: قرن هشتم" className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">دسته‌بندی</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    {[...new Set([...CATEGORIES, category])].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">زمان مطالعه (دقیقه)</span>
                  <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">تعداد صفحه</span>
                  <input type="number" min={1} value={pages} onChange={(e) => setPages(Number(e.target.value) || 1)} className={inputCls} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">برچسب‌ها (با ویرگول جدا کنید)</span>
                  <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-mist-400">معرفی کوتاه کتاب</span>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={cx(inputCls, 'resize-none leading-6')} />
                </label>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist-300">
                <input type="checkbox" checked={poetry} onChange={(e) => setPoetry(e.target.checked)} className="h-4 w-4 accent-[#e3b341]" />
                این اثر شعر است (نمایش مصرع‌به‌مصرع و سروده‌محور در کتابخوان)
              </label>
            </div>
          ) : (
            <div>
              {/* toolbar */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => insertAtCursor(`\n\n## فصل جدید ${faNum(liveChapters.length + 1)}\n\n`)}
                  className="flex items-center gap-1.5 rounded-md bg-gold-500/12 px-3 py-1.5 text-xs font-bold text-gold-400 ring-1 ring-gold-500/25 transition-colors hover:bg-gold-500/20"
                >
                  <IconPlus size={14} /> افزودن فصل در انتها
                </button>
                <button
                  onClick={() => insertAtCursor(`\n\n## فصل بدون عنوان\n\n`)}
                  className="flex items-center gap-1.5 rounded-md border border-night-500 px-3 py-1.5 text-xs text-mist-300 transition-colors hover:border-gold-500/40 hover:text-gold-400"
                >
                  <IconFeather size={14} /> جداکردن فصل از محل نشانگر
                </button>
                <span className="ms-auto text-[11px] text-mist-500">
                  {faNum(words)} واژه · {faNum(Math.max(2, Math.round(words / 190)))} دقیقه
                </span>
              </div>

              {/* editor */}
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                className="min-h-[280px] w-full resize-y rounded-lg border border-night-500 bg-night-900/70 p-4 text-sm leading-8 text-mist-100 focus:border-gold-500/50 focus:outline-none"
                placeholder={'## فصل نخست\n\nمتنِ فصل این‌جا…'}
              />
              <p className="mt-1.5 text-[10px] leading-5 text-mist-500">
                هر سطر که با «##» یا «فصل / بخش / باب…» آغاز شود، سرآغازِ فصلِ تازه‌ای است؛ بندها با یک سطر خالی از هم جدا می‌شوند. نقل‌قول با «&gt;» و فهرست با «-».
              </p>

              {/* live chapter map */}
              <div className="mt-4 rounded-lg border border-night-600 bg-night-900/50 p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold text-mist-400">
                  <IconLayers size={15} className="text-gold-400" /> نقشهٔ فصل‌ها — همان‌طور که خواننده خواهد دید
                </p>
                {spans.length === 0 && <p className="py-4 text-center text-xs text-mist-500">متنی نیست؛ فصل‌ها همین‌جا ظاهر می‌شوند.</p>}
                <div className="max-h-56 space-y-1.5 overflow-y-auto pe-1">
                  {spans.map((s, i) => (
                    <div key={i} className="group flex items-center justify-between gap-3 rounded-md bg-night-800/80 px-3 py-2 text-xs transition-colors hover:bg-night-700">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-night-600 text-[10px] font-bold text-gold-400">{faNum(i + 1)}</span>
                        <span className="truncate font-medium text-mist-200">{s.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2.5">
                        <span className="text-[10px] text-mist-500">{faNum(s.words)} واژه</span>
                        <button
                          onClick={() => removeChapter(s.start, s.end)}
                          title="حذف این فصل از متن"
                          className="rounded p-1 text-mist-500 opacity-40 transition-all hover:bg-rose-500/15 hover:text-rose-500 group-hover:opacity-100"
                        >
                          <IconTrash size={13} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-night-600 bg-night-900/60 px-5 py-3.5">
          <button onClick={recompute} className="text-xs text-mist-500 underline-offset-4 transition-colors hover:text-gold-400 hover:underline">
            محاسبهٔ دوبارهٔ زمان و صفحات از روی متن
          </button>
          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="rounded-md border border-night-500 px-5 py-2.5 text-sm text-mist-400 transition-colors hover:border-mist-500 hover:text-mist-100">
              انصراف
            </button>
            <button
              onClick={save}
              className="flex items-center gap-2 rounded-md bg-gold-500 px-6 py-2.5 text-sm font-black text-night-900 shadow-[0_10px_26px_rgba(227,179,65,0.22)] transition-all hover:-translate-y-0.5 hover:bg-gold-400"
            >
              <IconCheck size={16} /> ثبت تغییرات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
