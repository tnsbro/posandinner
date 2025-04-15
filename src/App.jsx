import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAuth, getRedirectResult, GoogleAuthProvider } from "firebase/auth";

import GoogleLoginPage from "./GoogleLoginPage";
import FinalScreen from "./FinalScreen";

function App() {
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(async () => {
    const auth = getAuth();
    const result = await getRedirectResult(auth);

    if (result) {
      // 리디렉션 통해 성공적으로 로그인됨
      // UserCredential에서 추가 정보 얻기 가능 (예: provider token)
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      const user = result.user;
      console.log("Successfully signed in via redirect:", user);
      // 여기서 로그인 성공 관련 초기 UI 업데이트를 하거나,
      // 어차피 onAuthStateChanged가 호출될 것이므로 거기서 처리해도 됩니다.
    } else {
      // 리디렉션 결과 없음 (직접 접속 또는 이미 처리됨)
      console.log("No redirect result found.");
    }
  });

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/finalscreen" replace /> : <GoogleLoginPage />}
      />
      <Route
        path="/finalscreen"
        element={user ? <FinalScreen /> : <Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;