import { useState, useCallback, useMemo, useEffect } from 'react';
import Ambient from './components/Ambient';
import Header from './components/Header';
import LibraryView from './components/LibraryView';
import AuthorPortal from './components/AuthorPortal';
import BookModal from './components/BookModal';
import BookEditor from './components/BookEditor';
import PdfLab from './components/PdfLab';
import Reader from './components/Reader';
import LoadingScreen from './components/LoadingScreen';
import { useApp } from './lib/app-context';
import { useAuth } from './lib/auth';
import type { Book } from './lib/core';
import { IconCheck } from './components/Icons';

interface MainAppProps {
  onAuthRequired: (mode: 'login' | 'register') => void;
}

export default function MainApp({ onAuthRequired }: MainAppProps) {
  const { user, profile, signOut } = useAuth();
  const {
    books,
    reviews,
    highlights,
    bookmarks,
    progress,
    myShelf,
    settings,
    loading,
    publishBook,
    updateBook,
    deleteBook,
    addReview,
    deleteReview,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    toggleBookmark,
    saveProgress,
    toggleShelf,
    updateSettings,
    toast,
    toasts,
  } = useApp();

  const [view, setView] = useState<'library' | 'authors'>('library');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Book | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [reader, setReader] = useState<{ book: Book; chapter: number } | null>(null);
  const [labOpen, setLabOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const openReader = useCallback((book: Book, chapter?: number) => {
    const ch = chapter ?? progress[book.id]?.chapter ?? 0;
    setModal(null);
    setReader({ book, chapter: Math.min(ch, book.chapters.length - 1) });
  }, [progress]);

  const openEditor = useCallback((b: Book) => {
    if (!user) {
      onAuthRequired('login');
      return;
    }
    setModal(null);
    setEditing(b);
  }, [user, onAuthRequired]);

  const handlePublish = useCallback(async (b: Book) => {
    try {
      await publishBook(b);
    } catch {
      // error handled in context
    }
  }, [publishBook]);

  const handleUpdateBook = useCallback(async (b: Book) => {
    try {
      await updateBook(b);
      setReader((r) =>
        r && r.book.id === b.id ? { ...r, book: b, chapter: Math.min(r.chapter, b.chapters.length - 1) } : r,
      );
      setEditing(null);
    } catch {
      // error handled in context
    }
  }, [updateBook]);

  const handleDeleteUpload = useCallback(async (id: string) => {
    try {
      await deleteBook(id);
      setModal(null);
    } catch {
      // error handled in context
    }
  }, [deleteBook]);

  const handleToggleShelf = useCallback(async (id: string) => {
    if (!user) {
      onAuthRequired('login');
      return;
    }
    try {
      await toggleShelf(id);
    } catch {
      // error handled in context
    }
  }, [user, toggleShelf, onAuthRequired]);

  const handleAddReview = useCallback(async (bookId: string, name: string, rating: number, text: string) => {
    if (!user) {
      onAuthRequired('login');
      return;
    }
    try {
      await addReview({ bookId, name: name || profile?.display_name || 'خوانندهٔ ناشناس', rating, text });
    } catch {
      // error handled in context
    }
  }, [user, profile, addReview, onAuthRequired]);

  const handleDeleteReview = useCallback(async (id: string) => {
    try {
      await deleteReview(id);
    } catch {
      // error handled in context
    }
  }, [deleteReview]);

  const handleSaveProgress = useCallback(async (bookId: string, p: { chapter: number; pct: number }) => {
    try {
      await saveProgress(bookId, { ...p, updatedAt: Date.now() });
    } catch {
      // error handled in context
    }
  }, [saveProgress]);

  const handleAddHighlight = useCallback(async (highlight: Omit<Parameters<typeof addHighlight>[0], 'id' | 'createdAt'>) => {
    if (!user) {
      onAuthRequired('login');
      return;
    }
    try {
      await addHighlight(highlight);
    } catch {
      // error handled in context
    }
  }, [user, addHighlight, onAuthRequired]);

  const handleUpdateHighlight = useCallback(async (id: string, note: string) => {
    try {
      await updateHighlight(id, note);
    } catch {
      // error handled in context
    }
  }, [updateHighlight]);

  const handleDeleteHighlight = useCallback(async (id: string) => {
    try {
      await deleteHighlight(id);
    } catch {
      // error handled in context
    }
  }, [deleteHighlight]);

  const handleToggleBookmark = useCallback(async (bookId: string, chapter: number) => {
    if (!user) {
      onAuthRequired('login');
      return;
    }
    try {
      await toggleBookmark(bookId, chapter);
    } catch {
      // error handled in context
    }
  }, [user, toggleBookmark, onAuthRequired]);

  const goDesk = useCallback(() => {
    setView('library');
    setTimeout(() => document.getElementById('desk')?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen">
      <Ambient />
      <Header
        view={view}
        onNav={setView}
        onDesk={goDesk}
        query={query}
        setQuery={setQuery}
        onLab={() => setLabOpen(true)}
        user={user}
        profile={profile}
        onSignOut={signOut}
        onAuthRequired={onAuthRequired}
      />

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
            onToggleShelf={handleToggleShelf}
            onEdit={openEditor}
            onGoAuthors={() => setView('authors')}
          />
        ) : (
          <AuthorPortal
            books={books}
            onPublish={handlePublish}
            onDelete={handleDeleteUpload}
            onEdit={openEditor}
            toast={toast}
            onRead={openReader}
            user={user}
          />
        )}
      </main>

      {modal && (
        <BookModal
          book={modal}
          reviews={reviews.filter((r) => r.bookId === modal.id)}
          inShelf={myShelf.includes(modal.id)}
          onClose={() => setModal(null)}
          onRead={openReader}
          onToggleShelf={handleToggleShelf}
          onAddReview={handleAddReview}
          onDeleteReview={handleDeleteReview}
          onEdit={openEditor}
          onDeleteBook={modal.uploaded ? handleDeleteUpload : undefined}
          user={user}
        />
      )}

      {editing && (
        <BookEditor
          key={editing.id}
          book={editing}
          onSave={handleUpdateBook}
          onClose={() => setEditing(null)}
          toast={toast}
        />
      )}

      {labOpen && <PdfLab onClose={() => setLabOpen(false)} toast={toast} onPublish={handlePublish} />}

      {reader && (
        <Reader
          key={reader.book.id}
          book={reader.book}
          initialChapter={reader.chapter}
          progress={progress[reader.book.id]}
          highlights={highlights.filter((h) => h.bookId === reader.book.id)}
          bookmarks={bookmarks.filter((b) => b.bookId === reader.book.id)}
          settings={settings}
          onSettings={updateSettings}
          onSaveProgress={async (bookId, p) => {
            try {
              await saveProgress(bookId, { ...p, updatedAt: Date.now() });
            } catch {
              // error handled in context
            }
          }}
          onAddHighlight={handleAddHighlight}
          onUpdateHighlight={handleUpdateHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          onToggleBookmark={async (bookId, chapter) => {
            if (!user) {
              onAuthRequired('login');
              return;
            }
            try {
              await toggleBookmark(bookId, chapter);
            } catch {
              // error handled in context
            }
          }}
          onClose={() => setReader(null)}
          toast={toast}
        />
      )}

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
