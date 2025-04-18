import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function ScanPage() {
  const { loggedInUserData, logout } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState('');
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [todayDate, setTodayDate] = useState('');
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const html5QrCodeScannerRef = useRef(null);
  const qrReaderId = 'qr-reader-teacher';
  const cleanupRef = useRef(false);

  // Debug mode check
  const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';

  // Get KST date string
  const getTodayKSTString = useCallback(() => {
    const today = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(today.getTime() + kstOffset);
    return kstTime.toISOString().split('T')[0];
  }, []);

  // Verify QR and mark usage in Firestore
  const verifyAndMarkUsage = useCallback(
    async (qrData) => {
      console.log('사용 확인 및 기록 시도:', qrData);
      setScanResult('');
      setScanError('');

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', qrData.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생 정보를 찾을 수 없습니다.`);
          return false;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userDocRef = doc(db, 'users', userDoc.id);

        if (!userData.dinnerApplied) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생은 석식을 신청하지 않았습니다.`);
          return false;
        }
        if (!userData.dinnerApproved) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생의 석식이 승인되지 않았습니다.`);
          return false;
        }
        if (userData.dinnerUsed && userData.lastUsedDate === todayDate) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생의 식권은 오늘 이미 사용되었습니다.`);
          return false;
        }

        await updateDoc(userDocRef, {
          dinnerUsed: true,
          lastUsedDate: todayDate,
        });
        console.log('사용 기록 성공:', qrData.email);
        return true;
      } catch (error) {
        console.error('Firestore 오류:', error);
        setScanError(`오류: 사용 처리 실패 (${error.message})`);
        return false;
      }
    },
    [todayDate]
  );

  // Pause scanning for 1 second and temporarily stop scanner
  const pauseAfterScan = useCallback(async () => {
    console.log('Pausing scan for 1 second...');
    setIsProcessing(true);
    if (html5QrCodeScannerRef.current) {
      try {
        const state = await html5QrCodeScannerRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrCodeScannerRef.current.pause();
          console.log('Scanner paused during processing');
        }
      } catch (err) {
        console.error('Pause error:', err);
      }
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsProcessing(false);
        if (html5QrCodeScannerRef.current) {
          html5QrCodeScannerRef.current.resume();
          console.log('Scanner resumed after 1-second pause');
        }
        console.log('Scan pause ended. Ready for next scan.');
        resolve();
      }, 1000); // 1-second pause
    });
  }, []);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (cleanupRef.current) return;
    console.log('Stopping scanner...');
    const scannerInstance = html5QrCodeScannerRef.current;
    if (scannerInstance) {
      try {
        const state = await scannerInstance.getState();
        if (state === 2) { // SCANNING
          await scannerInstance.stop();
          console.log('Scanner stopped successfully');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Scanner stop error:', err);
          setScanError(`스캐너 중지 오류: ${err.message}`);
        }
      } finally {
        html5QrCodeScannerRef.current = null;
        setIsScanning(false);
        setIsInitializing(false);
        const container = document.getElementById(qrReaderId);
        if (container) container.innerHTML = '';
      }
    } else {
      setIsScanning(false);
      setIsInitializing(false);
    }
  }, []);

  // Handle scan success
  const onScanSuccess = useCallback(
    async (decodedText) => {
      if (isProcessing || cleanupRef.current) {
        console.log('Scan ignored: Scanner is processing or cleaning up.');
        return;
      }
      console.log(`스캔 성공: ${decodedText} at ${new Date().toISOString()}`);
      setIsProcessing(true);
      setScanResult('');
      setScanError('');

      try {
        const currentKstDate = getTodayKSTString();
        if (currentKstDate !== todayDate) {
          setScanError('오류: 처리 중 날짜가 변경되었습니다.');
          await stopScanner();
          return;
        }

        const qrData = JSON.parse(decodedText);
        if (!qrData.email || !qrData.name || !qrData.classInfo || !qrData.date || !qrData.nonce) {
          setScanError('오류: 유효하지 않은 QR 코드 형식입니다.');
          await pauseAfterScan();
          return;
        }

        if (qrData.date !== todayDate) {
          setScanError(`오류: 이 QR 코드는 오늘(${todayDate}) 날짜가 아닙니다.`);
          await pauseAfterScan();
          return;
        }

        const saveSuccess = await verifyAndMarkUsage(qrData);
        if (saveSuccess) {
          setScanResult(`✅ 인증 완료: ${qrData.classInfo} ${qrData.name}`);
        }
        await pauseAfterScan();
      } catch (e) {
        console.warn('QR 처리 오류:', e);
        setScanError(`오류: QR 코드 처리 실패 (${e.message})`);
        await pauseAfterScan();
      }
    },
    [isProcessing, todayDate, getTodayKSTString, stopScanner, verifyAndMarkUsage, pauseAfterScan]
  );

  // Handle scan failure
  const onScanFailure = useCallback(
    (error) => {
      if (isDebug && !error.message.includes('No QR code found')) {
        console.debug('QR 인식 오류:', error);
      }
    },
    [isDebug]
  );

  // Start scanner with retry and fallback
  const startScanner = useCallback(
    async (attempt = 1, maxAttempts = 3, cameraConstraints = { facingMode: 'environment' }) => {
      if (cleanupRef.current || !isLibraryLoaded || isProcessing) return;

      const container = document.getElementById(qrReaderId);
      if (!container) {
        setScanError('오류: QR 스캐너 UI 영역을 찾을 수 없습니다.');
        setIsInitializing(false);
        return;
      }

      setScanResult('');
      setScanError('');
      setIsInitializing(true);

      try {
        if (html5QrCodeScannerRef.current) {
          const state = await html5QrCodeScannerRef.current.getState();
          if (state === 2) {
            setIsInitializing(false);
            return;
          }
        }

        html5QrCodeScannerRef.current = new window.Html5Qrcode(qrReaderId, { verbose: isDebug });
        const config = {
          fps: 15,
          qrbox: (w, h) => ({
            width: Math.max(Math.min(w, h) * 0.75, 200),
            height: Math.max(Math.min(w, h) * 0.75, 200),
          }),
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        };

        console.log(`Attempting to start scanner (Attempt ${attempt}/${maxAttempts}) with constraints:`, cameraConstraints);
        await html5QrCodeScannerRef.current.start(cameraConstraints, config, onScanSuccess, onScanFailure);

        const videoElement = container.querySelector('video');
        if (!videoElement) {
          throw new Error('Video stream not rendered in DOM');
        }

        setIsScanning(true);
        setIsInitializing(false);
        console.log('Scanner started successfully');
      } catch (err) {
        console.error(`Scanner start error (Attempt ${attempt}):`, err);
        if (attempt < maxAttempts && err.name === 'AbortError' && err.message.includes('Timeout starting video source')) {
          console.log(`Retrying scanner start (Attempt ${attempt + 1})...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return startScanner(attempt + 1, maxAttempts, cameraConstraints);
        } else if (attempt === maxAttempts && cameraConstraints.facingMode === 'environment') {
          console.log('Falling back to front camera...');
          return startScanner(1, maxAttempts, { facingMode: 'user' });
        } else if (attempt === maxAttempts && cameraConstraints.facingMode === 'user') {
          console.log('Falling back to any camera...');
          return startScanner(1, maxAttempts, {});
        }

        let errorMessage = `카메라 시작 오류: ${err.message || err}. `;
        if (err.name === 'NotAllowedError') errorMessage += '카메라 권한이 필요합니다. 브라우저 설정에서 권한을 허용하세요.';
        else if (err.name === 'NotFoundError') errorMessage += '카메라를 찾을 수 없습니다. 디바이스에 카메라가 있는지 확인하세요.';
        else if (err.name === 'NotReadableError') errorMessage += '카메라 사용 불가. 다른 앱이 사용 중일 수 있습니다.';
        else if (err.name === 'AbortError') errorMessage += '카메라 초기화 시간이 초과되었습니다. 새로고침하거나 다른 카메라를 시도하세요.';
        else if (err.message.includes('Video stream not rendered')) errorMessage += '카메라 스트림을 렌더링할 수 없습니다. 브라우저를 새로고침하세요.';
        setScanError(errorMessage);
        setIsScanning(false);
        setIsInitializing(false);
        html5QrCodeScannerRef.current = null;
      }
    },
    [isLibraryLoaded, isProcessing, onScanSuccess, onScanFailure, isDebug]
  );

  // Load library and cleanup
  useEffect(() => {
    cleanupRef.current = false;
    const kstDate = getTodayKSTString();
    setTodayDate(kstDate);

    const scriptId = 'html5qrcode-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      script.onload = () => {
        console.log('Html5Qrcode library loaded');
        setIsLibraryLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Html5Qrcode library');
        setScanError('스캐너 라이브러리 로드 실패. 네트워크를 확인하고 새로고침하세요.');
      };
      document.head.appendChild(script);
    } else if (typeof window.Html5Qrcode !== 'undefined') {
      console.log('Html5Qrcode library already loaded');
      setIsLibraryLoaded(true);
    }

    return () => {
      cleanupRef.current = true;
      stopScanner();
      const container = document.getElementById(qrReaderId);
      if (container) container.innerHTML = '';
    };
  }, [stopScanner, getTodayKSTString]);

  // Auto-start scanner for teachers
  useEffect(() => {
    if (isLibraryLoaded && loggedInUserData?.role === 'teacher' && !isScanning && !isInitializing && !isProcessing) {
      console.log('Attempting to auto-start scanner');
      startScanner();
    }
  }, [isLibraryLoaded, loggedInUserData, startScanner, isScanning, isInitializing, isProcessing]);

  // Handle date change
  useEffect(() => {
    const interval = setInterval(() => {
      const currentKstDate = getTodayKSTString();
      if (currentKstDate !== todayDate) {
        setTodayDate(currentKstDate);
        setScanError('날짜가 변경되었습니다.');
        stopScanner();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [todayDate, stopScanner, getTodayKSTString]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await stopScanner();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      setScanError('로그아웃 실패.');
    }
  };

  if (!loggedInUserData) {
    return <div className="p-4 text-center">사용자 정보 로딩 중...</div>;
  }

  if (loggedInUserData.role !== 'teacher') {
    return <div className="p-4 text-center">교사만 접근 가능합니다.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">식권 QR 스캐너 (교사용)</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded"
          disabled={isProcessing}
        >
          로그아웃
        </button>
      </div>
      <p className="text-center text-sm text-gray-500 mb-4">오늘 날짜 (KST): {todayDate}</p>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">QR 코드 스캔</h2>
        <div
          id={qrReaderId}
          className="w-full mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative"
          style={{ maxWidth: '500px', minHeight: '250px' }}
        >
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-lg font-semibold">
              처리 중...
            </div>
          )}
        </div>
        {!isLibraryLoaded && <p className="text-center text-gray-500 mt-4">스캐너 라이브러리 로딩 중...</p>}
        {isLibraryLoaded && !isScanning && isInitializing && (
          <p className="text-center text-gray-500 mt-4">카메라 초기화 중...</p>
        )}
        {isLibraryLoaded && !isScanning && !isInitializing && !scanError && (
          <p className="text-center text-gray-500 mt-4">카메라 시작 준비 중...</p>
        )}
        <div className="mt-4 text-center min-h-[3rem]">
          {scanResult && (
            <div className="p-3 rounded bg-green-100 text-green-800 font-semibold break-words">
              {scanResult}
            </div>
          )}
          {scanError && (
            <div className="p-3 rounded bg-red-100 text-red-800 font-semibold break-words">
              {scanError}
            </div>
          )}
          {!scanResult && !scanError && isScanning && !isProcessing && (
            <div className="p-3 rounded bg-blue-100 text-blue-800 font-semibold">
              QR 코드를 스캔하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScanPage;