import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../sch.css";

const Sundictionary = ({ currentUser }) => {
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedWordId, setExpandedWordId] = useState(null);
  const [newComment, setNewComment] = useState("");
  const wordsCollection = collection(db, "words");

  // Firestore에서 단어 가져오기
  const fetchWords = async () => {
    try {
      const data = await getDocs(wordsCollection);
      setWords(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("단어 목록을 가져오는 중 오류 발생:", error);
    }
  };

  // Firestore에 단어 추가
  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) {
      alert("단어와 뜻을 입력해주세요.");
      return;
    }
    try {
      await addDoc(wordsCollection, {
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        comments: [],
      });
      setNewWord("");
      setNewMeaning("");
      fetchWords();
    } catch (error) {
      console.error("단어 추가 중 오류 발생:", error);
    }
  };

  // Firestore에 댓글 추가
  const handleAddComment = async (wordId) => {
    if (!newComment.trim()) {
      alert("댓글을 입력해주세요.");
      return;
    }
    const wordDoc = doc(db, "words", wordId);

    try {
      const docSnapshot = await getDoc(wordDoc);
      if (!docSnapshot.exists()) {
        alert("단어를 찾을 수 없습니다.");
        return;
      }

      const targetWord = docSnapshot.data();
      const updatedComments = [
        ...(targetWord.comments || []),
        { 
          text: newComment, 
          user: currentUser || "익명", 
          id: Date.now().toString() 
        },
      ];

      await updateDoc(wordDoc, { comments: updatedComments });
      setNewComment("");
      fetchWords();
    } catch (error) {
      console.error("댓글 추가 중 오류 발생:", error);
      alert("댓글 추가 중 문제가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // Firestore에서 댓글 수정
  const handleEditComment = async (wordId, commentId, newText) => {
    if (!newText?.trim()) {
      alert("수정할 댓글 내용을 입력해주세요.");
      return;
    }
    const wordDoc = doc(db, "words", wordId);

    try {
      const docSnapshot = await getDoc(wordDoc);
      if (!docSnapshot.exists()) {
        alert("단어를 찾을 수 없습니다.");
        return;
      }

      const targetWord = docSnapshot.data();
      const updatedComments = targetWord.comments.map((comment) =>
        comment.id === commentId ? { ...comment, text: newText } : comment
      );

      await updateDoc(wordDoc, { comments: updatedComments });
      fetchWords();
    } catch (error) {
      console.error("댓글 수정 중 오류 발생:", error);
      alert("댓글 수정 중 문제가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // Firestore에서 댓글 삭제
  const handleDeleteComment = async (wordId, commentId) => {
    const wordDoc = doc(db, "words", wordId);

    try {
      const docSnapshot = await getDoc(wordDoc);
      if (!docSnapshot.exists()) {
        alert("단어를 찾을 수 없습니다.");
        return;
      }

      const targetWord = docSnapshot.data();
      const updatedComments = targetWord.comments.filter((comment) => comment.id !== commentId);

      await updateDoc(wordDoc, { comments: updatedComments });
      fetchWords();
    } catch (error) {
      console.error("댓글 삭제 중 오류 발생:", error);
      alert("댓글 삭제 중 문제가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // Firestore에서 단어 삭제
  const handleDeleteWord = async (id) => {
    const wordDoc = doc(db, "words", id);

    try {
      await deleteDoc(wordDoc);
      fetchWords();
    } catch (error) {
      console.error("단어 삭제 중 오류 발생:", error);
      alert("단어 삭제 중 문제가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // 검색어 필터링
  const filteredWords = words.filter((item) =>
    item.word?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 첫 마운트 때 데이터 가져오기
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
            <div 
              onClick={() => setExpandedWordId(item.id === expandedWordId ? null : item.id)}
              className="word-header"
            >
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
                        {/* 댓글 수정/삭제 버튼 */}
                        <div className="comment-actions">
                          <button
                            onClick={() => {
                              const newText = prompt("수정할 댓글 내용을 입력하세요.", comment.text);
                              if (newText !== null) {
                                handleEditComment(item.id, comment.id, newText);
                              }
                            }}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("댓글을 삭제하시겠습니까?")) {
                                handleDeleteComment(item.id, comment.id);
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>댓글이 없습니다.</p>
                  )}

                  {/* 새 댓글 입력 */}
                  <div className="add-comment-section">
                    <input
                      type="text"
                      placeholder="댓글 입력"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-field"
                    />
                    <button onClick={() => handleAddComment(item.id)} className="add-button">
                      댓글 추가
                    </button>
                  </div>
                </div>

                {/* 단어 삭제 버튼 */}
                <button
                  onClick={() => {
                    if (window.confirm("이 단어를 삭제하시겠습니까?")) {
                      handleDeleteWord(item.id);
                    }
                  }}
                  className="delete-button"
                >
                  단어 삭제
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sundictionary;
