import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore 초기화 파일
import "../sch.css"; // 스타일 파일

const Sundictionary = () => {
  const [words, setWords] = useState([]); // 단어 목록
  const [newWord, setNewWord] = useState(""); // 새 단어 입력
  const [newMeaning, setNewMeaning] = useState(""); // 새 뜻 입력
  const [searchTerm, setSearchTerm] = useState(""); // 검색어
  const [editIndex, setEditIndex] = useState(null); // 수정 중인 단어 ID
  const [editWord, setEditWord] = useState(""); // 수정할 단어
  const [editMeaning, setEditMeaning] = useState(""); // 수정할 뜻

  const wordsCollection = collection(db, "words"); // Firestore 컬렉션 참조

  // Firestore에서 데이터 가져오기
  const fetchWords = async () => {
    const data = await getDocs(wordsCollection);
    setWords(
      data.docs.map((doc) => ({ ...doc.data(), id: doc.id })) // Firestore 데이터 매핑
    );
  };

  // Firestore에 단어 추가
  const handleAddWord = async () => {
    if (newWord.trim() && newMeaning.trim()) {
      await addDoc(wordsCollection, { word: newWord.trim(), meaning: newMeaning.trim() });
      setNewWord(""); // 입력 필드 초기화
      setNewMeaning("");
      fetchWords(); // 데이터 갱신
    }
  };

  // Firestore에서 단어 수정
  const handleEditWord = async () => {
    const wordDoc = doc(db, "words", editIndex);
    await updateDoc(wordDoc, { word: editWord.trim(), meaning: editMeaning.trim() });
    setEditIndex(null); // 수정 모드 종료
    setEditWord("");
    setEditMeaning("");
    fetchWords(); // 데이터 갱신
  };

  // Firestore에서 단어 삭제
  const handleDeleteWord = async (id) => {
    const wordDoc = doc(db, "words", id);
    await deleteDoc(wordDoc);
    fetchWords(); // 데이터 갱신
  };

  // Firestore에서 데이터 로드
  useEffect(() => {
    fetchWords();
  }, []);

  // 검색 필터
  const filteredWords = words.filter((item) =>
    item.word?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dictionary-container">
      <h1 className="dictionary-title">재윤 순형 은어 대사전</h1>

      {/* 검색 섹션 */}
      <div className="search-section">
        <input
          type="text"
          placeholder="단어 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input search-input"
        />
      </div>

      {/* 단어 추가 섹션 */}
      <div className="add-word-section">
        <input
          type="text"
          placeholder="단어 입력"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="뜻 입력"
          value={newMeaning}
          onChange={(e) => setNewMeaning(e.target.value)}
          className="input-field"
        />
        <button onClick={handleAddWord} className="add-button">
          추가
        </button>
      </div>

      {/* 단어 목록 */}
      <div className="word-list">
        {filteredWords.map((item) => (
          <div key={item.id} className="word-item">
            {editIndex === item.id ? (
              <div className="edit-section">
                <input
                  type="text"
                  value={editWord}
                  onChange={(e) => setEditWord(e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  className="input-field"
                />
                <button onClick={handleEditWord} className="save-button">
                  저장
                </button>
                <button onClick={() => setEditIndex(null)} className="cancel-button">
                  취소
                </button>
              </div>
            ) : (
              <>
                <strong>{item.word}</strong>: {item.meaning}
                <div className="action-buttons">
                  <button
                    onClick={() => {
                      setEditIndex(item.id);
                      setEditWord(item.word);
                      setEditMeaning(item.meaning);
                    }}
                    className="edit-button"
                  >
                    수정
                  </button>
                  <button onClick={() => handleDeleteWord(item.id)} className="delete-button">
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sundictionary;
