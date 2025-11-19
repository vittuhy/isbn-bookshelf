import { useState, useEffect } from 'react';
import type { Book } from '../types';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  isImageExpanded?: boolean;
  onImageExpand?: () => void;
  onImageClose?: () => void;
}

// Modern dark color palette for tags - vibrant and contemporary
const TAG_COLORS = [
  'bg-purple-500/20 text-purple-300 border border-purple-400/30',
  'bg-blue-500/20 text-blue-300 border border-blue-400/30',
  'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
  'bg-pink-500/20 text-pink-300 border border-pink-400/30',
  'bg-amber-500/20 text-amber-300 border border-amber-400/30',
  'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
  'bg-rose-500/20 text-rose-300 border border-rose-400/30',
  'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30',
  'bg-violet-500/20 text-violet-300 border border-violet-400/30',
  'bg-orange-500/20 text-orange-300 border border-orange-400/30',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

export function BookCard({ book, onEdit, isImageExpanded = false, onImageExpand, onImageClose }: BookCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasImageUrl = !!(book.imageUrl || book.coverUrl);

  // Reset error state when image URL changes
  useEffect(() => {
    setImageError(false);
  }, [book.imageUrl, book.coverUrl, book.updatedAt]);

  const handleCardClick = () => {
    // Don't open book detail if image is expanded
    if (isImageExpanded) return;
    onEdit(book);
    // Update URL when clicking card
    window.history.pushState({}, '', `/${book.isbn13}`);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasImageUrl && !imageError && onImageExpand) {
      onImageExpand();
    }
  };

  const handleCloseImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onImageClose) {
      onImageClose();
    }
  };

  return (
    <div 
      className="glass-dark rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full relative w-full border border-white/20 hover:border-purple-400/50 hover:scale-[1.02] group cursor-pointer"
      onClick={handleCardClick}
    >
      {!isImageExpanded ? (
        <div className="flex flex-1">
          <div className="flex flex-col items-start flex-shrink-0 relative pt-4 pl-4 pb-4">
            <div 
              className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center relative cursor-pointer hover:opacity-90 transition-all duration-300 rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/50 group-hover:scale-105"
              onClick={handleImageClick}
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
                  className="absolute inset-0 w-full h-full object-contain"
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
          <div className="flex-1 pt-4 pl-4 pb-4 pr-4 flex flex-col min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1">
              <div className="flex-shrink-0">
                <h3 className="font-bold text-base sm:text-lg mb-1.5 line-clamp-2 text-white group-hover:text-purple-300 transition-colors">
                  {book.title}
                </h3>
                {book.authors && book.authors.length > 0 && (
                  <p className="text-sm text-gray-300 mb-2 line-clamp-1">
                    {book.authors.join(', ')}
                  </p>
                )}
                {book.publishedYear && (
                  <p className="text-sm sm:text-base text-purple-300 font-bold mb-2">{book.publishedYear}</p>
                )}
              </div>
              {/* Tags display - aligned with bottom of image */}
              {book.tags && book.tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 items-end">
                  {book.tags.map(tag => (
                    <span
                      key={tag}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getTagColor(tag)} backdrop-blur-sm`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded image view within card */
        <div className="relative w-full h-full min-h-[300px] flex items-center justify-center p-4">
          <button
            onClick={handleCloseImage}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-purple-500/30 backdrop-blur-sm border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-110 active:scale-95"
            title="Zavřít"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={(() => {
              const imageUrl = book.imageUrl || book.coverUrl || '';
              const separator = imageUrl.includes('?') ? '&' : '?';
              const timestamp = new Date(book.updatedAt).getTime();
              return `${imageUrl}${separator}_cb=${timestamp}`;
            })()}
            alt={book.title}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

