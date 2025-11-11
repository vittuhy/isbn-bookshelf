import { BookMetadata } from '../types';
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
      coverUrl: metadata.coverUrl || data.coverUrl,
    };
  }

  if (!metadata.title) {
    return null;
  }

  return metadata as BookMetadata;
}

/**
 * Fetch from isbnsearch.org (via Netlify Function to avoid CORS)
 * This is optional - Open Library and Google Books should be sufficient
 */
async function fetchFromISBNSearch(isbn13: string): Promise<Partial<BookMetadata> | null> {
  try {
    // Use Netlify Function proxy to avoid CORS issues
    const url = `/.netlify/functions/isbn-proxy?isbn=${isbn13}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return data;
  } catch (error) {
    // Silently fail - we have other sources
    return null;
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

        // Get cover URL
        const coverUrl = isbn13 
          ? `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`
          : isbn10 
          ? `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`
          : undefined;

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
        
        return {
          title: volume.title,
          authors: volume.authors,
          publisher: volume.publisher,
          publishedYear: volume.publishedDate ? parseInt(volume.publishedDate.split('-')[0]) : undefined,
          description: volume.description,
          coverUrl: volume.imageLinks?.thumbnail?.replace('http://', 'https://') 
            || volume.imageLinks?.smallThumbnail?.replace('http://', 'https://'),
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Google Books error:', error);
    return null;
  }
}

