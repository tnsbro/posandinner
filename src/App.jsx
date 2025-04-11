import React, { useState, useEffect } from 'react';
import DinnerTicket from './components/DinnerTicket'; // DinnerTicket 컴포넌트 임포트
import './App.css'; // App 전용 CSS

function App() {
  const [dinnerMenu, setDinnerMenu] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        // --- 임시(더미) 데이터 사용 ---
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dummyMenuData = {
          date: '2025-04-11', // 오늘 날짜 또는 해당 날짜
          mainCourse: '김치볶음밥 & 계란후라이',
          sideDishes: ['유부장국', '콘샐러드', '깍두기'],
          location: '본관 구내식당',
          calories: '약 680kcal'
        };
        setDinnerMenu(dummyMenuData);
        // ------------------------------------

      } catch (error) {
        console.error("메뉴 데이터를 가져오는 데 실패했습니다:", error);
        setDinnerMenu(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>오늘의 석식 정보</h1>
        {loading && <span style={{ fontSize: '0.8em', marginLeft: '10px' }}>(로딩중...)</span>}
      </header>

      {/* --- 메인 화면 영역 --- */}
      <main className="App-main">
        {loading ? (
          <p>메뉴 정보를 불러오는 중...</p>
        ) : dinnerMenu ? (
          // --- 메인 화면에 메뉴 상세 정보 표시 ---
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
          // ------------------------------------
        ) : (
          <p>오늘의 석식 메뉴 정보가 없습니다.</p>
        )}
      </main>
      {/* -------------------- */}


      {/* DinnerTicket은 로딩 완료 후 메뉴가 있을 때만 렌더링, 날짜 정보 전달 */}
      {!loading && dinnerMenu && <DinnerTicket date={dinnerMenu.date} location={dinnerMenu.location} />}

    </div>
  );
}

export default App;