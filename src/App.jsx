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
import './sch.css';

const PrivateRoute = ({ element, allowedRoles }) => {
  const { loggedInUserData } = useAuth();

  console.log('PrivateRoute, loggedInUserData:', loggedInUserData);

  if (!loggedInUserData) {
    return <LoginPage />;
  }

  if (allowedRoles && !allowedRoles.includes(loggedInUserData.role)) {
    return <LoginPage />;
  }

  return element;
};

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

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/student"
          element={<PrivateRoute element={<StudentDashboard />} allowedRoles={['student']} />}
        />
        <Route
          path="/change-password"
          element={<PrivateRoute element={<ChangePasswordPage />} allowedRoles={['student']} />}
        />
        <Route
          path="/pixar"
          element={<PrivateRoute element={<Pixar />} allowedRoles={['student']} />}
        />
        <Route
          path="/phrasejae"
          element={<PrivateRoute element={<PhraseCreater />} allowedRoles={['student']} />}
        />
        <Route
          path="/scan"
          element={<PrivateRoute element={<ScanPage />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/admin"
          element={<PrivateRoute element={<AdminPage />} allowedRoles={['admin']} />}
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
          <div className="footer">
            <p>
              Powered by{' '}
              <a
                href="https://www.instagram.com/tnsbro_"
                className="footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                박순형
              </a>{' '}
              💛{' '}
              <a
                href="https://www.instagram.com/isqepe"
                className="footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                정재윤
              </a>
            </p>
          </div>
          ⓒ 2025 포산고등학교. All rights reserved.
        </footer>
      )}
    </div>
  );
}

export default App;