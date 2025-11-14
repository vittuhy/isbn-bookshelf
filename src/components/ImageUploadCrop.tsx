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
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Detect if we're on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window && window.innerWidth < 768);

  // Check camera permission status on mount
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const nav = navigator as Navigator & { mediaDevices?: MediaDevices; permissions?: Permissions };
        
        // Check if Permissions API is available
        if (nav.permissions) {
          try {
            const permissionStatus = await nav.permissions.query({ name: 'camera' as PermissionName });
            setCameraPermissionGranted(permissionStatus.state === 'granted');
            
            // Listen for permission changes
            permissionStatus.onchange = () => {
              setCameraPermissionGranted(permissionStatus.state === 'granted');
            };
          } catch (e) {
            // Permissions API might not support 'camera' query on all browsers
            // Try getUserMedia to check if we can access camera
            if (nav.mediaDevices && nav.mediaDevices.getUserMedia) {
              try {
                const stream = await nav.mediaDevices.getUserMedia({ video: true });
                setCameraPermissionGranted(true);
                // Stop the stream immediately - we just wanted to check permission
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
              } catch (err) {
                setCameraPermissionGranted(false);
              }
            } else {
              setCameraPermissionGranted(null);
            }
          }
        } else {
          // Fallback: try to access camera to check permission
          if (nav.mediaDevices && nav.mediaDevices.getUserMedia) {
            try {
              const stream = await nav.mediaDevices.getUserMedia({ video: true });
              setCameraPermissionGranted(true);
              stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            } catch (err) {
              setCameraPermissionGranted(false);
            }
          } else {
            setCameraPermissionGranted(null);
          }
        }
      } catch (error) {
        // If we can't check, assume we need to request
        setCameraPermissionGranted(null);
      }
    };

    if (isMobile) {
      checkCameraPermission();
    }
  }, [isMobile]);

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

  // Don't auto-trigger - let user choose camera or gallery

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

  // Show overlay with camera and gallery options before image is selected
  if (!imageSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-sm w-full p-6">
          <h3 className="text-lg font-bold mb-4 text-center">Vybrat obrázek</h3>
          <div className="space-y-3">
            {isMobile && (
              <button
                onClick={async () => {
                  // If permission not yet granted, request it first using getUserMedia
                  // This ensures permission is granted once, then file input will remember it
                  const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
                  
                  if (cameraPermissionGranted === false || cameraPermissionGranted === null) {
                    if (nav.mediaDevices && nav.mediaDevices.getUserMedia) {
                      try {
                        const stream = await nav.mediaDevices.getUserMedia({ video: true });
                        setCameraPermissionGranted(true);
                        // Stop the stream - we just needed to request permission
                        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                        // Small delay to ensure permission is registered
                        setTimeout(() => {
                          cameraInputRef.current?.click();
                        }, 100);
                      } catch (err) {
                        setError('Kamera není dostupná. Zkontrolujte oprávnění v nastavení prohlížeče.');
                      }
                    } else {
                      // Fallback: just try the file input directly
                      cameraInputRef.current?.click();
                    }
                  } else {
                    // Permission already granted, just click the input
                    cameraInputRef.current?.click();
                  }
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Pořídit fotku</span>
              </button>
            )}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className={`w-full px-4 py-3 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isMobile 
                  ? 'bg-gray-600 hover:bg-gray-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Vybrat z galerie</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </button>
          </div>
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
        </div>
      </div>
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

