// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore'; // doc, onSnapshot 추가
import { db } from '../firebaseConfig'; // db는 계속 사용
import bcrypt from 'bcryptjs';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeLoading, setRealtimeLoading] = useState(false); // 실시간 데이터 로딩 상태 추가

  // --- Firestore에서 사용자 정보 조회 및 비밀번호 검증 함수 ---
  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log("Custom login attempt for:", email);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("User not found in Firestore");
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { uid: userDoc.id, ...userDoc.data() };

      if (!userData.passwordHash || !password) {
        console.log("Password hash missing or password not provided");
        throw new Error("비밀번호 정보가 없거나 입력되지 않았습니다.");
      }

      const isMatch = await bcrypt.compare(password, userData.passwordHash);
      if (!isMatch) {
        console.log("Password mismatch");
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      console.log("Login successful for user:", userData.uid);
      // 로그인 성공 시 상태만 업데이트. 실시간 리스너는 useEffect에서 처리
      setLoggedInUserData(userData);
      setLoading(false);
      return userData;

    } catch (error) {
      console.error("Custom login error:", error);
      setLoggedInUserData(null);
      setLoading(false);
      throw error;
    }
  };

  // --- 로그아웃 함수 ---
  const logout = () => {
    console.log("Custom logout");
    setLoggedInUserData(null); // 사용자 데이터 초기화 -> useEffect에서 리스너 해제됨
    return Promise.resolve();
  };

  // --- 회원가입 함수 ---
  const signup = async (email, password, additionalUserData = {}) => {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const userRef = await addDoc(collection(db, "users"), {
        email,
        passwordHash,
        ...additionalUserData,
        role: 'student',
        createdAt: new Date(),
      });

      console.log("회원가입 성공:", userRef.id);

      // 회원가입 성공 후 바로 로그인 상태로 설정. 실시간 리스너는 useEffect에서 처리
      const newUserData = {
        uid: userRef.id,
        email,
        ...additionalUserData,
        role: 'student',
      };
      setLoggedInUserData(newUserData);

      return newUserData;
    } catch (error) {
      console.error("회원가입 실패:", error);
      throw new Error("회원가입 중 오류가 발생했습니다.");
    }
  };

  // --- 실시간 리스너 설정 및 해제 useEffect ---
  useEffect(() => {
    let unsubscribe = null; // 리스너 해제 함수를 담을 변수

    // loggedInUserData 상태가 null이 아닐 때 (로그인/가입 성공 시)
    if (loggedInUserData && loggedInUserData.uid) {
      console.log("Setting up real-time listener for user:", loggedInUserData.uid);
      setRealtimeLoading(true); // 실시간 데이터 로딩 시작

      // 해당 사용자의 문서에 대한 onSnapshot 리스너 설정
      const userDocRef = doc(db, "users", loggedInUserData.uid);
      unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          // 문서가 존재하면 최신 데이터로 상태 업데이트
          const updatedUserData = { uid: docSnapshot.id, ...docSnapshot.data() };
          console.log("Real-time user data update:", updatedUserData);
          setLoggedInUserData(updatedUserData);
        } else {
          // 문서가 존재하지 않으면 (예: 관리자가 사용자를 삭제한 경우) 로그아웃 처리
          console.warn("User document no longer exists. Logging out.");
          setLoggedInUserData(null);
        }
        setRealtimeLoading(false); // 실시간 데이터 로딩 완료
      }, (error) => {
        // 리스너 에러 처리
        console.error("Real-time listener error:", error);
        setRealtimeLoading(false);
        // 에러 발생 시 로그아웃 또는 에러 상태 처리 등 필요
        // setLoggedInUserData(null); // 에러 시 로그아웃을 원하면 주석 해제
      });
    } else {
      // loggedInUserData가 null일 때 (로그아웃 상태 또는 초기 상태)
      // 리스너가 설정되어 있다면 해제
      if (unsubscribe) {
        console.log("Cleaning up real-time listener.");
        unsubscribe(); // 리스너 해제
      }
      setRealtimeLoading(false); // 실시간 데이터 로딩 상태 초기화
    }

    // Cleanup 함수: 컴포넌트 언마운트 또는 loggedInUserData가 변경/null이 될 때 리스너 해제
    return () => {
      if (unsubscribe) {
        console.log("Running useEffect cleanup: Detaching listener.");
        unsubscribe();
      }
    };
  }, [loggedInUserData?.uid]); // loggedInUserData.uid가 변경될 때만 useEffect 재실행

  // 초기 로딩 상태 처리 (기존 로직 유지)
  useEffect(() => {
    // 여기에서 localStorage 등을 확인하여 초기 로그인 세션 복구 로직 추가 가능
    setLoading(false); // 초기 로딩 완료 (실제 구현에서는 세션 복구 후 로딩 완료 처리)
  }, []);


  const value = {
    loggedInUserData,
    loading, // 앱 초기 로딩 (세션 복구 등)
    realtimeLoading, // 실시간 데이터 로딩 상태
    login,
    logout,
    signup,
    currentUser: null, // 기존 코드 호환을 위해 null 유지 (Firebase Auth 아님)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* 초기 로딩 중에는 children 렌더링 안 함 */}
    </AuthContext.Provider>
  );
}