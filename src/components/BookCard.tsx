import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
}

export function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-32 h-48 object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-32 h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No Cover</span>
          </div>
        )}
        <div className="flex-1 p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{book.title}</h3>
          {book.authors && book.authors.length > 0 && (
            <p className="text-sm text-gray-600 mb-2">
              by {book.authors.join(', ')}
            </p>
          )}
          <div className="text-xs text-gray-500 space-y-1 mb-3">
            {book.publisher && <p>Publisher: {book.publisher}</p>}
            {book.publishedYear && <p>Year: {book.publishedYear}</p>}
            <p>ISBN-13: {book.isbn13}</p>
            {book.isbn10 && <p>ISBN-10: {book.isbn10}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(book)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(book.id)}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      {book.description && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 line-clamp-3">{book.description}</p>
        </div>
      )}
    </div>
  );
}

