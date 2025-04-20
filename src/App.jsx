import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import Pixar from './pages/ScanerPicture';
import './sch.css';
import PhraseCreater from './pages/phraseCreater';

function ProtectedRoute({ children }) {
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
  if (loggedInUserData?.email === '3404' || loggedInUserData?.email === '3312') {
    return <Navigate to="/phrasejae" replace />;
  }

  console.warn("알 수 없는 사용자 역할, 로그인 페이지로 이동:", loggedInUserData);
  return <Navigate to="/login" replace />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRedirectedRef = useRef(false);

  useEffect(() => {
    const isFreshLoad = !sessionStorage.getItem('hasLoaded');
    if (isFreshLoad && location.pathname !== '/') {
      console.log(`새로고침 감지: 현재 경로(${location.pathname}) → 루트(/)로 리디렉션`);
      sessionStorage.setItem('hasLoaded', 'true');
      isRedirectedRef.current = true;
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!isRedirectedRef.current) {
      sessionStorage.setItem('hasLoaded', 'true');
    }
  }, []);

  return (
    <div className="App">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pixar" element={<Pixar />} />
          <Route path="/phrasejae" element={
              <ProtectedRoute>
                <PhraseCreater />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;