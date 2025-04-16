
// src/pages/ScanPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext'; // AuthContext 사용
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'; // Firestore 함수 import
import { db } from '../firebaseConfig'; // Firestore 인스턴스 import
// !!! 라이브러리 설치 후 import 방식 사용 권장 !!!
// npm install html5-qrcode 또는 yarn add html5-qrcode
// import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'; // 설치 후 이 라인 사용

function ScanPage() {
    const { currentUser, logout } = useAuth(); // 현재 로그인한 교사 정보
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState('');
    const [scanError, setScanError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [todayDate, setTodayDate] = useState('');
    const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Firestore 처리 중 상태

    const html5QrCodeScannerRef = useRef(null);
    const qrReaderId = "qr-reader-teacher"; // 고유 ID

    // --- 오늘 날짜 계산 ---
    const getTodayKSTString = useCallback(() => {
        const today = new Date();
        const kstOffsetMinutes = 9 * 60;
        const kstTime = new Date(today.getTime() + (kstOffsetMinutes * 60 * 1000));
        const year = kstTime.getUTCFullYear();
        const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(kstTime.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    // --- Firestore 사용 기록 확인 함수 ---
    const checkUsageInFirestore = async (studentUid, date) => {
        // 함수 내용 동일 (이전 코드 참조)
        console.log(`Firestore 사용 기록 확인: 학생 UID=${studentUid}, 날짜=${date}`);
        const ticketsRef = collection(db, "mealTickets");
        const q = query(ticketsRef, where("studentUid", "==", studentUid), where("scanDate", "==", date));
        try {
            const querySnapshot = await getDocs(q);
            const usageCount = querySnapshot.size;
            console.log(`Firestore 확인 결과: ${usageCount} 건`);
            return usageCount > 0;
        } catch (error) {
            console.error("Firestore 사용 기록 확인 오류:", error);
            showMessage(`오류: 사용 기록 확인 실패 (${error.message})`, 'error');
            return true; // 오류 시 사용된 것으로 간주
        }
    };

    // --- Firestore 사용 기록 저장 함수 ---
    const saveUsageToFirestore = async (qrData) => {
        // 함수 내용 동일 (이전 코드 참조)
        console.log("Firestore 사용 기록 저장 시도:", qrData);
        // 현재 로그인한 교사 정보 확인
        if (!currentUser) {
            console.error("Firestore 저장 오류: 로그인한 교사 정보 없음");
            showMessage('오류: 로그인한 교사 정보를 찾을 수 없습니다.', 'error');
            return false;
        }
        try {
            const ticketsRef = collection(db, "mealTickets");
            await addDoc(ticketsRef, {
                studentUid: qrData.studentUid,
                studentName: qrData.name,
                studentClassInfo: qrData.classInfo,
                scanDate: qrData.date, // QR에 포함된 날짜 사용
                scanTimestamp: serverTimestamp(), // 서버 시간 기준 기록
                scannedByUid: currentUser.uid // 스캔한 교사 UID
            });
            console.log("Firestore 사용 기록 저장 성공");
            return true;
        } catch (error) {
            console.error("Firestore 사용 기록 저장 오류:", error);
            showMessage(`오류: 사용 기록 저장 실패 (${error.message})`, 'error');
            return false;
        }
    };


    // --- 스캐너 중지 함수 ---
    const stopScanner = useCallback(async () => {
        // 함수 내용 동일 (이전 코드 참조)
        console.log("stopScanner 호출됨 (Scan). 현재 isScanning:", isScanning);
        const scannerInstance = html5QrCodeScannerRef.current;
        if (scannerInstance && isScanning) {
            try {
                console.log("scannerInstance.stop() 호출 시도 (Scan)...");
                await scannerInstance.stop();
                console.log("✅ QR 코드 스캐너 중지됨 (Scan).");
            } catch (err) {
                console.error("❌ 스캐너 중지 중 오류 (Scan):", err);
            } finally {
                setIsScanning(false);
                // setScanResult(''); // 결과는 유지할 수도 있음
                console.log("스캔 상태 false로 변경 완료 (Scan).");
            }
        } else {
            if (isScanning) setIsScanning(false);
        }
    }, [isScanning]);

    // --- QR 코드 스캔 성공 콜백 ---
    const onScanSuccess = useCallback(async (decodedText, decodedResult) => {
        if (isProcessing) return; // 중복 처리 방지

        console.log(`스캔된 텍스트: ${decodedText}`);
        setIsProcessing(true); // 처리 시작 상태
        setScanError(''); // 이전 오류 메시지 초기화

        const currentKstDate = getTodayKSTString();
        if (currentKstDate !== todayDate) {
            showMessage('오류: 처리 중 날짜가 변경되었습니다. 다시 시도하세요.', 'error');
            stopScanner().catch(err => console.error("스캔 성공 콜백 중 날짜 변경으로 인한 중지 오류:", err));
            setIsProcessing(false); return;
        }

        let qrData;
        try {
            // *** JSON 파싱 시도 ***
            qrData = JSON.parse(decodedText);
            // *** 필수 필드 검사 (studentUid, name, classInfo, date, nonce) ***
            if (!qrData || !qrData.studentUid || !qrData.name || !qrData.classInfo || !qrData.date || !qrData.nonce) {
                throw new Error("QR 데이터에 필수 정보가 누락되었습니다.");
            }
            console.log("QR 데이터 파싱 성공:", qrData);
        } catch (e) {
            console.warn("QR 데이터 파싱 오류 또는 형식 오류:", e);
            showMessage('오류: 유효하지 않은 QR 코드 형식입니다. 학생 QR코드가 맞는지 확인하세요.', 'error');
            setIsProcessing(false); return; // 계속 스캔
        }

        // 1. 날짜 검증 (QR 내부 날짜와 현재 날짜)
        if (qrData.date !== todayDate) {
            showMessage(`오류: 오늘(${todayDate}) 식권 QR코드가 아닙니다 (QR 날짜: ${qrData.date}).`, 'error');
            setIsProcessing(false); return; // 계속 스캔
        }

        // 2. Firestore에서 당일 사용 여부 검증
        const alreadyUsed = await checkUsageInFirestore(qrData.studentUid, todayDate);
        if (alreadyUsed) {
            showMessage(`오류: ${qrData.name} 학생 (${qrData.classInfo})은(는) 오늘 이미 식권을 사용했습니다.`, 'error');
            setIsProcessing(false); return; // 계속 스캔
        }

        // (추가 검증) Firestore users 컬렉션에서 학생의 dinnerApproved 상태 확인 (선택적)
        // const studentInfo = await getStudentInfo(qrData.studentUid); // getStudentInfo 함수 필요
        // if (!studentInfo || !studentInfo.dinnerApproved) {
        //     showMessage(`오류: ${qrData.name} 학생 (${qrData.classInfo})의 석식이 승인되지 않았습니다.`, 'error');
        //     setIsProcessing(false); return;
        // }

        // 3. Firestore에 사용 기록 저장
        const saveSuccess = await saveUsageToFirestore(qrData);
        if (saveSuccess) {
            const studentDetails = `${qrData.classInfo} ${qrData.name}`;
            showMessage(`인증 완료: ${studentDetails} (${qrData.date}) 식권 사용 처리되었습니다.`, 'success');
            // 성공 후 자동 중지
            stopScanner().catch(err => console.error("성공 후 자동 중지 오류:", err));
        }
        // saveUsageToFirestore 내부에서 오류 메시지 처리됨

        setIsProcessing(false); // 처리 완료 상태

    }, [todayDate, getTodayKSTString, stopScanner, currentUser, isProcessing, checkUsageInFirestore, saveUsageToFirestore]); // 의존성 배열 업데이트



    // --- 컴포넌트 마운트 시 ---
    useEffect(() => {
        const kstDate = getTodayKSTString();
        setTodayDate(kstDate);

        // Html5Qrcode 라이브러리 로드 (CDN)
        const html5QrCodeScriptId = 'html5qrcode-script';
        if (!document.getElementById(html5QrCodeScriptId)) {
            console.log("Html5Qrcode 스크립트 로딩 시도 (Scan)...");
            const script = document.createElement('script');
            script.id = html5QrCodeScriptId;
            script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
            script.onload = () => {
                console.log("✅ Html5Qrcode 스크립트 로드 완료 (Scan).");
                if (typeof window.Html5Qrcode !== 'undefined') setIsLibraryLoaded(true);
                else console.error("❌ window.Html5Qrcode 객체 찾을 수 없음 (Scan).");
            };
            script.onerror = () => console.error("❌ Html5Qrcode 스크립트 로딩 실패 (Scan).");
            document.head.appendChild(script);
        } else if (typeof window.Html5Qrcode !== 'undefined') {
            setIsLibraryLoaded(true);
        }

        // 언마운트 시 스캐너 정리
        return () => {
            if (html5QrCodeScannerRef.current && isScanning) {
                // stopScanner가 async 함수이므로 .catch()로 오류 처리
                stopScanner().catch(err => console.error("언마운트 중 스캐너 중지 오류:", err));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 마운트 시 한 번만 실행

    // --- 날짜 변경 감지 ---
    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate && todayDate) {
                console.log(`날짜 변경 감지 (Scan): ${todayDate} -> ${currentKstDate}.`);
                setTodayDate(currentKstDate);
                setScanResult('');
                setScanError('날짜가 변경되었습니다.');
                if (isScanning) {
                    stopScanner().catch(err => console.error("날짜 변경 시 스캐너 중지 오류:", err));
                }
            }
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [todayDate, isScanning, getTodayKSTString]); // stopScanner 의존성 제거 (useCallback 사용)


    // --- 메시지 표시 ---
    const showMessage = (text, type) => {
        if (type === 'success') { setScanResult(text); setScanError(''); }
        else { setScanError(text); setScanResult(''); }
    };


    // --- QR 코드 스캔 실패 콜백 ---
    const onScanFailure = useCallback((error) => { /* 무시 */ }, []);

    // --- 스캐너 시작 함수 ---
    const startScanner = useCallback(async () => {
        // 함수 내용 동일 (이전 코드 참조)
        if (!isLibraryLoaded || typeof window.Html5Qrcode === 'undefined') {
            showMessage('오류: 스캐너 라이브러리가 로드되지 않았습니다.', 'error'); return;
        }
        if (isScanning) { console.log("이미 스캔 중"); return; }

        setIsScanning(true);
        setScanResult('');
        setScanError('카메라 권한 요청 중...');

        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            if (!html5QrCodeScannerRef.current) {
                html5QrCodeScannerRef.current = new window.Html5Qrcode(qrReaderId, { verbose: false });
            }
            const config = { fps: 10, qrbox: (w, h) => ({ width: Math.max(Math.floor(Math.min(w, h) * 0.7), 150), height: Math.max(Math.floor(Math.min(w, h) * 0.7), 150) }), aspectRatio: 1.0, showTorchButtonIfSupported: true };
            showMessage('카메라 시작 중...', 'info');
            await html5QrCodeScannerRef.current.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
            showMessage('QR 코드를 스캔하세요.', 'info');
        } catch (err) {
            console.error("카메라 시작 오류 (Scan):", err);
            let errorMessage = `카메라 시작 오류: ${err.message || err}. `;
            if (err.name === "NotAllowedError") errorMessage += "카메라 권한 거부됨.";
            else if (err.name === "NotFoundError") errorMessage += "카메라 없음.";
            else if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) errorMessage += "HTTPS 또는 localhost 필요.";
            else errorMessage += "권한/설정 확인.";
            showMessage(errorMessage, 'error');
            setIsScanning(false);
        }
    }, [isLibraryLoaded, isScanning, onScanSuccess, onScanFailure, qrReaderId]);


    // --- 로그아웃 처리 ---
    const handleLogout = async () => {
        if (isScanning) await stopScanner(); // 스캔 중이면 중지
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("로그아웃 오류:", error);
            showMessage('로그아웃 실패', 'error');
        }
    };

    // --- 렌더링 ---
    return (
        <div className="container mx-auto p-4 max-w-lg">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">식권 QR 스캐너 (교사용)</h1>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded">
                    로그아웃
                </button>
            </div>
            <p className="text-center text-sm text-gray-500 mb-4">오늘 날짜 (KST): <span>{todayDate}</span></p>

            <div className="section bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">QR 코드 스캔</h2>
                <div className="flex justify-center space-x-4 mb-4">
                    {!isScanning ? (
                        <button onClick={startScanner} disabled={!isLibraryLoaded || isProcessing}
                            className={`font-bold py-2 px-6 rounded transition duration-300 ease-in-out ${!isLibraryLoaded || isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-700 text-white'
                                }`}>
                            {!isLibraryLoaded ? '라이브러리 로딩중...' : isProcessing ? '처리 중...' : '카메라 스캔 시작'}
                        </button>
                    ) : (
                        <button onClick={stopScanner} disabled={isProcessing}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition duration-300 ease-in-out disabled:opacity-50">
                            {isProcessing ? '처리 중...' : '스캔 중지'}
                        </button>
                    )}
                </div>

                {/* 스캐너 영역 - 조건부 렌더링 */}
                {isScanning && (
                    <div id={qrReaderId}
                        className="w-full mx-auto border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                        style={{ maxWidth: '500px', minHeight: '250px' }}>
                    </div>
                )}

                {/* 결과 메시지 */}
                <div className="message-output mt-4 text-center min-h-[3rem]">
                    {scanResult && <div className="message p-3 rounded bg-green-100 text-green-800 font-semibold break-words">{scanResult}</div>}
                    {scanError && <div className="message p-3 rounded bg-red-100 text-red-800 font-semibold break-words">{scanError}</div>}
                    {!isScanning && !scanResult && !scanError && <div className="text-gray-500">스캔을 시작하세요.</div>}
                </div>
            </div>
        </div>
    );
}

export default ScanPage;