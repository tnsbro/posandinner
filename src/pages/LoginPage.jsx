// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('로그인 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-center">
      <div>
        <h1 className="text-center text-bold mb-4">SikOne (식권)</h1>
      </div>
      <div className="card">
        <h2 className="text-center text-bold mb-4">로그인</h2>
        {error && <p className="text-center text-gray">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="text-gray text-bold">학반번호</label>
          <input
            id="email"
            name="email"
            className="input mb-4"
            placeholder="예) 3312"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password" className="text-gray text-bold">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input mb-4"
            placeholder="초기 비밀번호는 123456"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;