import React, { useState, useEffect, useRef } from 'react';
import './sch.css'; // CSS 파일이 있다면 주석 해제

// !!! 라이브러리 설치 후 import 방식 사용 권장 !!!
// npm install easyqrcodejs 또는 yarn add easyqrcodejs
// import QRCode from 'easyqrcodejs'; // 설치 후 이 라인 사용

function GenerateStudentQR() {
    // --- React State ---
    const [loggedInStudent] = useState({ // 로그인 정보 (실제 앱에서는 props나 Context로 받을 수 있음)
        id: "2025030301", name: "정재윤", grade: "3", classNum: "3", gender: "남학생"
    });
    const [todayDate, setTodayDate] = useState('');
    const [generatedQrDataString, setGeneratedQrDataString] = useState(null); // 생성된 QR 데이터
    const [isQrLibLoaded, setIsQrLibLoaded] = useState(false); // 라이브러리 로드 상태
    const [message, setMessage] = useState({ text: '', type: '' }); // 메시지 상태

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

        // --- 스크립트 로딩 ---
        const loadScripts = () => {
            // Tailwind (선택적)
            const tailwindScriptId = 'tailwind-script-gen'; // ID 중복 방지
            if (!document.getElementById(tailwindScriptId)) {
                const tailwindScript = document.createElement('script');
                tailwindScript.id = tailwindScriptId;
                tailwindScript.src = "https://cdn.tailwindcss.com";
                document.head.appendChild(tailwindScript);
            }

            // EasyQRCodeJS (CDN 방식)
            // !!! import 방식을 사용한다면 이 블록 제거 !!!
            const easyQRCodeScriptId = 'easyqrcode-script';
            if (!document.getElementById(easyQRCodeScriptId)) {
                console.log("EasyQRCodeJS 스크립트 로딩 시도...");
                const script = document.createElement('script');
                script.id = easyQRCodeScriptId;
                script.src = "https://cdn.jsdelivr.net/npm/easyqrcodejs@4.4.13/dist/easy.qrcode.min.js";
                script.onload = () => {
                    console.log("✅ EasyQRCodeJS 스크립트 로드 완료.");
                    if (typeof window.QRCode !== 'undefined') {
                        console.log("✅ window.QRCode 객체 확인됨.");
                        setIsQrLibLoaded(true); // 로드 성공 상태 업데이트
                    } else {
                        console.error("❌ 스크립트는 로드되었으나 window.QRCode 객체를 찾을 수 없음.");
                        setMessage({ text: 'QR 라이브러리 초기화 오류 (객체 없음)', type: 'error' });
                        setIsQrLibLoaded(false);
                    }
                };
                script.onerror = (error) => {
                    console.error("❌ EasyQRCodeJS 스크립트 로딩 실패:", error);
                    setMessage({ text: 'QR 라이브러리 로드 실패. 네트워크 확인.', type: 'error' });
                    setIsQrLibLoaded(false);
                };
                document.head.appendChild(script);
            } else {
                // 이미 스크립트 태그가 있다면 객체 확인
                if (typeof window.QRCode !== 'undefined') {
                    console.log("✅ EasyQRCodeJS 스크립트 이미 존재 및 객체 확인됨.");
                    setIsQrLibLoaded(true);
                } else {
                    console.warn("⚠️ EasyQRCodeJS 스크립트 태그는 있으나 객체가 로드되지 않음.");
                    setIsQrLibLoaded(false);
                }
            }

            // !!! import 방식 사용 시 확인 !!!
            // import QRCode from 'easyqrcodejs'; // 파일 상단에 import
            // if (typeof QRCode !== 'undefined') {
            //     console.log("✅ EasyQRCodeJS 라이브러리 import 확인됨.");
            //     setIsQrLibLoaded(true);
            // } else {
            //     console.error("❌ EasyQRCodeJS import 실패.");
            //     setMessage({ text: 'QR 라이브러리 초기화 오류 (import 실패)', type: 'error' });
            //     setIsQrLibLoaded(false);
            // }
        };

        loadScripts();

        // 컴포넌트 언마운트 시 스크립트 제거 (선택적, SPA에서는 보통 유지)
        // return () => {
        //     const addedScripts = document.querySelectorAll('#tailwind-script-gen, #easyqrcode-script');
        //     addedScripts.forEach(script => {
        //         if (document.head.contains(script)) {
        //             document.head.removeChild(script);
        //         }
        //     });
        // };
    }, []); // 마운트 시 한 번만 실행

    // --- 날짜 변경 감지 및 상태 초기화 ---
    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate) {
                console.log(`날짜 변경 감지 (Generate): ${todayDate} -> ${currentKstDate}. 상태 초기화.`);
                setTodayDate(currentKstDate);
                setGeneratedQrDataString(null); // QR 데이터 초기화
                setMessage({ text: '날짜가 변경되었습니다.', type: 'info' });
                // QR 코드 표시 영역 초기화
                if (qrCodeRef.current) {
                    qrCodeRef.current.innerHTML = 'QR 코드가 여기에 표시됩니다.';
                }
                easyQRCodeInstanceRef.current = null; // 인스턴스 참조 제거
            }
        }, 60 * 1000); // 1분마다 체크

        return () => clearInterval(interval);
    }, [todayDate]); // todayDate가 변경될 때마다 effect 재실행

    // --- QR 코드 생성 로직 (useEffect 사용) ---
    useEffect(() => {
        // QR 라이브러리가 로드되었고, 생성할 데이터가 있고, QR 코드를 표시할 DOM 요소가 준비되었을 때 실행
        if (isQrLibLoaded && generatedQrDataString && qrCodeRef.current) {
            console.log("QR 코드 생성 effect 실행. 데이터:", generatedQrDataString);
            // !!! import 방식 사용 시 `window.QRCode` 대신 `QRCode` 사용 !!!
            const QRLibrary = window.QRCode; // CDN 사용 시

            if (typeof QRLibrary === 'undefined') {
                console.error("QR 코드 생성 시도 중 라이브러리 찾을 수 없음.");
                setMessage({ text: '오류: QR 코드 라이브러리 사용 불가', type: 'error' });
                return;
            }

            try {
                // 기존 내용 삭제 (중요: 인스턴스 생성 전에)
                qrCodeRef.current.innerHTML = '';

                // 새 인스턴스 생성
                easyQRCodeInstanceRef.current = new QRLibrary(qrCodeRef.current, {
                    text: generatedQrDataString,
                    width: 180,
                    height: 180,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRLibrary.CorrectLevel.M
                });
                console.log("EasyQRCodeJS 인스턴스 생성/업데이트 완료");
                setMessage({ text: 'QR 코드가 생성되었습니다. 담당자에게 보여주세요.', type: 'success' });

            } catch (e) {
                console.error("EasyQRCodeJS QR 코드 생성 중 오류 발생:", e);
                setMessage({ text: `오류: QR 코드 생성 실패 (${e.message})`, type: 'error' });
                if (qrCodeRef.current) {
                    qrCodeRef.current.innerHTML = 'QR 생성 오류';
                }
            }
        } else if (!generatedQrDataString && qrCodeRef.current) {
             // 데이터가 없을 때 (초기 상태 또는 날짜 변경 시)
             qrCodeRef.current.innerHTML = 'QR 코드가 여기에 표시됩니다.';
             easyQRCodeInstanceRef.current = null; // 인스턴스 참조 제거
        }

    }, [isQrLibLoaded, generatedQrDataString]); // 라이브러리 로드 상태 또는 QR 데이터가 변경될 때 실행

    // --- QR 생성 버튼 클릭 핸들러 ---
    const handleGenerateClick = () => {
        const currentKstDate = getTodayKSTString();
        // 날짜가 변경되었는지 다시 한번 확인
        if (currentKstDate !== todayDate) {
            console.log("생성 버튼 클릭 시 날짜 변경 감지. 상태 초기화 필요.");
            setTodayDate(currentKstDate);
            setGeneratedQrDataString(null);
            setMessage({ text: '날짜가 변경되었습니다. 다시 시도하세요.', type: 'info' });
            return;
        }

        if (generatedQrDataString) {
            setMessage({ text: '오늘 식권 QR코드가 이미 생성되어 있습니다.', type: 'info' });
            // 이미 데이터가 있으면 QR 생성 effect가 다시 실행될 필요 없음
            // (필요하다면 강제로 다시 그리게 할 수도 있지만, 보통은 불필요)
            return;
        }

        // --- localStorage에서 오늘 사용 여부 확인 (선택적 강화) ---
        // const usageData = JSON.parse(localStorage.getItem('mealTicketUsage') || '{}');
        // const todaysUsage = usageData[todayDate] || [];
        // const studentIdentifier = `${loggedInStudent.grade}-${loggedInStudent.classNum}-${loggedInStudent.name}`;
        // if (todaysUsage.includes(studentIdentifier)) {
        //     setMessage({ text: '오늘은 이미 식권을 사용한 것으로 기록되어 있습니다.', type: 'error' });
        //     // 필요하면 버튼 비활성화 로직 추가
        //     return;
        // }

        // 새로운 QR 데이터 생성 (단순 문자열)
        const classInfo = `${loggedInStudent.grade}-${loggedInStudent.classNum}`;
        const nonce = Math.random().toString(36).substring(2, 8);
        const qrString = `${classInfo} ${loggedInStudent.name} ${todayDate} ${nonce}`;

        console.log("QR 생성 요청 (단순 문자열):", qrString);
        setGeneratedQrDataString(qrString); // 상태 업데이트 -> useEffect 트리거
    };

    // --- React 렌더링 ---
    return (
        <div className="container mx-auto p-4 max-w-md"> {/* Tailwind CSS 적용 */}
            <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">식권 QR 생성</h1>
            <p className="text-center text-sm text-gray-500 mb-4">오늘 날짜 (KST): <span>{todayDate || '로딩중...'}</span></p>

            <div className="section bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">학생 정보</h2>
                <h3 className="text-lg mb-4 text-gray-600">
                    {loggedInStudent.grade}학년 {loggedInStudent.classNum}반 {loggedInStudent.name} 학생
                </h3>
                <button
                    id="generateBtn"
                    onClick={handleGenerateClick}
                    disabled={!isQrLibLoaded || !!generatedQrDataString} // 라이브러리 로드 전 또는 이미 생성 후 비활성화
                    className={`w-full font-bold py-2 px-4 rounded transition duration-300 ease-in-out ${
                        !isQrLibLoaded
                            ? 'bg-gray-400 text-gray-800 cursor-not-allowed'
                            : generatedQrDataString
                                ? 'bg-gray-500 text-white cursor-not-allowed' // 이미 생성됨 스타일
                                : 'bg-blue-500 hover:bg-blue-700 text-white' // 활성 스타일
                    }`}
                >
                    {!isQrLibLoaded ? '라이브러리 로딩중...' : generatedQrDataString ? 'QR 코드 생성됨' : '오늘 식권 QR 코드 생성하기'}
                </button>

                {/* QR 코드 표시 영역 */}
                <div
                    ref={qrCodeRef}
                    id="qrcode" // ID는 유지 (라이브러리가 사용할 수도 있음)
                    className="mt-4 h-48 flex items-center justify-center text-gray-500 border border-gray-200 rounded"
                >
                    QR 코드가 여기에 표시됩니다.
                </div>

                {/* 메시지 표시 영역 */}
                {message.text && (
                    <div className={`message p-2 rounded mt-4 text-center ${
                        message.type === 'error' ? 'bg-red-100 text-red-700' :
                        message.type === 'success' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700' // info
                    }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GenerateStudentQR;
