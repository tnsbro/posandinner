import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import './DinnerTicket.css';

function DinnerTicket({ date, location, isParentOpen, onOpenChange, onOpacityChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const cardHeight = 640;
  const closedYCalcString = '17vh - 20px';
  const y = useMotionValue(0);

  const openYPixelRef = useRef(-cardHeight / 2);
  const closedYPixelRef = useRef(0);
  const dragConstraintsRef = useRef({ top: -320, bottom: 0 });
  const startDragY = useRef(0);

  // 부모 상태와 동기화
  useEffect(() => {
    if (isParentOpen !== undefined) {
      setIsOpen(isParentOpen);
    }
  }, [isParentOpen]);

  // 상태 변경 시 부모에 알림
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const calculateYValues = () => {
      const vh = window.innerHeight / 100;
      const calculatedClosedY = (vh * 17) - 20;
      closedYPixelRef.current = calculatedClosedY;

      dragConstraintsRef.current = {
        top: openYPixelRef.current,
        bottom: calculatedClosedY
      };

      if (!isOpen) {
        y.set(closedYPixelRef.current);
      }
    };

    calculateYValues();
    window.addEventListener('resize', calculateYValues);
    return () => window.removeEventListener('resize', calculateYValues);
  }, [y, isOpen, cardHeight]);

  useEffect(() => {
    if (dragConstraintsRef.current.bottom === dragConstraintsRef.current.top && dragConstraintsRef.current.top === 0) {
      return;
    }
    const targetY = isOpen ? dragConstraintsRef.current.top : dragConstraintsRef.current.bottom;
    animate(y, targetY, {
      type: "spring",
      stiffness: 280,
      damping: 30
    });
  }, [isOpen, y]);

  const backdropOpacity = useTransform(
    y,
    [closedYPixelRef.current, openYPixelRef.current],
    [0, 1]
  );

  // 투명도 변경 시 부모에 알림
  useEffect(() => {
    const unsubscribe = backdropOpacity.on("change", (latest) => {
      onOpacityChange?.(latest);
    });
    return () => unsubscribe();
  }, [backdropOpacity, onOpacityChange]);

  const handleDrag = (event, info) => {
    const constraints = dragConstraintsRef.current;
    if (constraints.bottom === constraints.top && constraints.top === 0) {
      return;
    }
    const newY = y.get() + info.delta.y;
    const clampedY = Math.max(constraints.top, Math.min(constraints.bottom, newY));
    y.set(clampedY);
  };

  const handleDragEnd = (event, info) => {
    const currentY = y.get();
    const midpoint = (openYPixelRef.current + closedYPixelRef.current) / 2;
    setIsOpen(currentY < midpoint);
  };

  const closeSheet = () => setIsOpen(false);

  if (!date) return null;

  const dummyCardNumber = "5890 **** **** 1234";
  const validThru = "04/26";
  const isBackdropVisible = isOpen;

  return (
    <>
      <motion.div
        className="backdrop"
        onClick={closeSheet}
        style={{
          opacity: backdropOpacity,
          visibility: isBackdropVisible ? "visible" : "hidden",
          pointerEvents: isBackdropVisible ? 'auto' : 'none'
        }}
      />

      <motion.div
        className={`credit-card-ticket ${isOpen ? 'active' : ''}`}
        drag="y"
        dragElastic={0}
        dragConstraints={dragConstraintsRef.current}
        onDragStart={(event, info) => startDragY.current = y.get()}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{
          translateX: '-50%',
          y: y,
          touchAction: 'pan-y',
          zIndex: 1002
        }}
      >
        <div className="card-design-elements">
          <div className="card-chip"></div>
          <div className="card-logo">Meal Ticket</div>
          <div className="card-number">{dummyCardNumber}</div>
          <div className="card-info">
            <span className="card-holder">{location || 'Cafeteria'}</span>
            <div className="card-valid-thru-expiry">
              <span className="card-valid-thru">VALID<br/>THRU</span>
              <span className="card-expiry">{validThru}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default DinnerTicket;