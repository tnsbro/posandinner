import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function StudentDashboard() {
    const { loggedInUserData, logout } = useAuth();
    const navigate = useNavigate();
    const [generatedQrDataString, setGeneratedQrDataString] = useState(null);
    const [isQrLibLoaded, setIsQrLibLoaded] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [todayDate, setTodayDate] = useState('');

    const qrCodeRef = useRef(null);
    const easyQRCodeInstanceRef = useRef(null);

    // 수정된 getTodayKSTString: 명시적 YYYY-MM-DD 형식 보장
    const getTodayKSTString = () => {
        const today = new Date();
        const kstOffset = 9 * 60 * 60 * 1000; // KST는 UTC+9
        const kstTime = new Date(today.getTime() + kstOffset);
        const year = kstTime.getUTCFullYear();
        const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(kstTime.getUTCDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        console.log(`Generated KST Date: ${dateString}`);
        return dateString;
    };

    // QR 코드 컨테이너 정리 함수
    const clearQRCodeDisplay = () => {
        console.log("Clearing QR Code Display");
        if (easyQRCodeInstanceRef.current) {
            easyQRCodeInstanceRef.current.clear();
        }
        if (qrCodeRef.current) {
            qrCodeRef.current.innerHTML = '';
        }
        setGeneratedQrDataString(null);
    };

    // 초기 설정: 날짜 설정 및 QR 라이브러리 로드
    useEffect(() => {
        const kstDate = getTodayKSTString();
        setTodayDate(kstDate);

        const scriptId = 'easyqrcode-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.jsdelivr.net/npm/easyqrcodejs@4.4.13/dist/easy.qrcode.min.js';
            script.onload = () => setIsQrLibLoaded(true);
            script.onerror = () => setMessage({ text: 'QR 라이브러리 로드 실패', type: 'error' });
            document.head.appendChild(script);
        } else if (window.QRCode) {
            setIsQrLibLoaded(true);
        }
    }, []);

    // 날짜 변경 감지: 1분마다 todayDate 업데이트
    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate) {
                console.log(`Date Rollover Detected: ${todayDate} -> ${currentKstDate}`);
                setTodayDate(currentKstDate);
                setMessage({ text: '새로운 날짜가 시작되었습니다.', type: 'info' });
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [todayDate]);

    // Firestore 데이터 초기화 로직: 날짜 기반 dinnerUsed 리셋
    useEffect(() => {
        if (
            loggedInUserData?.uid &&
            typeof loggedInUserData.lastUsedDate === 'string' &&
            loggedInUserData.dinnerUsed === true &&
            todayDate
        ) {
            const lastUsedDate = loggedInUserData.lastUsedDate.trim();
            const normalizedTodayDate = todayDate.trim();

            // 디버깅 로그 추가
            console.log('Date Comparison:');
            console.log(`lastUsedDate: "${lastUsedDate}" (length: ${lastUsedDate.length})`);
            console.log(`todayDate: "${normalizedTodayDate}" (length: ${normalizedTodayDate.length})`);
            console.log(`Strict Equality (===): ${lastUsedDate === normalizedTodayDate}`);

            // 날짜 형식 검증
            const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateFormatRegex.test(lastUsedDate)) {
                console.warn(`Invalid lastUsedDate format: ${lastUsedDate}. Skipping reset.`);
                return;
            }

            if (lastUsedDate !== normalizedTodayDate) {
                console.log(`Date mismatch detected: ${lastUsedDate} vs ${normalizedTodayDate}. Resetting Firestore.`);
                const userDocRef = doc(db, 'users', loggedInUserData.uid);
                updateDoc(userDocRef, {
                    dinnerUsed: false,
                    lastUsedDate: null, // 또는 normalizedTodayDate로 설정 가능
                })
                    .then(() => {
                        console.log('Firestore reset successful.');
                    })
                    .catch(error => {
                        console.error('Firestore reset error:', error);
                        setMessage({ text: '식권 초기화 실패', type: 'error' });
                    });
            } else {
                console.log('Dates match. No reset required.');
            }
        } else {
            console.log('Reset conditions not met:', {
                uid: loggedInUserData?.uid,
                lastUsedDate: loggedInUserData?.lastUsedDate,
                dinnerUsed: loggedInUserData?.dinnerUsed,
                todayDate,
            });
        }
    }, [loggedInUserData?.uid, loggedInUserData?.lastUsedDate, loggedInUserData?.dinnerUsed, todayDate]);

    // QR 코드 렌더링 로직
    useEffect(() => {
        console.log("QR Rendering Effect:", {
            isQrLibLoaded,
            generatedQrDataString: !!generatedQrDataString,
            dinnerUsed: loggedInUserData?.dinnerUsed,
        });

        if (!loggedInUserData || loggedInUserData.dinnerUsed === true) {
            clearQRCodeDisplay();
            return;
        }

        if (isQrLibLoaded && generatedQrDataString && qrCodeRef.current) {
            if (easyQRCodeInstanceRef.current) {
                easyQRCodeInstanceRef.current.clear();
            } else {
                if (qrCodeRef.current) qrCodeRef.current.innerHTML = '';
            }

            try {
                easyQRCodeInstanceRef.current = new window.QRCode(qrCodeRef.current, {
                    text: generatedQrDataString,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel.M,
                });
                setMessage({ text: 'QR 코드가 생성되었습니다. 스캔해주세요.', type: 'success' });
                console.log("QR Code generated successfully.");
            } catch (e) {
                console.error('QR 코드 생성 오류:', e);
                setMessage({ text: `QR 코드 생성 실패: ${e.message}`, type: 'error' });
                if (qrCodeRef.current) qrCodeRef.current.innerHTML = 'QR 생성 오류';
            }
        } else {
            if (qrCodeRef.current && !generatedQrDataString) {
                qrCodeRef.current.innerHTML = 'QR 코드 생성 버튼을 눌러주세요.';
            } else if (qrCodeRef.current && generatedQrDataString && !isQrLibLoaded) {
                qrCodeRef.current.innerHTML = 'QR 라이브러리 로딩 중...';
            }
        }
    }, [isQrLibLoaded, generatedQrDataString, loggedInUserData]);

    // QR 코드 생성 버튼 핸들러
    const handleGenerateClick = async () => {
        if (!loggedInUserData) {
            setMessage({ text: '사용자 정보를 불러올 수 없습니다.', type: 'error' });
            return;
        }
        if (!loggedInUserData.dinnerApplied) {
            setMessage({ text: '석식을 신청하지 않았습니다.', type: 'info' });
            return;
        }
        if (!loggedInUserData.dinnerApproved) {
            setMessage({ text: '석식이 승인되지 않았습니다.', type: 'info' });
            return;
        }
        if (loggedInUserData.dinnerUsed === true) {
            setMessage({ text: '오늘 식권이 이미 사용되었습니다.', type: 'info' });
            return;
        }
        if (generatedQrDataString) {
            setMessage({ text: 'QR 코드가 이미 생성되었습니다.', type: 'info' });
            return;
        }
        if (!isQrLibLoaded) {
            setMessage({ text: 'QR 라이브러리가 로드되지 않았습니다.', type: 'info' });
            return;
        }

        const classInfo = `${loggedInUserData.grade || '?'}-${loggedInUserData.classNum || '?'}`;
        const nonce = Math.random().toString(36).substring(2, 10);
        const qrData = {
            email: loggedInUserData.email,
            name: loggedInUserData.name || '이름없음',
            classInfo: classInfo,
            date: todayDate,
            nonce: nonce,
        };
        const qrString = JSON.stringify(qrData);
        console.log("Generated QR Data String:", qrString);
        setGeneratedQrDataString(qrString);
    };

    // 로그아웃 핸들러
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            setMessage({ text: '로그아웃 실패', type: 'error' });
        }
    };

    // 로그인 안 된 경우 렌더링
    if (!loggedInUserData) {
        return <div className="p-4 text-center">로그인 후 이용해주세요.</div>;
    }

    // 메인 렌더링
    return (
        <div className="container mx-auto p-4 max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">학생 대시보드</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                >
                    로그아웃
                </button>
            </div>
            <p className="text-center text-sm text-gray-500 mb-4">오늘: {todayDate}</p>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">내 정보</h2>
                <p>이메일: {loggedInUserData.email || 'N/A'}</p>
                <p>이름: {loggedInUserData.name || 'N/A'}</p>
                <p>학년/반: {loggedInUserData.grade || '?'}학년 {loggedInUserData.classNum || '?'}반</p>
                <p>석식 신청: {loggedInUserData.dinnerApplied ? '신청함' : '신청 안 함'}</p>
                <p className={loggedInUserData.dinnerApproved ? 'text-green-600' : 'text-red-600'}>
                    석식 승인: {loggedInUserData.dinnerApproved ? '승인됨' : '미승인'}
                </p>
                <p className={loggedInUserData.dinnerUsed === true ? 'text-red-600' : 'text-green-600'}>
                    오늘 식권 사용됨: {loggedInUserData.dinnerUsed === true ? '예' : '아니오'}
                </p>
                <p className="text-gray-500">
                    Last Used Date (DB): {loggedInUserData.lastUsedDate || '없음'}
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">식권 QR 코드</h2>
                {loggedInUserData.dinnerApplied && loggedInUserData.dinnerApproved && loggedInUserData.dinnerUsed === false ? (
                    <>
                        <button
                            onClick={handleGenerateClick}
                            disabled={!isQrLibLoaded || generatedQrDataString}
                            className={`w-full py-2 rounded ${
                                !isQrLibLoaded || generatedQrDataString
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                        >
                            {generatedQrDataString ? 'QR 코드 생성됨 (스캔 대기)' : 'QR 코드 생성'}
                        </button>
                        <div
                            ref={qrCodeRef}
                            className="h-52 flex items-center justify-center border rounded bg-gray-50 mt-4"
                        >
                            {!generatedQrDataString && 'QR 코드 생성 버튼을 눌러주세요.'}
                        </div>
                    </>
                ) : (
                    <p className="text-red-600 text-center">
                        {!loggedInUserData.dinnerApplied
                            ? '석식을 신청하지 않았습니다.'
                            : !loggedInUserData.dinnerApproved
                            ? '석식이 승인되지 않았습니다.'
                            : loggedInUserData.dinnerUsed === true
                            ? '오늘 식권이 이미 사용되었습니다.'
                            : 'QR 코드 표시 조건을 만족하지 않습니다.'}
                    </p>
                )}
            </div>

            {message.text && (
                <div
                    className={`mt-4 p-3 rounded text-center ${
                        message.type === 'error'
                            ? 'bg-red-100 text-red-700'
                            : message.type === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                    }`}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default StudentDashboard;