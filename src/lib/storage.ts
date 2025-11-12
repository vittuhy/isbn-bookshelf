import type { Book } from '../types';
import type { Database } from './database.types';
import { supabase } from './supabase';
import { deleteImageFromSupabase } from './storageUpload';

const STORAGE_KEY = 'isbn_database_books';

type BookRow = Database['public']['Tables']['books']['Row'];

// Helper to convert Supabase row to Book
function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn13: row.isbn13,
    isbn10: row.isbn10 || undefined,
    title: row.title,
    authors: row.authors || undefined,
    publisher: row.publisher || undefined,
    publishedYear: row.published_year || undefined,
    description: row.description || undefined,
    coverUrl: row.cover_url || undefined,
    imageUrl: row.image_url || undefined,
    tags: row.tags || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type BookInsert = Database['public']['Tables']['books']['Insert'];

// Helper to convert Book to Supabase row
function bookToRow(book: Book): BookInsert {
  const row: BookInsert = {
    id: book.id,
    isbn13: book.isbn13,
    isbn10: book.isbn10 || null,
    title: book.title,
    authors: book.authors || null,
    publisher: book.publisher || null,
    published_year: book.publishedYear || null,
    description: book.description || null,
    cover_url: book.coverUrl || null,
    image_url: book.imageUrl || null,
    tags: book.tags || null,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
  };
  return row;
}

// LocalStorage fallback functions
function getAllBooksLocal(): Book[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const books = stored ? JSON.parse(stored) : [];
    // Sort by title A-Z (case-insensitive, Czech-aware)
    return books.sort((a: Book, b: Book) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB, 'cs');
    });
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

function saveBookLocal(book: Book): void {
  const books = getAllBooksLocal();
  const existingIndex = books.findIndex(b => b.id === book.id);
  
  if (existingIndex >= 0) {
    books[existingIndex] = book;
  } else {
    books.push(book);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function deleteBookLocal(id: string): void {
  const books = getAllBooksLocal();
  const filtered = books.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Supabase functions
export async function getAllBooks(): Promise<Book[]> {
  console.log('getAllBooks called, supabase available:', !!supabase);
  if (supabase) {
    try {
      console.log('Fetching books from Supabase...');
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) {
        console.error('Error fetching books from Supabase:', error);
        console.log('Falling back to localStorage');
        return getAllBooksLocal();
      }
      
      console.log('Successfully fetched from Supabase:', data?.length || 0, 'books');
      const books = (data || []).map(rowToBook);
      // Sort by title A-Z (case-insensitive, Czech-aware) as fallback
      return books.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB, 'cs');
      });
    } catch (error) {
      console.error('Error fetching books:', error);
      console.log('Falling back to localStorage due to exception');
      return getAllBooksLocal();
    }
  }
  
  console.log('Supabase not available, using localStorage');
  return getAllBooksLocal();
}

export async function saveBook(book: Book): Promise<void> {
  if (supabase) {
    try {
      const row = bookToRow(book);
      console.log('Saving book to Supabase:', row); // Debug log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('books')
        .upsert([row], { onConflict: 'id' });
      
      if (error) {
        console.error('Error saving book to Supabase:', error);
        console.error('Book data:', row);
        // If image_url column doesn't exist, try without it
        if (error.message?.includes('image_url')) {
          console.warn('image_url column may not exist, saving without it');
          const rowWithoutImage = { ...row };
          delete rowWithoutImage.image_url;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: retryError } = await (supabase as any)
            .from('books')
            .upsert([rowWithoutImage], { onConflict: 'id' });
          if (retryError) {
            console.error('Error saving without image_url:', retryError);
            throw new Error(`Supabase error: ${retryError.message}`);
          }
        } else {
          throw new Error(`Supabase error: ${error.message || 'Unknown error'}`);
        }
      } else {
        console.log('Book saved successfully to Supabase');
      }
      return;
    } catch (error) {
      console.error('Error saving book:', error);
      saveBookLocal(book);
      return;
    }
  }
  
  saveBookLocal(book);
}

export async function deleteBook(id: string): Promise<void> {
  if (supabase) {
    try {
      // First, fetch the book to get its imageUrl before deleting
      const { data: bookData } = await supabase
        .from('books')
        .select('image_url')
        .eq('id', id)
        .single();

      // Delete the image from storage if it exists
      // (We do this even if fetch failed, as long as we have data)
      if (bookData?.image_url) {
        await deleteImageFromSupabase(bookData.image_url);
      }

      // Now delete the book record (even if fetch failed, try to delete)
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting book from Supabase:', error);
        deleteBookLocal(id);
      }
      return;
    } catch (error) {
      console.error('Error deleting book:', error);
      // Try to delete locally as fallback
      deleteBookLocal(id);
      return;
    }
  }
  
  // For local storage, also try to delete the image if it exists
  const books = getAllBooksLocal();
  const bookToDelete = books.find(b => b.id === id);
  if (bookToDelete?.imageUrl) {
    await deleteImageFromSupabase(bookToDelete.imageUrl);
  }
  
  deleteBookLocal(id);
}

export async function searchBooks(query: string): Promise<Book[]> {
  const books = await getAllBooks();
  if (!query.trim()) return books;
  
  const lowerQuery = query.toLowerCase();
  const filtered = books.filter(book => 
    book.title.toLowerCase().includes(lowerQuery) ||
    book.isbn13.includes(query) ||
    (book.isbn10 && book.isbn10.includes(query)) ||
    book.authors?.some(author => author.toLowerCase().includes(lowerQuery)) ||
    book.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
  
  // Sort filtered results by title A-Z
  return filtered.sort((a, b) => {
    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    return titleA.localeCompare(titleB, 'cs');
  });
}

