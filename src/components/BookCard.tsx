import type { Book } from '../types';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  editMode: boolean;
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

export function BookCard({ book, onEdit, onDelete, editMode }: BookCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full relative ${!editMode ? 'max-w-sm' : ''}`}>
      {/* Info icon in top right corner - opens edit dialog */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => onEdit(book)}
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
          <div className="w-24 h-36 bg-gray-200 flex items-center justify-center relative">
            {(book.imageUrl || book.coverUrl) ? (
              <img
                src={book.imageUrl || book.coverUrl}
                alt={book.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-gray-400 text-xs z-10 text-center px-1">Bez obálky</span>
          </div>
          {editMode && (
            <div className="flex gap-2 absolute left-0 top-0 bg-white rounded-br-lg shadow-md p-1">
              <button
                onClick={() => onEdit(book)}
                className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title="Upravit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(book.id)}
                className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                title="Smazat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 pt-4 pb-4 pl-4 pr-8 flex flex-col min-w-0 overflow-hidden">
          <div className="flex flex-col" style={{ height: '144px' }}>
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
    </div>
  );
}

