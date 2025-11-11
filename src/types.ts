export interface Book {
  id: string;
  isbn13: string;
  isbn10?: string;
  title: string;
  authors?: string[];
  publisher?: string;
  publishedYear?: number;
  description?: string;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookMetadata {
  isbn13: string;
  isbn10?: string;
  title: string;
  authors?: string[];
  publisher?: string;
  publishedYear?: number;
  description?: string;
  coverUrl?: string;
}

