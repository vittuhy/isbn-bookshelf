import { useState, useEffect } from 'react';
import type { Book } from '../types';
import { normalizeISBN, isbn13To10 } from '../lib/isbn';

interface EditBookDrawerProps {
  book: Book | null;
  onClose: () => void;
  onSave: (book: Book) => void;
  onDelete?: (id: string) => void;
}

export function EditBookDrawer({ book, onClose, onSave, onDelete }: EditBookDrawerProps) {
  const [formData, setFormData] = useState({
    title: book?.title || '',
    authors: book?.authors?.join(', ') || '',
    publisher: book?.publisher || '',
    publishedYear: book?.publishedYear?.toString() || '',
    description: book?.description || '',
    imageUrl: book?.imageUrl || '',
    tags: book?.tags?.join(', ') || '',
    isbn13: book?.isbn13 || '',
    isbn10: book?.isbn10 || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate title (mandatory)
    if (!formData.title.trim()) {
      alert('Název knihy je povinný.');
      return;
    }

    // If book has no ID, it's a new book - create it
    if (!book || !book.id) {
      // Normalize ISBN if provided
      let normalizedIsbn13 = '';
      let normalizedIsbn10: string | undefined = undefined;
      
      if (formData.isbn13.trim()) {
        try {
          normalizedIsbn13 = normalizeISBN(formData.isbn13.trim());
          // Try to generate ISBN-10 from ISBN-13
          normalizedIsbn10 = isbn13To10(normalizedIsbn13) || undefined;
        } catch (error) {
          alert('Neplatný formát ISBN. Zadejte 10 nebo 13 číslic (s nebo bez pomlček).');
          return;
        }
      } else if (formData.isbn10.trim()) {
        try {
          // If only ISBN-10 is provided, convert it to ISBN-13
          normalizedIsbn13 = normalizeISBN(formData.isbn10.trim());
          normalizedIsbn10 = formData.isbn10.trim().replace(/\D/g, '');
        } catch (error) {
          alert('Neplatný formát ISBN. Zadejte 10 nebo 13 číslic (s nebo bez pomlček).');
          return;
        }
      }
      
      const newBook: Book = {
        id: '', // Will be generated in Library component
        isbn13: normalizedIsbn13, // Use entered ISBN or empty (will be generated if empty)
        isbn10: normalizedIsbn10,
        title: formData.title.trim(),
        authors: formData.authors ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        publisher: formData.publisher.trim() || undefined,
        publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
        description: formData.description.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSave(newBook);
      onClose();
      return;
    }

    // Existing book - update it
    const updated: Book = {
      ...book,
      title: formData.title.trim(),
      authors: formData.authors ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
      publisher: formData.publisher.trim() || undefined,
      publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
      description: formData.description.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : undefined,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  // Update form data when book changes
  useEffect(() => {
    setFormData({
      title: book?.title || '',
      authors: book?.authors?.join(', ') || '',
      publisher: book?.publisher || '',
      publishedYear: book?.publishedYear?.toString() || '',
      description: book?.description || '',
      imageUrl: book?.imageUrl || '',
      tags: book?.tags?.join(', ') || '',
      isbn13: book?.isbn13 || '',
      isbn10: book?.isbn10 || '',
    });
  }, [book]);

  // Prevent zoom on input focus (mobile browsers)
  useEffect(() => {
    const preventZoom = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    };

    const restoreZoom = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
      }
    };

    if (book || !book) {
      preventZoom();
    }

    return () => {
      restoreZoom();
    };
  }, [book]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" style={{ touchAction: 'none' }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" style={{ touchAction: 'pan-y' }}>
        <div className="flex justify-between items-center p-3 border-b flex-shrink-0">
            <h2 className="text-xl font-bold">{book && book.id ? 'Detail knihy' : 'Přidat knihu ručně'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-3 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Název <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Autoři (oddělené čárkou)</label>
                <input
                  type="text"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nakladatel</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Rok vydání</label>
                <input
                  type="number"
                  value={formData.publishedYear}
                  onChange={(e) => setFormData({ ...formData, publishedYear: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">URL obrázku</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Tagy (oddělené čárkou)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="např. sci-fi, fantasy, detektivka"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Popis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>
              {/* ISBN fields - editable for new books, read-only for existing books */}
              {(!book || !book.id) ? (
                <div className="col-span-2 border-t pt-2">
                  <label className="block text-xs font-medium mb-1">ISBN-13</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9-]*"
                    value={formData.isbn13}
                    onChange={(e) => setFormData({ ...formData, isbn13: e.target.value })}
                    placeholder="978-80-257-4767-4 nebo 9788025747674"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontSize: '16px' }}
                  />
                  <label className="block text-xs font-medium mb-1 mt-2">ISBN-10 (volitelné)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9X-]*"
                    value={formData.isbn10}
                    onChange={(e) => setFormData({ ...formData, isbn10: e.target.value })}
                    placeholder="80-257-4767-4 nebo 8025747674"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              ) : (
                <div className="col-span-2 border-t pt-2">
                  <label className="block text-xs font-medium mb-1">ISBN</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500">ISBN-13:</span>
                      <p className="font-mono text-xs mt-0.5">{book.isbn13}</p>
                    </div>
                    {book.isbn10 && (
                      <div>
                        <span className="text-xs text-gray-500">ISBN-10:</span>
                        <p className="font-mono text-xs mt-0.5">{book.isbn10}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="flex gap-2 justify-between p-3 border-t flex-shrink-0">
          <div>
            {onDelete && book && book.id && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Opravdu chcete smazat tuto knihu?')) {
                    onDelete(book.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Smazat
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Uložit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

