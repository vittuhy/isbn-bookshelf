import { useState, useEffect } from 'react';
import type { Book, BookMetadata } from '../types';
import { getAllBooks, saveBook, deleteBook, searchBooks } from '../lib/storage';
import { lookupBook } from '../lib/bookLookup';
import { normalizeISBN } from '../lib/isbn';
import { AddBookForm } from '../components/AddBookForm';
import { SearchBar } from '../components/SearchBar';
import { TagFilter } from '../components/TagFilter';
import { BookCard } from '../components/BookCard';
import { EditBookDrawer } from '../components/EditBookDrawer';

export function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Generate UUID v4
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Function to check URL and open/add book if ISBN is present
  const checkUrlAndOpenBook = async (allBooks: Book[]) => {
    // Check URL for ISBN parameter or path
    const urlParams = new URLSearchParams(window.location.search);
    const isbnFromQuery = urlParams.get('isbn');
    const pathIsbn = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    
    console.log('Checking URL:', {
      pathname: window.location.pathname,
      pathIsbn,
      isbnFromQuery,
      search: window.location.search
    });
    
    // Check if path looks like an ISBN (10 or 13 digits, with or without hyphens)
    // Pattern: digits only OR digits with hyphens (e.g., 978-80-257-4767-4 or 9788025747674)
    const isbnPathPattern = /^[\d-]{10,17}$/; // Allow digits and hyphens, 10-17 chars (13 digits + up to 4 hyphens)
    const isbnFromPath = isbnPathPattern.test(pathIsbn) ? pathIsbn : null;
    
    const isbnToFind = isbnFromQuery || isbnFromPath;
    
    console.log('ISBN to find:', isbnToFind, 'from path:', isbnFromPath, 'from query:', isbnFromQuery);
    
    if (isbnToFind) {
      // Normalize the ISBN for comparison (remove hyphens, convert to ISBN-13 if needed)
      let normalizedIsbnToFind: string;
      try {
        normalizedIsbnToFind = normalizeISBN(isbnToFind);
      } catch (error) {
        console.error('Invalid ISBN format:', isbnToFind, error);
        setEditingBook(null);
        return;
      }
      
      // Find book by ISBN (compare normalized versions)
      let book = allBooks.find(b => {
        const bookIsbn13 = b.isbn13.replace(/-/g, '');
        const bookIsbn10 = b.isbn10?.replace(/-/g, '') || '';
        return bookIsbn13 === normalizedIsbnToFind || bookIsbn10 === normalizedIsbnToFind;
      });
      
      if (book) {
        // Book exists - open detail dialog
        console.log('Book found, opening detail:', book.title);
        setEditingBook(book);
      } else {
        console.log('Book not found in library, attempting to add:', isbnToFind);
        // Book not found - try to add it (use normalized ISBN for lookup)
        try {
          const metadata = await lookupBook(normalizedIsbnToFind);
          if (metadata && metadata.title) {
            // Create and save the new book
            const newBook: Book = {
              id: generateUUID(),
              ...metadata,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            await saveBook(newBook);
            
            // Reload books and open the detail dialog
            const updatedBooks = await getAllBooks();
            setBooks(updatedBooks);
            setFilteredBooks(updatedBooks);
            
            // Find the newly added book and open it (compare normalized ISBNs)
            const addedBook = updatedBooks.find(b => 
              b.isbn13.replace(/-/g, '') === newBook.isbn13.replace(/-/g, '')
            );
            
            if (addedBook) {
              console.log('Book added successfully, opening detail:', addedBook.title);
              setEditingBook(addedBook);
              // Update URL to use the ISBN path
              window.history.pushState({}, '', `/${addedBook.isbn13}`);
            } else {
              console.error('Book was saved but not found in updated books list');
            }
          } else {
            // Book lookup failed
            console.warn('Book with ISBN', isbnToFind, 'could not be found or added - no metadata returned');
            alert(`Kniha s ISBN ${isbnToFind} nebyla nalezena v databázích.`);
            setEditingBook(null);
          }
        } catch (error) {
          console.error('Error adding book from URL:', error);
          alert(`Chyba při přidávání knihy s ISBN ${isbnToFind}: ${error instanceof Error ? error.message : String(error)}`);
          setEditingBook(null);
        }
      }
    } else {
      // No ISBN in URL - close any open dialogs
      console.log('No ISBN found in URL, closing dialogs');
      setEditingBook(null);
    }
  };

  useEffect(() => {
    const loadBooks = async () => {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
      setFilteredBooks(allBooks);
      await checkUrlAndOpenBook(allBooks);
    };
    loadBooks();

    // Handle browser back/forward navigation
    const handlePopState = async () => {
      const currentBooks = await getAllBooks();
      await checkUrlAndOpenBook(currentBooks);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedTags);
  };

  const handleTagToggle = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    applyFilters(searchQuery, newSelectedTags);
  };

  const applyFilters = async (query: string, tags: string[]) => {
    let results: Book[];
    
    if (query.trim()) {
      results = await searchBooks(query);
    } else {
      results = await getAllBooks();
    }

    // Filter by tags
    if (tags.length > 0) {
      results = results.filter(book => 
        book.tags && book.tags.some(tag => tags.includes(tag))
      );
    }

    setFilteredBooks(results);
  };

  const handleAddBook = async (metadata: BookMetadata) => {
    console.log('handleAddBook called with:', metadata);
    try {
      const newBook: Book = {
        id: generateUUID(),
        ...metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('Saving book:', newBook);
      await saveBook(newBook);
      const updatedBooks = await getAllBooks();
      console.log('Books after save:', updatedBooks.length);
      setBooks(updatedBooks);
      
      // Update filtered books if we're searching
      if (searchQuery.trim()) {
        await handleSearch(searchQuery);
      } else {
        setFilteredBooks(updatedBooks);
      }
      
      // Close the form after adding
      setShowAddForm(false);
      
      // Find the newly added book and open detail dialog
      const addedBook = updatedBooks.find(b => 
        b.isbn13 === newBook.isbn13 || 
        b.isbn13.replace(/-/g, '') === newBook.isbn13.replace(/-/g, '')
      );
      
      if (addedBook) {
        setEditingBook(addedBook);
        // Update URL to include ISBN
        window.history.pushState({}, '', `/${addedBook.isbn13}`);
      }
    } catch (error) {
      console.error('Error in handleAddBook:', error);
      alert('Chyba při ukládání knihy: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    // Update URL to include ISBN
    const newUrl = `/${book.isbn13}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleSaveBook = async (book: Book) => {
    try {
      await saveBook(book);
      const updatedBooks = await getAllBooks();
      setBooks(updatedBooks);
      
      if (searchQuery.trim()) {
        await handleSearch(searchQuery);
      } else {
        setFilteredBooks(updatedBooks);
      }
      
      // Disable edit mode after saving
      if (editMode) {
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Chyba při ukládání knihy. Zkontrolujte konzoli pro více informací.');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (confirm('Opravdu chcete smazat tuto knihu?')) {
      await deleteBook(id);
      const updatedBooks = await getAllBooks();
      setBooks(updatedBooks);
      
      if (searchQuery.trim()) {
        await handleSearch(searchQuery);
      } else {
        setFilteredBooks(updatedBooks);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">Moje knihovna</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-md ${
                  editMode 
                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={editMode ? 'Vypnout režim úprav' : 'Zapnout režim úprav'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md"
                title="Přidat knihu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">
              {books.length} {books.length === 1 ? 'kniha' : books.length < 5 ? 'knihy' : 'knih'} ve vaší sbírce
            </p>
            {editMode && (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                Režim úprav
              </span>
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Přidat novou knihu</h2>
            <AddBookForm onAdd={handleAddBook} />
          </div>
        )}

        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
          <TagFilter 
            books={books} 
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery.trim() 
                ? 'Nebyly nalezeny žádné knihy odpovídající vašemu vyhledávání.' 
                : 'Vaše knihovna je prázdná. Přidejte svou první knihu výše!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={handleEditBook}
                onDelete={handleDeleteBook}
                editMode={editMode}
              />
            ))}
          </div>
        )}

        {editingBook && (
          <EditBookDrawer
            book={editingBook}
            onClose={() => {
              setEditingBook(null);
              // Clear URL when closing
              window.history.pushState({}, '', '/');
            }}
            onSave={handleSaveBook}
          />
        )}
      </div>
    </div>
  );
}

