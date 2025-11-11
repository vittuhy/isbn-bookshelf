import { useState } from 'react';
import { lookupBook } from '../lib/bookLookup';
import { BookMetadata } from '../types';

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
      const metadata = await lookupBook(isbn.trim());
      if (metadata) {
        onAdd(metadata);
        setIsbn('');
      } else {
        setError('Book not found. Please check the ISBN and try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup book');
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
          placeholder="Enter ISBN (10 or 13 digits)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !isbn.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching...' : 'Add Book'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </form>
  );
}

