// src/pages/ChangePasswordPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // 입력 검증
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      // 비밀번호 변경 후 로그아웃 및 리디렉션
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000); // 2초 후 로그아웃
    } catch (err) {
      console.error("비밀번호 변경 오류:", err);
      setError(err.message || '비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  return (
    <div className="container-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800">비밀번호 변경</h2>
        {error && (
          <p className="text-sm text-red-600 text-center bg-red-100 p-2 rounded">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 text-center bg-green-100 p-2 rounded">{success}</p>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div>
            <label htmlFor="current-password" className="text-gray text-bold">
              현재 비밀번호
            </label>
            <input
              id="current-password"
              name="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input mb-4"
              placeholder="현재 비밀번호"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="text-gray text-bold">
              새 비밀번호
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mb-4"
              placeholder="새 비밀번호"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-gray text-bold">
              새 비밀번호 확인
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input mb-4"
              placeholder="새 비밀번호 확인"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="button button-secondary"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export default ChangePasswordPage;