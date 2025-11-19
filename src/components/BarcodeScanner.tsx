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
    let codeReader: BrowserMultiFormatReader | null = null;

    const startScanning = async () => {
      try {
        if (!isMounted || !videoRef.current) return;
        
        codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;
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
                  if (codeReader) {
                    codeReader.reset();
                  }
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
      if (codeReader) {
        try {
          codeReader.reset();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      // Also stop video tracks if video element has a stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  const handleClose = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass-dark rounded-3xl max-w-md w-full flex flex-col border border-white/20 shadow-2xl">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10">
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Skenovat ISBN</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-3xl transition-colors hover:scale-110 active:scale-95 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 flex flex-col items-center">
          <div className="relative w-full max-w-sm" style={{ minHeight: '300px' }}>
            <video
              ref={videoRef}
              className="w-full rounded-2xl border border-white/10"
              style={{ 
                maxHeight: '400px', 
                minHeight: '300px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div 
                  className="border-2 border-purple-400 rounded-xl shadow-lg shadow-purple-500/50" 
                  style={{ 
                    width: '80%', 
                    height: '200px',
                    minWidth: '200px',
                    maxWidth: '300px'
                  }} 
                />
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl w-full backdrop-blur-sm">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          {scanning && !error && (
            <p className="mt-4 text-sm text-gray-300 text-center">
              Namiřte kameru na čárový kód ISBN
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

