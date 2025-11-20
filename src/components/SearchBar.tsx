import { useState, useEffect, useCallback, useRef } from 'react';
import { BarcodeScanner } from './BarcodeScanner';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);


  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Clear the query
    setQuery('');
    onSearch('');
    // Immediately refocus the input field
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      // Also ensure focus on next frame for mobile browsers
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    });
  };

  const handleBarcodeScan = useCallback((scannedIsbn: string) => {
    // Clean the scanned ISBN (remove any non-digit characters except X)
    const cleaned = scannedIsbn.replace(/[^\dX]/g, '');
    setQuery(cleaned);
    // Automatically search with the scanned ISBN
    onSearch(cleaned);
  }, [onSearch]);

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  return (
    <>
      <div className="mb-0 relative">
        <div className="flex items-center gap-2 glass-dark border border-white/20 rounded-2xl px-3 sm:px-4 focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-400/50 focus-within:glow-sm transition-all duration-300" style={{ height: '44px', display: 'flex', alignItems: 'center' }}>
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Vyhledat knihu nebo ISBN"
            className="flex-1 min-w-0 px-2 bg-transparent border-0 focus:outline-none text-white placeholder-gray-400 text-sm sm:text-base leading-normal"
            style={{ 
              fontSize: '16px', 
              padding: '0',
              margin: '0',
              border: 'none',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'transparent'
            }}
          />
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
            title="Skenovat čárový kód"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h3v12H7V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h3v12h-3V6zm4 0h1v12h-1V6z"/>
            </svg>
          </button>
          {query && (
            <button
              type="button"
              onClick={handleClear}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur on mousedown
              className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
              title="Vymazat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={handleCloseScanner}
        />
      )}
    </>
  );
}

