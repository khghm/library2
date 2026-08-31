export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          category: string;
          description: string;
          cover_url: string | null;
          cover_color: string;
          is_poetry: boolean;
          minutes: number;
          year: string;
          pages: number;
          tags: string[];
          chapters: unknown;
          is_uploaded: boolean;
          uploader_id: string | null;
          pdf_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author: string;
          category: string;
          description?: string;
          cover_url?: string | null;
          cover_color?: string;
          is_poetry?: boolean;
          minutes?: number;
          year?: string;
          pages?: number;
          tags?: string[];
          chapters: unknown;
          is_uploaded?: boolean;
          uploader_id?: string | null;
          pdf_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string;
          category?: string;
          description?: string;
          cover_url?: string | null;
          cover_color?: string;
          is_poetry?: boolean;
          minutes?: number;
          year?: string;
          pages?: number;
          tags?: string[];
          chapters?: unknown;
          is_uploaded?: boolean;
          uploader_id?: string | null;
          pdf_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          user_name?: string;
          rating?: number;
          text?: string;
          created_at?: string;
        };
      };
      highlights: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          chapter: number;
          paragraph: number;
          start_offset: number;
          end_offset: number;
          color: string;
          text: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          chapter: number;
          paragraph: number;
          start_offset: number;
          end_offset: number;
          color: string;
          text: string;
          note?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          chapter?: number;
          paragraph?: number;
          start_offset?: number;
          end_offset?: number;
          color?: string;
          text?: string;
          note?: string;
          created_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          chapter: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          chapter: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          chapter?: number;
          created_at?: string;
        };
      };
      reading_progress: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          chapter: number;
          percentage: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          chapter: number;
          percentage: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          chapter?: number;
          percentage?: number;
          updated_at?: string;
        };
      };
      user_shelves: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          created_at?: string;
        };
      };
      reader_settings: {
        Row: {
          user_id: string;
          theme: string;
          font: string;
          font_size: number;
          line_height: number;
          content_width: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          font?: string;
          font_size?: number;
          line_height?: number;
          content_width?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: string;
          font?: string;
          font_size?: number;
          line_height?: number;
          content_width?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Profile = Tables<'profiles'>;
export type BookRow = Tables<'books'>;
export type ReviewRow = Tables<'reviews'>;
export type HighlightRow = Tables<'highlights'>;
export type BookmarkRow = Tables<'bookmarks'>;
export type ReadingProgressRow = Tables<'reading_progress'>;
export type UserShelfRow = Tables<'user_shelves'>;
export type ReaderSettingsRow = Tables<'reader_settings'>;
