import type { BookMetadata } from '../types';
import { normalizeISBN, isbn13To10 } from './isbn';

/**
 * Fetch book metadata from multiple sources
 */
export async function lookupBook(isbn: string): Promise<BookMetadata | null> {
  const normalizedISBN = normalizeISBN(isbn);
  const isbn10 = isbn13To10(normalizedISBN);

  // Try multiple sources in parallel (Open Library and Google Books have CORS support)
  // Note: isbnsearch.org has CORS issues, so we'll use a proxy via Netlify Function if needed
  const [openLibraryResult, googleBooksResult] = await Promise.allSettled([
    fetchFromOpenLibrary(normalizedISBN, isbn10),
    fetchFromGoogleBooks(normalizedISBN, isbn10),
  ]);

  // Merge results, prioritizing Open Library, then Google Books
  let metadata: Partial<BookMetadata> = {
    isbn13: normalizedISBN,
    isbn10: isbn10 || undefined,
  };

  // Process Open Library result
  if (openLibraryResult.status === 'fulfilled' && openLibraryResult.value) {
    const data = openLibraryResult.value;
    metadata = {
      ...metadata,
      title: data.title || metadata.title,
      authors: data.authors || metadata.authors,
      publisher: data.publisher || metadata.publisher,
      publishedYear: data.publishedYear || metadata.publishedYear,
      description: data.description || metadata.description,
      coverUrl: data.coverUrl || metadata.coverUrl,
    };
  }

  // Process Google Books result
  if (googleBooksResult.status === 'fulfilled' && googleBooksResult.value) {
    const data = googleBooksResult.value;
    metadata = {
      ...metadata,
      title: metadata.title || data.title,
      authors: metadata.authors || data.authors,
      publisher: metadata.publisher || data.publisher,
      publishedYear: metadata.publishedYear || data.publishedYear,
      description: metadata.description || data.description,
      // Use Google Books cover if we don't have one yet, or prefer Google's if it exists
      coverUrl: metadata.coverUrl || data.coverUrl,
    };
  }
  
  // If still no cover, try additional sources
  if (!metadata.coverUrl) {
    // Try Open Library with ISBN-13
    if (normalizedISBN) {
      const openLibraryCover = `https://covers.openlibrary.org/b/isbn/${normalizedISBN}-L.jpg`;
      const isValid = await verifyCoverExists(openLibraryCover);
      if (isValid) {
        metadata.coverUrl = openLibraryCover;
      }
    }
    
    // Try Open Library with ISBN-10 if ISBN-13 didn't work
    if (!metadata.coverUrl && isbn10) {
      const openLibraryCover10 = `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`;
      const isValid = await verifyCoverExists(openLibraryCover10);
      if (isValid) {
        metadata.coverUrl = openLibraryCover10;
      }
    }
    
    // Try alternative cover sizes if large doesn't work
    if (!metadata.coverUrl && normalizedISBN) {
      const sizes = ['M', 'S'];
      for (const size of sizes) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${normalizedISBN}-${size}.jpg`;
        const isValid = await verifyCoverExists(coverUrl);
        if (isValid) {
          metadata.coverUrl = coverUrl;
          break;
        }
      }
    }
    
    // Last resort: try searching Google Books by title if we have it
    if (!metadata.coverUrl && metadata.title) {
      try {
        const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:"${encodeURIComponent(metadata.title)}"&maxResults=1`;
        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const volume = data.items[0].volumeInfo;
            if (volume.imageLinks) {
              const coverUrl = volume.imageLinks.large?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '')
                || volume.imageLinks.medium?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '')
                || volume.imageLinks.thumbnail?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '');
              
              if (coverUrl) {
                const isValid = await verifyCoverExists(coverUrl);
                if (isValid) {
                  metadata.coverUrl = coverUrl;
                }
              }
            }
          }
        }
      } catch {
        // Ignore errors in fallback search
      }
    }
  }

  if (!metadata.title) {
    console.warn('No title found in metadata:', metadata);
    return null;
  }

  console.log('Final metadata to return:', metadata);
  return metadata as BookMetadata;
}

/**
 * Verify if a cover image URL actually exists and is not a placeholder
 * Open Library returns a 1px GIF placeholder if no cover exists
 */
