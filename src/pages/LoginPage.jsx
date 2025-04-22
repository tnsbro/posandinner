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

  console.log('LoginPage rendered, useAuth login:', login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with email:', email);
      await login(email, password);
      console.log("로그인 성공, 리디렉션 대기...");
      navigate('/');
    } catch (err) {
      console.error("로그인 페이지 오류:", err);
      setError(err.message || '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.');
      setLoading(false);
    }
  };

  return (
    <div className="container-center">
      <div>
        <div>
          <h1 className="text-center text-bold mb-4">포산고등학교</h1>
        </div>
        <div>
          <h1 className="text-center text-bold " style={{'textAlign' : 'center'}}>SikOne (식권)</h1>
        </div>
        {error && <p className="text-sm text-red-600 text-center bg-red-100 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className='card'>
            <div>
              <label htmlFor="email" className="text-gray text-bold">
                학반번호
              </label>
              <input
                id="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mb-4"
                placeholder="예) 3312"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-gray text-bold">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mb-4"
                placeholder="초기 비밀번호 : 123456"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="button button-primary"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;