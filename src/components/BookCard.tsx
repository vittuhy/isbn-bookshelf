import { useState, useEffect } from 'react';
import type { Book } from '../types';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
}

// Modern color palette for tags - sophisticated and contemporary
const TAG_COLORS = [
  'bg-slate-100 text-slate-700 border border-slate-300',
  'bg-blue-50 text-blue-700 border border-blue-200',
  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'bg-purple-50 text-purple-700 border border-purple-200',
  'bg-pink-50 text-pink-700 border border-pink-200',
  'bg-amber-50 text-amber-700 border border-amber-200',
  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'bg-rose-50 text-rose-700 border border-rose-200',
  'bg-cyan-50 text-cyan-700 border border-cyan-200',
  'bg-violet-50 text-violet-700 border border-violet-200',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

export function BookCard({ book, onEdit }: BookCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const hasImageUrl = !!(book.imageUrl || book.coverUrl);

  // Reset error state when image URL changes
  useEffect(() => {
    setImageError(false);
  }, [book.imageUrl, book.coverUrl, book.updatedAt]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full relative w-full">
      {/* Info icon in top right corner - opens edit dialog */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => {
            onEdit(book);
            // Update URL when clicking info icon
            window.history.pushState({}, '', `/${book.isbn13}`);
          }}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
          title="Upravit knihu"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1">
        <div className="flex flex-col items-center flex-shrink-0 mt-4 ml-4 relative">
          <div 
            className="w-32 h-32 bg-gray-200 flex items-center justify-center relative cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => hasImageUrl && !imageError && setShowFullImage(true)}
          >
            {hasImageUrl ? (
              <img
                key={`${book.id}-${book.imageUrl || book.coverUrl}-${book.updatedAt}`}
                src={(() => {
                  const imageUrl = book.imageUrl || book.coverUrl || '';
                  // Add cache-busting parameter based on updatedAt timestamp
                  const separator = imageUrl.includes('?') ? '&' : '?';
                  const timestamp = new Date(book.updatedAt).getTime();
                  return `${imageUrl}${separator}_cb=${timestamp}`;
                })()}
                alt={book.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onLoad={() => {
                  setImageError(false);
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  setImageError(true);
                }}
              />
            ) : null}
            {(!hasImageUrl || imageError) && (
              <span className="text-gray-400 text-xs z-10 text-center px-1">Bez obálky</span>
            )}
          </div>
        </div>
        <div className="flex-1 pt-4 pb-4 pl-4 pr-8 flex flex-col min-w-0 overflow-hidden">
          <div className="flex flex-col" style={{ height: '128px' }}>
            <div className="flex-shrink-0">
              <h3 className="font-semibold text-lg mb-1 line-clamp-2">{book.title}</h3>
              {book.authors && book.authors.length > 0 && (
                <p className="text-sm text-gray-600 mb-2">
                  {book.authors.join(', ')}
                </p>
              )}
              {book.publishedYear && (
                <p className="text-base text-black font-bold mb-2">{book.publishedYear}</p>
              )}
            </div>
            {/* Tags display - aligned with bottom of image */}
            {book.tags && book.tags.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-1.5 items-end">
                {book.tags.map(tag => (
                  <span
                    key={tag}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${getTagColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Full-size image modal */}
      {showFullImage && hasImageUrl && !imageError && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl z-10"
            title="Zavřít"
          >
            ×
          </button>
          <img
            src={(() => {
              const imageUrl = book.imageUrl || book.coverUrl || '';
              const separator = imageUrl.includes('?') ? '&' : '?';
              const timestamp = new Date(book.updatedAt).getTime();
              return `${imageUrl}${separator}_cb=${timestamp}`;
            })()}
            alt={book.title}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

