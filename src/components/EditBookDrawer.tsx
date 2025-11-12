import { useState, useEffect } from 'react';
import type { Book } from '../types';
import { normalizeISBN, isbn13To10 } from '../lib/isbn';

interface EditBookDrawerProps {
  book: Book | null;
  allBooks?: Book[]; // All books to extract available tags
  onClose: () => void;
  onSave: (book: Book) => void;
  onDelete?: (id: string) => void;
}

export function EditBookDrawer({ book, allBooks = [], onClose, onSave, onDelete }: EditBookDrawerProps) {
  const [currentTags, setCurrentTags] = useState<string[]>(book?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState({
    title: book?.title || '',
    authors: book?.authors?.join(', ') || '',
    publisher: book?.publisher || '',
    publishedYear: book?.publishedYear?.toString() || '',
    description: book?.description || '',
    imageUrl: book?.imageUrl || book?.coverUrl || '',
    isbn13: book?.isbn13 || '',
    isbn10: book?.isbn10 || '',
  });

  // Extract all unique tags from all books
  const allAvailableTags = Array.from(
    new Set(
      allBooks
        .flatMap(b => b.tags || [])
        .filter(Boolean)
    )
  ).sort().filter(tag => !currentTags.includes(tag)); // Exclude tags already in current book

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
      
      const imageUrlValue = formData.imageUrl.trim() || undefined;
      const newBook: Book = {
        id: '', // Will be generated in Library component
        isbn13: normalizedIsbn13, // Use entered ISBN or empty (will be generated if empty)
        isbn10: normalizedIsbn10,
        title: formData.title.trim(),
        authors: formData.authors ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        publisher: formData.publisher.trim() || undefined,
        publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
        description: formData.description.trim() || undefined,
        imageUrl: imageUrlValue,
        coverUrl: imageUrlValue ? undefined : book?.coverUrl, // Preserve coverUrl if imageUrl is not set
        tags: currentTags.length > 0 ? currentTags : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSave(newBook);
      onClose();
      return;
    }

    // Existing book - update it
    const imageUrlValue = formData.imageUrl.trim() || undefined;
    const updated: Book = {
      ...book,
      title: formData.title.trim(),
      authors: formData.authors ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
      publisher: formData.publisher.trim() || undefined,
      publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
      description: formData.description.trim() || undefined,
      imageUrl: imageUrlValue,
      // If imageUrl is set, clear coverUrl. Otherwise, preserve existing coverUrl
      coverUrl: imageUrlValue ? undefined : (book.coverUrl || undefined),
      tags: currentTags.length > 0 ? currentTags : undefined,
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
      imageUrl: book?.imageUrl || book?.coverUrl || '',
      isbn13: book?.isbn13 || '',
      isbn10: book?.isbn10 || '',
    });
    setCurrentTags(book?.tags || []);
    setTagInput('');
  }, [book]);

  // Handle adding tag from input
  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !currentTags.includes(normalizedTag)) {
      setCurrentTags([...currentTags, normalizedTag]);
      setTagInput('');
    }
  };

  // Handle tag input key press
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    }
  };

  // Handle removing tag
  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };

  // Handle clicking on available tag
  const handleClickAvailableTag = (tag: string) => {
    handleAddTag(tag);
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4" style={{ touchAction: 'none' }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col" style={{ touchAction: 'pan-y' }}>
        <div className="flex justify-between items-center p-2 sm:p-3 border-b flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-bold">{book && book.id ? 'Detail knihy' : 'Přidat knihu ručně'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-2 sm:p-3 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-1.5 sm:space-y-2">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Název <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                  autoFocus={!book || !book.id}
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
                <label className="block text-xs font-medium mb-1">Tagy</label>
                {/* Combined input with tags inside and available tags below */}
                <div className="border border-gray-300 rounded focus-within:ring-2 focus-within:ring-blue-500">
                  {/* Tags and input field in the same container */}
                  <div className="flex flex-wrap gap-1.5 items-center p-2 min-h-[40px]">
                    {currentTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium flex-shrink-0"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-900 focus:outline-none"
                          aria-label={`Odstranit tag ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder={currentTags.length === 0 ? "Zadejte tag nebo klikněte na dostupný tag" : ""}
                      className="flex-1 min-w-[120px] px-1 py-0.5 text-sm border-0 focus:outline-none"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  {/* Available tags integrated below input */}
                  {allAvailableTags.length > 0 && (
                    <div className="px-2 pb-2 pt-1 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1.5">
                        {allAvailableTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleClickAvailableTag(tag)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                </div>
              ) : (
                <div className="col-span-2 border-t pt-2">
                  <label className="block text-xs font-medium mb-1">ISBN</label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
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
        <div className="flex gap-1.5 sm:gap-2 justify-between p-2 sm:p-3 border-t flex-shrink-0">
          <div>
            {onDelete && book && book.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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

