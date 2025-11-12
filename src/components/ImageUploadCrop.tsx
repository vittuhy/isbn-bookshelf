import { useState, useCallback } from 'react';
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
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

  if (!imageSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-bold mb-4">Vybrat obrázek</h3>
          <div className="space-y-3">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="px-4 py-3 bg-blue-600 text-white rounded-lg text-center cursor-pointer hover:bg-blue-700 transition-colors">
                📷 Pořídit fotku
              </div>
            </label>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="px-4 py-3 bg-gray-600 text-white rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors">
                🖼️ Vybrat z galerie
              </div>
            </label>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex flex-col">
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
            onClick={() => setImageSrc(null)}
            disabled={uploading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Zpět
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

