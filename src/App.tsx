import { useCallback, useEffect, useMemo, useState } from 'react';
import Ambient from './components/Ambient';
import AuthorPortal from './components/AuthorPortal';
import BookEditor from './components/BookEditor';
import BookModal from './components/BookModal';
import Header from './components/Header';
import LibraryView from './components/LibraryView';
import Reader from './components/Reader';
import { IconCheck } from './components/Icons';
import { seedBooks, seedReviews } from './data/library';
import type { Book, Bookmark, Highlight, Progress, ReaderSettings, Review } from './lib/core';
import { KEYS, load, save, uid } from './lib/core';

type View = 'library' | 'authors';
interface Toast { id: string; msg: string; }

export default function App() {
  const [view, setView] = useState<View>('library');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Book | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [reader, setReader] = useState<{ book: Book; chapter: number } | null>(null);

  const [uploads, setUploads] = useState<Book[]>(() => load<Book[]>(KEYS.uploads, []));
  const [edits, setEdits] = useState<Book[]>(() => load<Book[]>(KEYS.edits, []));
  const [reviews, setReviews] = useState<Review[]>(() => load<Review[]>(KEYS.reviews, seedReviews));
  const [highlights, setHighlights] = useState<Highlight[]>(() => load<Highlight[]>(KEYS.highlights, []));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => load<Bookmark[]>(KEYS.bookmarks, []));
  const [progress, setProgress] = useState<Record<string, Progress>>(() => load(KEYS.progress, {}));
  const [myShelf, setMyShelf] = useState<string[]>(() => load<string[]>(KEYS.myshelf, ['hafez', 'masnavi']));
  const [settings, setSettings] = useState<ReaderSettings>(() =>
    load<ReaderSettings>(KEYS.settings, { theme: 'night', font: 'vazir', size: 18, lh: 2.0, width: 'normal' }),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => save(KEYS.uploads, uploads), [uploads]);
  useEffect(() => save(KEYS.edits, edits), [edits]);
  useEffect(() => save(KEYS.reviews, reviews), [reviews]);
  useEffect(() => save(KEYS.highlights, highlights), [highlights]);
  useEffect(() => save(KEYS.bookmarks, bookmarks), [bookmarks]);
  useEffect(() => save(KEYS.progress, progress), [progress]);
  useEffect(() => save(KEYS.myshelf, myShelf), [myShelf]);
  useEffect(() => save(KEYS.settings, settings), [settings]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const books = useMemo(
    () => [
      ...uploads,
      ...edits,
      ...seedBooks.filter((s) => !edits.some((e) => e.id === s.id)),
    ],
    [uploads, edits],
  );

  const toast = useCallback((msg: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const openReader = useCallback((book: Book, chapter?: number) => {
    const ch = chapter ?? progress[book.id]?.chapter ?? 0;
    setModal(null);
    setReader({ book, chapter: Math.min(ch, book.chapters.length - 1) });
  }, [progress]);

  const saveProgress = useCallback((p: Progress) => {
    if (!reader) return;
    setProgress((prev) => {
      const old = prev[reader.book.id];
      const merged = old && old.chapter === p.chapter ? { ...p, pct: Math.max(old.pct, p.pct) } : p;
      return { ...prev, [reader.book.id]: merged };
    });
  }, [reader]);

  const toggleShelf = useCallback((id: string) => {
    setMyShelf((s) => {
      const has = s.includes(id);
      toast(has ? 'از قفسهٔ شما برداشته شد' : 'به قفسهٔ شما افزوده شد');
      return has ? s.filter((x) => x !== id) : [...s, id];
    });
  }, [toast]);

  const publish = useCallback((b: Book) => {
    setUploads((u) => [b, ...u]);
    toast(`«${b.title}» منتشر شد و در قفسه نشست 🎉`);
  }, [toast]);

  const openEditor = useCallback((b: Book) => {
    setModal(null);
    setEditing(b);
  }, []);

  const updateBook = useCallback((b: Book) => {
    setUploads((u) => (u.some((x) => x.id === b.id) ? u.map((x) => (x.id === b.id ? b : x)) : u));
    setEdits((e) =>
      seedBooks.some((s) => s.id === b.id) ? [...e.filter((x) => x.id !== b.id), b] : e,
    );
    setReader((r) =>
      r && r.book.id === b.id ? { ...r, book: b, chapter: Math.min(r.chapter, b.chapters.length - 1) } : r,
    );
    setEditing(null);
    toast(`تغییرات «${b.title}» ذخیره شد`);
  }, [toast]);

  const deleteUpload = useCallback((id: string) => {
    setUploads((u) => u.filter((b) => b.id !== id));
    setReviews((r) => r.filter((x) => x.bookId !== id));
    setHighlights((h) => h.filter((x) => x.bookId !== id));
    setBookmarks((b) => b.filter((x) => x.bookId !== id));
    setProgress((p) => { const n = { ...p }; delete n[id]; return n; });
    setModal(null);
    toast('اثر حذف شد');
  }, [toast]);

  const goDesk = useCallback(() => {
    setView('library');
    setTimeout(() => document.getElementById('desk')?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  return (
    <div className="min-h-screen">
      <Ambient />
      <Header view={view} onNav={setView} onDesk={goDesk} query={query} setQuery={setQuery} />

      <main>
        {view === 'library' ? (
          <LibraryView
            books={books}
            progress={progress}
            highlights={highlights}
            bookmarks={bookmarks}
            reviews={reviews}
            myShelf={myShelf}
            query={query}
            onRead={openReader}
            onOpen={setModal}
            onToggleShelf={toggleShelf}
            onEdit={openEditor}
            onGoAuthors={() => setView('authors')}
          />
        ) : (
          <AuthorPortal uploads={uploads} onPublish={publish} onDelete={deleteUpload} onEdit={openEditor} toast={toast} onRead={openReader} />
        )}
      </main>

      {modal && (
        <BookModal
          book={modal}
          reviews={reviews}
          inShelf={myShelf.includes(modal.id)}
          onClose={() => setModal(null)}
          onRead={openReader}
          onToggleShelf={toggleShelf}
          onAddReview={(r) => { setReviews((x) => [r, ...x]); toast('نقد شما ثبت شد — سپاس از نگاه دقیق‌تان'); }}
          onDeleteReview={(id) => setReviews((x) => x.filter((r) => r.id !== id))}
          onEdit={openEditor}
          onDeleteBook={modal.uploaded ? deleteUpload : undefined}
        />
      )}

      {editing && (
        <BookEditor
          key={editing.id}
          book={editing}
          onSave={updateBook}
          onClose={() => setEditing(null)}
          toast={toast}
        />
      )}

      {reader && (
        <Reader
          key={reader.book.id}
          book={reader.book}
          initialChapter={reader.chapter}
          progress={progress[reader.book.id]}
          highlights={highlights}
          bookmarks={bookmarks}
          settings={settings}
          onSettings={setSettings}
          onSaveProgress={saveProgress}
          onHighlights={setHighlights}
          onBookmarks={setBookmarks}
          onClose={() => setReader(null)}
          toast={toast}
        />
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-lg border border-gold-500/25 bg-night-700/95 px-4 py-3 text-sm font-medium text-mist-100 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-gold-500/20 text-gold-400"><IconCheck size={12} /></span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
