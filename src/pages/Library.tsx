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
  const [justSaved, setJustSaved] = useState(false);
  const [expandedImageBookId, setExpandedImageBookId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

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
    // Don't check URL if we just saved (to prevent reopening dialog)
    if (justSaved) {
      setJustSaved(false);
      return;
    }
    
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
      try {
        console.log('Loading books...');
        const allBooks = await getAllBooks();
        console.log('Loaded books:', allBooks.length, 'books');
        console.log('Books data:', allBooks);
        setBooks(allBooks);
        setFilteredBooks(allBooks);
        await checkUrlAndOpenBook(allBooks);
      } catch (error) {
        console.error('Error loading books:', error);
        // Try to load from localStorage as fallback
        try {
          const localBooks = JSON.parse(localStorage.getItem('books') || '[]');
          console.log('Loaded from localStorage fallback:', localBooks.length, 'books');
          setBooks(localBooks);
          setFilteredBooks(localBooks);
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
        }
      }
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

  // Handle scroll to hide/show header elements
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
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
      
      // Find the newly added book and open detail dialog (compare normalized ISBNs)
      const newBookIsbn13Normalized = newBook.isbn13.replace(/-/g, '');
      const addedBook = updatedBooks.find(b => 
        b.isbn13.replace(/-/g, '') === newBookIsbn13Normalized
      );
      
      if (addedBook) {
        console.log('Opening detail for newly added book:', addedBook.title);
        setEditingBook(addedBook);
        // Update URL to include ISBN
        window.history.pushState({}, '', `/${addedBook.isbn13}`);
      } else {
        console.error('Added book not found in updated books list. Looking for ISBN:', newBookIsbn13Normalized);
        console.log('Available books ISBNs:', updatedBooks.map(b => b.isbn13));
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
      // If book has no ID, it's a new book - generate ID and ISBN
      if (!book.id) {
        book.id = generateUUID();
        // Generate a placeholder ISBN if not provided (must be valid 13-digit ISBN)
        if (!book.isbn13 || !book.isbn13.trim()) {
          // Create a valid placeholder ISBN-13 format: 978 + 9 random digits + check digit
          // Use timestamp to ensure uniqueness, pad to 9 digits
          const randomDigits = (Date.now().toString() + Math.random().toString().slice(2)).slice(0, 9).padStart(9, '0');
          const base = '978' + randomDigits;
          // Calculate check digit for ISBN-13
          let sum = 0;
          for (let i = 0; i < 12; i++) {
            const digit = parseInt(base[i]);
            sum += digit * (i % 2 === 0 ? 1 : 3);
          }
          const checkDigit = (10 - (sum % 10)) % 10;
          book.isbn13 = base + checkDigit.toString();
        }
        book.createdAt = new Date().toISOString();
      }
      
      // Ensure isbn13 is not empty
      if (!book.isbn13 || !book.isbn13.trim()) {
        throw new Error('ISBN-13 je povinné pole');
      }
      
      // Save book and get the updated version (with converted image URL if external)
      const savedBook = await saveBook(book);
      
      const updatedBooks = await getAllBooks();
      setBooks(updatedBooks);
      
      if (searchQuery.trim()) {
        await handleSearch(searchQuery);
      } else {
        setFilteredBooks(updatedBooks);
      }
      
      // Find the updated book in the refreshed list to ensure we have the latest data
      const updatedBook = updatedBooks.find(b => b.id === savedBook.id) || savedBook;
      
      // Update the editing book state with the saved version to show updated URL immediately
      // This ensures if the drawer reopens, it shows the converted URL
      if (editingBook?.id === book.id) {
        setEditingBook(updatedBook);
      }
      
      // Close the dialog after saving and prevent URL check from reopening it
      setJustSaved(true);
      setEditingBook(null);
      // Clear URL when closing
      window.history.pushState({}, '', '/');
      // Reset viewport zoom on mobile after closing dialog
      if (window.visualViewport) {
        document.body.style.zoom = '1';
      }
    } catch (error) {
      console.error('Error saving book:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Chyba při ukládání knihy: ${errorMessage}`);
    }
  };

  const handleDeleteBook = async (id: string) => {
    await deleteBook(id);
    const updatedBooks = await getAllBooks();
    setBooks(updatedBooks);
    
    if (searchQuery.trim()) {
      await handleSearch(searchQuery);
    } else {
      setFilteredBooks(updatedBooks);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-4 sm:py-8" style={{ paddingTop: `max(1rem, env(safe-area-inset-top))` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sticky Header with Search and Tags */}
        <div className="sticky top-2 sm:top-4 z-40 mb-4 sm:mb-6 glass-dark backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl transition-all duration-300">
          <div className="px-4 sm:px-6 pt-3 sm:pt-4">
            {/* Title - Hidden when scrolled */}
            <div className={`flex items-center justify-between mb-3 transition-all duration-300 ${isScrolled ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-modern text-white text-glow">
                Moje knihovna
              </h1>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-purple-500/50 hover:scale-110 active:scale-95 glow-sm flex-shrink-0"
                title="Přidat knihu"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            {/* Search Bar - Always visible */}
            <div className="mb-2 sm:mb-3">
              <SearchBar onSearch={handleSearch} />
            </div>
            
            {/* Tags - Hidden when scrolled */}
            {!showAddForm && (
              <div className={`transition-all duration-300 ${isScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 pb-1'}`}>
                <TagFilter 
                  books={books} 
                  selectedTags={selectedTags}
                  onTagToggle={handleTagToggle}
                />
              </div>
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="glass-dark rounded-2xl shadow-2xl p-4 sm:p-6 mb-6 relative border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Přidat novou knihu</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-white text-3xl transition-colors hover:scale-110 active:scale-95"
                title="Zavřít"
              >
                ×
              </button>
            </div>
            <AddBookForm 
              onAdd={handleAddBook} 
              onManualAdd={() => {
                setShowAddForm(false);
                // Open blank detail dialog for manual entry
                setEditingBook({
                  id: '',
                  isbn13: '',
                  title: '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as Book);
              }}
            />
          </div>
        )}

        {filteredBooks.length === 0 ? (
          <div className="text-center pt-1 pb-12 sm:pt-12 sm:pb-20">
            <div className="glass-dark rounded-2xl sm:rounded-3xl p-3 sm:p-12 max-w-md mx-auto border border-white/20 flex flex-col justify-center min-h-[120px] sm:min-h-0">
              <div className="hidden sm:flex justify-center mb-4">
                <svg className="w-24 h-24 text-purple-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-300 text-xs sm:text-lg mb-3 sm:mb-6 leading-tight flex sm:flex-1 items-center justify-center">
                {searchQuery.trim() 
                  ? `Nebyly nalezeny žádné knihy odpovídající "${searchQuery.trim()}".` 
                  : 'Vaše knihovna je prázdná. Přidejte svou první knihu výše!'}
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => {
                    // Open manual addition dialog with prefilled data
                    setShowAddForm(false);
                    const trimmedQuery = searchQuery.trim();
                    // Check if search term is numeric (ISBN) or text (title)
                    const isNumeric = /^\d+$/.test(trimmedQuery.replace(/\D/g, ''));
                    
                    setEditingBook({
                      id: '',
                      isbn13: isNumeric ? trimmedQuery.replace(/\D/g, '') : '',
                      title: isNumeric ? '' : trimmedQuery,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    } as Book);
                  }}
                  className="w-3/4 mx-auto mt-2 sm:mt-0 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
                >
                  Přidat ručně
                </button>
              )}
            </div>
          </div>
        ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onEdit={handleEditBook}
                    isImageExpanded={expandedImageBookId === book.id}
                    onImageExpand={() => setExpandedImageBookId(book.id)}
                    onImageClose={() => setExpandedImageBookId(null)}
                  />
                ))}
              </div>
        )}

        {editingBook && (
          <EditBookDrawer
            book={editingBook}
            allBooks={books}
            onClose={() => {
              setEditingBook(null);
              // Clear URL when closing
              window.history.pushState({}, '', '/');
              // Reset viewport zoom on mobile after closing dialog
              if (window.visualViewport) {
                document.body.style.zoom = '1';
              }
            }}
            onSave={handleSaveBook}
            onDelete={handleDeleteBook}
          />
        )}

        {/* Book Count at Bottom - Hidden when searching */}
        {!searchQuery.trim() && (
          <div className="mt-12 sm:mt-16 pb-6 text-center">
            <p className="text-sm sm:text-base text-gray-400">
              {books.length} {books.length === 1 ? 'kniha' : books.length < 5 ? 'knihy' : 'knih'} ve vaší sbírce
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

