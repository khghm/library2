import { useMemo, useRef, useState } from 'react';
import type { Book, Chapter } from '../lib/core';
import { CATEGORIES, COVER_PALETTE, cx, faNum, readingWords, uid } from '../lib/core';
import { ACCEPTED, isGenericTitle, mdToChapters, parseFile, textToChapters } from '../lib/parsers';
import { Cover } from './BookCard';
import CoverPicker from './CoverPicker';
import { IconCheck, IconFeather, IconLayers, IconPencil, IconPlus, IconTrash, IconUpload } from './Icons';

interface Props {
  uploads: Book[];
  onPublish: (b: Book) => void;
  onDelete: (id: string) => void;
  onEdit: (b: Book) => void;
  toast: (m: string) => void;
  onRead: (b: Book) => void;
}

const FORMATS = [
  { ext: 'TXT', note: 'متن ساده؛ فصل‌ها با سطرهای «فصل…» جدا می‌شوند' },
  { ext: 'MD', note: 'مارک‌داون؛ سرتیترهای ## فصل می‌شوند' },
  { ext: 'HTML', note: 'صفحهٔ وب؛ h1 تا h3 فصل می‌شوند' },
  { ext: 'DOCX', note: 'ورد؛ با حفظ ساختار سرتیترها' },
  { ext: 'PDF', note: 'پی‌دی‌اف؛ متن استخراج و فصل‌بندی می‌شود' },
];

