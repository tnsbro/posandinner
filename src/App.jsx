// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // AuthContext import

import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';

// 보호된 라우트 컴포넌트 수정
function ProtectedRoute({ children, requiredRole }) {
  // currentUser 대신 loggedInUserData 사용
  const { loggedInUserData, loading } = useAuth();

  if (loading) {
    return <div>로딩 중...</div>; // 인증 상태 확인 중
  }

  // loggedInUserData가 없으면 로그인되지 않은 상태
  if (!loggedInUserData) {
    return <Navigate to="/login" replace />;
  }

  // 역할 확인 시 loggedInUserData.role 사용
  if (requiredRole && (!loggedInUserData.role || loggedInUserData.role !== requiredRole)) {
    console.warn(`접근 시도 거부: 사용자 역할(${loggedInUserData?.role}), 필요 역할(${requiredRole})`);
    // 역할에 맞는 기본 페이지로 보내거나 접근 거부 페이지 표시
    if (loggedInUserData?.role === 'student') return <Navigate to="/student" replace />;
    if (loggedInUserData?.role === 'teacher') return <Navigate to="/scan" replace />;
    if (loggedInUserData?.role === 'admin') return <Navigate to="/admin" replace />;
    // 역할 정보 없으면 로그인으로 (이 경우는 거의 없어야 함)
    return <Navigate to="/login" replace />;
  }

  // 모든 조건 통과 시 자식 컴포넌트 렌더링
  return children;
}


function App() {
  return (
    <div className="App" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AuthProvider>
        <Routes>
          {/* 로그인 페이지 */}
          <Route path="/login" element={<LoginPage />} />
          {/* SignupPage 라우트 제거 또는 주석 처리 */}
          <Route path="/signup" element={<SignupPage />} />

          {/* 학생 대시보드 */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* 교사 스캔 페이지 */}
          <Route
            path="/scan"
            element={
              <ProtectedRoute requiredRole="teacher">
                <ScanPage />
              </ProtectedRoute>
            }
          />

          {/* 관리자 페이지 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* 기본 경로 처리 */}
          <Route
            path="/"
            element={<HomeRedirect />} // HomeRedirect도 수정 필요
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

function HomeRedirect() {
  // currentUser 대신 loggedInUserData와 loading 사용
  const { loggedInUserData, loading } = useAuth();

  if (loading) {
    return <div>로딩 중...</div>; // 로딩 중일 때 보여줄 내용
  }

  // loggedInUserData 없으면 로그인 페이지로 리디렉션
  if (!loggedInUserData) {
    return <Navigate to="/login" replace />;
  }

  // 사용자의 역할에 따른 리디렉션 처리
  if (loggedInUserData?.role === 'student') {
    return <Navigate to="/student" replace />;
  }
  if (loggedInUserData?.role === 'teacher') {
    return <Navigate to="/scan" replace />;
  }
  if (loggedInUserData?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // 역할 정보가 없거나 예외적인 경우 로그인 페이지로 리디렉션
  console.warn("알 수 없는 사용자 역할 또는 데이터 로드 실패, 로그인 페이지로 이동:", loggedInUserData);
  return <Navigate to="/login" replace />;
}

export default App;