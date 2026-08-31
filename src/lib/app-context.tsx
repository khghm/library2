import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import type { Book, Review, Highlight, Bookmark, Progress, ReaderSettings } from './core';
import { uid } from './core';
import * as api from './api';
import { seedBooks, seedReviews } from '../data/library';

interface AppContextType {
  books: Book[];
  reviews: Review[];
  highlights: Highlight[];
  bookmarks: Bookmark[];
  progress: Record<string, Progress>;
  myShelf: string[];
  settings: ReaderSettings;
  loading: boolean;
  error: string | null;
  refreshBooks: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  publishBook: (book: Book) => Promise<void>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  addReview: (review: Omit<Review, 'id' | 'date'>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => Promise<void>;
  updateHighlight: (id: string, note: string) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  toggleBookmark: (bookId: string, chapter: number) => Promise<void>;
  saveProgress: (bookId: string, progress: Progress) => Promise<void>;
  toggleShelf: (bookId: string) => Promise<void>;
  updateSettings: (settings: Partial<ReaderSettings>) => Promise<void>;
  toast: (msg: string) => void;
  toasts: { id: string; msg: string }[];
}

const defaultSettings: ReaderSettings = {
  theme: 'night',
  font: 'vazir',
  size: 18,
  lh: 2.0,
  width: 'normal',
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, settings: dbSettings } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [myShelf, setMyShelf] = useState<string[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  const toast = useCallback((msg: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    if (dbSettings) {
      setSettings({
        theme: dbSettings.theme as ReaderSettings['theme'],
        font: dbSettings.font as ReaderSettings['font'],
        size: dbSettings.font_size,
        lh: dbSettings.line_height,
        width: dbSettings.content_width as ReaderSettings['width'],
      });
    }
  }, [dbSettings]);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setHighlights([]);
      setBookmarks([]);
      setProgress({});
      setMyShelf([]);
    }
  }, [user]);

  async function loadBooks() {
    try {
      setLoading(true);
      const data = await api.fetchBooks();
      console.log('Fetched books:', data.length);
      setBooks(data.length > 0 ? data : seedBooks);
      if (data.length > 0) {
        const allReviews = await api.fetchAllReviews();
        setReviews(allReviews.length > 0 ? allReviews : seedReviews);
      } else {
        setReviews(seedReviews);
      }
    } catch (e) {
      console.error('Failed to load books:', e);
      setBooks(seedBooks);
      setReviews(seedReviews);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserData() {
    if (!user) return;
    try {
      const [highlightsData, bookmarksData, progressData, shelfData] = await Promise.all([
        api.fetchHighlights(user.id, ''),
        api.fetchBookmarks(user.id, ''),
        api.fetchProgress(user.id),
        api.fetchUserShelf(user.id),
      ]);
      setHighlights(highlightsData);
      setBookmarks(bookmarksData);
      setProgress(progressData);
      setMyShelf(shelfData);
    } catch (e) {
      console.error('Failed to load user data:', e);
    }
  }

  async function refreshBooks() {
    await loadBooks();
  }

  async function refreshUserData() {
    await loadUserData();
  }

  async function publishBook(book: Book) {
    try {
      const created = await api.createBook({ ...book, uploader: user?.id ?? undefined, uploaded: true });
      console.log('Book published:', created);
      toast(`«${book.title}» منتشر شد و در قفسه نشست 🎉`);
      await loadBooks();
    } catch (e) {
      console.error('Failed to publish book:', e);
      toast('خطا در انتشار کتاب');
      throw e;
    }
  }

  async function updateBook(book: Book) {
    try {
      await api.updateBook(book);
      toast(`تغییرات «${book.title}» ذخیره شد`);
      await loadBooks();
    } catch (e) {
      toast('خطا در ذخیره‌سازی');
      throw e;
    }
  }

  async function deleteBook(id: string) {
    try {
      await api.deleteBook(id);
      toast('اثر حذف شد');
      await loadBooks();
    } catch (e) {
      toast('خطا در حذف کتاب');
    }
  }

  async function addReview(review: Omit<Review, 'id' | 'date'>) {
    if (!user) return;
    try {
      const newReview: Review = {
        ...review,
        id: uid(),
        date: Date.now(),
        userId: user.id,
      };
      await api.createReview(newReview);
      setReviews((r) => [newReview, ...r]);
      toast('نقد شما ثبت شد — سپاس از نگاه دقیق‌تان');
    } catch (e) {
      toast('خطا در ثبت نقد');
    }
  }

  async function deleteReview(id: string) {
    try {
      await api.deleteReview(id);
      setReviews((r) => r.filter((x) => x.id !== id));
      toast('نقد حذف شد');
    } catch (e) {
      toast('خطا در حذف نقد');
    }
  }

  async function addHighlight(highlight: Omit<Highlight, 'id' | 'createdAt'>) {
    if (!user) return;
    try {
      const newHighlight: Highlight = {
        ...highlight,
        id: uid(),
        createdAt: Date.now(),
      };
      await api.createHighlight(newHighlight, user.id);
      setHighlights((h) => [...h, newHighlight]);
      toast('برجسته شد ✒');
    } catch (e) {
      toast('خطا در برجسته‌سازی');
    }
  }

  async function updateHighlight(id: string, note: string) {
    try {
      await api.updateHighlightNote(id, note);
      setHighlights((h) => h.map((x) => (x.id === id ? { ...x, note } : x)));
      toast(note.trim() ? 'یادداشت ذخیره شد' : 'یادداشت برداشته شد');
    } catch (e) {
      toast('خطا در ذخیرهٔ یادداشت');
    }
  }

  async function deleteHighlight(id: string) {
    try {
      await api.deleteHighlight(id);
      setHighlights((h) => h.filter((x) => x.id !== id));
      toast('برجستگی حذف شد');
    } catch (e) {
      toast('خطا در حذف برجستگی');
    }
  }

  async function toggleBookmark(bookId: string, chapter: number) {
    if (!user) return;
    try {
      const existing = bookmarks.find((b) => b.bookId === bookId && b.chapter === chapter);
      if (existing) {
        await api.deleteBookmark(bookId, chapter, user.id);
        setBookmarks((b) => b.filter((x) => x.id !== existing.id));
        toast('نشانک برداشته شد');
      } else {
        const newBookmark: Bookmark = { id: uid(), bookId, chapter, createdAt: Date.now() };
        await api.createBookmark(newBookmark, user.id);
        setBookmarks((b) => [...b, newBookmark]);
        toast('نشانک گذاشته شد 🔖');
      }
    } catch (e) {
      toast('خطا در نشانک‌گذاری');
    }
  }

  async function saveProgress(bookId: string, p: Progress) {
    if (!user) return;
    try {
      await api.upsertProgress(bookId, user.id, p);
      setProgress((prev) => ({ ...prev, [bookId]: p }));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  async function toggleShelf(bookId: string) {
    if (!user) return;
    try {
      const has = myShelf.includes(bookId);
      if (has) {
        await api.removeFromShelf(user.id, bookId);
        setMyShelf((s) => s.filter((x) => x !== bookId));
        toast('از قفسهٔ شما برداشته شد');
      } else {
        await api.addToShelf(user.id, bookId);
        setMyShelf((s) => [...s, bookId]);
        toast('به قفسهٔ شما افزوده شد');
      }
    } catch (e) {
      toast('خطا در تغییر قفسه');
    }
  }

  async function updateSettings(updates: Partial<ReaderSettings>) {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    try {
      await api.supabase.from('reader_settings').upsert({
        user_id: user?.id,
        theme: newSettings.theme,
        font: newSettings.font,
        font_size: newSettings.size,
        line_height: newSettings.lh,
        content_width: newSettings.width,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  return (
    <AppContext.Provider
      value={{
        books,
        reviews,
        highlights,
        bookmarks,
        progress,
        myShelf,
        settings,
        loading,
        error,
        refreshBooks,
        refreshUserData,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
