import { supabase } from './supabase';
import type {
  BookRow,
  ReviewRow,
  HighlightRow,
  BookmarkRow,
  ReadingProgressRow,
  UserShelfRow,
} from './database.types';
import type { Book, Chapter, Review, Highlight, Bookmark, Progress } from './core';

export { supabase };

/* ---------- Mappers (DB row <-> app model) ---------- */

function mapBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    desc: row.description,
    cover: row.cover_url ?? undefined,
    coverColor: row.cover_color,
    poetry: row.is_poetry,
    minutes: row.minutes,
    year: row.year,
    pages: row.pages,
    tags: row.tags,
    chapters: row.chapters as unknown as Chapter[],
    uploaded: row.is_uploaded,
    uploader: row.uploader_id ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    originalPdf: !!row.pdf_path,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    bookId: row.book_id,
    name: row.user_name,
    rating: row.rating,
    text: row.text,
    date: new Date(row.created_at).getTime(),
  };
}

function mapHighlight(row: HighlightRow): Highlight {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    p: row.paragraph,
    start: row.start_offset,
    end: row.end_offset,
    color: row.color,
    text: row.text,
    note: row.note,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapProgress(row: ReadingProgressRow): Progress {
  return {
    chapter: row.chapter,
    pct: Number(row.percentage),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/* ---------- Books API ---------- */

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapBook);
}

export async function fetchBook(bookId: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) throw error;
  return data ? mapBook(data) : null;
}

export async function fetchBooksByUploader(userId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('uploader_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapBook);
}

export async function createBook(book: Book): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      description: book.desc,
      cover_url: book.cover,
      cover_color: book.coverColor ?? '#31517a',
      is_poetry: book.poetry ?? false,
      minutes: book.minutes,
      year: book.year,
      pages: book.pages,
      tags: book.tags,
      chapters: book.chapters as unknown as object,
      is_uploaded: book.uploaded ?? true,
      uploader_id: book.uploader,
      pdf_path: book.originalPdf ? `pdfs/${book.id}.pdf` : null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapBook(data);
}

export async function updateBook(book: Book): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .update({
      title: book.title,
      author: book.author,
      category: book.category,
      description: book.desc,
      cover_url: book.cover,
      cover_color: book.coverColor ?? '#31517a',
      is_poetry: book.poetry ?? false,
      minutes: book.minutes,
      year: book.year,
      pages: book.pages,
      tags: book.tags,
      chapters: book.chapters as unknown as object,
      updated_at: new Date().toISOString(),
    })
    .eq('id', book.id)
    .select()
    .single();

  if (error) throw error;
  return mapBook(data);
}

export async function deleteBook(bookId: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) throw error;
}

/* ---------- Reviews API ---------- */

export async function fetchReviews(bookId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function fetchAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function createReview(review: Review): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      id: review.id,
      book_id: review.bookId,
      user_id: review.userId!,
      user_name: review.name,
      rating: review.rating,
      text: review.text,
    })
    .select()
    .single();

  if (error) throw error;
  return mapReview(data);
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

/* ---------- Highlights API ---------- */

export async function fetchHighlights(userId: string, bookId: string): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from('highlights')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapHighlight);
}

export async function createHighlight(highlight: Highlight, userId: string): Promise<Highlight> {
  const { data, error } = await supabase
    .from('highlights')
    .insert({
      id: highlight.id,
      book_id: highlight.bookId,
      user_id: userId,
      chapter: highlight.chapter,
      paragraph: highlight.p,
      start_offset: highlight.start,
      end_offset: highlight.end,
      color: highlight.color,
      text: highlight.text,
      note: highlight.note,
    })
    .select()
    .single();

  if (error) throw error;
  return mapHighlight(data);
}

export async function updateHighlightNote(highlightId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('highlights')
    .update({ note })
    .eq('id', highlightId);
  if (error) throw error;
}

export async function deleteHighlight(highlightId: string): Promise<void> {
  const { error } = await supabase.from('highlights').delete().eq('id', highlightId);
  if (error) throw error;
}

/* ---------- Bookmarks API ---------- */

export async function fetchBookmarks(userId: string, bookId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapBookmark);
}

export async function createBookmark(bookmark: Bookmark, userId: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').insert({
    id: bookmark.id,
    book_id: bookmark.bookId,
    user_id: userId,
    chapter: bookmark.chapter,
  });
  if (error) throw error;
}

export async function deleteBookmark(bookId: string, chapter: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .eq('user_id', userId);
  if (error) throw error;
}

/* ---------- Reading Progress API ---------- */

export async function fetchProgress(userId: string): Promise<Record<string, Progress>> {
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const result: Record<string, Progress> = {};
  for (const row of data ?? []) {
    result[row.book_id] = mapProgress(row);
  }
  return result;
}

export async function upsertProgress(
  bookId: string,
  userId: string,
  progress: Progress
): Promise<void> {
  const { error } = await supabase.from('reading_progress').upsert({
    book_id: bookId,
    user_id: userId,
    chapter: progress.chapter,
    percentage: progress.pct,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ---------- User Shelf API ---------- */

export async function fetchUserShelf(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_shelves')
    .select('book_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.book_id);
}

export async function addToShelf(userId: string, bookId: string): Promise<void> {
  const { error } = await supabase.from('user_shelves').insert({
    user_id: userId,
    book_id: bookId,
  });
  if (error && error.code !== '23505') throw error;
}

export async function removeFromShelf(userId: string, bookId: string): Promise<void> {
  const { error } = await supabase
    .from('user_shelves')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);
  if (error) throw error;
}

/* ---------- Storage API ---------- */

export async function uploadPdf(bookId: string, file: File): Promise<string> {
  const path = `${bookId}/${file.name}`;
  const { error } = await supabase.storage.from('pdfs').upload(path, file, {
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCover(bookId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${bookId}/cover.${ext}`;
  const { error } = await supabase.storage.from('covers').upload(path, file, {
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('covers').getPublicUrl(path);
  return data.publicUrl;
}

export async function getPdfUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
  return data.publicUrl;
}

/* ---------- Seed Data Migration ---------- */

export async function migrateLocalBooks(books: Book[], userId: string): Promise<void> {
  for (const book of books) {
    await supabase.from('books').insert({
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      description: book.desc,
      cover_url: book.cover,
      cover_color: book.coverColor ?? '#31517a',
      is_poetry: book.poetry ?? false,
      minutes: book.minutes,
      year: book.year,
      pages: book.pages,
      tags: book.tags,
      chapters: book.chapters as unknown as object,
      is_uploaded: true,
      uploader_id: userId,
      pdf_path: book.originalPdf ? `pdfs/${book.id}.pdf` : null,
    });
  }
}
