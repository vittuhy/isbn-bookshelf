import { useState, useCallback } from 'react';
import { lookupBook } from '../lib/bookLookup';
import { normalizeISBN } from '../lib/isbn';
import type { BookMetadata } from '../types';
import { BarcodeScanner } from './BarcodeScanner';

interface AddBookFormProps {
  onAdd: (metadata: BookMetadata) => void;
  onManualAdd?: () => void;
}

export function AddBookForm({ onAdd, onManualAdd }: AddBookFormProps) {
  const [isbn, setIsbn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useGoogleSearchOnly, setUseGoogleSearchOnly] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isbn.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Test ISBN normalization first
      try {
        normalizeISBN(isbn.trim());
      } catch {
        const errorMsg = 'Neplatný formát ISBN. Zadejte 10 nebo 13 číslic (s nebo bez pomlček).';
        setError(errorMsg);
        alert(errorMsg);
        setLoading(false);
        return;
      }

      const metadata = await lookupBook(isbn.trim(), useGoogleSearchOnly);
      console.log('Lookup result:', metadata);
      
      if (metadata && metadata.title) {
        onAdd(metadata);
        setIsbn('');
        setError(null);
      } else {
        const trimmedIsbn = isbn.trim();
        const errorMsg = useGoogleSearchOnly
          ? `Kniha s ISBN ${trimmedIsbn} nebyla nalezena pomocí Google Search.`
          : `Kniha s ISBN ${trimmedIsbn} nebyla nalezena v databázích. Zkontrolujte ISBN a zkuste to znovu.`;
        console.error('Book not found:', trimmedIsbn, metadata);
        setError(errorMsg);
        // Don't clear the input on error
        setTimeout(() => {
          alert(errorMsg);
        }, 100);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Nepodařilo se vyhledat knihu. Zkontrolujte, zda je ISBN ve správném formátu (10 nebo 13 číslic, s nebo bez pomlček).';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = useCallback((scannedIsbn: string) => {
    // Clean the scanned ISBN (remove any non-digit characters except X)
    const cleaned = scannedIsbn.replace(/[^\dX]/g, '');
    setIsbn(cleaned);
    setError(null);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-0">
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-2 glass-dark border border-white/20 rounded-xl px-3 sm:px-4 py-2 focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-400/50 focus-within:glow-sm transition-all duration-300">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9-]*"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="Zadejte ISBN"
              className="flex-1 min-w-0 px-2 py-2 border-0 focus:outline-none bg-transparent text-white placeholder-gray-400 text-sm sm:text-base"
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={loading}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50"
              title="Skenovat čárový kód"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h3v12H7V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h3v12h-3V6zm4 0h1v12h-1V6z"/>
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !isbn.trim()}
            className="flex-shrink-0 px-5 sm:px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95 font-medium text-sm sm:text-base"
          >
            {loading ? 'Vyhledávání...' : 'Přidat'}
          </button>
        </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="useGoogleSearchOnly"
          checked={useGoogleSearchOnly}
          onChange={(e) => setUseGoogleSearchOnly(e.target.checked)}
          disabled={loading}
          className="w-4 h-4 text-purple-600 border-white/20 rounded focus:ring-purple-500 bg-white/5 checked:bg-purple-600"
        />
        <label
          htmlFor="useGoogleSearchOnly"
          className="text-sm text-gray-300 cursor-pointer select-none"
        >
          Použít pouze Google Search
        </label>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}
      {onManualAdd && (
        <div className="mt-3 mb-0 pb-0">
          <button
            type="button"
            onClick={onManualAdd}
            className="text-sm text-purple-300 hover:text-purple-200 underline transition-colors"
          >
            Přidat ručně
          </button>
        </div>
      )}
    </form>
    {showScanner && (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={handleCloseScanner}
      />
    )}
    </>
  );
}

