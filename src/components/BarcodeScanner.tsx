import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startScanning = async () => {
      try {
        if (!isMounted) return;
        setScanning(true);
        setError(null);

        // Get available video input devices
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (!isMounted) return;
        
        if (videoInputDevices.length === 0) {
          setError('Žádná kamera není k dispozici.');
          setScanning(false);
          return;
        }

        // Prefer back camera on mobile devices (usually labeled as "back" or "environment")
        // On desktop, use the first available camera
        let selectedDeviceId = videoInputDevices[0].deviceId;
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        if (backCamera) {
          selectedDeviceId = backCamera.deviceId;
        }

        if (videoRef.current && isMounted) {
          // Start decoding from video stream
          codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result, error) => {
              if (!isMounted) return;
              
              if (result) {
                const text = result.getText();
                // Check if it looks like an ISBN (EAN-13 or ISBN-10)
                // ISBN-13: 13 digits, ISBN-10: 10 digits (may end with X)
                if (text && (/^\d{13}$/.test(text) || /^\d{9}[0-9X]$/.test(text) || /^\d{10}$/.test(text))) {
                  // Stop scanning
                  codeReader.reset();
                  setScanning(false);
                  // Return the scanned ISBN
                  onScan(text);
                  onClose();
                }
              }
              if (error && error.name !== 'NotFoundException') {
                // NotFoundException is normal while scanning, ignore it
                console.error('Scanning error:', error);
              }
            }
          );
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error starting camera:', err);
        setError(err instanceof Error ? err.message : 'Nepodařilo se spustit kameru. Zkontrolujte oprávnění.');
        setScanning(false);
      }
    };

    startScanning();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [onScan, onClose]);

  const handleClose = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold">Skenovat ISBN</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full max-w-sm">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-blue-500 rounded-lg" style={{ width: '80%', height: '60%' }} />
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg w-full">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {scanning && !error && (
            <p className="mt-4 text-sm text-gray-600 text-center">
              Namiřte kameru na čárový kód ISBN
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

