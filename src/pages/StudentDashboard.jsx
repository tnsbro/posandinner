import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext'; // AuthContext 사용
import { useNavigate } from 'react-router-dom';

// !!! 라이브러리 설치 후 import 방식 사용 권장 !!!
// npm install easyqrcodejs 또는 yarn add easyqrcodejs
// import QRCode from 'easyqrcodejs'; // 설치 후 이 라인 사용

function StudentDashboard() {
    // useAuth 훅을 통해 현재 로그인한 사용자 정보 및 데이터를 가져옴
    const { loggedInUserData, loading, logout } = useAuth(); // currentUser -> loggedInUserData로 변경
    const navigate = useNavigate();

    // --- React State ---
    const [generatedQrDataString, setGeneratedQrDataString] = useState(null); // 생성된 QR 데이터 (JSON 문자열)
    const [isQrLibLoaded, setIsQrLibLoaded] = useState(false); // 라이브러리 로드 상태
    const [message, setMessage] = useState({ text: '', type: '' }); // 메시지 상태
    const [todayDate, setTodayDate] = useState(''); // 오늘 날짜 상태

    // --- Refs ---
    const qrCodeRef = useRef(null); // QR 코드가 그려질 div 참조
    const easyQRCodeInstanceRef = useRef(null); // easyqrcodejs 인스턴스 참조

    // --- 오늘 날짜 계산 함수 ---
    const getTodayKSTString = () => {
        const today = new Date();
        const kstOffsetMinutes = 9 * 60;
        const kstTime = new Date(today.getTime() + (kstOffsetMinutes * 60 * 1000));
        const year = kstTime.getUTCFullYear();
        const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(kstTime.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // --- 컴포넌트 마운트 시 라이브러리 로드 및 날짜 설정 ---
    useEffect(() => {
        const kstDate = getTodayKSTString();
        setTodayDate(kstDate);

        // EasyQRCodeJS 로드 (CDN)
        const easyQRCodeScriptId = 'easyqrcode-script';
        if (!document.getElementById(easyQRCodeScriptId)) {
            console.log("EasyQRCodeJS 스크립트 로딩 시도 (Student)...");

            const script = document.createElement('script');
            script.id = easyQRCodeScriptId;
            script.src = "https://cdn.jsdelivr.net/npm/easyqrcodejs@4.4.13/dist/easy.qrcode.min.js";
            script.onload = () => {
                console.log("✅ EasyQRCodeJS 스크립트 로드 완료 (Student).");
                if (typeof window.QRCode !== 'undefined') setIsQrLibLoaded(true);
                else console.error("❌ window.QRCode 객체 찾을 수 없음 (Student).");
            };
            script.onerror = () => {
                console.error("❌ EasyQRCodeJS 스크립트 로딩 실패 (Student).");
                setMessage({ text: 'QR 라이브러리 로드 실패.', type: 'error' });
            };
            document.head.appendChild(script);
        } else if (typeof window.QRCode !== 'undefined') {
            setIsQrLibLoaded(true);
        }
    }, []);

    // --- 날짜 변경 감지 및 상태 초기화 ---
    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate && todayDate) {
                console.log(`날짜 변경 감지 (Student): ${todayDate} -> ${currentKstDate}. 상태 초기화.`);
                setTodayDate(currentKstDate);
                setGeneratedQrDataString(null); // QR 데이터 초기화
                setMessage({ text: '날짜가 변경되었습니다. QR코드를 다시 생성해주세요.', type: 'info' });
                if (qrCodeRef.current) qrCodeRef.current.innerHTML = 'QR 코드가 여기에 표시됩니다.';
                easyQRCodeInstanceRef.current = null;
            }
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [todayDate]); // todayDate 상태에 의존

    // --- QR 코드 생성 로직 ---
    useEffect(() => {
        // 라이브러리 로드 완료, QR 데이터 존재, DOM 요소 준비 완료 시 실행
        if (isQrLibLoaded && generatedQrDataString && qrCodeRef.current) {
            console.log("QR 코드 생성 effect 실행 (Student). 데이터:", generatedQrDataString);
            // !!! import 방식 사용 시 `window.QRCode` 대신 `QRCode` 사용 !!!
            const QRLibrary = window.QRCode; // CDN 사용 시

            if (typeof QRLibrary === 'undefined') {
                setMessage({ text: '오류: QR 코드 라이브러리 사용 불가', type: 'error' }); return;
            }
            try {
                qrCodeRef.current.innerHTML = ''; // 기존 내용 삭제
                // 새 인스턴스 생성
                easyQRCodeInstanceRef.current = new QRLibrary(qrCodeRef.current, {
                    text: generatedQrDataString, // JSON 문자열 전달
                    width: 200, height: 200,
                    colorDark: "#000000", colorLight: "#ffffff",
                    correctLevel: QRLibrary.CorrectLevel.M // 에러 보정 레벨
                });
                console.log("EasyQRCodeJS 인스턴스 생성/업데이트 완료 (Student)");
            } catch (e) {
                console.error("EasyQRCodeJS QR 코드 생성 오류 (Student):", e);
                setMessage({ text: `오류: QR 코드 생성 실패 (${e.message})`, type: 'error' });
                if (qrCodeRef.current) qrCodeRef.current.innerHTML = 'QR 생성 오류';
            }
        } else if (!generatedQrDataString && qrCodeRef.current) {
             // 데이터가 없을 때 초기화
             qrCodeRef.current.innerHTML = 'QR 코드가 여기에 표시됩니다.';
             easyQRCodeInstanceRef.current = null;
        }
    }, [isQrLibLoaded, generatedQrDataString]); // 의존성: 라이브러리 로드 상태, QR 데이터

    // --- QR 생성 버튼 클릭 핸들러 ---
    const handleGenerateClick = () => {
        const currentKstDate = getTodayKSTString();
        if (currentKstDate !== todayDate) {
             setMessage({ text: '날짜가 변경되었습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.', type: 'error' });
             return;
        }

        // 로그인 정보 및 사용자 데이터 확인
        if (!loggedInUserData) { // loggedInUserData로 변경
            setMessage({ text: '오류: 사용자 정보를 불러올 수 없습니다.', type: 'error' });
            return;
        }

        // 석식 신청 및 승인 여부 확인
        if (!loggedInUserData.dinnerApplied) { // loggedInUserData로 변경
            setMessage({ text: '석식을 신청하지 않았습니다.', type: 'info' });
            return;
        }
        if (!loggedInUserData.dinnerApproved) { // loggedInUserData로 변경
            setMessage({ text: '석식이 아직 승인되지 않았습니다. 관리자에게 문의하세요.', type: 'info' });
            return;
        }

        // 이미 생성된 경우
        if (generatedQrDataString) {
            setMessage({ text: '오늘 식권 QR코드가 이미 생성되어 있습니다.', type: 'info' });
            return;
        }

        // *** QR 데이터 생성 (JSON 형식) ***
        const classInfo = `${loggedInUserData.grade || '?'}-${loggedInUserData.classNum || '?'}`; // loggedInUserData로 변경
        const nonce = Math.random().toString(36).substring(2, 10); // 고유 식별값
        const qrData = {
            studentUid: loggedInUserData.uid, // Firebase Auth UID 사용
            name: loggedInUserData.name || '이름없음', // loggedInUserData로 변경
            classInfo: classInfo,
            date: todayDate,
            nonce: nonce // 재사용 방지용 랜덤 값
        };

        const qrString = JSON.stringify(qrData); // JSON 문자열로 변환

        console.log("QR 생성 요청 (JSON):", qrString);
        setGeneratedQrDataString(qrString); // 상태 업데이트 -> useEffect 트리거
        setMessage({ text: 'QR 코드가 생성되었습니다. 스캔해주세요.', type: 'success' });
    };

    // --- 로그아웃 처리 ---
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login'); // 로그인 페이지로 이동
        } catch (error) {
            console.error("로그아웃 오류:", error);
            setMessage({ text: '로그아웃 실패', type: 'error' });
        }
    };

    // 로딩 중일 때 UI 처리
    if (loading) {
        return (
            <div className="flex justify-center items-center">
                <div>사용자 정보를 로딩 중...</div>
            </div>
        );
    }

    return (
        <div>
            <h2>학생 대시보드</h2>
            <button onClick={handleGenerateClick}>QR 코드 생성</button>
            <div ref={qrCodeRef}>QR 코드가 여기에 표시됩니다.</div>
            <button onClick={handleLogout}>로그아웃</button>
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default StudentDashboard;
