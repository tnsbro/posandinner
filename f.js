import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import bcrypt from "bcryptjs";

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

// 학생 리스트 예시
const students = ["권보영",
  "권형준",
  "김사랑",
  "김서영",
  "김재민",
  "김현우",
  "노희윤",
  "박예빈",
  "박지훈",
  "백소민",
  "성민기",
  "신유진",
  "양지훈",
  "윤병호",
  "이윤제",
  "이현율",
  "임지현",
  "제갈지우",
  "조예나",
  "최동훈",
  "최민규",
  "최민서",
  "최효인",
  "허원형"
];

// bcrypt 설정
const saltRounds = 10;
const defaultPassword = "123456";

// 학생 데이터를 Firestore에 삽입
async function addStudentsToFirestore() {
  try {

    for (let i = 0; i < students.length; i++) {
      let email1 = ""
      if (i < 9) {
        email1 = `150${i+1}`
      } else {
        email1 = `15${i+1}`
      }
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
      
      await addDoc(collection(db, "users"), {
        classNum: '5',                // 반 (숫자)
        grade: '1',                   // 학년 (숫자)
        dinnerApplied: false,         // boolean
        dinnerApproved: false,        // boolean
        dinnerUsed: false,            // boolean
        email: email1,           // string
        role: "student",             // string
        updatedAt: serverTimestamp(), // timestamp
        name: students[i],           // string
        lastUsedDate: '2025-04-18',  // string
        password: hashedPassword      // 해싱된 비밀번호
      });
    }
    console.log("학생 데이터가 Firestore에 성공적으로 삽입되었습니다.");
  } catch (error) {
    console.error("데이터 삽입 중 오류 발생:", error);
  }
}

// 함수 실행
addStudentsToFirestore();