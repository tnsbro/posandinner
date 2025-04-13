import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import './DinnerTicket.css';

function DinnerTicket({ date, location }) {
  const [isOpen, setIsOpen] = useState(false);
  const cardHeight = 640;
  const y = useMotionValue(0);
  const constraintsRef = useRef({
    top: -cardHeight / 2,
    bottom: window.innerHeight * 0.17 - 20
  });

  // 드래그 임계값 (화면 높이의 40%)
  const OPEN_THRESHOLD = window.innerHeight * 0.4;

  // 투명도 계산 (카드 제외 전체 어두움)
  const bgOpacity = useTransform(
    y,
    [constraintsRef.current.bottom, constraintsRef.current.top],
    [0, 0.7]
  );

  // 흰색 판 색상 계산 (카드보다 위에 위치)
  const panelColor = useTransform(
    bgOpacity,
    [0, 0.7],
    ['rgba(255,255,255,1)', 'rgba(235,235,235,0)']
  );

  // 드래그 종료 핸들러 (확실한 열림 구현)
  const handleDragEnd = (_, info) => {
    const currentY = y.get();
    const dragDistance = constraintsRef.current.bottom - currentY;
    
    // 확실한 열림 조건 (임계값 초과 또는 빠른 드래그)
    const shouldOpen = dragDistance > OPEN_THRESHOLD || 
                      Math.abs(info.velocity.y) > 1000;
    
    setIsOpen(shouldOpen);
  };

  // 애니메이션 제어
  useEffect(() => {
    animate(y, isOpen ? constraintsRef.current.top : constraintsRef.current.bottom, {
      type: "spring",
      stiffness: 350,
      damping: 25,
      restDelta: 0.1
    });
  }, [isOpen, y]);

  // 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => {
      constraintsRef.current.bottom = window.innerHeight * 0.17 - 20;
      if (!isOpen) y.set(constraintsRef.current.bottom);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, y]);

  if (!date) return null;

  return (
    <>
      {/* 전체 어두움 배경 */}
      <motion.div
        className="global-backdrop"
        style={{ opacity: bgOpacity }}
        onClick={() => setIsOpen(false)}
      />

      {/* 흰색 판 (카드보다 위에 위치) */}
      <motion.div
        className="bottom-panel-override"
        style={{
          backgroundColor: panelColor,
          zIndex: 1003 // 카드(1002)보다 위
        }}
      />

      {/* 카드 */}
      <motion.div
        className="credit-card-ticket"
        drag="y"
        dragConstraints={constraintsRef.current}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        style={{
          translateX: '-50%',
          y,
          zIndex: 1002,
          filter: 'brightness(1)' // 카드는 항상 밝게 유지
        }}
      >
        <div className="card-design-elements">
          <div className="card-chip"></div>
          <div className="card-logo">Meal Ticket</div>
          <div className="card-number">5890 **** **** 1234</div>
          <div className="card-info">
            <span className="card-holder">{location || 'Cafeteria'}</span>
            <div className="card-valid-thru-expiry">
              <span className="card-valid-thru">VALID<br/>THRU</span>
              <span className="card-expiry">04/26</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default DinnerTicket;