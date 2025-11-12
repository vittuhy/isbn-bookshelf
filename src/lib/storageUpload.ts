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
    // URL format: https://[project].supabase.co/storage/v1/object/public/book-covers/[filename]
    const match = url.match(/\/book-covers\/([^/?]+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return null;
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  if (!supabase) {
    console.warn('Supabase is not configured, skipping image deletion');
    return;
  }

  if (!imageUrl) {
    return;
  }

  // Extract filename from URL
  const fileName = extractFileNameFromUrl(imageUrl);
  if (!fileName) {
    console.warn('Could not extract filename from URL:', imageUrl);
    return;
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('Error deleting image from Supabase Storage:', error);
      // Don't throw - we don't want to fail book deletion if image deletion fails
    } else {
      console.log('Successfully deleted image from storage:', fileName);
    }
  } catch (error) {
    console.error('Exception while deleting image:', error);
    // Don't throw - we don't want to fail book deletion if image deletion fails
  }
}

