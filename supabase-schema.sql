-- Mana Library Database Schema
-- Run this in Supabase SQL Editor
-- Safe to run multiple times - uses IF NOT EXISTS and DROP IF EXISTS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT,
  cover_color TEXT DEFAULT '#31517a',
  is_poetry BOOLEAN DEFAULT FALSE,
  minutes INTEGER DEFAULT 0,
  year TEXT DEFAULT '',
  pages INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_uploaded BOOLEAN DEFAULT FALSE,
  uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Highlights table
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  paragraph INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'gold',
  text TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading progress table
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- User shelves table
CREATE TABLE IF NOT EXISTS user_shelves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Reader settings table
CREATE TABLE IF NOT EXISTS reader_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'night' CHECK (theme IN ('night', 'paper', 'sepia')),
  font TEXT DEFAULT 'vazir' CHECK (font IN ('vazir', 'markazi', 'gulzar')),
  font_size INTEGER DEFAULT 18 CHECK (font_size >= 13 AND font_size <= 28),
  line_height NUMERIC(3,1) DEFAULT 2.0 CHECK (line_height >= 1.6 AND line_height <= 2.6),
  content_width TEXT DEFAULT 'normal' CHECK (content_width IN ('narrow', 'normal', 'wide')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_uploader ON books(uploader_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_highlights_user_book ON highlights(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_shelves_user ON user_shelves(user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO reader_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating (safe re-run)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view books" ON books;
DROP POLICY IF EXISTS "Anyone can insert books" ON books;
DROP POLICY IF EXISTS "Authenticated users can insert books" ON books;
DROP POLICY IF EXISTS "Users can update own uploaded books" ON books;
DROP POLICY IF EXISTS "Users can delete own uploaded books" ON books;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can insert own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can update own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can delete own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can view own progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can view own shelves" ON user_shelves;
DROP POLICY IF EXISTS "Users can insert to own shelves" ON user_shelves;
DROP POLICY IF EXISTS "Users can delete from own shelves" ON user_shelves;
DROP POLICY IF EXISTS "Users can view own settings" ON reader_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON reader_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON reader_settings;
DROP POLICY IF EXISTS "Anyone can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own covers" ON storage.objects;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Books policies
CREATE POLICY "Anyone can view books" ON books FOR SELECT USING (true);
CREATE POLICY "Anyone can insert books" ON books FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own uploaded books" ON books FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "Users can delete own uploaded books" ON books FOR DELETE USING (auth.uid() = uploader_id);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Highlights policies
CREATE POLICY "Users can view own highlights" ON highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own highlights" ON highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own highlights" ON highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON highlights FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Reading progress policies
CREATE POLICY "Users can view own progress" ON reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON reading_progress FOR UPDATE USING (auth.uid() = user_id);

-- User shelves policies
CREATE POLICY "Users can view own shelves" ON user_shelves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert to own shelves" ON user_shelves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from own shelves" ON user_shelves FOR DELETE USING (auth.uid() = user_id);

-- Reader settings policies
CREATE POLICY "Users can view own settings" ON reader_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON reader_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON reader_settings FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDFs
CREATE POLICY "Anyone can view PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'pdfs');
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pdfs' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own PDFs" ON storage.objects FOR UPDATE USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage bucket for covers
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for covers
CREATE POLICY "Anyone can view covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Authenticated users can upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own covers" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own covers" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
