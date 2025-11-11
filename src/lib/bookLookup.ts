import type { BookMetadata } from '../types';
import { normalizeISBN, isbn13To10 } from './isbn';

/**
 * Fetch book metadata from multiple sources
 * @param isbn - ISBN to lookup
 * @param useGoogleSearchOnly - If true, skip Open Library and Google Books and use Google Search directly
 */
export async function lookupBook(isbn: string, useGoogleSearchOnly: boolean = false): Promise<BookMetadata | null> {
  const normalizedISBN = normalizeISBN(isbn);
  const isbn10 = isbn13To10(normalizedISBN);

  // Track which sources were used
  const sources: string[] = [];

  // If Google Search-only mode, use Google Search directly
  if (useGoogleSearchOnly) {
    console.log('Using Google Search-only mode, skipping Open Library and Google Books');
    
    const googleSearchResult = await searchGoogleForISBN(normalizedISBN, isbn10);
    if (googleSearchResult && googleSearchResult.title) {
      sources.push('Google Search');
      
      // Try to find cover image using Google Search
      if (!googleSearchResult.coverUrl) {
        const coverUrl = await searchGoogleForCoverImage(normalizedISBN, isbn10, googleSearchResult.title);
        if (coverUrl) {
          googleSearchResult.coverUrl = coverUrl;
        }
      }
      
      const sourceInfo = `\n\n[Zdroj: ${sources.join(', ')}]`;
      return {
        isbn13: normalizedISBN,
        isbn10: isbn10 || undefined,
        ...googleSearchResult,
        description: (googleSearchResult.description || '') + sourceInfo,
      } as BookMetadata;
    }
    return null;
  }

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
    if (data.title) {
      sources.push('Open Library');
    }
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
    // Track Google Books as source if it provided any useful data (title, authors, etc.)
    if (data.title || data.authors || data.publishedYear || data.description) {
      if (!sources.includes('Google Books')) {
        sources.push('Google Books');
      }
    }
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
    
    // Try Google Search for cover image if still no cover
    if (!metadata.coverUrl && metadata.title) {
      try {
        const coverUrl = await searchGoogleForCoverImage(normalizedISBN, isbn10, metadata.title);
        if (coverUrl) {
          metadata.coverUrl = coverUrl;
        }
      } catch {
        // Ignore errors in Google Search image lookup
      }
    }
  }

  // If no title found from Open Library or Google Books, try Google Search as fallback (option #3)
  if (!metadata.title) {
    console.warn('No title found in metadata, trying Google Search fallback:', metadata);
    try {
      const googleSearchResult = await searchGoogleForISBN(normalizedISBN, isbn10);
      if (googleSearchResult && googleSearchResult.title) {
        sources.push('Google Search');
        metadata = {
          ...metadata,
          title: googleSearchResult.title,
          authors: googleSearchResult.authors || metadata.authors,
          publishedYear: googleSearchResult.publishedYear || metadata.publishedYear,
        };
        
        // Try to find cover image using Google Search if we don't have one
        if (!metadata.coverUrl && metadata.title) {
          const coverUrl = await searchGoogleForCoverImage(normalizedISBN, isbn10, metadata.title);
          if (coverUrl) {
            metadata.coverUrl = coverUrl;
          }
        }
      }
    } catch (error) {
      console.error('Google Search fallback error:', error);
      // Continue to return null if Google Search also fails
    }
  }

  if (!metadata.title) {
    console.warn('No title found in metadata after all sources:', metadata);
    return null;
  }

  // If we have a book title but no cover image, try Google Search for the cover
  // This applies regardless of which source found the book (Open Library, Google Books, or Google Search)
  if (!metadata.coverUrl && metadata.title) {
    console.log('Book found but no cover image, trying Google Search for cover...');
    try {
      const coverUrl = await searchGoogleForCoverImage(normalizedISBN, isbn10, metadata.title);
      if (coverUrl) {
        metadata.coverUrl = coverUrl;
        console.log('Found cover image via Google Search:', coverUrl);
      }
    } catch (error) {
      console.error('Error searching for cover image via Google Search:', error);
      // Continue - cover image is optional
    }
  }

  // Add source information to description
  if (sources.length > 0) {
    const sourceInfo = `\n\n[Zdroj: ${sources.join(', ')}]`;
    metadata.description = (metadata.description || '') + sourceInfo;
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
 * Search Google for ISBN and extract book information
 * Uses Google Custom Search API
 */
async function searchGoogleForISBN(isbn13: string, isbn10: string | null): Promise<Partial<BookMetadata> | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
  const searchEngineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    console.warn('Google Search API not configured (VITE_GOOGLE_SEARCH_API_KEY and VITE_GOOGLE_SEARCH_ENGINE_ID)');
    console.warn('API Key present:', !!apiKey, 'Search Engine ID present:', !!searchEngineId);
    return null;
  }

  try {
    // Try both ISBN-13 and ISBN-10, prioritizing ISBN-13 since that's what user likely entered
    const isbnsToTry = isbn13 ? [isbn13, isbn10].filter(Boolean) : [isbn10].filter(Boolean);
    
    // Try multiple search query variations for each ISBN
    const searchQueries: string[] = [];
    for (const isbn of isbnsToTry) {
      searchQueries.push(
        `"${isbn}"`,
        `ISBN ${isbn}`,
        `ISBN-${isbn}`,
        `${isbn} book`,
        `${isbn} kniha`,
      );
    }
    
    let data: any = null;
    let successfulQuery = '';
    
    // Try each query variation until we get results
    for (const searchQuery of searchQueries) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}`;
      
      console.log('Searching Google with query:', searchQuery);
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Google Search API error:', response.status, errorText);
          try {
            const errorData = JSON.parse(errorText);
            console.error('Error details:', errorData);
          } catch {
            // Not JSON, already logged as text
          }
          continue; // Try next query
        }

        const responseData = await response.json();
        console.log('Google Search results for query:', searchQuery, 'Results:', responseData.items?.length || 0);

        if (responseData.items && responseData.items.length > 0) {
          // Found results with this query, use them
          data = responseData;
          successfulQuery = searchQuery;
          break; // Exit the loop and process results
        }
      } catch (fetchError) {
        console.error('Fetch error for query:', searchQuery, fetchError);
        continue; // Try next query
      }
    }
    
    if (!data || !data.items || data.items.length === 0) {
      console.warn('No Google Search results found for ISBN:', isbn13 || isbn10, 'after trying multiple queries');
      return null;
    }
    
    console.log('Using results from query:', successfulQuery);
    console.log('Final Google Search results:', data);
    console.log('Number of results:', data.items.length);

    // Try to extract book information from search results
    // Look at the first few results
    for (const item of data.items.slice(0, 3)) {
      const title = item.title;
      const snippet = item.snippet;
      
      console.log('Processing result:', { title, snippet });
      
      // Try to extract title and author from the result
      // Format is often: "Book Title - Author Name" or "Book Title by Author Name"
      let extractedTitle = title;
      let extractedAuthors: string[] | undefined = undefined;
      
      // Try to parse author from title or snippet
      const authorPatterns = [
        /by\s+([^-]+?)(?:\s*[-–]|$)/i,
        /-\s*([^-]+?)(?:\s*[-–]|$)/i,
        /,\s*([^,]+?)(?:\s*[-–]|$)/i,
      ];
      
      for (const pattern of authorPatterns) {
        const match = (title + ' ' + snippet).match(pattern);
        if (match && match[1]) {
          extractedAuthors = [match[1].trim()];
          extractedTitle = title.replace(pattern, '').trim();
          break;
        }
      }

      // If we found a title, return it
      if (extractedTitle && extractedTitle.length > 3) {
        console.log('Extracted book info:', { title: extractedTitle, authors: extractedAuthors });
        return {
          title: extractedTitle,
          authors: extractedAuthors,
          publishedYear: undefined, // Hard to extract from search results
        };
      }
    }

    console.warn('Could not extract valid title from Google Search results');
    return null;
  } catch (error) {
    console.error('Google Search error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Search Google for book cover image
 * Uses Google Custom Search API with image search
 */
async function searchGoogleForCoverImage(isbn13: string, isbn10: string | null, bookTitle?: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
  const searchEngineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    return null;
  }

  try {
    const isbnToSearch = isbn10 || isbn13;
    // Search for book cover image
    const searchQuery = bookTitle 
      ? `${bookTitle} book cover ISBN ${isbnToSearch}`
      : `ISBN ${isbnToSearch} book cover`;
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=5`;
    
    console.log('Searching Google for cover image:', searchQuery);
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    // Try to find a valid cover image from the results
    for (const item of data.items) {
      const imageUrl = item.link;
      if (imageUrl && (imageUrl.includes('cover') || imageUrl.match(/\.(jpg|jpeg|png|webp)$/i))) {
        // Verify the image exists
        const isValid = await verifyCoverExists(imageUrl);
        if (isValid) {
          console.log('Found cover image via Google Search:', imageUrl);
          return imageUrl;
        }
      }
    }

    // If no cover-specific image found, try the first image result
    if (data.items[0]?.link) {
      const imageUrl = data.items[0].link;
      const isValid = await verifyCoverExists(imageUrl);
      if (isValid) {
        console.log('Found image via Google Search (first result):', imageUrl);
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Google Search image error:', error);
    return null;
  }
}

// OpenAI function removed - using Google Custom Search instead

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

