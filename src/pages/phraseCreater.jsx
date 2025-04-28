import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { db } from "../firebaseConfig";
import useDataExist from "./isDataExist";

function PhraseCreater() {
  const [num, setNum] = useState(0);
  const [sch, setSch] = useState('');
  const [target, setTarget] = useState('');
  const [su, setSu] = useState('');
  const navigate = useNavigate();

  useDataExist();

  const one = async (sch, target) => {
    if (target === '') {
      try {
        // "users" 컬렉션의 모든 문서 가져오기
        const usersCollection = collection(db, "users");
        const userDocs = await getDocs(usersCollection);

        // 각 문서의 phrase 필드를 업데이트
        for (const userDoc of userDocs.docs) {
          if (userDoc.data().phrase !== undefined) {
            try {
              await updateDoc(doc(db, "users", userDoc.id), {
                phrase: sch,
              });
              // Increment count after each successful update
              setNum(prev => prev + 1);
            } catch (error) {
              console.error(`Error updating document ${userDoc.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    } else {
      try {
        const targetArray = target.split(" ");
        const usersCollection = collection(db, "users");

        for (const targets of targetArray) {
          const q = query(usersCollection, where("email", "==", targets));
          const querySnapshot = await getDocs(q);

          // 쿼리 결과를 순회하며 업데이트
          for (const docSnapshot of querySnapshot.docs) {
            try {
              await updateDoc(doc(db, "users", docSnapshot.id), {
                phrase: sch,
              });
              // Increment count after each successful update
              setNum(prev => prev + 1);
            } catch (error) {
              console.error(`Error updating document ${docSnapshot.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error processing target users:", error);
      }
    }
  };

  const createrPhrase = async () => {
    await one(sch, target);
    setSu(true);
  };

  return (
    <div className="container-center">
      <div>
        <h1 className="text-center text-bold mb-4">순형 하트 재윤</h1>
      </div>
      <div className="card">
        <h2 className="text-center text-bold mb-4">문구 생성기</h2>
        <input
          id="target"
          name="target"
          className="input mb-4"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="예) 3404 3412 띄어쓰기로 구분"
        />
        <input
          id="sch"
          name="sch"
          className="input mb-4"
          value={sch}
          onChange={(e) => setSch(e.target.value)}
        />
        <button onClick={createrPhrase} className="button button-primary">GO</button>
        <br />
        현재 적용된 문서 개수 : {num}
        {su && <p className="text-center text-gray">문구 생성 완료</p>}
        <div className="button-group">
          <button
            onClick={() => { navigate('/') }}
            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
          >
            홈
          </button>
          <button
            onClick={() => { navigate('/sundictionary') }} // 사전으로 이동하는 버튼
            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded ml-2"
          >
            사전으로
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhraseCreater;
