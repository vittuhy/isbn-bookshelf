import { useState } from 'react';
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

  const handleBarcodeScan = (scannedIsbn: string) => {
    // Clean the scanned ISBN (remove any non-digit characters except X)
    const cleaned = scannedIsbn.replace(/[^\dX]/g, '');
    setIsbn(cleaned);
    setError(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-0">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 border border-gray-300 rounded-lg px-2 focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9-]*"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="Zadejte ISBN"
              className="flex-1 min-w-0 px-2 py-2 border-0 focus:outline-none"
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={loading}
              className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
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
            className="flex-shrink-0 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'Vyhledávání...' : 'Přidat'}
          </button>
        </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="useGoogleSearchOnly"
          checked={useGoogleSearchOnly}
          onChange={(e) => setUseGoogleSearchOnly(e.target.checked)}
          disabled={loading}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="useGoogleSearchOnly"
          className="text-sm text-gray-700 cursor-pointer select-none"
        >
          Použít pouze Google Search
        </label>
      </div>
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
      {onManualAdd && (
        <div className="mt-1 mb-0 pb-0">
          <button
            type="button"
            onClick={onManualAdd}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Přidat ručně
          </button>
        </div>
      )}
    </form>
    {showScanner && (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />
    )}
    </>
  );
}

