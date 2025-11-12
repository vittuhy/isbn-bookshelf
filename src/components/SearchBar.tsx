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
    setQuery('');
    onSearch('');
    // Keep focus on the input field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
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
      <div className="mb-6 relative">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 focus-within:ring-2 focus-within:ring-blue-500">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat podle názvu, ISBN nebo autora..."
            className="flex-1 min-w-0 px-2 py-2 border-0 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Skenovat čárový kód"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h3v12H7V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h3v12h-3V6zm4 0h1v12h-1V6z"/>
            </svg>
          </button>
          {query && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
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

