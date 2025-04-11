import React, { useState } from 'react';
import './DinnerTicket.css'; // CSS 파일 이름은 그대로 사용

function DinnerTicket({ menuData }) {
  const [isOpen, setIsOpen] = useState(false);

  // 시트 열기/닫기 토글 (핸들 클릭 시)
  const toggleSheet = (e) => {
    if (e) e.stopPropagation(); // 이벤트 전파 중지
    setIsOpen(!isOpen);
  };

  // 배경 클릭 시 시트 닫기
  const closeSheet = () => {
    setIsOpen(false);
  };

  // 데이터 없으면 렌더링 안 함
  if (!menuData) return null;

  const { date, mainCourse, sideDishes, location, calories } = menuData;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className={`backdrop ${isOpen ? 'active' : ''}`}
        onClick={closeSheet}
      ></div>

      {/* 바텀 시트 컨테이너 */}
      <div className={`bottom-sheet ${isOpen ? 'active' : ''}`}>
        {/* 시트 핸들 (클릭하여 열고 닫기) */}
        <div className="sheet-handle" onClick={toggleSheet}>
          <div className="handle-bar"></div> {/* 핸들바 시각적 표시 */}
          {/* 닫혀 있을 때 보이는 요약 정보 (선택 사항) */}
          {!isOpen && <span className="peek-summary">오늘의 식권 보기 ({date})</span>}
        </div>

        {/* 시트 내용 (메뉴 상세 정보) */}
        <div className="sheet-content">
          <h2>{date} 석식 메뉴</h2>
          <h3>{mainCourse}</h3>
          <ul>
            {sideDishes.map((dish, index) => (
              <li key={index}>{dish}</li>
            ))}
          </ul>
          {calories && <p className="calories-sheet">열량: {calories}</p>}
          {location && <p className="location-sheet">장소: {location}</p>}
          {/* 여기에 추가적인 버튼이나 정보 배치 가능 */}
        </div>
      </div>
    </>
  );
}

export default DinnerTicket;