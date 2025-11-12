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

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('[deleteImageFromSupabase] Error deleting image from Supabase Storage:', error);
      console.error('[deleteImageFromSupabase] Error message:', error.message);
      console.error('[deleteImageFromSupabase] Filename:', fileName);
      console.error('[deleteImageFromSupabase] Full URL:', imageUrl);
      // Don't throw - we don't want to fail book deletion if image deletion fails
    } else {
      console.log('[deleteImageFromSupabase] ✅ Successfully deleted image from storage:', fileName);
      if (data && data.length > 0) {
        console.log('[deleteImageFromSupabase] Deleted files:', data);
      } else {
        console.log('[deleteImageFromSupabase] No files returned in response (might already be deleted)');
      }
    }
  } catch (error) {
    console.error('[deleteImageFromSupabase] Exception while deleting image:', error);
    console.error('[deleteImageFromSupabase] Filename:', fileName);
    console.error('[deleteImageFromSupabase] Full URL:', imageUrl);
    // Don't throw - we don't want to fail book deletion if image deletion fails
  }
}

