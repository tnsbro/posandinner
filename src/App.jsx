import React, { useState, useEffect } from 'react';
// DinnerTicket을 BottomSheet로 이름 변경해도 좋지만, 일단 그대로 사용
import DinnerTicket from './components/DinnerTicket';
import './App.css';

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
          date: '2025-04-12', // 현재 날짜 또는 해당 날짜
          mainCourse: '소불고기 덮밥',
          sideDishes: ['맑은 콩나물국', '배추김치', '마카로니 샐러드', '과일 (사과)'],
          location: '교직원 식당',
          calories: '약 720kcal'
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

      {/* 메인 영역: 간단한 안내 또는 다른 콘텐츠 */}
      <main className="App-main">
        {!loading && !dinnerMenu && <p>오늘은 석식 정보가 없습니다.</p>}
        {!loading && dinnerMenu && <p style={{ marginTop: '30px', color: '#777' }}>식권 정보를 확인하려면 하단을 탭하세요.</p>}
        {/* 필요하다면 여기에 다른 내용 추가 */}
        {/* <div style={{height: '600px', background: '#eee', marginTop: '20px'}}>스크롤 테스트용</div> */}
      </main>

      {/* DinnerTicket(BottomSheet) 컴포넌트: 로딩 끝나고 메뉴 있을 때 렌더링 */}
      {!loading && dinnerMenu && <DinnerTicket menuData={dinnerMenu} />}

    </div>
  );
}

export default App;