import { supabase } from './supabase';

const STORAGE_BUCKET = 'book-covers';

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToSupabase(
  file: Blob,
  fileName: string
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const extension = fileName.split('.').pop() || 'jpg';
  const uniqueFileName = `${timestamp}-${randomId}.${extension}`;

  // Detect MIME type from blob (defaults to jpeg)
  const contentType = file.type || 'image/jpeg';

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(uniqueFileName, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('Error uploading to Supabase Storage:', error);
    if (error.message?.includes('bucket') || error.message?.includes('not found')) {
      throw new Error('Úložiště obrázků není nakonfigurováno. Vytvořte prosím bucket "book-covers" v Supabase Storage.');
    }
    if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
      throw new Error('Chyba oprávnění: Je potřeba nastavit Storage policy. Viz dokumentace v Supabase Dashboard → Storage → Policies.');
    }
    throw new Error(`Chyba při nahrávání obrázku: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(uniqueFileName);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  return urlData.publicUrl;
}

/**
 * Extract filename from Supabase storage public URL
 */
function extractFileNameFromUrl(url: string): string | null {
  try {
    if (!url || typeof url !== 'string') {
      console.warn('Invalid URL provided to extractFileNameFromUrl:', url);
      return null;
    }
    
    // URL format: https://[project].supabase.co/storage/v1/object/public/book-covers/[filename]
    // Also handle URLs with query parameters
    const match = url.match(/\/book-covers\/([^/?]+)/);
    if (match && match[1]) {
      // Decode URL-encoded filename if needed
      return decodeURIComponent(match[1]);
    }
    
    console.warn('Could not extract filename from URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting filename from URL:', error, url);
    return null;
  }
}

/**
 * Check if URL is from our Supabase storage bucket
 */
export function isSupabaseStorageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('/book-covers/') && url.includes('supabase.co');
}

/**
 * Download image from external URL and upload to Supabase Storage
 * This ensures external images are stored in our database and won't disappear
 */
export async function downloadAndUploadExternalImage(imageUrl: string): Promise<string> {
  if (!supabase) {
    console.warn('[downloadAndUploadExternalImage] Supabase is not configured, returning original URL');
    return imageUrl;
  }

  // If already from Supabase storage, return as-is
  if (isSupabaseStorageUrl(imageUrl)) {
    console.log('[downloadAndUploadExternalImage] Image is already from Supabase storage, skipping download');
    return imageUrl;
  }

  console.log('[downloadAndUploadExternalImage] Downloading external image:', imageUrl);

  try {
    // Try to use Netlify function first (bypasses CORS)
    let blob: Blob | undefined;
    let contentType = 'image/jpeg';

    // Check if we're on Netlify (production) - only use function in production
    const isNetlify = window.location.hostname.includes('netlify.app') || 
                      window.location.hostname.includes('vtuhy.cz');

    // Try Netlify function only in production (or if explicitly enabled in dev)
    if (isNetlify) {
      try {
        console.log('[downloadAndUploadExternalImage] Attempting to download via Netlify function');
        const functionUrl = '/.netlify/functions/download-image';
        
        const functionResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
        });

        if (functionResponse.ok) {
          const data = await functionResponse.json();
          if (data.success && data.dataUrl) {
            console.log('[downloadAndUploadExternalImage] ✅ Downloaded via Netlify function');
            // Convert data URL to blob
            const response = await fetch(data.dataUrl);
            blob = await response.blob();
            contentType = data.contentType || 'image/jpeg';
          } else {
            throw new Error(data.error || 'Function returned unsuccessful response');
          }
        } else {
          const errorData = await functionResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Function returned ${functionResponse.status}`);
        }
      } catch (functionError) {
        console.warn('[downloadAndUploadExternalImage] Netlify function failed, trying direct download:', functionError);
        // Fall through to direct download attempt
      }
    } else if (import.meta.env.DEV) {
      // In local dev, try Netlify dev server if available (optional)
      try {
        console.log('[downloadAndUploadExternalImage] Attempting to download via Netlify dev function (if available)');
        const functionUrl = 'http://localhost:8888/.netlify/functions/download-image';
        
        // Use a timeout to avoid hanging if Netlify dev isn't running
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const functionResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (functionResponse.ok) {
          const data = await functionResponse.json();
          if (data.success && data.dataUrl) {
            console.log('[downloadAndUploadExternalImage] ✅ Downloaded via Netlify dev function');
            // Convert data URL to blob
            const response = await fetch(data.dataUrl);
            blob = await response.blob();
            contentType = data.contentType || 'image/jpeg';
          } else {
            throw new Error(data.error || 'Function returned unsuccessful response');
          }
        } else {
          throw new Error(`Function returned ${functionResponse.status}`);
        }
      } catch (functionError) {
        // Silently fail in dev - Netlify dev might not be running
        if (functionError instanceof Error && functionError.name === 'AbortError') {
          console.log('[downloadAndUploadExternalImage] Netlify dev not available (timeout), trying direct download');
        } else {
          console.log('[downloadAndUploadExternalImage] Netlify dev function not available, trying direct download');
        }
        // Fall through to direct download attempt
      }
    }

    // If Netlify function didn't work or isn't available, try direct download
    if (!blob) {
      console.log('[downloadAndUploadExternalImage] Attempting direct download');
      let response: Response;
      try {
        response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit',
        });
      } catch (corsError) {
        console.warn('[downloadAndUploadExternalImage] CORS error:', corsError);
        throw new Error('CORS error: Cannot download image from external source. Try deploying to Netlify to use the serverless function.');
      }

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      // Get the image as a blob
      blob = await response.blob();
      contentType = blob.type || 'image/jpeg';
    }

    // Ensure we have a blob at this point
    if (!blob) {
      throw new Error('Failed to download image: No blob obtained');
    }

    // Check if it's actually an image
    if (!contentType.startsWith('image/')) {
      throw new Error('Downloaded file is not an image');
    }

    // Determine file extension from content type or URL
    let extension = 'jpg';
    if (contentType.includes('png')) {
      extension = 'png';
    } else if (contentType.includes('webp')) {
      extension = 'webp';
    } else if (contentType.includes('gif')) {
      extension = 'gif';
    } else {
      // Try to get extension from URL
      const urlMatch = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
      if (urlMatch) {
        extension = urlMatch[1].toLowerCase();
        if (extension === 'jpeg') extension = 'jpg';
      }
    }

    // Generate filename from URL (use domain and path hash for uniqueness)
    const urlHash = imageUrl.split('').reduce((acc, char) => {
      const hash = ((acc << 5) - acc) + char.charCodeAt(0);
      return hash & hash;
    }, 0);
    const fileName = `external-${Math.abs(urlHash)}.${extension}`;

    console.log('[downloadAndUploadExternalImage] Uploading to Supabase storage:', fileName);

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, {
        contentType: contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error('[downloadAndUploadExternalImage] Error uploading to Supabase:', error);
      throw new Error(`Failed to upload image to storage: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL after upload');
    }

    console.log('[downloadAndUploadExternalImage] ✅ Successfully uploaded external image to Supabase:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[downloadAndUploadExternalImage] ❌ Error downloading/uploading external image:', error);
    console.error('[downloadAndUploadExternalImage] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[downloadAndUploadExternalImage] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // If download/upload fails, return original URL (don't break the save operation)
    console.warn('[downloadAndUploadExternalImage] ⚠️ Returning original URL due to error - conversion failed');
    console.warn('[downloadAndUploadExternalImage] The book will be saved with the external URL');
    console.warn('[downloadAndUploadExternalImage] Common causes: CORS restrictions, network errors, or invalid image URL');
    return imageUrl;
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  console.log('[deleteImageFromSupabase] Called with URL:', imageUrl);
  
  if (!supabase) {
    console.warn('[deleteImageFromSupabase] Supabase is not configured, skipping image deletion');
    return;
  }

  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    console.warn('[deleteImageFromSupabase] Invalid or empty imageUrl provided');
    return;
  }

  // Only delete if it's from our storage bucket
  if (!isSupabaseStorageUrl(imageUrl)) {
    console.log('[deleteImageFromSupabase] Skipping deletion - URL is not from our storage bucket:', imageUrl);
    return;
  }

  // Extract filename from URL
  const fileName = extractFileNameFromUrl(imageUrl);
  if (!fileName) {
    console.warn('[deleteImageFromSupabase] Could not extract filename from URL:', imageUrl);
    return;
  }

  console.log('[deleteImageFromSupabase] Attempting to delete image from storage');
  console.log('[deleteImageFromSupabase] Filename:', fileName);
  console.log('[deleteImageFromSupabase] Full URL:', imageUrl);
  console.log('[deleteImageFromSupabase] Bucket:', STORAGE_BUCKET);

  try {
    // First, verify the file exists by trying to list it
    const { data: listData, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', {
        search: fileName
      });
    
    if (listError) {
      console.warn('[deleteImageFromSupabase] Could not list files to verify existence:', listError);
    } else {
      console.log('[deleteImageFromSupabase] Files found matching name:', listData);
    }

    // Attempt to delete the file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    console.log('[deleteImageFromSupabase] Delete response - data:', data);
    console.log('[deleteImageFromSupabase] Delete response - error:', error);

    if (error) {
      console.error('[deleteImageFromSupabase] ❌ Error deleting image from Supabase Storage:', error);
      console.error('[deleteImageFromSupabase] Error details:', JSON.stringify(error, null, 2));
      console.error('[deleteImageFromSupabase] Filename:', fileName);
      console.error('[deleteImageFromSupabase] Full URL:', imageUrl);
      
      // Check if it's a permissions error
      if (error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('row-level security')) {
        console.error('[deleteImageFromSupabase] ⚠️ PERMISSIONS ERROR: Make sure DELETE policy is set up for the book-covers bucket');
        console.error('[deleteImageFromSupabase] See SUPABASE_STORAGE_SETUP.md for instructions');
      }
      // Don't throw - we don't want to fail book deletion if image deletion fails
    } else {
      // Supabase remove() returns an array of deleted paths
      // If the array is empty, the file might not have existed or wasn't deleted
      // IMPORTANT: An empty array usually means the deletion didn't actually happen
      // This is often due to missing DELETE permissions/policy
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('[deleteImageFromSupabase] ✅ Successfully deleted image from storage:', fileName);
        console.log('[deleteImageFromSupabase] Deleted files:', data);
      } else {
        console.error('[deleteImageFromSupabase] ⚠️ DELETE CALL RETURNED EMPTY RESPONSE - FILE NOT DELETED');
        console.error('[deleteImageFromSupabase] This usually means:');
        console.error('[deleteImageFromSupabase] ❌ DELETE policy is missing or not configured correctly');
        console.error('[deleteImageFromSupabase] Response data:', data);
        console.error('[deleteImageFromSupabase] ⚠️ ACTION REQUIRED:');
        console.error('[deleteImageFromSupabase] 1. Go to Supabase Dashboard → Storage → Policies');
        console.error('[deleteImageFromSupabase] 2. Select the "book-covers" bucket');
        console.error('[deleteImageFromSupabase] 3. Create a DELETE policy with:');
        console.error('[deleteImageFromSupabase]    - Policy name: "Allow public delete"');
        console.error('[deleteImageFromSupabase]    - Operation: DELETE');
        console.error('[deleteImageFromSupabase]    - Policy definition: true');
        console.error('[deleteImageFromSupabase]    - USING expression: bucket_id = \'book-covers\'');
        console.error('[deleteImageFromSupabase] See SUPABASE_STORAGE_SETUP.md for detailed instructions');
      }
    }
  } catch (error) {
    console.error('[deleteImageFromSupabase] ❌ Exception while deleting image:', error);
    console.error('[deleteImageFromSupabase] Exception details:', JSON.stringify(error, null, 2));
    console.error('[deleteImageFromSupabase] Filename:', fileName);
    console.error('[deleteImageFromSupabase] Full URL:', imageUrl);
    // Don't throw - we don't want to fail book deletion if image deletion fails
  }
}

