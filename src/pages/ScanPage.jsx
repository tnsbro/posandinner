
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

  const html5QrCodeScannerRef = useRef(null);

  const qrReaderId = 'qr-reader-teacher';

  const qrContainerRef = useRef(null);



  const getTodayKSTString = useCallback(() => {

    const today = new Date();

    const kstOffset = 9 * 60 * 60 * 1000;

    const kstTime = new Date(today.getTime() + kstOffset);

    return kstTime.toISOString().split('T')[0];

  }, []);



  const verifyAndMarkUsage = async (qrData) => {

    console.log('사용 확인 및 기록 시도:', qrData);

    try {

      const usersRef = collection(db, 'users');

      const q = query(usersRef, where('email', '==', qrData.email));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {

        setScanError('오류: 학생을 찾을 수 없습니다.');

        return false;

      }

      const userDoc = querySnapshot.docs[0];

      const userData = userDoc.data();

      const userDocRef = doc(db, 'users', userDoc.id);



      if (!userData.dinnerApplied) {

        setScanError(`오류: ${qrData.name} (${qrData.classInfo})은 석식을 신청하지 않았습니다.`);

        return false;

      }

      if (!userData.dinnerApproved) {

        setScanError(`오류: ${qrData.name} (${qrData.classInfo})의 석식이 승인되지 않았습니다.`);

        return false;

      }

      if (userData.dinnerUsed && userData.lastUsedDate === todayDate) {

        setScanError(`오류: ${qrData.name} (${qrData.classInfo})의 식권은 이미 사용되었습니다.`);

        return false;

      }



      await updateDoc(userDocRef, {

        dinnerUsed: true,

        lastUsedDate: todayDate,

      });

      console.log('사용 기록 성공');

      return true;

    } catch (error) {

      console.error('사용 확인/기록 오류:', error);

      setScanError(`오류: 사용 처리 실패 (${error.message})`);

      return false;

    }

  };



  const stopScanner = useCallback(async () => {

    console.log('stopScanner 호출됨');

    const scannerInstance = html5QrCodeScannerRef.current;

    if (scannerInstance && isScanning) {

      try {

        await scannerInstance.stop();

        console.log('✅ QR 코드 스캐너 중지됨');

        setIsScanning(false);

      } catch (err) {

        console.error('❌ 스캐너 중지 중 오류:', err);

        setScanError(`스캐너 중지 오류: ${err.message}`);

      }

    } else {

      setIsScanning(false);

    }

  }, [isScanning]);



  const pauseScanner = useCallback(() => {

    return new Promise((resolve) => {

      setIsProcessing(true);

      setTimeout(() => {

        setIsProcessing(false);

        resolve();

      }, 1000); // 1초 대기

    });

  }, []);



  const onScanSuccess = useCallback(

    async (decodedText) => {

      if (isProcessing) return;

      console.log(`스캔된 텍스트: ${decodedText}`);

      setScanResult('');

      setScanError('');



      const currentKstDate = getTodayKSTString();

      if (currentKstDate !== todayDate) {

        setScanError('오류: 처리 중 날짜가 변경되었습니다.');

        await pauseScanner();

        return;

      }



      let qrData;

      try {

        qrData = JSON.parse(decodedText);

        if (!qrData.email || !qrData.name || !qrData.classInfo || !qrData.date || !qrData.nonce) {

          throw new Error('QR 데이터에 필수 정보가 누락되었습니다.');

        }

        console.log('QR 데이터 파싱 성공:', qrData);

      } catch (e) {

        console.warn('QR 데이터 파싱 오류:', e);

        setScanError('오류: 유효하지 않은 QR 코드 형식입니다.');

        await pauseScanner();

        return;

      }



      if (qrData.date !== todayDate) {

        setScanError(`오류: 오늘(${todayDate}) QR 코드가 아닙니다 (QR 날짜: ${qrData.date}).`);

        await pauseScanner();

        return;

      }



      const saveSuccess = await verifyAndMarkUsage(qrData);

      if (saveSuccess) {

        setScanResult(`인증 완료: ${qrData.classInfo} ${qrData.name} (이메일: ${qrData.email})`);

      }

      await pauseScanner();

    },

    [todayDate, getTodayKSTString, pauseScanner, isProcessing]

  );



  const onScanFailure = useCallback((error) => {

    console.debug('스캔 실패:', error);

  }, []);



  const startScanner = useCallback(async () => {

    if (!isLibraryLoaded || typeof window.Html5Qrcode === 'undefined') {

      setScanError('오류: 스캐너 라이브러리가 로드되지 않았습니다.');

      return;

    }

    if (isScanning) {

      console.log('이미 스캔 중');

      return;

    }

    if (!qrContainerRef.current) {

      setScanError('오류: QR 스캐너 컨테이너를 찾을 수 없습니다.');

      return;

    }



    setIsScanning(true);

    setScanResult('');

    setScanError('');



    try {

      if (!html5QrCodeScannerRef.current) {

        html5QrCodeScannerRef.current = new window.Html5Qrcode(qrReaderId, { verbose: false });

      }

      const config = {

        fps: 10,

        qrbox: (w, h) => ({

          width: Math.max(Math.floor(Math.min(w, h) * 0.3), 150),

          height: Math.max(Math.floor(Math.min(w, h) * 0.3), 150),

        }),

        aspectRatio: 1.0,

        showTorchButtonIfSupported: true,

      };

      await html5QrCodeScannerRef.current.start(

        { facingMode: 'environment' },

        config,

        onScanSuccess,

        onScanFailure

      );

      console.log('✅ QR 스캐너 시작됨');

    } catch (err) {

      console.error('카메라 시작 오류:', err);

      let errorMessage = `카메라 시작 오류: ${err.message || err}. `;

      if (err.name === 'NotAllowedError') errorMessage += '카메라 권한이 거부되었습니다.';

      else if (err.name === 'NotFoundError') errorMessage += '카메라를 찾을 수 없습니다.';

      else if (err.message.includes('not found')) errorMessage += 'QR 스캐너 요소를 찾을 수 없습니다.';

      else errorMessage += '권한 및 설정을 확인하세요.';

      setScanError(errorMessage);

      setIsScanning(false);

    }

  }, [isLibraryLoaded, isScanning, onScanSuccess, onScanFailure]);



  useEffect(() => {

    const kstDate = getTodayKSTString();

    setTodayDate(kstDate);



    const scriptId = 'html5qrcode-script';

    if (!document.getElementById(scriptId)) {

      const script = document.createElement('script');

      script.id = scriptId;

      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

      script.onload = () => {

        setIsLibraryLoaded(true);

        console.log('✅ Html5Qrcode 라이브러리 로드됨');

      };

      script.onerror = () => {

        setScanError('스캐너 라이브러리 로드 실패');

        console.error('❌ Html5Qrcode 라이브러리 로드 실패');

      };

      document.head.appendChild(script);

    } else if (typeof window.Html5Qrcode !== 'undefined') {

      setIsLibraryLoaded(true);

    }



    return () => {

      if (html5QrCodeScannerRef.current && isScanning) {

        stopScanner();

      }

    };

  }, [stopScanner]);



  useEffect(() => {

    const interval = setInterval(() => {

      const currentKstDate = getTodayKSTString();

      if (currentKstDate !== todayDate) {

        console.log(`날짜 변경 감지: ${todayDate} -> ${currentKstDate}`);

        setTodayDate(currentKstDate);

        setScanResult('');

        setScanError('날짜가 변경되었습니다.');

        if (isScanning) stopScanner();

      }

    }, 60000);

    return () => clearInterval(interval);

  }, [todayDate, isScanning, stopScanner]);



  const handleLogout = async () => {

    if (isScanning) await stopScanner();

    try {

      await logout();

      navigate('/login');

    } catch (error) {

      console.error('로그아웃 오류:', error);

      setScanError('로그아웃 실패');

    }

  };



  if (!loggedInUserData || loggedInUserData.role !== 'teacher') {

    return <div className="p-4 text-center">교사만 접근 가능합니다.</div>;

  }



  return (

    <div className="container mx-auto p-4 max-w-lg">

      <p className="text-center text-sm text-gray-500 mb-4">오늘 날짜 (KST): {todayDate}</p>

      <div className="bg-white p-6 rounded-lg shadow-md">

        <h2 className="text-xl font-semibold mb-3 text-gray-700">QR 코드 스캔</h2>

        <div className="flex justify-center space-x-4 mb-4">

          {!isScanning ? (

            <button

              onClick={startScanner}

              disabled={!isLibraryLoaded || isProcessing}

              className={`font-bold py-2 px-6 rounded ${!isLibraryLoaded || isProcessing

                ? 'bg-gray-400 cursor-not-allowed'

                : 'bg-green-500 hover:bg-green-700 text-white'

                }`}

            >

              {!isLibraryLoaded ? '라이브러리 로딩중...' : isProcessing ? '처리 중...' : '카메라 스캔 시작'}

            </button>

          ) : (

            <button

              onClick={stopScanner}

              disabled={isProcessing}

              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"

            >

              {isProcessing ? '처리 중...' : '스캔 중지'}

            </button>

          )}

        </div>

        <div

          id={qrReaderId}

          ref={qrContainerRef}

          className="w-full mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"

          style={{ maxWidth: '500px', minHeight: '250px', display: isScanning ? 'block' : 'none' }}

        />

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

          {!isScanning && !scanResult && !scanError && (

            <div className="text-gray-500">스캔을 시작하세요.</div>

          )}

        </div>

      </div>

    </div>

  );

}



export default ScanPage;