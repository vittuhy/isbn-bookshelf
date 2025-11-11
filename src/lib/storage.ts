import { Book } from '../types';

const STORAGE_KEY = 'isbn_database_books';

export function getAllBooks(): Book[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

export function saveBook(book: Book): void {
  const books = getAllBooks();
  const existingIndex = books.findIndex(b => b.id === book.id);
  
  if (existingIndex >= 0) {
    books[existingIndex] = book;
  } else {
    books.push(book);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

export function deleteBook(id: string): void {
  const books = getAllBooks();
  const filtered = books.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function searchBooks(query: string): Book[] {
  const books = getAllBooks();
  if (!query.trim()) return books;
  
  const lowerQuery = query.toLowerCase();
  return books.filter(book => 
    book.title.toLowerCase().includes(lowerQuery) ||
    book.isbn13.includes(query) ||
    (book.isbn10 && book.isbn10.includes(query)) ||
    book.authors?.some(author => author.toLowerCase().includes(lowerQuery))
  );
}