async function verifyCoverExists(url: string): Promise<boolean> {
  try {
    // Fetch the image to check its actual content
    const response = await fetch(url);
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    
    // First check: If it's a GIF, it's definitely a placeholder
    if (contentType?.includes('image/gif')) {
      return false;
    }
    
    // Second check: Get the blob and check size and file signature
    const blob = await response.blob();
    
    // Placeholders are tiny (< 500 bytes)
    if (blob.size < 500) {
      return false;
    }
    
    // Third check: Verify it's actually a JPEG or PNG by reading magic bytes
    const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // JPEG magic bytes: FF D8 FF
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8;
    // PNG magic bytes: 89 50 4E 47
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    
    return isJPEG || isPNG;
  } catch (error) {
    console.warn('Cover verification failed:', url, error);
    return false;
  }
}

/**
 * Fetch from Open Library API
 */
async function fetchFromOpenLibrary(isbn13: string, isbn10: string): Promise<Partial<BookMetadata> | null> {
  try {
    // Try ISBN-13 first, then ISBN-10
    const identifiers = isbn10 ? [isbn13, isbn10] : [isbn13];
    
    for (const isbn of identifiers) {
      const url = `https://openlibrary.org/isbn/${isbn}.json`;
      const response = await fetch(url);
      if (!response.ok) continue;

      // Check if response is actually JSON (Open Library sometimes returns HTML)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        continue;
      }

      const data = await response.json();
      
      if (data.title) {
        const authors: string[] = [];
        if (data.authors) {
          for (const authorRef of data.authors) {
            try {
              const authorUrl = `https://openlibrary.org${authorRef.key}.json`;
              const authorResponse = await fetch(authorUrl);
              if (authorResponse.ok) {
                const authorData = await authorResponse.json();
                authors.push(authorData.name || '');
              }
            } catch {
              // Skip author if fetch fails
            }
          }
        }

        // Get cover URL - Open Library covers work with both ISBN-13 and ISBN-10
        // Verify the cover exists (not a 1px placeholder) before using it
        let coverUrl: string | undefined;
        // Prefer ISBN-13, fallback to ISBN-10
        if (isbn13) {
          const potentialCover = `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
          const isValid = await verifyCoverExists(potentialCover);
          if (isValid) {
            coverUrl = potentialCover;
          }
        }
        
        // Try ISBN-10 if ISBN-13 didn't work
        if (!coverUrl && isbn10) {
          const potentialCover = `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`;
          const isValid = await verifyCoverExists(potentialCover);
          if (isValid) {
            coverUrl = potentialCover;
          }
        }

        const publishedYear = data.publish_date 
          ? parseInt(data.publish_date.split('-')[0] || data.publish_date)
          : undefined;

        return {
          title: data.title,
          authors: authors.length > 0 ? authors : undefined,
          publisher: data.publishers?.[0],
          publishedYear,
          description: typeof data.description === 'string' 
            ? data.description 
            : data.description?.value,
          coverUrl,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Open Library error:', error);
    return null;
  }
}

/**
 * Fetch from Google Books API
 */
async function fetchFromGoogleBooks(isbn13: string, isbn10: string): Promise<Partial<BookMetadata> | null> {
  try {
    // Try ISBN-13 first, then ISBN-10
    const identifiers = isbn10 ? [isbn13, isbn10] : [isbn13];
    
    for (const isbn of identifiers) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const volume = data.items[0].volumeInfo;
        
        // Get best cover image from Google Books
        let coverUrl: string | undefined;
        if (volume.imageLinks) {
          // Prefer larger images, replace http with https, and remove zoom parameter for better quality
          const large = volume.imageLinks.large?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '');
          const medium = volume.imageLinks.medium?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '');
          const thumbnail = volume.imageLinks.thumbnail?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '');
          const smallThumbnail = volume.imageLinks.smallThumbnail?.replace('http://', 'https://')?.replace(/&zoom=\d+/, '');
          
          // Use the best available, but verify it exists
          coverUrl = large || medium || thumbnail || smallThumbnail;
          
          // Verify the cover is valid before using it
          if (coverUrl) {
            const isValid = await verifyCoverExists(coverUrl);
            if (!isValid) {
              coverUrl = undefined;
            }
          }
        }
        
        return {
          title: volume.title,
          authors: volume.authors,
          publisher: volume.publisher,
          publishedYear: volume.publishedDate ? parseInt(volume.publishedDate.split('-')[0]) : undefined,
          description: volume.description,
          coverUrl,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Google Books error:', error);
    return null;
  }
}

