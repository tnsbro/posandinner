// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';
import './sch.css'; // CSS 파일 import

// ProtectedRoute 컴포넌트는 그대로 둡니다. 수정할 필요 없습니다.
function ProtectedRoute({ children, requiredRole }) {
  const { loggedInUserData, loading } = useAuth();

  if (loading) {
    // Loading state styled by sch.css .loading-container
    return (
        <div className="loading-container">
             <div>데이터 로딩 중...</div>
             {/* CSS에 로딩 스피너가 추가되어 있습니다 */}
        </div>
    );
  }

  if (!loggedInUserData) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!loggedInUserData.role || loggedInUserData.role !== requiredRole)) {
    console.warn(`접근 시도 거부: 사용자 역할(${loggedInUserData?.role}), 필요 역할(${requiredRole})`);
    // Redirect based on existing role or to login
    if (loggedInUserData?.role === 'student') return <Navigate to="/student" replace />;
    if (loggedInUserData?.role === 'teacher') return <Navigate to="/scan" replace />;
    if (loggedInUserData?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

// HomeRedirect 컴포넌트도 그대로 둡니다. 수정할 필요 없습니다.
function HomeRedirect() {
  const { loggedInUserData, loading } = useAuth();

  if (loading) {
     // Loading state styled by sch.css .loading-container
     return (
         <div className="loading-container">
              <div>데이터 로딩 중...</div>
         </div>
     );
  }

  if (!loggedInUserData) {
    return <Navigate to="/login" replace />;
  }

  if (loggedInUserData?.role === 'student') {
    return <Navigate to="/student" replace />;
  }
  if (loggedInUserData?.role === 'teacher') {
    return <Navigate to="/scan" replace />;
  }
  if (loggedInUserData?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  console.warn("알 수 없는 사용자 역할 또는 데이터 로드 실패, 로그인 페이지로 이동:", loggedInUserData);
  return <Navigate to="/login" replace />;
}


function App() {
  return (
    // 최상위 div에서 inline style={{ display: 'flex', ... }} 제거
    <div className="App"> 
      <AuthProvider>
        <Routes>
          {/* 로그인 페이지 (이 페이지는 sch.css 대신 Tailwind를 사용하므로 변경 없음) */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* 회원가입 페이지 (이 페이지도 sch.css 레이아웃을 사용하려면 구조 수정 필요) */}
          <Route path="/signup" element={<SignupPage />} />

          {/* 보호된 라우트 - StudentDashboard, ScanPage, AdminPage는 내부에서 sch.css 클래스를 사용해야 함 */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/scan"
            element={
              <ProtectedRoute requiredRole="teacher">
                <ScanPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* 기본 경로 처리 - HomeRedirect는 loading 상태에서 sch.css 스타일 사용 */}
          <Route
            path="/"
            element={<HomeRedirect />}
          />

          {/* 404 Not Found (NotFoundPage도 sch.css 스타일을 사용하려면 구조 수정 필요) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;