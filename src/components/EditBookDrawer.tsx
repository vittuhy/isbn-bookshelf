import { useState } from 'react';
import type { Book } from '../types';

interface EditBookDrawerProps {
  book: Book | null;
  onClose: () => void;
  onSave: (book: Book) => void;
}

export function EditBookDrawer({ book, onClose, onSave }: EditBookDrawerProps) {
  const [formData, setFormData] = useState({
    title: book?.title || '',
    authors: book?.authors?.join(', ') || '',
    publisher: book?.publisher || '',
    publishedYear: book?.publishedYear?.toString() || '',
    description: book?.description || '',
    imageUrl: book?.imageUrl || '',
    tags: book?.tags?.join(', ') || '',
  });

  if (!book) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Book = {
      ...book,
      title: formData.title,
      authors: formData.authors ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
      publisher: formData.publisher.trim() || undefined,
      publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
      description: formData.description.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold">Upravit knihu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Název *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Autoři (oddělené čárkou)</label>
                <input
                  type="text"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nakladatel</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Rok vydání</label>
                <input
                  type="number"
                  value={formData.publishedYear}
                  onChange={(e) => setFormData({ ...formData, publishedYear: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Popis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
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
            </div>
          </form>
        </div>
        <div className="flex gap-2 justify-end p-4 border-t flex-shrink-0">
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
  );
}

