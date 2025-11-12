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

