// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
// Firebase Auth 관련 import 제거 또는 주석 처리
// import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // 수정된 login 함수 사용
  const navigate = useNavigate();
  // const auth = getAuth(); // auth 사용 제거 또는 주석 처리

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 수정된 login 함수 호출 (Firestore 직접 조회)
      await login(email, password);
      // 로그인 성공 시 AuthContext에서 loggedInUserData가 설정됨
      // App.jsx의 HomeRedirect가 역할에 따라 이동시킴
      console.log("로그인 성공, 리디렉션 대기...");
      navigate('/'); // HomeRedirect가 처리
    } catch (err) {
      console.error("로그인 페이지 오류:", err);
      // AuthContext에서 throw된 에러 메시지 사용
      setError(err.message || '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.');
      setLoading(false); // 실패 시 로딩 상태 해제
    }
    // 성공 시 HomeRedirect가 페이지를 이동시키므로 여기서 setLoading(false) 불필요
  };

  // 회원가입 버튼 제거 또는 다른 기능으로 변경
  // const handleSignupClick = async () => { ... }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">식권 시스템 로그인</h2>
        {error && <p className="text-sm text-red-600 text-center bg-red-100 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-6"> {/* mt-4 추가 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              id="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Password"
            />
          </div>
          {/* {error && <p className="text-sm text-red-600 text-center">{error}</p>} 삭제하고 위로 옮김 */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button> 
          </div>
        </form>


        {/* 회원가입 버튼 제거 또는 주석 처리 */}
        <button type="button" id="signUpButton" onClick={()=>{navigate("/signup")}}>회원가입 하기</button>
         <p className="mt-4 text-xs text-center text-gray-500">
            계정이 없으신가요? 관리자에게 문의하여 계정을 생성하세요.
          </p>
      </div>
    </div>
  );
}

export default LoginPage;