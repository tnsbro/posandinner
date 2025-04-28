import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import Pixar from './pages/ScanerPicture';
import PhraseCreater from './pages/phraseCreater';
import Sundictionary from './pages/Sundictionary'; // 추가된 페이지
import './sch.css';

function App() {
  const location = useLocation();
  const { loggedInUserData, loading } = useAuth();
  const [timeoutError, setTimeoutError] = useState(false);

  console.log('App rendered, loading:', loading, 'loggedInUserData:', loggedInUserData);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setTimeoutError(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div>
        {timeoutError ? (
          <div className="text-center p-4 text-red-600">
            로딩이 너무 오래 걸립니다. 네트워크를 확인하거나 새로고침하세요.
          </div>
        ) : (
          <div className="text-center p-4">Loading...</div>
        )}
      </div>
    );
  }

  // 특정 사용자 ID만 접근 허용 (email 속성 사용)
  const allowedUserIDs = ['3312', '3404'];
  const isAllowedUser = loggedInUserData?.email && allowedUserIDs.includes(loggedInUserData.email);

  // Debugging: Check isAllowedUser computation
  console.log('loggedInUserData.email:', loggedInUserData?.email);
  console.log('isAllowedUser:', isAllowedUser);

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/student"
          element={<StudentDashboard />}
        />
        <Route
          path="/sundictionary"
          element={
            isAllowedUser ? (
              <Sundictionary />
            ) : (
              <div className="text-center p-4 text-red-600">
                접근 권한이 없습니다. 로그인 페이지로 이동합니다.
              </div>
            )
          }
        />
        <Route
          path="/phrasejae"
          element={<PhraseCreater />}
        />
        <Route
          path="/change-password"
          element={<ChangePasswordPage />}
        />
        <Route
          path="/admin"
          element={<AdminPage />}
        />
        <Route
          path="/scan"
          element={<ScanPage />}
        />
        <Route
          path="/pixar"
          element={<Pixar />}
        />
        <Route
          path="/"
          element={
            loggedInUserData ? (
              {
                student: <StudentDashboard />,
                teacher: <ScanPage />,
                admin: <AdminPage />,
              }[loggedInUserData.role] || <LoginPage />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="*"
          element={
            loggedInUserData ? (
              {
                student: <StudentDashboard />,
                teacher: <ScanPage />,
                admin: <AdminPage />,
              }[loggedInUserData.role] || <LoginPage />
            ) : (
              <LoginPage />
            )
          }
        />
      </Routes>

      {location.pathname !== '/login' && (
        <footer className="footer">
          ⓒ 2025 포산고등학교. All rights reserved.
        </footer>
      )}
    </div>
  );
}

export default App;
