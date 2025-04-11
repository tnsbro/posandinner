import React, { useState } from 'react';
import './DinnerTicket.css';

function DinnerTicket({ date, location }) {
  const [isOpen, setIsOpen] = useState(false);

  // 카드 열기/닫기 토글
  const toggleTicket = (e) => {
    // 클릭 이벤트가 backdrop으로 전파되는 것을 막음
    if (e) e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // 배경 클릭 시 카드 닫기 (이 함수는 유지)
  const closeTicket = () => {
    setIsOpen(false);
  };

  // 데이터 없으면 렌더링 안 함
  if (!date) return null;

  const dummyCardNumber = "5890 **** **** 1234";
  const validThru = "04/26";

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className={`backdrop ${isOpen ? 'active' : ''}`}
        onClick={closeTicket} // 배경 클릭 시 닫기
      ></div>

      {/* 식권 카드 */}
      <div
        className={`credit-card-ticket ${isOpen ? 'active' : ''}`}
        // === 수정된 부분 ===
        // 이전: onClick={!isOpen ? toggleTicket : undefined}
        // 변경: 항상 toggleTicket 함수 호출
        onClick={toggleTicket}
        // =================
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

        {!isOpen && <div className="peek-hint-bottom">탭하여 식권 보기 ({date})</div>}
      </div>
    </>
  );
}

export default DinnerTicket;