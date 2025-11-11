import { useState, useEffect } from 'react';
import { Book, BookMetadata } from '../types';
import { getAllBooks, saveBook, deleteBook, searchBooks } from '../lib/storage';
import { AddBookForm } from '../components/AddBookForm';
import { SearchBar } from '../components/SearchBar';
import { BookCard } from '../components/BookCard';
import { EditBookDrawer } from '../components/EditBookDrawer';

export function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    const allBooks = getAllBooks();
    setBooks(allBooks);
    setFilteredBooks(allBooks);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchBooks(query);
      setFilteredBooks(results);
    } else {
      setFilteredBooks(books);
    }
  };

  const handleAddBook = (metadata: BookMetadata) => {
    const newBook: Book = {
      id: crypto.randomUUID(),
      ...metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    saveBook(newBook);
    const updatedBooks = getAllBooks();
    setBooks(updatedBooks);
    
    // Update filtered books if we're searching
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setFilteredBooks(updatedBooks);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
  };

  const handleSaveBook = (book: Book) => {
    saveBook(book);
    const updatedBooks = getAllBooks();
    setBooks(updatedBooks);
    
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setFilteredBooks(updatedBooks);
    }
  };

  const handleDeleteBook = (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      deleteBook(id);
      const updatedBooks = getAllBooks();
      setBooks(updatedBooks);
      
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setFilteredBooks(updatedBooks);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Book Library</h1>
          <p className="text-gray-600">
            {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Book</h2>
          <AddBookForm onAdd={handleAddBook} />
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery.trim() 
                ? 'No books found matching your search.' 
                : 'Your library is empty. Add your first book above!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={handleEditBook}
                onDelete={handleDeleteBook}
              />
            ))}
          </div>
        )}

        {editingBook && (
          <EditBookDrawer
            book={editingBook}
            onClose={() => setEditingBook(null)}
            onSave={handleSaveBook}
          />
        )}
      </div>
    </div>
  );
}