export default function AuthorPortal({ uploads, onPublish, onDelete, onEdit, toast, onRead }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[6]);
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState(COVER_PALETTE[0]);
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [asMarkdown, setAsMarkdown] = useState(false);
  const [pasted, setPasted] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLInputElement>(null);

  const words = useMemo(() => (chapters ? chapters.reduce((a, c) => a + readingWords(c.paras), 0) : 0), [chapters]);

  /** parses one or several files and merges their chapters (optionally appending) */
  const parseFiles = async (files: File[], append: boolean) => {
    if (!files.length) return;
    setParsing(true);
    setPasted('');
    try {
      let all: Chapter[] = append && chapters ? [...chapters] : [];
      const names: string[] = append ? [...fileNames] : [];
      let okCount = 0;

      for (const file of files) {
        try {
          const stem = file.name.replace(/\.[^.]+$/, '');
          let chs = await parseFile(file);
          if (chs.length === 1 && isGenericTitle(chs[0].title)) {
            chs = [{ ...chs[0], title: stem || chs[0].title }];
          }
          all = [...all, ...chs];
          names.push(file.name);
          okCount++;
        } catch (err) {
          const msg =
            err instanceof Error && err.message === 'scanned-pdf'
              ? `«${file.name}» اسکن‌شده است و متنِ قابل استخراج ندارد.`
              : `خواندن «${file.name}» ناموفق بود؛ فایل سالم یا قالب دیگری امتحان کنید.`;
          toast(msg);
        }
      }

      if (all.length > 0) {
        setChapters(all);
        setFileNames(names);
        toast(
          okCount > 1
            ? `${faNum(okCount)} فایل پردازش و ادغام شد — مجموعاً ${faNum(all.length)} فصل`
            : `«${names[names.length - 1]}» پردازش شد — ${faNum(all.length)} فصل`,
        );
      } else if (!append) {
        setChapters(null);
        setFileNames([]);
      }
    } finally {
      setParsing(false);
    }
  };

  const handlePaste = () => {
    if (!pasted.trim()) return;
    const chs = asMarkdown ? mdToChapters(pasted) : textToChapters(pasted);
    setChapters(chs);
    setFileNames([]);
    toast(`متن پردازش شد — ${faNum(chs.length)} فصل`);
  };

  const publish = () => {
    if (!title.trim() || !author.trim()) return toast('عنوان و نام نویسنده لازم است.');
    if (!chapters || chapters.length === 0) return toast('ابتدا فایل کتاب را بارگذاری یا متن را پردازش کنید.');
    const book: Book = {
      id: `up-${uid()}`,
      title: title.trim(),
      author: author.trim(),
      category,
      desc: desc.trim() || 'این اثر از راه درگاه نویسندگانِ کتابخانهٔ مانا منتشر شده است.',
      cover,
      coverColor: color,
      poetry: false,
      minutes: Math.max(2, Math.round(words / 190)),
      year: new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(Date.now()),
      pages: Math.max(4, Math.round(words / 230)),
      tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean).slice(0, 6),
      chapters,
      uploaded: true,
      uploader: author.trim(),
      createdAt: Date.now(),
    };
    onPublish(book);
    setTitle(''); setDesc(''); setTags(''); setChapters(null); setFileNames([]); setPasted(''); setCover(undefined);
  };

  const steps = [
    { t: 'فایل یا متن کتاب', d: 'فایل کتاب‌تان را با یکی از قالب‌های رایج بارگذاری کنید — یا متن را همین‌جا بچسبانید.' },
    { t: 'پردازش و فصل‌بندی', d: 'موتور کتابخانه، سرتیترها را می‌شناسد و متن را به فصل‌های خوانا تقسیم می‌کند؛ پیش‌نمایش را همان لحظه می‌بینید.' },
    { t: 'انتشار در قفسه', d: 'با یک کلیک، کتاب کنار آثار کلاسیک و معاصر می‌نشیند و همهٔ خوانندگان می‌توانند آن را در کتابخوان حرفه‌ای بخوانند.' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      {/* intro */}
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div>
          <p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-turq-400">
            <span className="h-px w-8 bg-turq-400/60" /> درگاه نویسندگان
          </p>
          <h1 className="font-display text-5xl leading-[1.25] text-mist-100 sm:text-6xl">
            کتاب‌تان را بنویسید،
            <br />
            <span className="text-turq-400">قفسه منتظر است.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-8 text-mist-400">
            اگر نویسنده‌اید، پژوهش‌تان آماده است یا یادداشت‌هایی دارید که باید کتاب شوند — اینجا همان جایی است که متن‌تان به کتابی خواندنی تبدیل می‌شود؛ با جلد، فصل‌بندی و جایگاهِ دائمی در کتابخانه.
          </p>

          {/* steps timeline */}
          <ol className="relative mt-10 space-y-8 border-r border-night-600 pr-8">
            {steps.map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -right-[45px] top-0.5 grid h-8 w-8 place-items-center rounded-full bg-night-700 font-display text-base text-turq-400 ring-1 ring-turq-500/40">
                  {faNum(i + 1)}
                </span>
                <p className="font-display text-lg text-mist-100">{s.t}</p>
                <p className="mt-1 text-xs leading-6 text-mist-500">{s.d}</p>
              </li>
            ))}
          </ol>

          {/* formats */}
          <div className="mt-10">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold text-mist-500"><IconLayers size={15} className="text-turq-400" /> قالب‌های پشتیبانی‌شده</p>
            <div className="flex flex-wrap gap-2.5">
              {FORMATS.map((f) => (
                <div key={f.ext} className="group rounded-md border border-night-500 bg-night-800/70 px-4 py-2.5 transition-colors hover:border-turq-500/50">
                  <p className="font-display text-base text-turq-400">{f.ext}</p>
                  <p className="mt-0.5 max-w-[180px] text-[10px] leading-5 text-mist-500">{f.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* the form */}
        <div className="rounded-xl border border-night-500/70 bg-night-800/70 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-mist-400">عنوان کتاب *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: باغِ آینه‌ها"
                className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-mist-400">نام نویسنده *</span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="نام و نام خانوادگی"
                className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-mist-400">دسته‌بندی</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 focus:border-turq-500/60 focus:outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-mist-400">برچسب‌ها (با ویرگول جدا کنید)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="داستان، فلسفه، …"
                className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-mist-400">معرفی کوتاه کتاب</span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="خواننده چرا باید این کتاب را بخواند؟"
                className="w-full resize-none rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm leading-6 text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none" />
            </label>
          </div>

          {/* cover: image upload + fallback color */}
          <div className="mt-5">
            <CoverPicker
              title={title}
              author={author}
              category={category}
              cover={cover}
              coverColor={color}
              onCover={setCover}
              onColor={setColor}
              toast={toast}
              accent="turq"
            />
          </div>

          {/* upload zone */}
          <div className="mt-6">
            <span className="mb-2 block text-xs font-bold text-mist-400">فایل کتاب <span className="font-normal text-mist-500">— یک یا چند فایل</span></span>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const fs = Array.from(e.dataTransfer.files || []);
                if (fs.length) parseFiles(fs, false);
              }}
              onClick={() => fileRef.current?.click()}
              className={cx(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all',
                dragOver ? 'border-turq-500 bg-turq-500/10' : 'border-night-500 bg-night-900/40 hover:border-turq-500/50 hover:bg-night-900/70',
              )}
            >
              {parsing ? (
                <>
                  <span className="spin-slow h-8 w-8 rounded-full border-2 border-night-500 border-t-turq-400" style={{ animationDuration: '1.2s' }} />
                  <p className="text-sm font-bold text-turq-400">در حال خواندن و فصل‌بندیِ فایل‌ها…</p>
                </>
              ) : chapters && fileNames.length ? (
                <>
                  <IconCheck size={26} className="text-turq-400" />
                  <p className="text-sm font-bold text-mist-100">
                    {fileNames.length > 1 ? `${faNum(fileNames.length)} فایل پردازش و ادغام شد` : fileNames[0]}
                  </p>
                  <p className="text-xs text-turq-400">{faNum(chapters.length)} فصل · {faNum(words)} واژه — آمادهٔ انتشار</p>
                  {fileNames.length > 1 && (
                    <div className="mt-1.5 flex max-w-full flex-wrap justify-center gap-1.5">
                      {fileNames.slice(0, 4).map((n) => (
                        <span key={n} className="rounded bg-night-700 px-2 py-0.5 text-[10px] text-mist-400">{n}</span>
                      ))}
                      {fileNames.length > 4 && <span className="text-[10px] text-mist-500">و {faNum(fileNames.length - 4)} فایل دیگر…</span>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <IconUpload size={26} className="text-mist-500" />
                  <p className="text-sm font-bold text-mist-300">فایل‌ها را این‌جا رها کنید یا کلیک کنید</p>
                  <p className="text-[11px] text-mist-500">TXT · Markdown · HTML · DOCX · PDF — می‌توانید چند فایل (مثلاً فصل‌های جداگانهٔ Markdown) را با هم انتخاب کنید</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => {
                  const fs = Array.from(e.target.files || []);
                  if (fs.length) parseFiles(fs, false);
                  e.target.value = '';
                }}
              />
            </div>

            {chapters && (
              <button
                onClick={() => moreRef.current?.click()}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-night-500 px-3.5 py-1.5 text-[11px] font-medium text-mist-400 transition-colors hover:border-turq-500/50 hover:text-turq-400"
              >
                <IconPlus size={13} /> افزودن فایل‌های دیگر به همین کتاب
              </button>
            )}
            <input
              ref={moreRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const fs = Array.from(e.target.files || []);
                if (fs.length) parseFiles(fs, true);
                e.target.value = '';
              }}
            />
          </div>

          {/* paste fallback */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-mist-400">یا متن را همین‌جا بچسبانید</span>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-mist-500">
                <input type="checkbox" checked={asMarkdown} onChange={(e) => setAsMarkdown(e.target.checked)} className="accent-[#3fc8b4]" />
                متن Markdown است
              </label>
            </div>
            <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5}
              placeholder={'فصل یک؛ آغاز راه\n\nمتنِ فصل این‌جا می‌آید…\n\nفصل دوم\n\nو فصلِ بعد…'}
              className="w-full resize-y rounded-md border border-night-500 bg-night-900/60 px-3.5 py-3 text-sm leading-7 text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none" />
            <button onClick={handlePaste} disabled={!pasted.trim()}
              className="mt-2 rounded-md border border-night-500 px-4 py-1.5 text-xs font-medium text-mist-300 transition-colors enabled:hover:border-turq-500/50 enabled:hover:text-turq-400 disabled:opacity-40">
              پردازش متن چسبانده‌شده
            </button>
          </div>

          {/* chapter preview */}
          {chapters && (
            <div className="pop-in mt-6 rounded-lg border border-night-600 bg-night-900/50 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold text-mist-400">
                <IconLayers size={15} className="text-turq-400" /> پیش‌نمایش فصل‌بندی <span className="text-mist-500">({faNum(chapters.length)} فصل)</span>
              </p>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pe-1">
                {chapters.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-night-800/80 px-3 py-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-night-600 text-[10px] font-bold text-turq-400">{faNum(i + 1)}</span>
                      <span className="truncate font-medium text-mist-200">{c.title}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-mist-500">{faNum(c.paras.length)} بند</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={publish}
            disabled={!chapters || !title.trim() || !author.trim()}
            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-md bg-turq-500 px-6 py-3.5 text-sm font-black text-night-900 shadow-[0_14px_34px_rgba(63,200,180,0.25)] transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-turq-400 disabled:opacity-35"
          >
            <IconFeather size={19} /> انتشار کتاب در کتابخانه
          </button>
          <p className="mt-2.5 text-center text-[10px] text-mist-500">کتاب منتشرشده در دستگاه شما ذخیره می‌شود و همراه کتاب‌های کتابخانه به همهٔ خوانندگان نمایش داده خواهد شد.</p>
        </div>
      </div>

      {/* published list */}
      {uploads.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 flex items-center gap-3 font-display text-2xl text-mist-100">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-turq-500/12 text-turq-400 ring-1 ring-turq-500/25"><IconFeather size={18} /></span>
            کتاب‌های منتشرشده از این درگاه <span className="rounded bg-night-700 px-2.5 py-0.5 text-sm text-turq-400">{faNum(uploads.length)}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((b) => (
              <div key={b.id} className="group flex items-center gap-4 rounded-lg border border-night-500/60 bg-night-800/60 p-3.5 transition-colors hover:border-turq-500/40">
                <button onClick={() => onRead(b)} className="h-20 w-14 shrink-0 overflow-hidden rounded transition-transform group-hover:-translate-y-1">
                  <Cover book={b} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg text-mist-100 group-hover:text-turq-400">{b.title}</p>
                  <p className="truncate text-[11px] text-mist-500">{b.author} · {b.category}</p>
                  <p className="mt-0.5 text-[11px] text-mist-500">{faNum(b.chapters.length)} فصل · {faNum(b.minutes)} دقیقه</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => onRead(b)} className="rounded bg-turq-500/12 px-2.5 py-1 text-[11px] font-bold text-turq-400 transition-colors hover:bg-turq-500/25">خواندن</button>
                  <button onClick={() => onEdit(b)} className="flex items-center justify-center gap-1 rounded bg-gold-500/12 px-2.5 py-1 text-[11px] font-bold text-gold-400 transition-colors hover:bg-gold-500/25"><IconPencil size={12} /> ویرایش</button>
                  <button onClick={() => onDelete(b.id)} className="flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] text-rose-500 transition-colors hover:bg-rose-500/10"><IconTrash size={12} /> حذف</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
