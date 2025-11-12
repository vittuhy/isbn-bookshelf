import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { cropImage, resizeImage } from '../lib/imageUtils';
import { uploadImageToSupabase } from '../lib/storageUpload';

interface ImageUploadCropProps {
  onComplete: (imageUrl: string) => void;
  onCancel: () => void;
}

export function ImageUploadCrop({ onComplete, onCancel }: ImageUploadCropProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB before processing)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('Obrázek je příliš velký. Maximální velikost je 10MB.');
        e.target.value = '';
        return;
      }

      // Validate MIME type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Nepodporovaný formát obrázku. Použijte JPEG, PNG nebo WebP.');
        e.target.value = '';
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  // Auto-trigger camera when component mounts
  useEffect(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleOpenGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      // Crop the image
      const croppedBlob = await cropImage(imageSrc, croppedAreaPixels);
      
      // Resize to max 1024px width
      const resizedBlob = await resizeImage(
        new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' }),
        1024
      );

      // Upload to Supabase
      const imageUrl = await uploadImageToSupabase(resizedBlob, 'cover.jpg');
      
      onComplete(imageUrl);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Chyba při zpracování obrázku');
      setUploading(false);
    }
  };

  // Hidden file inputs
  if (!imageSrc) {
    return (
      <>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex flex-col">
      {/* Hidden file inputs for camera and gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1} // Square aspect ratio
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
        {/* Gallery button overlay */}
        <button
          onClick={handleOpenGallery}
          disabled={uploading}
          className="absolute top-4 right-4 px-4 py-2 bg-white bg-opacity-90 rounded-lg shadow-md hover:bg-opacity-100 transition-all disabled:opacity-50 flex items-center gap-2"
          title="Vybrat z galerie"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">Galerie</span>
        </button>
      </div>
      <div className="bg-white p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Zrušit
          </button>
          <button
            onClick={handleCropAndUpload}
            disabled={uploading || !croppedAreaPixels}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Nahrávání...' : 'Uložit'}
          </button>
        </div>
      </div>
    </div>
  );
}

