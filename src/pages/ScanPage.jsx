import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import useDataExist from './isDataExist';

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
  const schRef = useRef('');
  const html5QrCodeScannerRef = useRef(null);
  const qrReaderId = 'qr-reader-teacher';
  const cleanupRef = useRef(false);

  useDataExist();
  const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';

  // TTS Helper Function
  const speak = useCallback((text, lang = 'ko-KR') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      // Optional: You can adjust rate or pitch if needed
      // utterance.rate = 1.1;
      // utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Web Speech API (Text-to-Speech) is not supported in this browser.');
    }
  }, []);

  const getTodayKSTString = useCallback(() => {
    const today = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(today.getTime() + kstOffset);
    return kstTime.toISOString().split('T')[0];
  }, []);

  const verifyAndMarkUsage = useCallback(
    async (qrData) => {
      // Clear previous messages at the start of verification
      setScanResult('');
      setScanError('');

      try {
        if (qrData.email === schRef.current) {
          // Already processed successfully moments ago.
          // Visual success message will be set by onScanSuccess.
          // TTS will also be handled by onScanSuccess.
          return true;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', qrData.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // User not in DB - treat as a special "verified" case.
          // Visual message will be set by onScanSuccess upon returning true.
          // TTS will be handled by onScanSuccess.
          // If a different message is needed for this specific case:
          // setScanResult(`ℹ️ 미등록 사용자 확인: ${qrData.classInfo} ${qrData.name}`);
          // speak(`${qrData.name} 님, 미등록 사용자 확인되었습니다.`);
          return true; // Signal as a successful outcome for general TTS in onScanSuccess
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userDocRef = doc(db, 'users', userDoc.id);

        if (!userData.dinnerApplied) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생은 석식을 신청하지 않았습니다.`);
          speak(` ${qrData.name} 학생은 석식을 신청하지 않았습니다.`);
          return fal
          se;
        }
        if (!userData.dinnerApproved) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생의 석식이 승인되지 않았습니다.`);
          speak(` ${qrData.name} 학생의 석식이 승인되지 않았습니다.`);
          return false;
        }
        if (userData.dinnerUsed && userData.lastUsedDate === todayDate) {
          setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생의 식권은 오늘 이미 사용되었습니다.`);
          speak(` ${qrData.name} 학생의 식권은 오늘 이미 사용되었습니다.`);
          return false;
        }

        await updateDoc(userDocRef, {
          dinnerUsed: true,
          lastUsedDate: todayDate,
        });
        schRef.current = qrData.email;
        return true; // Signal successful Firestore update
      } catch (error) {
        console.error('Firestore 오류:', error);
        setScanError(`오류: 사용 처리 실패 (${error.message})`);
        speak('사용 처리 중 오류가 발생했습니다.');
        return false;
      }
    },
    [todayDate, speak] // speak is now a dependency
  );

  const pauseAfterScan = useCallback(() => {
    // isProcessing is true when this is called.
    // It needs to be set to false *after* the timeout.
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsProcessing(false);
        resolve();
      }, 1000); // 1초 대기
    });
  }, []); // setIsProcessing is stable

  const stopScanner = useCallback(async () => {
    if (cleanupRef.current) return;
    console.log('스캐너 중지 중...');
    const scannerInstance = html5QrCodeScannerRef.current;
    if (scannerInstance) {
      try {
        const state = await scannerInstance.getState();
        if (state === 2) { // SCANNING 상태
          await scannerInstance.stop();
          console.log('스캐너 성공적으로 중지됨');
        }
      } catch (err) {
        if (err.name !== 'AbortError') { // AbortError is expected if stop is called during start
          console.error('스캐너 중지 오류:', err);
          setScanError(`스캐너 중지 오류: ${err.message}`);
        }
      } finally {
        html5QrCodeScannerRef.current = null;
        setIsScanning(false);
        setIsInitializing(false);
        const container = document.getElementById(qrReaderId);
        if (container) container.innerHTML = ''; // Clear the viewfinder
      }
    } else {
      // Ensure states are reset even if scannerInstance was null
      setIsScanning(false);
      setIsInitializing(false);
    }
  }, [qrReaderId]); // qrReaderId is a constant, technically not needed but good for clarity

  const onScanSuccess = useCallback(
    async (decodedText) => {
      if (isProcessing || cleanupRef.current) return;
      setIsProcessing(true);
      // Clear messages at the beginning of a new scan processing
      setScanResult('');
      setScanError('');

      try {
        const currentKstDate = getTodayKSTString();
        if (currentKstDate !== todayDate) {
          setScanError('오류: 처리 중 날짜가 변경되었습니다. 스캔이 중지됩니다.');
          speak('오류, 날짜가 변경되었습니다. 스캔을 다시 시작해주세요.');
          await stopScanner();
          setIsProcessing(false); // Explicitly set isProcessing false
          return;
        }

        const qrData = JSON.parse(decodedText);
        if (!qrData.email || !qrData.name || !qrData.classInfo || !qrData.date || !qrData.nonce) {
          setScanError('오류: 유효하지 않은 QR 코드 형식입니다.');
          speak(' 유효하지 않은 QR 코드입니다.');
          await pauseAfterScan();
          return;
        }

        if (qrData.date !== todayDate) {
          setScanError(`오류: 이 QR 코드는 오늘(${todayDate}) 날짜가 아닙니다.`);
          speak('오늘 날짜의 QR 코드가 아닙니다.');
          await pauseAfterScan();
          return;
        }

        const isVerified = await verifyAndMarkUsage(qrData);

        if (isVerified) {
          // Set a generic success message if verifyAndMarkUsage didn't set a more specific one
          if (!scanResult && !scanError) { // Check if verifyAndMarkUsage already set a message
             // For the "querySnapshot.empty" case, verifyAndMarkUsage now returns true
             // but doesn't set scanResult itself, allowing this default.
             // Or, we can be more specific based on qrData if needed here.
            setScanResult(`✅ 인증 완료: ${qrData.classInfo} ${qrData.name}`);
            speak(`${qrData.name} 님, 인증되었습니다.`);
          }
        } else {
          // If isVerified is false, verifyAndMarkUsage should have set scanError and spoken.
          // This is a fallback if scanError wasn't set.
          if (!scanError) {
            setScanError(`오류: ${qrData.name}(${qrData.classInfo}) 학생의 식권 처리 중 문제가 발생했습니다.`);
            // Avoid double speaking if verifyAndMarkUsage already spoke.
            // speak(`삐빅, ${qrData.name} 학생 처리 중 문제가 발생했습니다.`);
          }
        }
        await pauseAfterScan();
      } catch (e) { // Catches JSON.parse error or other unexpected errors in this function
        console.warn('QR 처리 오류:', e);
        setScanError(`오류: QR 코드 처리 실패 (${e.message})`);
        speak('삐빅, QR 코드 처리 중 오류가 발생했습니다.');
        await pauseAfterScan();
      }
    },
    [
      isProcessing,
      todayDate,
      getTodayKSTString,
      stopScanner,
      verifyAndMarkUsage,
      pauseAfterScan,
      speak,
      scanResult, // Read to check if a message was preset
      scanError   // Read to check if an error was preset
    ]
  );

  const onScanFailure = useCallback((error) => {
    if (isDebug && !error.message.includes('No QR code found')) {
      console.debug('QR 인식 오류:', error);
      // Consider if TTS is needed for "No QR code found" or other minor scan failures.
      // speak("QR 코드를 찾지 못했습니다."); // This could be too noisy.
    }
  }, [isDebug]); // speak can be added if TTS is desired here

  const startScanner = useCallback(
    async (attempt = 1, maxAttempts = 3, cameraConstraints = { facingMode: 'user' }) => {
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
          if (state === 2) { // Already SCANNING
            setIsInitializing(false);
            return; // Scanner is already running
          }
          // If not scanning, but instance exists, it might be stopped. Clear it.
          // await html5QrCodeScannerRef.current.clear(); // Not needed, new instance below
        }

        html5QrCodeScannerRef.current = new window.Html5Qrcode(qrReaderId, { verbose: isDebug });
        const config = {
          fps: 10, // Slightly reduced FPS can sometimes help performance
          qrbox: (w, h) => ({
            width: Math.max(Math.min(w, h) * 0.7, 200), // Adjusted qrbox size
            height: Math.max(Math.min(w, h) * 0.7, 200),
          }),
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        };

        await html5QrCodeScannerRef.current.start(cameraConstraints, config, onScanSuccess, onScanFailure);

        const videoElement = container.querySelector('video');
        if (!videoElement) {
          // This can happen if the start promise resolves but DOM isn't ready
          // or if there's an issue with the library's rendering.
          console.warn('Video element not found immediately after start.');
          // Try a small delay and check again, or rely on library's internal handling.
        }

        setIsScanning(true);
        setIsInitializing(false);
      } catch (err) {
        console.error(`스캐너 시작 오류 (시도 ${attempt}):`, err);
        // Fallback logic
        if (attempt < maxAttempts && (err.name === 'AbortError' || err.name === 'NotReadableError')) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retry
          const nextConstraints = (err.name === 'NotReadableError' && cameraConstraints.facingMode === 'user')
                                  ? { facingMode: 'environment' } // Try other camera on NotReadableError
                                  : cameraConstraints;
          return startScanner(attempt + 1, maxAttempts, nextConstraints);
        } else if (attempt < maxAttempts && cameraConstraints.facingMode === 'user') {
           // If max attempts not reached for this camera, but it's not Abort/NotReadable, try environment
          return startScanner(1, maxAttempts, { facingMode: 'environment' }); // Reset attempts for new camera
        } else if (attempt < maxAttempts && cameraConstraints.facingMode === 'environment') {
          return startScanner(1, maxAttempts, {}); // Try with no specific constraints
        }


        let errorMessage = `카메라 시작 오류: ${err.message || err}. `;
        if (err.name === 'NotAllowedError') errorMessage += '카메라 권한이 필요합니다. 브라우저 설정에서 권한을 허용하세요.';
        else if (err.name === 'NotFoundError') errorMessage += '카메라를 찾을 수 없습니다. 디바이스에 카메라가 있는지 확인하세요.';
        else if (err.name === 'NotReadableError') errorMessage += '카메라 사용 불가. 다른 앱이 사용 중이거나 이 카메라에 문제가 있습니다.';
        else if (err.name === 'AbortError') errorMessage += '카메라 초기화 시간이 초과되었습니다. 새로고침하거나 다른 카메라를 시도하세요.';
        else if (err.message && err.message.includes('Video stream not rendered')) errorMessage += '카메라 스트림을 렌더링할 수 없습니다. 브라우저를 새로고침하세요.';
        setScanError(errorMessage);
        setIsScanning(false);
        setIsInitializing(false);
        if (html5QrCodeScannerRef.current) { // Ensure it's cleared on error
            try { await html5QrCodeScannerRef.current.clear(); } catch (clearErr) { /* ignore */ }
            html5QrCodeScannerRef.current = null;
        }
      }
    },
    [isLibraryLoaded, isProcessing, onScanSuccess, onScanFailure, isDebug, qrReaderId]
  );

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
      script.onload = () => setIsLibraryLoaded(true);
      script.onerror = () => {
        console.error('Html5Qrcode 라이브러리 로드 실패');
        setScanError('스캐너 라이브러리 로드 실패. 네트워크를 확인하고 새로고침하세요.');
      };
      document.head.appendChild(script);
    } else if (typeof window.Html5Qrcode !== 'undefined') {
      setIsLibraryLoaded(true);
    }

    return () => {
      cleanupRef.current = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any speech on component unmount
      }
      stopScanner(); // stopScanner already handles clearing the div and scanner instance
    };
  }, [getTodayKSTString, stopScanner]); // stopScanner is memoized

  useEffect(() => {
    if (isLibraryLoaded && loggedInUserData?.role === 'teacher' && !isScanning && !isInitializing) {
      startScanner();
    }
  }, [isLibraryLoaded, loggedInUserData, startScanner, isScanning, isInitializing]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentKstDate = getTodayKSTString();
      if (currentKstDate !== todayDate) {
        setTodayDate(currentKstDate);
        setScanError('날짜가 변경되었습니다. 스캔 기능이 중지됩니다. 페이지를 새로고침 해주세요.');
        speak('날짜가 변경되었습니다. 스캔 기능이 중지됩니다.');
        if (isScanning) { // Only stop if it was scanning
            stopScanner();
        }
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [todayDate, isScanning, stopScanner, getTodayKSTString, speak]); // Added speak and isScanning

  const handleLogout = async () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any speech on logout
      }
      await stopScanner();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      setScanError('로그아웃 실패.');
      // speak("로그아웃 중 오류가 발생했습니다."); // Optional: speak logout error
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
        <h1 /* Braun removed as it's not a standard HTML attribute */ className="text-2xl font-bold text-gray-800">식권 QR 스캐너 (교사용)</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded"
          disabled={isProcessing || isInitializing} // Also disable on init
        >
          로그아웃
        </button>
      </div>
      <p className="text-center text-sm text-gray-500 mb-4">오늘 날짜 (KST): {todayDate}</p>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">QR 코드 스캔</h2>
        <div
          id={qrReaderId}
          className="w-full mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative" // Added relative for potential overlays
          style={{ maxWidth: '500px', minHeight: '250px' }} // Ensure this is enough for the scanner UI
        />
        {!isLibraryLoaded && <p className="text-center text-gray-500 mt-4">스캐너 라이브러리 로딩 중...</p>}
        {isLibraryLoaded && !isScanning && isInitializing && (
          <p className="text-center text-gray-500 mt-4">카메라 초기화 중...</p>
        )}
        {isLibraryLoaded && !isScanning && !isInitializing && !scanError && loggedInUserData?.role === 'teacher' && (
          <button
            onClick={() => startScanner()} // Manual start button if auto-start fails or for retry
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            disabled={isInitializing || isProcessing}
          >
            스캐너 시작
          </button>
        )}
         {isLibraryLoaded && !isScanning && !isInitializing && !scanError && loggedInUserData?.role !== 'teacher' && (
             <p className="text-center text-gray-500 mt-4">교사 계정으로 로그인해주세요.</p>
         )}
        <div className="mt-4 text-center min-h-[3rem]"> {/* min-height to prevent layout jump */}
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
          {!scanResult && !scanError && isProcessing && (
             <div className="p-3 rounded bg-yellow-100 text-yellow-800 font-semibold">
              처리 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScanPage;
