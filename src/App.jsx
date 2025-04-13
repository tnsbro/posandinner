// src/App.jsx
import React, { useState, useEffect } from 'react';
import DinnerTicket from './components/DinnerTicket';
import './App.css';

function App() {
  const [dinnerMenu, setDinnerMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [backdropOpacity, setBackdropOpacity] = useState(0);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dummyMenuData = {
          date: '2025-04-12', // 현재 날짜 또는 해당 날짜
          mainCourse: '순두부찌개',
          sideDishes: ['흑미밥', '계란말이', '오이무침', '김'],
          location: '제2학생회관 식당',
          calories: '약 650kcal'
        };
        setDinnerMenu(dummyMenuData);
      } catch (error) {
        console.error("메뉴 데이터를 가져오는 데 실패했습니다:", error);
        setDinnerMenu(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
    console.log("Fetching menu...");
    fetchMenu().then(() => {
        console.log("Loading finished, menu data:", dinnerMenu); // dinnerMenu 상태 확인
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>오늘의 석식 정보</h1>
        {loading && <span style={{ fontSize: '0.8em', marginLeft: '10px' }}>(로딩중...)</span>}
      </header>

      <main className="App-main">
        {loading ? (
          <p>메뉴 정보를 불러오는 중...</p>
        ) : dinnerMenu ? (
          <div className="menu-details-main">
            <h2>{dinnerMenu.date} 석식 메뉴</h2>
            <h3>{dinnerMenu.mainCourse}</h3>
            <ul>
              {dinnerMenu.sideDishes.map((dish, index) => (
                <li key={index}>{dish}</li>
              ))}
            </ul>
            {dinnerMenu.calories && <p className="calories-main">열량: {dinnerMenu.calories}</p>}
            {dinnerMenu.location && <p className="location-main">장소: {dinnerMenu.location}</p>}
          </div>
        ) : (
          <p>오늘의 석식 메뉴 정보가 없습니다.</p>
        )}
      </main>

      {/* DinnerTicket에 날짜와 위치 정보 전달 */}
      {!loading && dinnerMenu && (
        <DinnerTicket 
          date={dinnerMenu.date} 
          location={dinnerMenu.location}
          isParentOpen={isTicketOpen}
          onOpenChange={setIsTicketOpen}
          onOpacityChange={setBackdropOpacity}
        />
      )}
      <div 
        className="bottom-panel"
        style={{
          backgroundColor: `rgba(255, 255, 255, ${1 - backdropOpacity * 1})`,
          zIndex: 1003
        }}
      />

    </div>
  );
}

export default App;