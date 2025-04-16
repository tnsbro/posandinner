import React, { useState, useEffect, useRef, useCallback } from 'react';
import './sch.css'; // CSS 파일이 있다면 주석 해제

// !!! 라이브러리 설치 후 import 방식 사용 권장 !!!
// npm install html5-qrcode 또는 yarn add html5-qrcode
// import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'; // 설치 후 이 라인 사용

// localStorage 키 정의
const LOCAL_STORAGE_KEY = 'mealTicketUsage';
const PROCESSING_DELAY = 2000; // 스캔 후 처리 지연 시간 (ms) - 2초

function ScanQR() {
    // --- React State ---
    const [scanResult, setScanResult] = useState(''); // 성공 메시지
    const [scanError, setScanError] = useState('');   // 오류/정보 메시지
    const [lastScannedData, setLastScannedData] = useState(''); // 마지막 스캔된 원시 데이터
    const [isScanning, setIsScanning] = useState(false); // 스캔 활성 상태
    const [isFullscreen, setIsFullscreen] = useState(false); // 전체 화면 상태
    const [isProcessing, setIsProcessing] = useState(false); // 데이터 처리 중 상태 추가
    const [todayDate, setTodayDate] = useState('');
    const [isLibraryLoaded, setIsLibraryLoaded] = useState(false); // 라이브러리 로드 상태

    // --- Refs ---
    const html5QrCodeScannerRef = useRef(null); // 스캐너 인스턴스용 Ref
    const processingTimeoutRef = useRef(null); // setTimeout ID 저장용 Ref
    const qrReaderId = "qr-reader-layout-delay"; // DOM ID 변경

    // --- 오늘 날짜 계산 함수 ---
    const getTodayKSTString = useCallback(() => { /* 이전과 동일 */
        const today = new Date(); const kstOffsetMinutes = 9 * 60; const kstTime = new Date(today.getTime() + (kstOffsetMinutes * 60 * 1000)); const year = kstTime.getUTCFullYear(); const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0'); const day = String(kstTime.getUTCDate()).padStart(2, '0'); return `${year}-${month}-${day}`;
    }, []);

    // --- localStorage 관련 함수 ---
    const getUsageData = useCallback(() => { /* 이전과 동일 */
        try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'); } catch (e) { console.error("localStorage 읽기 오류:", e); return {}; }
    }, []);
    const addUsageRecord = useCallback((date, studentIdentifier) => { /* 이전과 동일 */
        const usageData = getUsageData(); const todaysUsage = usageData[date] || []; if (!todaysUsage.includes(studentIdentifier)) { todaysUsage.push(studentIdentifier); usageData[date] = todaysUsage; try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(usageData)); console.log(`localStorage 업데이트: ${date} - ${studentIdentifier} 추가`); } catch (e) { console.error("localStorage 쓰기 오류:", e); setScanError("오류: 사용 기록 저장 실패"); } }
    }, [getUsageData]);
    const isStudentUsedToday = useCallback((date, studentIdentifier) => { /* 이전과 동일 */
        const usageData = getUsageData(); const todaysUsage = usageData[date] || []; return todaysUsage.includes(studentIdentifier);
    }, [getUsageData]);

    // --- 라이브러리 로드 Effect ---
    useEffect(() => { /* 이전과 동일 */
        const kstDate = getTodayKSTString(); setTodayDate(kstDate);
        const loadScripts = () => { const tailwindScriptId = 'tailwind-script-scan-fs-layout-delay'; if (!document.getElementById(tailwindScriptId)) { const script = document.createElement('script'); script.id = tailwindScriptId; script.src = "https://cdn.tailwindcss.com"; document.head.appendChild(script); } const html5QrCodeScriptId = 'html5qrcode-script'; if (!document.getElementById(html5QrCodeScriptId)) { console.log("Html5Qrcode 스크립트 로딩 시도..."); const script = document.createElement('script'); script.id = html5QrCodeScriptId; script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"; script.onload = () => { console.log("✅ Html5Qrcode 스크립트 로드 완료."); if (typeof window.Html5Qrcode !== 'undefined') { console.log("✅ window.Html5Qrcode 객체 확인됨."); setIsLibraryLoaded(true); } else { console.error("❌ 스크립트는 로드되었으나 window.Html5Qrcode 객체를 찾을 수 없음."); setScanError("스캐너 라이브러리 초기화 오류 (객체 없음)"); setIsLibraryLoaded(false); } }; script.onerror = (error) => { console.error("❌ Html5Qrcode 스크립트 로딩 실패:", error); setScanError("스캐너 라이브러리 로드 실패. 네트워크 확인."); setIsLibraryLoaded(false); }; document.head.appendChild(script); } else { if (typeof window.Html5Qrcode !== 'undefined') { console.log("✅ Html5Qrcode 스크립트 이미 존재 및 객체 확인됨."); setIsLibraryLoaded(true); } else { console.warn("⚠️ Html5Qrcode 스크립트 태그는 있으나 객체가 로드되지 않음."); setIsLibraryLoaded(false); } } }; loadScripts();
        return () => { console.log("ScanQR 언마운트: 스캐너 및 타이머 정리 시도"); if (processingTimeoutRef.current) { clearTimeout(processingTimeoutRef.current); console.log("처리 지연 타이머 제거됨 (언마운트)"); } if (html5QrCodeScannerRef.current && isScanning) { stopScannerInternal(html5QrCodeScannerRef.current).catch(err => console.error("언마운트 중 스캐너 중지 오류:", err)); } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- 메시지 표시 함수 ---
    const showMessage = (text, type) => { /* 이전과 동일 */
        if (type === 'success') { setScanResult(text); setScanError(''); } else { setScanError(text); setScanResult(''); }
    };

     // --- 날짜 변경 감지 Effect ---
    useEffect(() => {
        const interval = setInterval(() => {
            const currentKstDate = getTodayKSTString();
            if (currentKstDate !== todayDate) {
                console.log(`날짜 변경 감지 (Scan): ${todayDate} -> ${currentKstDate}.`);
                setTodayDate(currentKstDate);
                setScanResult('');
                // 날짜 변경 시 스캐너는 중지하지 않음
                setScanError('날짜가 변경되었습니다. 스캐너는 활성 상태입니다.');
                // 처리 중이었다면 중단
                if (processingTimeoutRef.current) {
                    clearTimeout(processingTimeoutRef.current);
                    processingTimeoutRef.current = null;
                }
                setIsProcessing(false);
            }
        }, 30 * 1000); // 30초마다 체크 (조정 가능)

        return () => clearInterval(interval);
    }, [todayDate, getTodayKSTString]); // isScanning 제거

    // --- 스캔 성공 콜백 (딜레이 및 처리 로직 포함) ---
    const onScanSuccess = useCallback((decodedText, decodedResult) => {
        // 이미 다른 스캔 결과를 처리 중이면 새로운 스캔 무시
        if (isProcessing) {
            console.log("처리 중... 새로운 스캔 무시:", decodedText);
            return;
        }

        console.log(`스캔 성공 (처리 시작 예약): ${decodedText}`);
        setIsProcessing(true);          // 처리 시작 상태
        setLastScannedData(decodedText); // 원시 데이터 즉시 표시
        setScanResult('');              // 이전 성공 메시지 제거
        setScanError('데이터 확인 중...'); // 처리 중 메시지 표시

        // 설정된 시간(PROCESSING_DELAY)만큼 지연 후 처리 로직 실행
        processingTimeoutRef.current = setTimeout(() => {
            console.log("딜레이 후 처리 로직 실행:", decodedText);
            const currentKstDate = getTodayKSTString();

            // 딜레이 중에 날짜가 변경되었는지 다시 확인
            if (currentKstDate !== todayDate) {
                showMessage('오류: 처리 중 날짜 변경됨. 다시 스캔하세요.', 'error');
                setIsProcessing(false); // 처리 완료 (실패)
                processingTimeoutRef.current = null;
                return;
            }

            // --- 유효성 검사 ---
            const parts = decodedText.trim().split(' ');
            if (parts.length < 3) {
                showMessage('오류: QR 코드 형식이 올바르지 않습니다.', 'error');
                setIsProcessing(false); // 처리 완료 (실패)
                processingTimeoutRef.current = null;
                return; // 스캐너는 계속 활성 상태 유지
            }
            const scannedClassInfo = parts[0], scannedName = parts[1], scannedDate = parts[2];
            const studentIdentifier = `${scannedClassInfo}-${scannedName}`;

            if (scannedDate !== todayDate) {
                showMessage(`오류: 오늘(${todayDate}) 식권 아님 (QR 날짜: ${scannedDate}).`, 'error');
                setIsProcessing(false); // 처리 완료 (실패)
                processingTimeoutRef.current = null;
                return; // 스캐너는 계속 활성 상태 유지
            }

            if (isStudentUsedToday(todayDate, studentIdentifier)) {
                showMessage(`오류: ${scannedName} (${scannedClassInfo}) 학생 이미 사용함.`, 'error');
                setIsProcessing(false); // 처리 완료 (실패)
                processingTimeoutRef.current = null;
                return; // 스캐너는 계속 활성 상태 유지
            }

            // --- 성공 처리 ---
            const studentDetails = `${scannedClassInfo} ${scannedName}`;
            addUsageRecord(todayDate, studentIdentifier); // localStorage에 기록
            showMessage(`인증 완료: ${studentDetails} (${scannedDate})`, 'success'); // 성공 메시지 표시

            // !!! 성공해도 스캐너는 중지하지 않음 !!!

            // 처리 완료
            setIsProcessing(false);
            processingTimeoutRef.current = null;

        }, PROCESSING_DELAY); // 설정된 지연 시간

    }, [isProcessing, todayDate, getTodayKSTString, isStudentUsedToday, addUsageRecord]); // 의존성 배열

    // --- 스캔 실패 콜백 ---
    const onScanFailure = useCallback((error) => { /* 무시 */ }, []);

    // --- 실제 스캐너 중지 로직 (내부 함수) ---
    const stopScannerInternal = useCallback(async (scannerInstance) => { /* 이전과 동일 */
        if (scannerInstance && typeof scannerInstance.stop === 'function') { try { console.log("stopScannerInternal - scannerInstance.stop() 호출 시도..."); await scannerInstance.stop(); console.log("✅ 스캐너 중지됨 (library stop() 완료)."); } catch (err) { console.error("❌ 스캐너 중지 중 오류:", err); } } else { console.warn("stopScannerInternal - 유효한 스캐너 인스턴스 또는 stop 메서드 없음"); }
    }, []);

    // --- 스캐너 중지 요청 함수 (UI 연결용) ---
    const stopScanner = useCallback(async () => {
        console.log("UI에서 stopScanner 호출됨. 현재 isScanning:", isScanning);
        const scannerInstance = html5QrCodeScannerRef.current;

        // 진행 중인 처리 타임아웃 취소
        if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
            console.log("처리 지연 타이머 취소됨 (수동 중지)");
        }

        setIsProcessing(false); // 처리 중 상태 강제 해제

        if (scannerInstance && isScanning) {
            await stopScannerInternal(scannerInstance);
        } else {
            console.log("중지 요청 무시: 스캐너 미실행 또는 인스턴스 없음");
        }

        setIsScanning(false);
        setIsFullscreen(false);
        setScanResult('');
        setLastScannedData('');
        setScanError('스캔이 중지되었습니다.'); // 명시적 중지 메시지

        console.log("스캔 상태 및 전체 화면 상태 false로 변경 완료.");

    }, [isScanning, stopScannerInternal]);

    // --- 스캐너 시작 요청 함수 (UI 연결용) ---
    const startScanner = useCallback(() => { /* 이전과 동일 */
        if (!isLibraryLoaded) { showMessage('오류: 스캐너 라이브러리 로딩 중.', 'error'); return; }
        if (isScanning) { console.log("이미 스캔 중."); return; }
        console.log("Fullscreen 스캔 시작 요청"); setScanResult(''); setScanError('카메라 권한 요청/시작 중...'); setLastScannedData(''); setIsProcessing(false); setIsScanning(true); setIsFullscreen(true);
    }, [isLibraryLoaded, isScanning]);

    // --- 스캐너 초기화 및 시작 Effect ---
    useEffect(() => { /* 이전과 동일 */
        if (isScanning && isFullscreen && isLibraryLoaded) {
            console.log("Effect 실행: 스캐너 초기화 및 시작 시도"); const QrCodeLibrary = window.Html5Qrcode; if (typeof QrCodeLibrary === 'undefined') { console.error("Effect 오류: QrCodeLibrary 사용 불가"); showMessage('오류: 스캐너 라이브러리 객체 사용 불가.', 'error'); setIsScanning(false); setIsFullscreen(false); return; }
            const initAndStart = async () => {
                try { if (!html5QrCodeScannerRef.current) { console.log("Html5Qrcode 인스턴스 생성 (ID:", qrReaderId, ")"); html5QrCodeScannerRef.current = new QrCodeLibrary(qrReaderId, { verbose: false }); console.log("✅ 인스턴스 생성 성공"); } const config = { fps: 10, qrbox: (w, h) => { const size = Math.max(Math.floor(Math.min(w, h) * 0.7), 200); return { width: size, height: size }; }, aspectRatio: 1.0, showTorchButtonIfSupported: true, }; console.log("scannerInstance.start() 호출"); await html5QrCodeScannerRef.current.start( { facingMode: "environment" }, config, onScanSuccess, onScanFailure ); console.log("✅ 스캐너 시작 완료."); showMessage('QR 코드를 화면 상단 영역에 맞춰 스캔하세요.', 'info'); } catch (err) { console.error("❌ 스캐너 시작 중 오류:", err); let errorMessage = `카메라 시작 오류: ${err.message || err}. `; if (err.name === "NotAllowedError") errorMessage += "카메라 권한 필요."; else if (err.name === "NotFoundError") errorMessage += "카메라 없음."; else if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) errorMessage += "HTTPS 환경 필요."; else errorMessage += "카메라 설정 확인."; showMessage(errorMessage, 'error'); setIsScanning(false); setIsFullscreen(false); if (html5QrCodeScannerRef.current) { stopScannerInternal(html5QrCodeScannerRef.current).catch(e => {}); html5QrCodeScannerRef.current = null; } } }; initAndStart();
        }
    }, [isScanning, isFullscreen, isLibraryLoaded, onScanSuccess, onScanFailure, stopScannerInternal]);

    // --- React 렌더링 ---
    return (
        <div className={`scanqr-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
            {/* 일반 모드 UI */}
            {!isFullscreen && (
                <div className="container mx-auto p-4 max-w-lg">
                    {/* ... (일반 모드 내용 - 이전과 동일) ... */}
                     <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">식권 QR 스캐너</h1>
                    <p className="text-center text-sm text-gray-500 mb-4">
                        오늘 날짜 (KST): <span>{todayDate || '로딩중...'}</span>
                    </p>
                    <div className="section bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-3 text-gray-700">QR 코드 스캔</h2>
                        <div className="flex justify-center space-x-4 mb-4">
                            <button
                                onClick={startScanner}
                                disabled={!isLibraryLoaded || isScanning}
                                className={`font-bold py-2 px-6 rounded transition duration-300 ease-in-out ${
                                    (!isLibraryLoaded || isScanning) ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-green-500 hover:bg-green-700 text-white'
                                }`}
                            >
                                {!isLibraryLoaded ? '라이브러리 로딩중...' : (isScanning ? '스캔 진행 중...' : '카메라 스캔 시작')}
                            </button>
                        </div>
                        <div className="message-output mt-4 text-center min-h-[3rem]">
                            {scanResult && <div className="message p-3 rounded bg-green-100 text-green-800 font-semibold break-words">{scanResult}</div>}
                            {scanError && <div className="message p-3 rounded bg-red-100 text-red-800 font-semibold break-words">{scanError}</div>}
                             {!isScanning && !scanResult && !scanError && <div className="text-gray-500">스캔을 시작하세요.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 전체 화면 모드 UI --- */}
            {isFullscreen && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    {/* 스캐너 영역 (상단 절반) */}
                    <div id={qrReaderId} className="w-full h-1/2"></div>

                    {/* 데이터 및 제어 영역 (하단 절반) */}
                    <div className="w-full h-1/2 bg-gray-900 p-4 flex flex-col justify-between overflow-y-auto">
                        {/* 상단 메시지 및 스캔 데이터 */}
                        <div className="flex-grow space-y-3 text-center mb-3">
                            {/* 스캔 결과/오류/정보 메시지 */}
                            <div className="message-output-fullscreen min-h-[2rem]">
                                {scanResult && <div className="message inline-block p-2 rounded bg-green-700 bg-opacity-90 text-white font-semibold break-words shadow-lg">{scanResult}</div>}
                                {scanError && <div className="message inline-block p-2 rounded bg-red-700 bg-opacity-90 text-white font-semibold break-words shadow-lg">{scanError}</div>}
                                {/* 처리 중 아닐 때만 스캔 안내 표시 */}
                                {!scanResult && !scanError && isScanning && !isProcessing && <div className="message inline-block p-2 rounded bg-blue-700 bg-opacity-90 text-white font-semibold break-words shadow-lg">QR 코드를 화면 상단 영역에 맞춰 스캔하세요...</div>}
                            </div>
                            {/* 스캔된 원시 데이터 */}
                            {lastScannedData && (
                                <div className="scanned-data-output mt-2">
                                    <p className="text-gray-400 text-sm mb-1">마지막 스캔 데이터:</p>
                                    <pre className="text-gray-100 text-xs break-all whitespace-pre-wrap bg-gray-700 bg-opacity-70 px-3 py-2 rounded text-left max-h-24 overflow-y-auto"> {/* 최대 높이 및 스크롤 추가 */}
                                        {lastScannedData}
                                    </pre>
                                </div>
                            )}
                        </div>
                        {/* 하단 중지 버튼 */}
                        <div className="flex-shrink-0 flex justify-center">
                            <button
                                onClick={stopScanner}
                                // 처리 중일 때 버튼 비활성화 (선택적)
                                // disabled={isProcessing}
                                className={`bg-red-600 hover:bg-red-800 text-white font-bold py-3 px-10 rounded-full shadow-lg transition duration-200 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label="스캔 중지"
                            >
                                {isProcessing ? '처리 중...' : '스캔 중지'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScanQR;