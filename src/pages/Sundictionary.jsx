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
  const [editingWordId, setEditingWordId] = useState(null);
  const [editedWord, setEditedWord] = useState("");
  const [editedMeaning, setEditedMeaning] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedComment, setEditedComment] = useState("");

  const wordsCollection = collection(db, "words");

  const getDisplayName = (user) => {
    if (!user) return "익명";
    const id = user.uid || user;
    if (id === "3312") return "정재윤";
    if (id === "3404") return "박순형";
    if (id === "3610") return "양원진";
    return "익명";
  };

  const fetchWords = async () => {
    try {
      const data = await getDocs(wordsCollection);
      setWords(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("단어 목록 가져오기 오류:", error);
    }
  };

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
      console.error("단어 추가 오류:", error);
    }
  };

  const handleEditWord = (word) => {
    setEditingWordId(word.id);
    setEditedWord(word.word);
    setEditedMeaning(word.meaning);
  };

  const handleSaveEdit = async (id) => {
    const wordDoc = doc(db, "words", id);
    try {
      await updateDoc(wordDoc, {
        word: editedWord,
        meaning: editedMeaning,
      });
      setEditingWordId(null);
      fetchWords();
    } catch (error) {
      console.error("단어 수정 오류:", error);
    }
  };

  const handleAddComment = async (wordId) => {
    if (!newComment.trim()) {
      alert("댓글을 입력해주세요.");
      return;
    }
    const wordDoc = doc(db, "words", wordId);
    const displayName = getDisplayName(currentUser);

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
          user: displayName,
          id: Date.now().toString(),
        },
      ];

      await updateDoc(wordDoc, { comments: updatedComments });
      setNewComment("");
      fetchWords();
    } catch (error) {
      console.error("댓글 추가 오류:", error);
    }
  };

  const handleEditComment = async (wordId, commentId) => {
    const wordDoc = doc(db, "words", wordId);
    
    if (!editedComment.trim()) {
      alert("수정할 댓글을 입력하세요.");
      return;
    }

    try {
      const docSnapshot = await getDoc(wordDoc);
      if (!docSnapshot.exists()) {
        alert("단어를 찾을 수 없습니다.");
        return;
      }
      const targetWord = docSnapshot.data();
      const updatedComments = targetWord.comments.map((comment) =>
        comment.id === commentId ? { ...comment, text: editedComment } : comment
      );

      await updateDoc(wordDoc, { comments: updatedComments });
      setEditingCommentId(null);
      setEditedComment("");
      fetchWords();
    } catch (error) {
      console.error("댓글 수정 오류:", error);
    }
  };

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
      console.error("댓글 삭제 오류:", error);
    }
  };

  const handleDeleteWord = async (id) => {
    const wordDoc = doc(db, "words", id);

    try {
      await deleteDoc(wordDoc);
      fetchWords();
    } catch (error) {
      console.error("단어 삭제 오류:", error);
    }
  };

  const filteredWords = words.filter((item) =>
    item.word?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-md">
    <div className="dictionary-container">
      <h1 className="dictionary-title">재윤 순형 은어 대사전</h1>

      <div className="search-section">
        <input
          type="text"
          placeholder="단어 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

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

      <div className="word-list">
        {filteredWords.map((item) => (
          <div key={item.id} className="word-item card">
            {editingWordId === item.id ? (
              <>
                <input
                  type="text"
                  value={editedWord}
                  onChange={(e) => setEditedWord(e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  value={editedMeaning}
                  onChange={(e) => setEditedMeaning(e.target.value)}
                  className="input-field"
                />
                <button onClick={() => handleSaveEdit(item.id)} className="save-button">저장</button>
              </>
            ) : (
              <>
                <div
                  onClick={() => setExpandedWordId(item.id === expandedWordId ? null : item.id)}
                  className="word-header"
                >
                  <strong>{item.word}</strong>
                </div>

                {expandedWordId === item.id && (
                  <div className="word-detail">
                    <p>{item.meaning}</p>

                    <div className="button-group">
                      <button onClick={() => handleEditWord(item)} className="edit-button">수정</button>
                      <button onClick={() => handleDeleteWord(item.id)} className="delete-button">삭제</button>
                    </div>

                    <div className="comment-section">
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
                      <ul className="comment-list">
                        {item.comments?.map((comment) => (
                          <li key={comment.id}>
                            {editingCommentId === comment.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editedComment}
                                  onChange={(e) => setEditedComment(e.target.value)}
                                  className="input-field"
                                />
                                <button onClick={() => handleEditComment(item.id, comment.id)} className="save-button">저장</button>
                              </>
                            ) : (
                              <>
                                <strong>{comment.user}:</strong> {comment.text}
                                <button onClick={() => setEditingCommentId(comment.id)} className="edit-comment-button">수정</button>
                                <button onClick={() => handleDeleteComment(item.id, comment.id)} className="delete-comment-button">삭제</button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
};

export default Sundictionary;
