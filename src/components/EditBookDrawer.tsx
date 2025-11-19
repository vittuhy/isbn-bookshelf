import { useState, useEffect } from 'react';
import type { Book } from '../types';
import { normalizeISBN, isbn13To10 } from '../lib/isbn';
import { ImageUploadCrop } from './ImageUploadCrop';

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
  const [showImageUpload, setShowImageUpload] = useState(false);

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
    
    // Scroll to ISBN field on mobile when dialog opens
    if (book) {
      setTimeout(() => {
        const isbnElement = document.getElementById('isbn-section') || document.getElementById('isbn13-input');
        if (isbnElement && window.innerWidth < 640) {
          isbnElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300" style={{ touchAction: 'none' }}>
      <div className="glass-dark rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[90vh] flex flex-col border border-white/20 shadow-2xl" style={{ touchAction: 'pan-y' }}>
        <div className="flex justify-between items-center p-3 sm:p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{book && book.id ? 'Detail knihy' : 'Přidat knihu ručně'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors hover:scale-110 active:scale-95 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4 pb-2">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="col-span-2">
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">Název <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 text-white placeholder-gray-400 transition-all"
                  style={{ fontSize: '16px' }}
                  autoFocus={!book || !book.id}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">Autoři (oddělené čárkou)</label>
                <input
                  type="text"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 text-white placeholder-gray-400 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">Nakladatel</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 text-white placeholder-gray-400 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">Rok vydání</label>
                <input
                  type="number"
                  value={formData.publishedYear}
                  onChange={(e) => setFormData({ ...formData, publishedYear: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 text-white placeholder-gray-400 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">URL obrázku</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 text-white placeholder-gray-400 transition-all"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageUpload(true)}
                    className="px-3 py-2 sm:px-4 sm:py-3 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 whitespace-nowrap flex items-center justify-center shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
                    title="Pořídit nebo vybrat obrázek"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">Tagy</label>
                {/* Combined input with tags inside and available tags below */}
                <div className="border border-white/20 rounded-lg sm:rounded-xl focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-400/50 transition-all bg-white/5">
                  {/* Tags and input field in the same container */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center p-2 sm:p-3 min-h-[40px] sm:min-h-[50px]">
                    {currentTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-lg text-xs font-medium flex-shrink-0 backdrop-blur-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-purple-200 focus:outline-none transition-colors"
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
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border-0 focus:outline-none bg-transparent text-white placeholder-gray-400"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  {/* Available tags integrated below input */}
                  {allAvailableTags.length > 0 && (
                    <div className="px-3 pb-3 pt-2 border-t border-white/10">
                      <div className="flex flex-wrap gap-2">
                        {allAvailableTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleClickAvailableTag(tag)}
                            className="px-3 py-1.5 text-xs bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-400/30 transition-all duration-300 backdrop-blur-sm"
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
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">Popis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 resize-none text-white placeholder-gray-400 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              {/* ISBN fields - editable for new books, read-only for existing books */}
              {(!book || !book.id) ? (
                <div className="col-span-2 border-t border-white/10 pt-2 sm:pt-4 scroll-mt-4">
                  <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">ISBN-13</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9-]*"
                    value={formData.isbn13}
                    onChange={(e) => setFormData({ ...formData, isbn13: e.target.value })}
                    placeholder="978-80-257-4767-4 nebo 9788025747674"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-white/5 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 text-white placeholder-gray-400 transition-all"
                    style={{ fontSize: '16px' }}
                    id="isbn13-input"
                  />
                </div>
              ) : (
                <div className="col-span-2 border-t border-white/10 pt-2 sm:pt-4 scroll-mt-4" id="isbn-section">
                  <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-300">ISBN</label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="glass-dark p-3 rounded-xl border border-white/10">
                      <span className="text-xs text-gray-400 block mb-1">ISBN-13:</span>
                      <p className="font-mono text-sm text-purple-300">{book.isbn13}</p>
                    </div>
                    {book.isbn10 && (
                      <div className="glass-dark p-3 rounded-xl border border-white/10">
                        <span className="text-xs text-gray-400 block mb-1">ISBN-10:</span>
                        <p className="font-mono text-sm text-purple-300">{book.isbn10}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="flex gap-2 sm:gap-4 justify-between p-3 sm:p-6 border-t border-white/10 flex-shrink-0">
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
                className="px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium bg-red-600/80 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95"
              >
                Smazat
              </button>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium border border-white/20 rounded-lg sm:rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-300"
            >
              Zrušit
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
            >
              Uložit
            </button>
          </div>
        </div>
      </div>
      
      {/* Image upload and crop modal */}
      {showImageUpload && (
        <ImageUploadCrop
          onComplete={(imageUrl) => {
            setFormData({ ...formData, imageUrl });
            setShowImageUpload(false);
          }}
          onCancel={() => setShowImageUpload(false)}
        />
      )}
    </div>
  );
}

