import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";

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

// 모든 문서의 password 필드를 passwordHash로 변경
async function renamePasswordToPasswordHash() {
  try {
    // "users" 컬렉션의 모든 문서 가져오기
    const usersCollection = collection(db, "users");
    const userDocs = await getDocs(usersCollection);

    // 각 문서의 password 필드를 passwordHash로 변경하고 password 삭제
    for (const userDoc of userDocs.docs) {
      const userData = userDoc.data();
      
      // password 필드가 존재하는 경우에만 업데이트
      await updateDoc(doc(db, "users", userDoc.id), {
        phrase : "오늘 하루도 수고했어요."
      });
    }

    console.log("모든 문서의 password 필드가 passwordHash로 성공적으로 변경되었습니다.");
  } catch (error) {
    console.error("필드 이름 변경 중 오류 발생:", error);
  }
}

// 함수 실행
renamePasswordToPasswordHash();