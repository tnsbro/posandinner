import React, { useState } from "react";
import "../sch.css"; // 사전 스타일을 sch.css에서 가져오기

const Sundictionary = ({ userId }) => {
  // 단어 목록 상태 관리
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editWord, setEditWord] = useState("");
  const [editMeaning, setEditMeaning] = useState("");

  // 단어 추가 핸들러
  const handleAddWord = () => {
    if (newWord.trim() && newMeaning.trim()) {
      setWords([...words, { word: newWord.trim(), meaning: newMeaning.trim() }]);
      setNewWord("");
      setNewMeaning("");
    }
  };

  // 단어 수정 핸들러
  const handleEditWord = (index) => {
    setEditIndex(index);
    setEditWord(words[index].word);
    setEditMeaning(words[index].meaning);
  };

  // 단어 저장 핸들러
  const handleSaveEdit = () => {
    const updatedWords = [...words];
    updatedWords[editIndex] = { word: editWord.trim(), meaning: editMeaning.trim() };
    setWords(updatedWords);
    setEditIndex(null);
    setEditWord("");
    setEditMeaning("");
  };

  // 단어 삭제 핸들러
  const handleDeleteWord = (index) => {
    setWords(words.filter((_, i) => i !== index));
  };

  // 단어 검색 필터
  const filteredWords = words.filter((item) =>
    item.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 특정 ID만 접근 허용
  if (!["3312", "3404"].includes(userId?.toString())) {
    return <div className="error-message">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="dictionary-container">
      <h1 className="dictionary-title">재윤 순형 은어 대사전</h1>

      {/* 검색 입력 필드 */}
      <div className="search-section">
        <input
          type="text"
          placeholder="단어 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input search-input"
        />
      </div>

      {/* 단어 추가 필드 */}
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
        {filteredWords.map((item, index) => (
          <div key={index} className="word-item">
            {editIndex === index ? (
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
                <button onClick={handleSaveEdit} className="save-button">
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
                  <button onClick={() => handleEditWord(index)} className="edit-button">
                    수정
                  </button>
                  <button onClick={() => handleDeleteWord(index)} className="delete-button">
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
