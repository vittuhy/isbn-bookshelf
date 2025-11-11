export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          isbn13: string
          isbn10: string | null
          title: string
          authors: string[] | null
          publisher: string | null
          published_year: number | null
          description: string | null
          cover_url: string | null
          image_url: string | null
          tags: string[] | null
          source_payload: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          isbn13: string
          isbn10?: string | null
          title: string
          authors?: string[] | null
          publisher?: string | null
          published_year?: number | null
          description?: string | null
          cover_url?: string | null
          image_url?: string | null
          tags?: string[] | null
          source_payload?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          isbn13?: string
          isbn10?: string | null
          title?: string
          authors?: string[] | null
          publisher?: string | null
          published_year?: number | null
          description?: string | null
          cover_url?: string | null
          image_url?: string | null
          tags?: string[] | null
          source_payload?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

