import { useState } from 'react';
import { lookupBook } from '../lib/bookLookup';
import { normalizeISBN } from '../lib/isbn';
import type { BookMetadata } from '../types';

interface AddBookFormProps {
  onAdd: (metadata: BookMetadata) => void;
}

export function AddBookForm({ onAdd }: AddBookFormProps) {
  const [isbn, setIsbn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const metadata = await lookupBook(isbn.trim());
      console.log('Lookup result:', metadata);
      
      if (metadata && metadata.title) {
        onAdd(metadata);
        setIsbn('');
        setError(null);
      } else {
        const trimmedIsbn = isbn.trim();
        const errorMsg = `Kniha s ISBN ${trimmedIsbn} nebyla nalezena v databázích. Zkontrolujte ISBN a zkuste to znovu.`;
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

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="Zadejte ISBN (10 nebo 13 číslic)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !isbn.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Vyhledávání...' : 'Přidat knihu'}
        </button>
      </div>
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
    </form>
  );
}

