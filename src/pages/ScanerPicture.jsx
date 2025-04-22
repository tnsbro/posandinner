import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useDataExist from './isDataExist';

function Pixar() {
  const { loggedInUserData, logout } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(`✅ 인증 완료: ${loggedInUserData.grade}-${loggedInUserData.classNum} ${loggedInUserData.name}`);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const html5QrCodeScannerRef = useRef(null);
  const qrReaderId = 'qr-reader-teacher';
  const cleanupRef = useRef(false); 

  useDataExist(); // 사용자 데이터 존재 여부 확인

  // 디버그 모드 확인 (?debug=true URL 파라미터)
  const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';

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
  const onScanSuccess = useCallback((decodedText) => {
    setScanError('');
  }, []);

  // 스캔 실패 처리
  const onScanFailure = useCallback((error) => {
    if (isDebug && !error.message.includes('No QR code found')) {
      console.debug('QR 인식 오류:', error);
    }
  }, [isDebug]);

  // 스캐너 시작
  const startScanner = useCallback(
    async (attempt = 1, maxAttempts = 3, cameraConstraints = { facingMode: 'user' }) => {
      if (cleanupRef.current || !isLibraryLoaded) return;

      const container = document.getElementById(qrReaderId);
      if (!container) {
        setScanError('오류: QR 스캐너 UI 영역을 찾을 수 없습니다.');
        setIsInitializing(false);
        return;
      }
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
        await html5QrCodeScannerRef.current.start(cameraConstraints, config, onScanSuccess, onScanFailure);

        const videoElement = container.querySelector('video');
        if (!videoElement) {
          throw new Error('비디오 스트림이 DOM에 렌더링되지 않음');
        }

        setIsScanning(true);
        setIsInitializing(false);
      } catch (err) {
        console.error(`스캐너 시작 오류 (시도 ${attempt}):`, err);
        if (attempt < maxAttempts && err.name === 'AbortError' && err.message.includes('Timeout starting video source')) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return startScanner(attempt + 1, maxAttempts, cameraConstraints);
        } else if (attempt === maxAttempts && cameraConstraints.facingMode === 'user') {
          return startScanner(1, maxAttempts, { facingMode: 'environment' });
        } else if (attempt === maxAttempts && cameraConstraints.facingMode === 'environment') {
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
    [isLibraryLoaded, onScanSuccess, onScanFailure, isDebug]
  );

  // 라이브러리 로드 및 정리
  useEffect(() => {
    cleanupRef.current = false;

    const scriptId = 'html5qrcode-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      script.onload = () => {
        setIsLibraryLoaded(true);
      };
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
      stopScanner();
      const container = document.getElementById(qrReaderId);
      if (container) container.innerHTML = '';
    };
  }, [stopScanner]);

  // 교사용 자동 스캐너 시작
  useEffect(() => {
    if (isLibraryLoaded && !isScanning && !isInitializing) {
      startScanner();
    }
  }, [isLibraryLoaded, loggedInUserData, startScanner, isScanning, isInitializing]);

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
  
  return (
    <div className="container mx-auto p-4 max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">식권 QR 스캐너</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded"
        >
          로그아웃
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">QR 코드 스캔</h2>
        <div
          id={qrReaderId}
          className="w-full mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
          style={{ maxWidth: '500px', minHeight: '250px' }}
        />
        {!isLibraryLoaded && <p className="text-center text-gray-500 mt-4">스캐너 라이브러리 로딩 중...</p>}
        {isLibraryLoaded && !isScanning && isInitializing && (
          <p className="text-center text-gray-500 mt-4">카메라 초기화 중...</p>
        )}
        {isLibraryLoaded && !isScanning && !isInitializing && !scanError && (
          <p className="text-center text-gray-500 mt-4">카메라 시작 준비 중...</p>
        )}
        <div className="mt-4 text-center min-h-[3rem]">
            <div className="p-3 rounded bg-green-100 text-green-800 font-semibold break-words">
              {scanResult}
            </div>
        </div>
      </div>
    </div>
  );
}

export default Pixar;