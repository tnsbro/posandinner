// src/components/DinnerTicket.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import './DinnerTicket.css';

function DinnerTicket({ date, location }) {
  const [isOpen, setIsOpen] = useState(false);

  // 카드 및 패널 정보
  const cardHeight = 640; // px
  const closedYCalcString = '17vh - 20px'; // 사용자 정의 초기 위치 표현 (계산용)

  // Y 위치(translateY)를 위한 Motion Value
  const y = useMotionValue(0);

  // 드래그 경계 및 목표 위치 (픽셀) Ref
  const constraintsRef = useRef({ top: 0, bottom: 0 });
  const closedYPixelRef = useRef(0);
  const openYPixelRef = useRef(-cardHeight / 2); // 열렸을 때 Y 픽셀 (고정값)

  // 화면 크기 변경 및 초기 로드 시 경계값 계산
  useEffect(() => {
    const calculateYValues = () => {
      const vh = window.innerHeight / 100;
      // calc(17vh - 20px) 를 픽셀로 계산
      const calculatedClosedY = (vh * 17) - 20;
      closedYPixelRef.current = calculatedClosedY;

      // 드래그 제한값 설정 (열린 위치 ~ 닫힌 위치)
      // 중요: top이 bottom보다 작은 값이어야 함 (Y축 기준)
      constraintsRef.current = {
        top: openYPixelRef.current,      // 예: -320 (더 작은 값, 위쪽)
        bottom: closedYPixelRef.current  // 예: 150 (더 큰 값, 아래쪽)
      };

      // 현재 상태에 맞는 y 값 즉시 설정
      y.set(isOpen ? openYPixelRef.current : closedYPixelRef.current);
    };

    calculateYValues();
    window.addEventListener('resize', calculateYValues);
    return () => window.removeEventListener('resize', calculateYValues);
  }, [isOpen, y, cardHeight]); // isOpen 추가됨

  // isOpen 상태 변경 시 애니메이션 실행
  useEffect(() => {
    const targetY = isOpen ? openYPixelRef.current : closedYPixelRef.current;
    animate(y, targetY, {
      type: "spring",
      stiffness: 300,
      damping: 30
    });
  }, [isOpen, y]); // 의존성 배열에 y 추가 (eslint 권고)

  // 드래그 시작 시 초기 Y값 저장 Ref
  const startDragY = useRef(0);

  // 드래그 중 위치 제한 및 업데이트 핸들러
  const handleDrag = (event, info) => {
    // 목표 Y 위치 계산 (시작점 + Y 이동량)
    const targetY = startDragY.current + info.offset.y;
    // 계산된 경계값 가져오기
    const constraints = constraintsRef.current;
    // 목표 Y를 경계값 사이로 제한 (Clamp)
    const clampedY = Math.max(constraints.top, Math.min(constraints.bottom, targetY));
    // 제한된 값으로 y 모션 값 즉시 업데이트
    y.set(clampedY);
  };

  // 드래그 종료 시 처리 핸들러
  const handleDragEnd = (event, info) => {
    const { offset, velocity } = info;
    const currentY = y.get();
    const velocityThreshold = 200;
    const midpoint = (openYPixelRef.current + closedYPixelRef.current) / 2;

    if (velocity.y < -velocityThreshold || (offset.y < 0 && currentY < midpoint)) {
      setIsOpen(true); // 열기
    } else if (velocity.y > velocityThreshold || (offset.y > 0 && currentY > midpoint)) {
      setIsOpen(false); // 닫기
    } else {
      // 애매하면 현재 상태로 복귀 (가까운 쪽으로 스냅)
      setIsOpen(currentY < midpoint);
    }
  };

  // 닫기 함수
  const closeSheet = () => setIsOpen(false);

  if (!date) return null;
  const dummyCardNumber = "5890 **** **** 1234";
  const validThru = "04/26";

  return (
    <>
      {/* 배경 오버레이 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="backdrop" onClick={closeSheet}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* 식권 카드 */}
      <motion.div
        className={`credit-card-ticket ${isOpen ? 'active' : ''}`}
        drag="y"
        // dragConstraints 제거됨
        dragElastic={0} // 탄성 없음 (수동 제한하므로)
        onDragStart={() => startDragY.current = y.get()} // 드래그 시작 시 Y값 저장
        onDrag={handleDrag} // 드래그 중 위치 제한 적용
        onDragEnd={handleDragEnd} // 드래그 종료 시 스냅 결정
        // onTap 제거됨
        style={{
          translateX: '-50%',
          y: y, // motion value 직접 연결
          touchAction: 'pan-y'
        }}
        // 애니메이션은 useEffect 내 animate 함수가 처리
      >
        <div className="card-design-elements">
          {/* ... (카드 내부 디자인 요소 동일) ... */}
        </div>
        {/* 하단 힌트 없음 */}
      </motion.div>
    </>
  );
}

export default DinnerTicket;