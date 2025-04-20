import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";
import { useState } from "react";
import { db } from "../firebaseConfig";

async function one(phrase) {
  try {
    // "users" 컬렉션의 모든 문서 가져오기
    const usersCollection = collection(db, "users");
    const userDocs = await getDocs(usersCollection);

    // 각 문서의 password 필드를 passwordHash로 변경하고 password 삭제
    for (const userDoc of userDocs.docs) {
      const userData = userDoc.data();
      
      // password 필드가 존재하는 경우에만 업데이트
      await updateDoc(doc(db, "users", userDoc.id), {
        phrase : phrase
      });
    }
  } catch (error) {
    console.error("필드 이름 변경 중 오류 발생:", error);
  }
}

function PhraseCreater() {
    const [sch, setSch] = useState('');
    const [su, setSu] = useState('');
    const createrPhrase = async () => {
        await one(sch);
        setSu(true)
    };
    return (
        <div className="container-center">
            <div>
                <h1 className="text-center text-bold mb-4">순형 하트 재윤</h1>
            </div>
            <div className="card">
                <h2 className="text-center text-bold mb-4">문구 생성기</h2>
                <input
                    id="sch"
                    name="sch"
                    className="input mb-4"
                    value={sch}
                    onChange={(e) => setSch(e.target.value)}
                />
                <button onClick={createrPhrase} className="button button-primary">GO</button>
                <br/>
                {su && <p className="text-center text-gray">문구 생성 완료</p>}
            </div>
        </div>
    );
}

export default PhraseCreater;