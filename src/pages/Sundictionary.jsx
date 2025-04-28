import React, { useState } from "react";
import "./Sundictionary.css"; // 이미 존재하는 CSS를 활용하거나 새롭게 정의

const Sundictionary = ({ userId }) => {
  // 단어 목록 상태 관리
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");

  // 단어 추가 핸들러
  const handleAddWord = () => {
    if (newWord.trim() && newMeaning.trim()) {
      setWords([...words, { word: newWord, meaning: newMeaning }]);
      setNewWord("");
      setNewMeaning("");
    }
  };

  // 특정 ID만 접근 허용
  if (!["3312", "3404"].includes(userId?.toString())) {
    return <div>접근 권한이 없습니다.</div>;
  }

  return (
    <div className="dictionary-container">
      <h1>순형 재윤 은어대사전</h1>
      <div className="add-word-section">
        <input
          type="text"
          placeholder="단어 입력"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
        />
        <input
          type="text"
          placeholder="뜻 입력"
          value={newMeaning}
          onChange={(e) => setNewMeaning(e.target.value)}
        />
        <button onClick={handleAddWord}>추가</button>
      </div>
      <div className="word-list">
        {words.map((item, index) => (
          <div key={index} className="word-item">
            <strong>{item.word}</strong>: {item.meaning}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sundictionary;
