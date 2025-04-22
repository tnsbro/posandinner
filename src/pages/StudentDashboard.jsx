import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import axios from 'axios';
import useDataExist from './isDataExist';

function StudentDashboard() {
    const { loggedInUserData, logout } = useAuth();
    const navigate = useNavigate();
    const [generatedQrDataString, setGeneratedQrDataString] = useState(null);
    const [isQrLibLoaded, setIsQrLibLoaded] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [todayDate, setTodayDate] = useState('');
    const [dinnerMenu, setDinnerMenu] = useState(null);
    const [menuError, setMenuError] = useState(null);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);

    const qrCodeRef = useRef(null);
    const easyQRCodeInstanceRef = useRef(null);

    const getTodayKSTString = () => {
        const today = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstTime = new Date(today.getTime() + kstOffset);
        const year = kstTime.getUTCFullYear();
        const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(kstTime.getUTCDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        return dateString;
    };

    const clearQRCodeDisplay = () => {
        if (easyQRCodeInstanceRef.current) {
            easyQRCodeInstanceRef.current.clear();
        }
        if (qrCodeRef.current) {
            qrCodeRef.current.innerHTML = '';
        }
        setGeneratedQrDataString(null);
    };

    useDataExist(); // 사용자 데이터 존재 여부 확인

    // Fetch dinner menu from NEIS API
    useEffect(() => {
        const fetchDinnerMenu = async () => {
            setIsLoadingMenu(true);
            const timeout = setTimeout(() => {
                if (isLoadingMenu) {
                    setIsLoadingMenu(false);
                    setMenuError('석식 메뉴 로딩이 너무 오래 걸립니다. 네트워크를 확인해주세요.');
                }
            }, 10000); // 10-second timeout

            try {
                const currentKstDate = getTodayKSTString();
                const date = currentKstDate.replace(/-/g, '');
                // Use proxy URL to bypass CORS
                const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=e551d44107644bb582cdd21f692e6dd4&Type=xml&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=D10&SD_SCHUL_CODE=7240189&MLSV_FROM_YMD=${date}&MLSV_TO_YMD=${date}`;
                const response = await axios.get(url);


                // Parse XML response
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, 'text/xml');
                
                // Check for error codes in the response
                // NEIS API typically returns error codes directly under the root in a <RESULT> tag
                const resultCode = xmlDoc.getElementsByTagName('RESULT')[0]?.getElementsByTagName('CODE')[0]?.textContent;
                if (resultCode && resultCode !== 'INFO-000') {
                    if (resultCode === 'INFO-200') {
                        setMenuError('오늘의 석식 메뉴가 없습니다. (데이터 없음)');
                    } else {
                        setMenuError(`API 오류: ${resultCode}`);
                    }
                    setIsLoadingMenu(false);
                    clearTimeout(timeout);
                    return;
                }

                // Find the meal entry for dinner (MMEAL_SC_NM = "석식")
                const rows = xmlDoc.getElementsByTagName('row');
                let dinnerMenuText = null;

                for (let i = 0; i < rows.length; i++) {
                    const mealType = rows[i].getElementsByTagName('MMEAL_SC_NM')[0]?.textContent;
                    const mealDate = rows[i].getElementsByTagName('MLSV_YMD')[0]?.textContent;
                    if (mealType === '석식') {
                        dinnerMenuText = rows[i].getElementsByTagName('DDISH_NM')[0]?.textContent;
                        break;
                    }
                }

                if (dinnerMenuText) {
                    // Clean up the menu text (remove numbers in parentheses, split by <br/>)
                    const cleanedMenu = dinnerMenuText
                        .replace(/\([0-9.]+(\/[0-9.]+)*\)/g, '') // Remove numbers like (1), (18.1), (1/2/3), etc.
                        .split('<br/>')
                        .map(item => item.trim())
                        .filter(item => item);
                    setDinnerMenu(cleanedMenu);
                    setMenuError(null);
                } else {
                    setDinnerMenu(null);
                    setMenuError('오늘의 석식 메뉴가 없습니다.');
                }
            } catch (error) {
                console.error('Error fetching dinner menu:', error);
                setDinnerMenu(null);
                if (error.response) {
                    console.error('Error Response Data:', error.response.data);
                    setMenuError(`석식 메뉴를 불러오는 데 실패했습니다. (상태 코드: ${error.response.status})`);
                } else if (error.request) {
                    setMenuError('석식 메뉴를 불러오는 데 실패했습니다. (서버 응답 없음)');
                } else {
                    setMenuError('석식 메뉴를 불러오는 데 실패했습니다. (오류: ' + error.message + ')');
                }
            } finally {
                setIsLoadingMenu(false);
                clearTimeout(timeout);
            }
        };

        fetchDinnerMenu();
    }, []);

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

    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate) {
                setTodayDate(currentKstDate);
                setMessage({ text: '새로운 날짜가 시작되었습니다.', type: 'info' });
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [todayDate]);

    useEffect(() => {
        if (
            loggedInUserData?.uid &&
            typeof loggedInUserData.lastUsedDate === 'string' &&
            loggedInUserData.dinnerUsed === true &&
            todayDate
        ) {
            const lastUsedDate = loggedInUserData.lastUsedDate.trim();
            const normalizedTodayDate = todayDate.trim();

            const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateFormatRegex.test(lastUsedDate)) {
                console.warn(`Invalid lastUsedDate format: ${lastUsedDate}. Skipping reset.`);
                return;
            }

            if (lastUsedDate !== normalizedTodayDate) {
                const userDocRef = doc(db, 'users', loggedInUserData.uid);
                updateDoc(userDocRef, {
                    dinnerUsed: false,
                    lastUsedDate: null,
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

    useEffect(() => {
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
        setGeneratedQrDataString(qrString);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
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
                <span> </span>
                <button
                    onClick={() => navigate('/change-password')}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                >
                    비밀번호 변경
                </button>
                <span> </span>
                <button
                    onClick={() => navigate('/pixar')}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                >
                    사진 찍기
                </button>
                {loggedInUserData?.email === '3404' || loggedInUserData?.email === '3312' ? (
                    <>
                        <span> </span>
                        <button
                            onClick={() => navigate('/phrasejae')}
                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                        >
                            Top Secret
                        </button>
                    </>
                ) : null}
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">오늘의 한 마디</h2>
                <p>{loggedInUserData.phrase || 'N/A'}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">식권 QR 코드</h2>
                {loggedInUserData.dinnerApplied && loggedInUserData.dinnerApproved && loggedInUserData.dinnerUsed === false ? (
                    <>
                        <button
                            onClick={handleGenerateClick}
                            disabled={!isQrLibLoaded || generatedQrDataString}
                            className={`w-full py-2 rounded ${!isQrLibLoaded || generatedQrDataString
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
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">오늘의 석식 메뉴</h2>
                {menuError ? (
                    <p className="text-red-600 text-center">{menuError}</p>
                ) : dinnerMenu ? (
                    dinnerMenu.map((item, index) => (
                        <p key={index} className="text-center">{item}</p>
                    ))
                ) : isLoadingMenu ? (
                    <p className="text-center text-gray-500">석식 메뉴를 불러오는 중...</p>
                ) : (
                    <p className="text-center text-gray-500">석식 메뉴 데이터가 없습니다.</p>
                )}
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">내 정보</h2>
                <p>이름: {loggedInUserData.name || 'N/A'}</p>
                <p>학년/반: {loggedInUserData.grade || '?'}학년 {loggedInUserData.classNum || '?'}반</p>
                <p>석식 신청: {loggedInUserData.dinnerApplied ? '신청함' : '신청 안 함'}</p>
            </div>
        </div>
    );
}

export default StudentDashboard;