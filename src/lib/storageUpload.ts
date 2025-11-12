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

