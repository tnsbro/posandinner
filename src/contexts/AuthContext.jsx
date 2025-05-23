// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, where, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import bcrypt from 'bcryptjs';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth called outside AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('useAuth context:', context);
  return context;
}

export function AuthProvider({ children }) {
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  console.log('AuthProvider rendered, loading:', loading, 'loggedInUserData:', loggedInUserData);

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
      setLoggedInUserData(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setLoading(false);
      return userData;
    } catch (error) {
      console.error("Custom login error:", error);
      setLoggedInUserData(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    console.log("Custom logout");
    setLoggedInUserData(null);
    localStorage.removeItem('user');
    return Promise.resolve();
  };

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
      const newUserData = {
        uid: userRef.id,
        email,
        ...additionalUserData,
        role: 'student',
      };
      setLoggedInUserData(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
      return newUserData;
    } catch (error) {
      console.error("회원가입 실패:", error);
      throw new Error("회원가입 중 오류가 발생했습니다.");
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!loggedInUserData?.uid) {
      throw new Error("로그인된 사용자가 없습니다.");
    }

    try {
      const userDocRef = doc(db, "users", loggedInUserData.uid);
      const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", loggedInUserData.email)));
      if (userDoc.empty) {
        throw new Error("사용자 데이터를 찾을 수 없습니다.");
      }

      const userData = userDoc.docs[0].data();
      if (!userData.passwordHash) {
        throw new Error("비밀번호 정보가 없습니다.");
      }

      const isMatch = await bcrypt.compare(currentPassword, userData.passwordHash);
      if (!isMatch) {
        throw new Error("현재 비밀번호가 일치하지 않습니다.");
      }

      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await updateDoc(userDocRef, {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      console.log("비밀번호 변경 성공:", loggedInUserData.uid);
      return true;
    } catch (error) {
      console.error("비밀번호 변경 실패:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('Checking for stored user data');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setLoggedInUserData(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    let unsubscribe = null;

    if (loggedInUserData && loggedInUserData.uid) {
      console.log("Setting up real-time listener for user:", loggedInUserData.uid);
      setRealtimeLoading(true);

      const userDocRef = doc(db, "users", loggedInUserData.uid);
      unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedUserData = { uid: docSnapshot.id, ...docSnapshot.data() };
          console.log("Real-time user data update:", updatedUserData);
          setLoggedInUserData(updatedUserData);
          localStorage.setItem('user', JSON.stringify(updatedUserData));
        } else {
          console.warn("User document no longer exists. Logging out.");
          setLoggedInUserData(null);
          localStorage.removeItem('user');
        }
        setRealtimeLoading(false);
      }, (error) => {
        console.error("Real-time listener error:", error);
        setRealtimeLoading(false);
      });
    } else {
      if (unsubscribe) {
        console.log("Cleaning up real-time listener.");
        unsubscribe();
      }
      setRealtimeLoading(false);
    }

    return () => {
      if (unsubscribe) {
        console.log("Running useEffect cleanup: Detaching listener.");
        unsubscribe();
      }
    };
  }, [loggedInUserData?.uid]);

  const value = {
    loggedInUserData,
    loading,
    realtimeLoading,
    login,
    logout,
    signup,
    changePassword,
    currentUser: null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}