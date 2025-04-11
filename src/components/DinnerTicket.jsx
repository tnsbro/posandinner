// src/components/DinnerTicket.jsx
import React, { useState } from 'react'; // useState 다시 임포트
import './DinnerTicket.css';

// props로 date, location 받음 (isOpen, onClose 제거)
function DinnerTicket({ date, location }) {
  // --- 상태 관리 다시 추가 ---
  const [isOpen, setIsOpen] = useState(false);

  const toggleTicket = (e) => {
    if (e) e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const closeTicket = () => {
    setIsOpen(false);
  };
  // --------------------------

  if (!date) return null;

  const dummyCardNumber = "5890 **** **** 1234";
  const validThru = "04/26";

  return (
    <>
      {/* 배경 오버레이: 클릭 시 closeTicket 호출 */}
      <div
        className={`backdrop ${isOpen ? 'active' : ''}`}
        onClick={closeTicket}
      ></div>

      {/* 식권 카드: 클릭 시 toggleTicket 호출 */}
      <div
        className={`credit-card-ticket ${isOpen ? 'active' : ''}`}
        onClick={toggleTicket}
      >
        <div className="card-design-elements">
          {/* ... (카드 내부 디자인 요소 동일) ... */}
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

        {/* 카드 하단 힌트 다시 추가 */}
        {!isOpen && <div className="peek-hint-bottom">탭하여 식권 보기 ({date})</div>}
      </div>
    </>
  );
}

export default DinnerTicket;