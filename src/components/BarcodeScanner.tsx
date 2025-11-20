import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { createPortal } from 'react-dom';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

        // Try to get available video input devices, but handle if method is not supported
        // (e.g., when accessing via HTTP on local network instead of HTTPS/localhost)
        let selectedDeviceId: string | undefined = undefined;
        
        try {
          const videoInputDevices = await codeReader.listVideoInputDevices();

          if (!isMounted) return;

          if (videoInputDevices.length === 0) {
            setError('Žádná kamera není k dispozici.');
            setScanning(false);
            return;
          }

          // Prefer back camera on mobile devices (usually labeled as "back" or "environment")
          // On desktop, use the first available camera
          selectedDeviceId = videoInputDevices[0].deviceId;
          const backCamera = videoInputDevices.find(device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          if (backCamera) {
            selectedDeviceId = backCamera.deviceId;
          }
        } catch (listError) {
          // If listVideoInputDevices is not supported (e.g., HTTP context), use undefined (default camera)
          console.warn('Could not enumerate devices, using default camera:', listError);
          // Continue with undefined deviceId - BrowserMultiFormatReader will use default
        }

        if (videoRef.current && isMounted) {
          // Set video element attributes for iOS compatibility
          videoRef.current.setAttribute('autoplay', '');
          videoRef.current.setAttribute('muted', '');
          videoRef.current.setAttribute('playsinline', '');
          
          // Start decoding from video stream
          if (selectedDeviceId) {
            // Use specific device if available
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
          } else {
            // Fallback: use decodeFromVideoDevice with null/undefined for default camera
            // This should work when device enumeration fails
            try {
              codeReader.decodeFromVideoDevice(
                undefined,
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
                    // If it's a permission error, show user-friendly message
                    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                      setError('Přístup ke kameře byl zamítnut. Povolte přístup v nastavení prohlížeče nebo zkuste použít HTTPS/localhost.');
                      setScanning(false);
                    }
                  }
                }
              );
            } catch (decodeError: any) {
              if (!isMounted) return;
              console.error('Error starting camera decoder:', decodeError);
              const errorMessage = decodeError.name === 'NotAllowedError' || decodeError.name === 'PermissionDeniedError'
                ? 'Přístup ke kameře byl zamítnut. Povolte přístup v nastavení prohlížeče. Pokud používáte HTTP na lokální síti, zkuste použít HTTPS nebo localhost.'
                : decodeError.name === 'NotFoundError' || decodeError.name === 'DevicesNotFoundError'
                ? 'Žádná kamera není k dispozici.'
                : 'Nepodařilo se přistoupit ke kameře. Zkontrolujte oprávnění nebo použijte HTTPS/localhost.';
              setError(errorMessage);
              setScanning(false);
            }
          }
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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
      />

      <div 
        className="relative glass-dark rounded-3xl max-w-md w-full flex flex-col border border-white/20 shadow-2xl overflow-hidden max-h-[90vh]"
        style={{
          position: 'relative',
          zIndex: 9999,
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10 shrink-0">
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Skenovat ISBN</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-3xl transition-colors hover:scale-110 active:scale-95 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20"
            aria-label="Zavřít"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 flex flex-col items-center" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
          <div className="relative w-full max-w-sm shrink-0" style={{ minHeight: '300px' }}>
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
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl w-full backdrop-blur-sm shrink-0">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          {scanning && !error && (
            <p className="mt-4 text-sm text-gray-300 text-center shrink-0">
              Namiřte kameru na čárový kód ISBN
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Render modal in a portal to ensure it's on top of everything
  return createPortal(modalContent, document.body);
}
