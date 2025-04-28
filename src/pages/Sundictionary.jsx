import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../sch.css";

const Sundictionary = () => {
  const [words, setWords] = useState([]); // 단어 목록
  const [newWord, setNewWord] = useState(""); // 새 단어 입력
  const [newMeaning, setNewMeaning] = useState(""); // 새 뜻 입력
  const [searchTerm, setSearchTerm] = useState(""); // 검색어
  const [selectedWord, setSelectedWord] = useState(null); // 선택된 단어
  const [newComment, setNewComment] = useState(""); // 새 댓글 입력
  const wordsCollection = collection(db, "words"); // Firestore 컬렉션 참조

  // Firestore에서 데이터 가져오기
  const fetchWords = async () => {
    const data = await getDocs(wordsCollection);
    setWords(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  };

  // Firestore에 단어 추가
  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    await addDoc(wordsCollection, { word: newWord.trim(), meaning: newMeaning.trim(), comments: [] });
    setNewWord("");
    setNewMeaning("");
    fetchWords();
  };

  // Firestore에서 단어 수정
  const handleEditWord = async (id, updatedWord, updatedMeaning) => {
    const wordDoc = doc(db, "words", id);
    await updateDoc(wordDoc, { word: updatedWord, meaning: updatedMeaning });
    setSelectedWord(null);
    fetchWords();
  };

  // Firestore에서 단어 삭제
  const handleDeleteWord = async (id) => {
    const wordDoc = doc(db, "words", id);
    await deleteDoc(wordDoc);
    setSelectedWord(null);
    fetchWords();
  };

  // Firestore에 댓글 추가
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedWord) return;
    const wordDoc = doc(db, "words", selectedWord.id);
    const updatedComments = [...(selectedWord.comments || []), newComment];
    await updateDoc(wordDoc, { comments: updatedComments }); // Firestore에 댓글 업데이트
    setNewComment(""); // 댓글 입력 필드 초기화
    setSelectedWord((prev) => ({
      ...prev,
      comments: updatedComments, // UI 즉시 업데이트
    }));
    fetchWords(); // Firestore 데이터 갱신
  };

  // 검색 필터
  const filteredWords = words.filter((item) =>
    item.word?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 컴포넌트 마운트 시 Firestore 데이터 로드
  useEffect(() => {
    fetchWords();
  }, []);

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
          className="search-input"
        />
      </div>

      {/* 단어 추가 섹션 */}
      <div className="add-word-section card">
        <input
          type="text"
          placeholder="새 단어 입력"
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
          <div
            key={item.id}
            className={`word-item card ${selectedWord?.id === item.id ? "selected" : ""}`}
            onClick={() => setSelectedWord(item)}
          >
            <strong>{item.word}</strong>: {item.meaning}
          </div>
        ))}
      </div>

      {/* 선택된 단어 상세보기 */}
      {selectedWord && (
        <div className="word-detail card">
          <h2>{selectedWord.word}</h2>
          <p>{selectedWord.meaning}</p>

          {/* 수정/삭제 버튼 */}
          <div className="action-buttons">
            <button
              className="edit-button"
              onClick={() =>
                handleEditWord(
                  selectedWord.id,
                  prompt("새 단어:", selectedWord.word) || selectedWord.word,
                  prompt("새 뜻:", selectedWord.meaning) || selectedWord.meaning
                )
              }
            >
              수정
            </button>
            <button
              className="delete-button"
              onClick={() => handleDeleteWord(selectedWord.id)}
            >
              삭제
            </button>
          </div>

          {/* 댓글 섹션 */}
          <div className="comments-section">
            <h3>댓글</h3>
            {selectedWord.comments?.length > 0 ? (
              selectedWord.comments.map((comment, index) => <p key={index}>- {comment}</p>)
            ) : (
              <p>댓글이 없습니다.</p>
            )}
            <div className="add-comment">
              <input
                type="text"
                placeholder="댓글 추가"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input-field"
              />
              <button onClick={handleAddComment} className="add-button">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sundictionary;
