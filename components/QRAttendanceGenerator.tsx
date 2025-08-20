// components/QRAttendanceGenerator.tsx
import React, { useState, useEffect } from 'react';
import { QrCode, RefreshCw, Clock, Users, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface QRAttendanceGeneratorProps {
  timeSlot: {
    id: string;
    courseId: string;
    startTime: string;
    endTime: string;
    dayOfWeek: number;
    yearLevel: number;
  };
  course: {
    id: string;
    code: string;
    name: string;
  };
  date: string;
  onClose?: () => void;
}

export default function QRAttendanceGenerator({
  timeSlot,
  course,
  date,
  onClose
}: QRAttendanceGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [attendanceCode, setAttendanceCode] = useState<string>('');
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Generate a unique attendance code
  const generateAttendanceCode = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${timeSlot.id}-${date}-${timestamp}-${random}`;
  };

  // Generate QR code
  const generateQRCode = async () => {
    const code = generateAttendanceCode();
    setAttendanceCode(code);
    
    // Set expiry time (15 minutes from now)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);
    setExpiryTime(expiry);

    // Create QR code data
    const qrData = {
      type: 'attendance',
      code: code,
      timeSlotId: timeSlot.id,
      courseId: course.id,
      date: date,
      expiry: expiry.toISOString()
    };

    try {
      const url = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, [refreshKey]);

  // Auto-refresh QR code every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, []);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!expiryTime) return '00:00';
    
    const now = new Date();
    const diff = expiryTime.getTime() - now.getTime();
    
    if (diff <= 0) return '00:00';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update timer every second
  const [timeRemaining, setTimeRemaining] = useState('15:00');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTime]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(attendanceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">QR Attendance</h2>
              <p className="text-blue-100">
                {course.code} - {course.name}
              </p>
              <p className="text-sm text-blue-200 mt-1">
                {new Date(date).toLocaleDateString()} | {timeSlot.startTime} - {timeSlot.endTime}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-gray-50 rounded-lg p-4 inline-block">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Attendance QR Code" className="w-80 h-80" />
              ) : (
                <div className="w-80 h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Info */}
          <div className="space-y-4">
            {/* Timer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    QR Code expires in: {timeRemaining}
                  </span>
                </div>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Attendance Code */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Manual Entry Code:</p>
                  <p className="font-mono text-lg font-bold text-gray-900">{attendanceCode}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Instructions for Students:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Open the student attendance app</li>
                <li>2. Click "Scan QR Code" or enter the manual code</li>
                <li>3. Your attendance will be marked automatically</li>
                <li>4. Make sure to scan within the time limit</li>
              </ol>
            </div>

            {/* Live Count (optional - requires real-time updates) */}
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Users className="w-5 h-5" />
              <span className="text-sm">Students marked present: 0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}