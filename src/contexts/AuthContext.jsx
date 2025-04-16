// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // db는 계속 사용
import bcrypt from 'bcryptjs'; // bcryptjs import

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // currentUser 대신 직접 관리할 사용자 정보 상태
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [loading, setLoading] = useState(true); // 로딩 상태는 유지

  // --- Firestore에서 사용자 정보 조회 및 비밀번호 검증 함수 ---
  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log("Custom login attempt for:", email);
      const usersRef = collection(db, "users");
      // 이메일로 사용자 검색 (필드 이름이 email이라고 가정)
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("User not found in Firestore");
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      // 여러 결과가 나올 경우 첫 번째 사용 (이메일은 고유해야 함)
      const userDoc = querySnapshot.docs[0];
      const userData = { uid: userDoc.id, ...userDoc.data() }; // uid는 문서 ID 사용

      console.log("User found:", userData.uid);

      // Firestore에 passwordHash 필드가 있는지, 비밀번호가 입력되었는지 확인
      if (!userData.passwordHash || !password) {
        console.log("Password hash missing or password not provided");
        throw new Error("비밀번호 정보가 없거나 입력되지 않았습니다.");
      }

      // --- 비밀번호 해시 비교 ---
      const isMatch = await bcrypt.compare(password, userData.passwordHash);
      if (!isMatch) {
        console.log("Password mismatch");
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      // --- 로그인 성공 ---
      console.log("Login successful for user:", userData.uid);
      setLoggedInUserData(userData); // 직접 사용자 상태 설정
      setLoading(false);
      return userData; // 성공 시 사용자 데이터 반환

    } catch (error) {
      console.error("Custom login error:", error);
      setLoggedInUserData(null); // 실패 시 사용자 상태 초기화
      setLoading(false);
      throw error; // 받은 에러를 그대로 전달
    }
  };

  // --- 로그아웃 함수 ---
  const logout = () => {
    console.log("Custom logout");
    setLoggedInUserData(null); // 사용자 데이터 초기화
    return Promise.resolve(); // Firebase Auth를 사용하지 않으므로 간단히 처리
  };

  // --- 회원가입 함수 ---
  const signup = async (email, password, additionalUserData = {}) => {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Firestore에 사용자 데이터 저장 (passwordHash 포함)
      const userRef = await addDoc(collection(db, "users"), {
        email,
        passwordHash,
        ...additionalUserData,
        role: 'student', // 기본 역할 지정
        createdAt: new Date(),
      });

      console.log("회원가입 성공:", userRef.id);

      const newUserData = {
        uid: userRef.id,
        email,
        ...additionalUserData,
        role: 'student',
      };

      setLoggedInUserData(newUserData); // 바로 로그인 상태로 설정
      return newUserData;
    } catch (error) {
      console.error("회원가입 실패:", error);
      throw new Error("회원가입 중 오류가 발생했습니다.");
    }
  };

  // 초기 로딩 처리 (예: 로컬 스토리지에서 세션 정보 확인 등)
  useEffect(() => {
    setLoading(false); // 간단 처리. 필요 시 localStorage 등 추가 가능
  }, []);

  const value = {
    loggedInUserData,
    loading,
    login,
    logout,
    signup,
    currentUser: null, // 기존 코드 호환을 위해 null 유지
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
