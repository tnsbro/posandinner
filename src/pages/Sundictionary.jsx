import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../sch.css";

const Sundictionary = ({ currentUser }) => {
  const [words, setWords] = useState([]); // 단어 목록
  const [newWord, setNewWord] = useState(""); // 새 단어 입력
  const [newMeaning, setNewMeaning] = useState(""); // 새 뜻 입력
  const [searchTerm, setSearchTerm] = useState(""); // 검색어
  const [expandedWordId, setExpandedWordId] = useState(null); // 클릭된 단어 ID
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
    await addDoc(wordsCollection, {
      word: newWord.trim(),
      meaning: newMeaning.trim(),
      comments: [],
    });
    setNewWord("");
    setNewMeaning("");
    fetchWords();
  };

  // Firestore에서 댓글 추가
  const handleAddComment = async (wordId) => {
    if (!newComment.trim()) return;
    const wordDoc = doc(db, "words", wordId);
    const targetWord = words.find((word) => word.id === wordId);
    const updatedComments = [
      ...(targetWord.comments || []),
      { text: newComment, user: currentUser, id: Date.now().toString() },
    ];
    await updateDoc(wordDoc, { comments: updatedComments });
    setNewComment("");
    fetchWords();
  };

  // Firestore에서 댓글 수정
  const handleEditComment = async (wordId, commentId, newText) => {
    if (!newText?.trim()) return;
    const wordDoc = doc(db, "words", wordId);
    const targetWord = words.find((word) => word.id === wordId);
    const updatedComments = targetWord.comments.map((comment) =>
      comment.id === commentId ? { ...comment, text: newText } : comment
    );
    await updateDoc(wordDoc, { comments: updatedComments });
    fetchWords();
  };

  // Firestore에서 댓글 삭제
  const handleDeleteComment = async (wordId, commentId) => {
    const wordDoc = doc(db, "words", wordId);
    const targetWord = words.find((word) => word.id === wordId);
    const updatedComments = targetWord.comments.filter((comment) => comment.id !== commentId);
    await updateDoc(wordDoc, { comments: updatedComments });
    fetchWords();
  };

  // Firestore에서 단어 삭제
  const handleDeleteWord = async (id) => {
    const wordDoc = doc(db, "words", id);
    await deleteDoc(wordDoc);
    fetchWords();
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
          <div key={item.id} className="word-item card">
            <div onClick={() => setExpandedWordId(item.id === expandedWordId ? null : item.id)}>
              <strong>{item.word}</strong>
            </div>
            {expandedWordId === item.id && (
              <div className="word-detail">
                <p>{item.meaning}</p>

                {/* 댓글 섹션 */}
                <div className="comments-section">
                  <h3>댓글</h3>
                  {item.comments?.length > 0 ? (
                    item.comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <p>
                          <strong>{comment.user}</strong>: {comment.text}
                        </p>
                        {comment.user === currentUser && (
                          <div className="comment-actions">
                            <button
                              className="edit-button"
                              onClick={() => {
                                const newText = prompt("댓글 수정:", comment.text);
                                if (newText) handleEditComment(item.id, comment.id, newText);
                              }}
                            >
                              수정
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteComment(item.id, comment.id)}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    ))
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
                    <button onClick={() => handleAddComment(item.id)} className="add-button">
                      추가
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sundictionary;
