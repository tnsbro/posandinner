import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';
import ChangePasswordPage from './pages/ChangePasswordPage'; // 새로 추가
import './sch.css';

function ProtectedRoute({ children, requiredRole }) {
  const { loggedInUserData, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div>데이터 로딩 중...</div>
      </div>
    );
  }

  if (!loggedInUserData) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!loggedInUserData.role || loggedInUserData.role !== requiredRole)) {
    console.warn(`접근 시도 거부: 사용자 역할(${loggedInUserData?.role}), 필요 역할(${requiredRole})`);
    if (loggedInUserData?.role === 'student') return <Navigate to="/student" replace />;
    if (loggedInUserData?.role === 'teacher') return <Navigate to="/scan" replace />;
    if (loggedInUserData?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

function HomeRedirect() {
  const { loggedInUserData, loading } = useAuth();

  if (loading) {
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
    <div className="App">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
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
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;