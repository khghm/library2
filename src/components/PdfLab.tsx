import { useRef, useState } from 'react';
import { cx, faDigits, faNum } from '../lib/core';
import { arabicTextQuality, getPdfJs, pdfOcrExtract, pdfTextExtract } from '../lib/parsers';
import { textToChapters } from '../lib/parsers';
import { IconClose, IconUpload, IconBook, IconFeather } from './Icons';
import type { Book } from '../lib/core';
import { uid } from '../lib/core';

interface Props {
  onClose: () => void;
  toast: (m: string) => void;
  onPublish?: (book: Book) => void;
}

type Stage = 'idle' | 'preview' | 'text' | 'deciding' | 'ocr' | 'done';

const fmt = (n: number) => faDigits(n.toFixed(3));

/** builds a real Persian PDF (image-based) from uploaded file for testing */
async function makeSamplePdf(uploadedFile?: File): Promise<File> {
  if (uploadedFile) {
    return uploadedFile;
  }

  const { PDFDocument } = await import('pdf-lib');
  try {
    await document.fonts.load('46px Vazirmatn');
    await document.fonts.load('60px Lalezar');
  } catch {
    /* fall back to system fonts */
  }
  await new Promise((r) => setTimeout(r, 120));

  const W = 1240;
  const PAD = 90;
  const LINE_H = 76;
  const FONT = '46px Vazirmatn, Tahoma, sans-serif';
  const meas = document.createElement('canvas').getContext('2d');
  if (!meas) throw new Error('canvas');
  meas.font = FONT;

  const sampleParas = [
    'جوانی مهم‌ترین دوران زندگی انسان است؛ دورانی که در آن انتخاب‌های بزرگ انجام می‌شود و مسیر آیندهٔ آدمی شکل می‌گیرد.',
    'هر انتخابی که در جوانی می‌کنیم، همچون بذری است که در زمینِ دل کاشته می‌شود و روزی به بار خواهد نشست؛ پس باید دانست چه می‌کاریم.',
    'آن‌که در جوانی راه درست را برگزیند، در بزرگسالی آرامش و سربلندی خواهد داشت و آن‌که غفلت کند، پشیمانی بر او چیره خواهد شد.',
    'انتخاب بزرگ، انتخابی است که با جان و دل آدمی سروکار دارد؛ انتخاب میان خوبی و بدی، میان ماندن و گذشتن، میان ابدیت و فنا.',
  ];

  const wrapped: string[] = [];
  for (const para of sampleParas) {
    let line = '';
    for (const w of para.split(' ')) {
      const test = line ? `${line} ${w}` : w;
      if (meas.measureText(test).width > W - PAD * 2 && line) {
        wrapped.push(line);
        line = w;
      } else line = test;
    }
    if (line) wrapped.push(line);
    wrapped.push('');
  }
  const H = PAD * 2 + wrapped.length * LINE_H + 170;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fbf7ec';
  ctx.fillRect(0, 0, W, H);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#8a6a24';
  ctx.font = '60px Lalezar, Vazirmatn, sans-serif';
  ctx.fillText('جوان و انتخاب بزرگ', W - PAD, PAD + 30);
  ctx.fillStyle = '#26221a';
  ctx.font = FONT;
  let y = PAD + 140;
  for (const line of wrapped) {
    if (line === '') {
      y += LINE_H * 0.45;
      continue;
    }
    ctx.fillText(line, W - PAD, y);
    y += LINE_H;
  }

  const jpeg = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = await PDFDocument.create();
  const img = await pdf.embedJpg(jpeg);
  const page = pdf.addPage([690, Math.round((690 / W) * H)]);
  page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  const bytes = await pdf.save();
  return new File([bytes as unknown as BlobPart], 'javan-va-entekhab-e-bozorg.pdf', { type: 'application/pdf' });
}

