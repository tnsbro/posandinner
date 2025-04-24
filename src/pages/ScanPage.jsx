
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
  const schRef = useRef(''); // sch 상태를 useRef로 유지
  const html5QrCodeScannerRef = useRef(null);
  const qrReaderId = 'qr-reader-teacher';
  const cleanupRef = useRef(false);

  useDataExist(); // 사용자 데이터 존재 여부 확인
  const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';

  // KST 날짜 문자열 반환
  const getTodayKSTString = useCallback(() => {
    const today = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // KST 오프셋 (9시간)
    const kstTime = new Date(today.getTime() + kstOffset);
    return kstTime.toISOString().split('T')[0];
  }, []);

  // QR 코드 검증 및 Firestore에 사용 기록
  const verifyAndMarkUsage = useCallback(
    async (qrData) => {
      setScanResult('');
      setScanError('');

      try {
        if (qrData.email !== schRef.current) {
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
          schRef.current = qrData.email; // schRef 업데이트
          return true;
        } else {
          return true;
        }
      } catch (error) {
        console.error('Firestore 오류:', error);
        setScanError(`오류: 사용 처리 실패 (${error.message})`);
        return false;
      }
    },
    [todayDate]
  );

  // 스캐너 중지
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
        if (err.name !== 'AbortError') {
          console.error('스캐너 중지 오류:', err);
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

  // 스캔 성공 처리
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
          setIsProcessing(false);
          return;
        }

        if (qrData.date !== todayDate) {
          setScanError(`오류: 이 QR 코드는 오늘(${todayDate}) 날짜가 아닙니다.`);
          setIsProcessing(false);
          return;
        }

        const saveSuccess = await verifyAndMarkUsage(qrData);
        if (saveSuccess) {
          setScanResult(`✅ 인증 완료: ${qrData.classInfo} ${qrData.name}`);
        }
        setIsProcessing(false);
      } catch (e) {
        console.warn('QR 처리 오류:', e);
        setScanError(`오류: QR 코드 처리 실패 (${e.message})`);
        setIsProcessing(false);
      }
    },
    [isProcessing, todayDate, getTodayKSTString, stopScanner, verifyAndMarkUsage]
  );

  // 스캔 실패 처리
  const onScanFailure = useCallback(
    (error) => {
      if (isDebug && !error.message.includes('No QR code found')) {
        console.debug('QR 인식 오류:', error);
      }
    },
    [isDebug]
  );

  // 스캐너 시작
  const startScanner = useCallback(
    async (attempt = 1, maxAttempts = 3, cameraConstraints = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }) => {
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
          fps: 25, // 빠른 인식
          qrbox: (w, h) => ({
            width: Math.min(w, h) * 0.9, // 넓은 스캔 영역
            height: Math.min(w, h) * 0.9,
          }),
          aspectRatio: 1.0,
          disableFlip: true, // 디코딩 속도 향상
          showTorchButtonIfSupported: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true, // 네이티브 바코드 감지
          },
          rememberLastUsedCamera: true, // 전면 카메라 지속
          formatsToSupport: [window.Html5QrcodeSupportedFormats.QR_CODE], // QR 코드 전용
        };

        console.log(`Attempting to start scanner (Attempt ${attempt}/${maxAttempts}) with constraints:`, cameraConstraints);
        await html5QrCodeScannerRef.current.start(cameraConstraints, config, onScanSuccess, onScanFailure);

        const videoElement = container.querySelector('video');
        if (!videoElement) {
          throw new Error('비디오 스트림이 DOM에 렌더링되지 않음');
        }

        setIsScanning(true);
        setIsInitializing(false);
        console.log('Scanner started successfully');
      } catch (err) {
        console.error(`스캐너 시작 오류 (시도 ${attempt}):`, err);
        if (attempt < maxAttempts && err.name === 'AbortError' && err.message.includes('Timeout starting video source')) {
          console.log(`Retrying scanner start (Attempt ${attempt + 1})...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
          return startScanner(attempt + 1, maxAttempts, cameraConstraints);
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

  // 라이브러리 로드 및 정리
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
        console.error('Html5Qrcode 라이브러리 로드 실패');
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

  // 교사용 자동 스캐너 시작
  useEffect(() => {
    if (isLibraryLoaded && loggedInUserData?.role === 'teacher' && !isScanning && !isInitializing && !isProcessing) {
      console.log('Attempting to auto-start scanner');
      startScanner();
    }
  }, [isLibraryLoaded, loggedInUserData, startScanner, isScanning, isInitializing, isProcessing]);

  // 날짜 변경 감지
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

  // 로그아웃 처리
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
          {isScanning && !isProcessing && (
            <div className="absolute inset-0 border-4 border-green-500 opacity-50 pointer-events-none" />
          )}
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
      <div className="footer">
        <p>
          <a
            href="https://www.instagram.com/tnsbro_"
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            박순형
          </a>{' '}
          💛{' '}
        </p>
        <p>
          <a
            href="https://www.instagram.com/isqepe"
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            정재윤
          </a>{' '}
          💛{' '}
        </p>
      </div>
    </div>
  );
}

export default ScanPage;
