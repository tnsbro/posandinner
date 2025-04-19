import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import bcrypt from "bcrypt";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDYTYu3KRhrdq2za6onCIiQO04v-2G20Uk",
    authDomain: "posanbab.firebaseapp.com",
    projectId: "posanbab",
    storageBucket: "posanbab.firebasestorage.app",
    messagingSenderId: "275820343995",
    appId: "1:275820343995:web:0b06f7e0e75f50ff5f6f9e",
    measurementId: "G-GEHLPR1EBJ"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// bcrypt 설정
const saltRounds = 10;
const defaultPassword = "123456";

// 기존 학생 데이터에 비밀번호 필드 추가
async function addPasswordToExistingStudents() {
  try {
    // "users" 컬렉션의 모든 문서 가져오기
    const usersCollection = collection(db, "users");
    const userDocs = await getDocs(usersCollection);

    // 각 문서에 대해 비밀번호 추가
    for (const userDoc of userDocs.docs) {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      // 문서 업데이트
      await updateDoc(doc(db, "users", userDoc.id), {
        password: hashedPassword
      });
    }

    console.log("모든 학생 데이터에 비밀번호 필드가 성공적으로 추가되었습니다.");
  } catch (error) {
    console.error("비밀번호 필드 추가 중 오류 발생:", error);
  }
}

// 함수 실행
addPasswordToExistingStudents();