export default function PdfLab({ onClose, toast, onPublish }: Props) {
  const [fileName, setFileName] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [note, setNote] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [quality, setQuality] = useState<number | null>(null);
  const [decision, setDecision] = useState<'text' | 'ocr' | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrQuality, setOcrQuality] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<'text' | 'ocr' | 'compare'>('compare');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('idle');
    setFileName('');
    setPreviewUrl('');
    setRawText('');
    setQuality(null);
    setDecision(null);
    setOcrText('');
    setOcrQuality(null);
    setNote('');
    setUploadedFile(null);
  };

  const analyze = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('لطفاً فقط فایل PDF بدهید.');
      return;
    }
    reset();
    setFileName(file.name);
    setUploadedFile(file);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();

      /* 1) preview — render the real first page */
      setStage('preview');
      setNote('در حال رندر پیش‌نمایش صفحهٔ نخست…');
      try {
        const pdfjs = await getPdfJs();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
        const page = await doc.getPage(1);
        const vp = page.getViewport({ scale: Math.min(2, 900 / page.getViewport({ scale: 1 }).width) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        await page.render({ canvas, viewport: vp }).promise;
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        /* preview optional */
      }

      /* 2) text-layer extraction */
      setStage('text');
      setNote('در حال استخراج لایهٔ متنی…');
      let text = '';
      try {
        text = await pdfTextExtract(buf.slice(0));
      } catch (e) {
        text = '';
        setNote(e instanceof Error ? e.message : 'خطا در استخراج');
      }
      setRawText(text);
      const q = arabicTextQuality(text);
      setQuality(q);

      /* 3) decide */
      setStage('deciding');
      const hasText = text.replace(/\s+/g, '').length >= 40;
      const good = hasText && q >= 0.03;
      setDecision(good ? 'text' : 'ocr');

      /* 4) if the text layer is unusable, run OCR */
      if (!good) {
        setStage('ocr');
        try {
          const ocr = await pdfOcrExtract(buf.slice(0), (_p: number, n: string) => setNote(n));
          setOcrText(ocr);
          setOcrQuality(arabicTextQuality(ocr));
        } catch (e) {
          setOcrText(`بازخوانی تصویری ناموفق بود: ${e instanceof Error ? e.message : 'خطای ناشناخته'}`);
        }
      } else {
        setOcrText('');
      }

      setStage('done');
      setNote('');
      setTab(good ? 'text' : 'compare');
      toast(good ? 'لایهٔ متنی این PDF سالم است.' : 'لایهٔ متنی خراب بود؛ بازخوانی تصویری انجام شد.');
    } finally {
      setBusy(false);
    }
  };

  const shown = decision === 'text' ? rawText : ocrText || rawText;

  const handlePublish = () => {
    const text = shown.trim();
    if (!text) {
      toast('متنی برای انتشار وجود ندارد.');
      return;
    }
    if (!bookTitle.trim()) {
      toast('لطفاً عنوان کتاب را وارد کنید.');
      return;
    }
    if (!bookAuthor.trim()) {
      toast('لطفاً نام نویسنده را وارد کنید.');
      return;
    }

    const chapters = textToChapters(text, true);
    const words = text.split(/\s+/).filter(Boolean).length;
    const book: Book = {
      id: `pdf-${uid()}`,
      title: bookTitle.trim(),
      author: bookAuthor.trim(),
      category: 'عمومی',
      desc: `کتاب «${bookTitle.trim()}» که از طریق آزمایشگاه PDF استخراج و منتشر شده است.`,
      chapters,
      uploaded: true,
      uploader: undefined,
      createdAt: Date.now(),
      originalPdf: true,
      minutes: Math.max(2, Math.round(words / 190)),
      year: new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(Date.now()),
      pages: Math.max(4, Math.round(words / 230)),
      tags: [],
    };

    if (onPublish) {
      onPublish(book);
      toast(`«${book.title}» منتشر شد!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="pop-in relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-night-500/70 bg-night-800 shadow-[0_40px_90px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-night-600 px-5 py-3.5">
          <div>
            <h2 className="font-display text-2xl text-mist-100">آزمایشگاه پردازش PDF</h2>
            <p className="text-[11px] text-mist-500">هر PDF فارسی/عربی را بدهید تا ببینید دقیقاً چه اتفاقی می‌افتد</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-mist-500 transition-colors hover:bg-night-700 hover:text-mist-100" aria-label="بستن">
            <IconClose size={19} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          {/* drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) analyze(f); }}
            onClick={() => fileRef.current?.click()}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-7 text-center transition-all',
              dragOver ? 'border-gold-500 bg-gold-500/10' : 'border-night-500 bg-night-900/40 hover:border-gold-500/50 hover:bg-night-900/70',
            )}
          >
            {busy ? (
              <>
                <span className="spin-slow h-8 w-8 rounded-full border-2 border-night-500 border-t-gold-400" style={{ animationDuration: '1.1s' }} />
                <p className="text-sm font-bold text-gold-400">{note || 'در حال پردازش…'}</p>
                <p className="text-[11px] text-mist-500">{fileName}</p>
              </>
            ) : (
              <>
                <IconUpload size={24} className="text-mist-500" />
                <p className="text-sm font-bold text-mist-300">فایل PDF را این‌جا رها کنید یا کلیک کنید</p>
                <p className="text-[11px] text-mist-500">پیش‌نمایش + استخراج متن + نمرهٔ کیفیت + بازخوانی تصویری</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); e.target.value = ''; }} />
          </div>

          {/* one-click sample built from the uploaded PDF or fallback to sample */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-gold-300">
                {uploadedFile ? `آزمایش روی PDF آپلودشده: ${uploadedFile.name}` : 'نمونهٔ آماده: «جوان و انتخاب بزرگ»'}
              </p>
              <p className="text-[11px] text-mist-500">
                {uploadedFile
                  ? 'همین‌جا پردازش می‌شود تا نتیجه را ببینید.'
                  : 'چند سطر از کتاب به یک PDF واقعی تبدیل و همین‌جا پردازش می‌شود تا نتیجه را ببینید.'}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                try {
                  const f = await makeSamplePdf(uploadedFile ?? undefined);
                  await analyze(f);
                } catch {
                  toast('ساخت نمونه ناموفق بود.');
                }
              }}
              className="rounded-md bg-gold-500 px-4 py-2 text-xs font-bold text-night-900 transition-all enabled:hover:bg-gold-400 disabled:opacity-40"
            >
              {uploadedFile ? 'آزمایش PDF آپلودشده' : 'ساخت و آزمایش نمونه'}
            </button>
          </div>

          {/* results */}
          {(stage !== 'idle') && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
              {/* left: preview + diagnostics */}
              <div className="space-y-4">
                {previewUrl && (
                  <div>
                    <p className="mb-2 text-xs font-bold text-mist-400">صفحهٔ نخست (آن‌چه خود PDF نشان می‌دهد)</p>
                    <img src={previewUrl} alt="پیش‌نمایش صفحهٔ نخست" className="w-full rounded-md border border-night-500 shadow-lg" />
                  </div>
                )}
                <div className="space-y-3 rounded-lg border border-night-500/70 bg-night-900/50 p-4">
                  <p className="text-xs font-bold text-mist-400">نتیجهٔ تشخیص</p>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-mist-500">
                      <span>کیفیت لایهٔ متنی</span>
                      <span className="font-bold text-mist-200">{quality === null ? '—' : fmt(quality)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-night-600">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (quality || 0) * 100)}%`, background: (quality || 0) >= 0.03 ? '#3fc8b4' : '#c9564e' }} />
                    </div>
                    <p className="mt-1 text-[10px] text-mist-500">آستانهٔ پذیرش: {fmt(0.03)}</p>
                  </div>

                  {decision && (
                    <div className={cx('rounded-md border px-3 py-2.5 text-xs leading-6', decision === 'text' ? 'border-turq-500/40 bg-turq-500/10 text-turq-300' : 'border-gold-500/40 bg-gold-500/10 text-gold-300')}>
                      {decision === 'text'
                        ? 'متن مستقیم از لایهٔ متنی PDF خوانده شد — سالم است.'
                        : 'لایهٔ متنی قابل اعتماد نیست — بازخوانی تصویری (OCR) انجام شد.'}
                    </div>
                  )}

                  {ocrQuality !== null && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-mist-500">
                        <span>کیفیت متنِ بازخوانی‌شده</span>
                        <span className="font-bold text-mist-200">{fmt(ocrQuality)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-night-600">
                        <div className="h-full rounded-full bg-turq-500 transition-all duration-700" style={{ width: `${Math.min(100, ocrQuality * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* right: text output */}
              <div className="flex min-w-0 flex-col">
                <div className="mb-2 flex items-center gap-1">
                  {([['compare', 'متن نهایی'], ['text', 'لایهٔ متنی خام'], ['ocr', 'خروجی OCR']] as const).map(([k, label]) => {
                    if (k === 'ocr' && decision !== 'ocr') return null;
                    return (
                      <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={cx('relative rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors', tab === k ? 'text-gold-400' : 'text-mist-500 hover:text-mist-200')}
                      >
                        {label}
                        {tab === k && <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gold-500" />}
                      </button>
                    );
                  })}
                </div>

                <div dir="rtl" className="min-h-[300px] flex-1 overflow-y-auto rounded-lg border border-night-500/70 bg-night-900/60 p-5">
                  {stage === 'done' ? (
                    tab === 'compare' ? (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-rose-500">لایهٔ متنی خام PDF</p>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-mist-400">{rawText.slice(0, 1500) || '(خالی)'}</p>
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-turq-400">{decision === 'text' ? 'همان لایهٔ متنی (سالم)' : 'متن بازخوانی‌شده (OCR)'}</p>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-mist-100">{shown.slice(0, 1500) || '(خالی)'}</p>
                        </div>
                      </div>
                    ) : tab === 'text' ? (
                      <p className="whitespace-pre-wrap text-sm leading-7 text-mist-100">{rawText || '(خالی)'}</p>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-7 text-mist-100">{ocrText || '(خالی)'}</p>
                    )
                  ) : (
                    <p className="text-sm text-mist-500">{note || 'در حال پردازش…'}</p>
                  )}
                </div>

                {stage === 'done' && (
                  <p className="mt-2 text-[11px] text-mist-500">
                    {faNum(shown.split(/\s+/).filter(Boolean).length)} واژه · {faNum(rawText.length)} نویسه در لایهٔ متنی
                  </p>
                )}
              </div>
            </div>
          )}

          {/* publish section */}
          {stage === 'done' && onPublish && (
            <div className="mt-5 rounded-lg border border-turq-500/30 bg-turq-500/[0.06] p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-turq-400">
                <IconBook size={18} /> انتشار این متن به‌عنوان کتاب در کتابخانه
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-mist-400">عنوان کتاب *</span>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="مثلاً: جوان و انتخاب بزرگ"
                    className="w-full rounded-md border border-night-500 bg-night-900/60 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-mist-400">نام نویسنده *</span>
                  <input
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    placeholder="نام نویسنده"
                    className="w-full rounded-md border border-night-500 bg-night-900/60 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-turq-500/60 focus:outline-none"
                  />
                </label>
              </div>
              <button
                onClick={handlePublish}
                disabled={!bookTitle.trim() || !bookAuthor.trim()}
                className="mt-4 flex items-center justify-center gap-2 rounded-md bg-turq-500 px-6 py-3 text-sm font-black text-night-900 transition-all enabled:hover:bg-turq-400 disabled:opacity-35"
              >
                <IconFeather size={18} /> انتشار کتاب در قفسهٔ کتابخانه
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
