// components/QRAttendanceScanner.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Keyboard, Loader } from 'lucide-react';
import jsQR from 'jsqr';

interface QRAttendanceScannerProps {
  studentId: string;
  onScanSuccess: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function QRAttendanceScanner({
  studentId,
  onScanSuccess,
  onClose
}: QRAttendanceScannerProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Start camera and scanning
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraPermission('granted');
        setScanning(true);
        scanQRCode();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraPermission('denied');
      setError('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setScanning(false);
  };

  // Scan QR code from video stream
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });
        
        if (code) {
          handleQRCodeData(code.data);
          return;
        }
      }
      
      animationRef.current = requestAnimationFrame(scan);
    };
    
    scan();
  };

  // Handle QR code data
  const handleQRCodeData = async (data: string) => {
    stopCamera();
    setSubmitting(true);
    setError(null);
    
    try {
      const qrData = JSON.parse(data);
      
      // Validate QR code data
      if (qrData.type !== 'attendance') {
        throw new Error('Invalid QR code. Please scan the attendance QR code.');
      }
      
      // Check expiry
      const expiry = new Date(qrData.expiry);
      if (new Date() > expiry) {
        throw new Error('QR code has expired. Please ask your instructor for a new one.');
      }
      
      // Submit attendance
      await onScanSuccess({
        code: qrData.code,
        timeSlotId: qrData.timeSlotId,
        courseId: qrData.courseId,
        date: qrData.date,
        studentId: studentId,
        scannedAt: new Date().toISOString()
      });
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process QR code');
      setSubmitting(false);
    }
  };

  // Handle manual code submission
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      setError('Please enter the attendance code');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // For manual entry, we'll send just the code
      await onScanSuccess({
        code: manualCode.trim(),
        studentId: studentId,
        manual: true,
        scannedAt: new Date().toISOString()
      });
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit attendance');
      setSubmitting(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera when switching to scan mode
  useEffect(() => {
    if (mode === 'scan' && !scanning && !success) {
      startCamera();
    } else if (mode === 'manual') {
      stopCamera();
    }
  }, [mode]);

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Marked!</h3>
          <p className="text-gray-600">You have been marked present.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b">
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              mode === 'scan'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera className="w-4 h-4 inline mr-2" />
            Scan QR Code
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Keyboard className="w-4 h-4 inline mr-2" />
            Enter Code
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {mode === 'scan' ? (
            <div className="space-y-4">
              {cameraPermission === 'denied' ? (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">Camera access is required to scan QR codes.</p>
                  <button
                    onClick={() => setMode('manual')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Enter Code Manually
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                    
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                        <div className="absolute inset-0 border-2 border-white rounded-lg animate-pulse"></div>
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
                      </div>
                    </div>
                    
                    {submitting && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 text-center mt-4">
                    Position the QR code within the frame
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance Code
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter the code shown by your instructor"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !submitting && manualCode.trim()) {
                      handleManualSubmit();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask your instructor for the attendance code if you can't scan the QR
                </p>
              </div>
              
              <button
                onClick={handleManualSubmit}
                disabled={submitting || !manualCode.trim()}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  submitting || !manualCode.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Attendance'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}