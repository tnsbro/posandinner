import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function StudentDashboard() {
    const { loggedInUserData, logout } = useAuth();
    const navigate = useNavigate();
    const [generatedQrDataString, setGeneratedQrDataString] = useState(null);
    const [isQrLibLoaded, setIsQrLibLoaded] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [todayDate, setTodayDate] = useState('');
    const [isQrUsed, setIsQrUsed] = useState(true);
    const qrCodeRef = useRef(null);
    const easyQRCodeInstanceRef = useRef(null);

    const getTodayKSTString = () => {
        const today = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstTime = new Date(today.getTime() + kstOffset);
        return kstTime.toISOString().split('T')[0];
    };

    const checkAndResetQrUsage = async () => {
        if (!loggedInUserData) return;
        const userDocRef = doc(db, 'users', loggedInUserData.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                setMessage({ text: '사용자 데이터를 찾을 수 없습니다.', type: 'error' });
                return;
            }
            const data = userDoc.data();
            const lastUsedDate = data.lastUsedDate || '';
            const isUsedToday = data.dinnerUsed && lastUsedDate === todayDate;

            if (lastUsedDate !== todayDate && data.dinnerUsed) {
                await updateDoc(userDocRef, {
                    dinnerUsed: false,
                    lastUsedDate: null,
                });
                console.log('sch');
                setIsQrUsed(false);
            } else {
                setIsQrUsed(isUsedToday);
            }

            if (isUsedToday) {
                setGeneratedQrDataString(null);
                setMessage({ text: '오늘 식권이 이미 사용되었습니다.', type: 'info' });
            }
        } catch (error) {
            console.error('QR 사용 확인 오류:', error);
            setMessage({ text: 'QR 사용 상태 확인 실패', type: 'error' });
        }
    };

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

        if (loggedInUserData) {
            checkAndResetQrUsage();
        }
    }, [loggedInUserData, todayDate]);

    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate) {
                setTodayDate(currentKstDate);
                setGeneratedQrDataString(null);
                setIsQrUsed(false);
                setMessage({ text: '새로운 날짜로 QR 코드가 초기화되었습니다.', type: 'info' });
                if (qrCodeRef.current) qrCodeRef.current.innerHTML = 'QR 코드가 여기에 표시됩니다.';
                easyQRCodeInstanceRef.current = null;
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [todayDate]);

    useEffect(() => {
        if (isQrLibLoaded && generatedQrDataString && qrCodeRef.current && !isQrUsed) {
            qrCodeRef.current.innerHTML = '';
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
            } catch (e) {
                console.error('QR 코드 생성 오류:', e);
                setMessage({ text: `QR 코드 생성 실패: ${e.message}`, type: 'error' });
                qrCodeRef.current.innerHTML = 'QR 생성 오류';
            }
        } else if (qrCodeRef.current) {
            qrCodeRef.current.innerHTML = isQrUsed ? '오늘 식권 사용됨' : 'QR 코드가 여기에 표시됩니다.';
        }
        console.log(isQrUsed)
    }, [isQrLibLoaded, generatedQrDataString, isQrUsed]);

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
        if (isQrUsed) {
            setMessage({ text: '오늘 식권이 이미 사용되었습니다.', type: 'info' });
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
        setGeneratedQrDataString(qrString);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('로그아웃 오류:', error);
            setMessage({ text: '로그아웃 실패', type: 'error' });
        }
    };

    if (!loggedInUserData) {
        return <div className="p-4 text-center">로그인 후 이용해주세요.</div>;
    }

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
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">식권 QR 코드</h2>
                {loggedInUserData.dinnerApplied && loggedInUserData.dinnerApproved && !isQrUsed && !loggedInUserData.dinnerUsed ? (
                    <>
                        <button
                            onClick={handleGenerateClick}
                            disabled={!isQrLibLoaded || generatedQrDataString}
                            className={`w-full py-2 rounded ${!isQrLibLoaded || generatedQrDataString
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                        >
                            {generatedQrDataString ? 'QR 코드 생성됨' : 'QR 코드 생성'}
                        </button>
                        <div
                            ref={qrCodeRef}
                            className="h-52 flex items-center justify-center border rounded bg-gray-50 mt-4"
                        />
                    </>
                ) : (
                    <p className="text-red-600 text-center">
                        {isQrUsed
                            ? '오늘 식권이 이미 사용되었습니다.'
                            : loggedInUserData.dinnerApplied
                                ? ''
                                : '석식을 신청하지 않았습니다.'}
                    </p>
                )}
            </div>
        </div>
    );
}

export default StudentDashboard;