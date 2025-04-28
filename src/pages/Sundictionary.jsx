import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../sch.css";

const Sundictionary = () => {
  // State variables
  const [words, setWords] = useState([]); // List of words from Firestore
  const [newWord, setNewWord] = useState(""); // New word input
  const [newMeaning, setNewMeaning] = useState(""); // New meaning input
  const [searchTerm, setSearchTerm] = useState(""); // Search keyword
  const [editIndex, setEditIndex] = useState(null); // ID of the word being edited
  const [editWord, setEditWord] = useState(""); // Edited word
  const [editMeaning, setEditMeaning] = useState(""); // Edited meaning

  // Reference to Firestore collection
  const wordsCollection = collection(db, "words");

  // Fetch words from Firestore
  const fetchWords = async () => {
    try {
      const data = await getDocs(wordsCollection);
      setWords(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("Error fetching words:", error);
    }
  };

  // Add a new word to Firestore
  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    try {
      await addDoc(wordsCollection, { word: newWord.trim(), meaning: newMeaning.trim() });
      setNewWord("");
      setNewMeaning("");
      fetchWords();
    } catch (error) {
      console.error("Error adding word:", error);
    }
  };

  // Update an existing word in Firestore
  const handleEditWord = async () => {
    if (!editWord.trim() || !editMeaning.trim()) return;
    try {
      const wordDoc = doc(db, "words", editIndex);
      await updateDoc(wordDoc, { word: editWord.trim(), meaning: editMeaning.trim() });
      setEditIndex(null);
      setEditWord("");
      setEditMeaning("");
      fetchWords();
    } catch (error) {
      console.error("Error updating word:", error);
    }
  };

  // Delete a word from Firestore
  const handleDeleteWord = async (id) => {
    try {
      const wordDoc = doc(db, "words", id);
      await deleteDoc(wordDoc);
      fetchWords();
    } catch (error) {
      console.error("Error deleting word:", error);
    }
  };

  // Filter words based on the search term
  const filteredWords = words.filter((item) =>
    item.word?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch words when the component mounts
  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <div className="dictionary-container">
      <h1 className="dictionary-title">재윤 순형 은어 대사전</h1>

      {/* Search Section */}
      <div className="search-section">
        <input
          type="text"
          placeholder="단어 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input search-input"
        />
      </div>

      {/* Add Word Section */}
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

      {/* Word List Section */}
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
              <div className="word-display">
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sundictionary;
