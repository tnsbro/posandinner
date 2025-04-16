// src/pages/AdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../sch.css'

function AdminPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]); // 학생 목록 상태
    const [loading, setLoading] = useState(true); // 데이터 로딩 상태
    const [error, setError] = useState('');     // 오류 메시지 상태
    const [filterApplied, setFilterApplied] = useState(false); // 신청자 필터링 상태
    const [searchTerm, setSearchTerm] = useState(''); // 검색어 상태

    // Firestore에서 학생 목록 가져오기
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const usersRef = collection(db, "users");
            // 역할이 'student'인 사용자만 쿼리
            const q = query(usersRef, where("role", "==", "student"));
            const querySnapshot = await getDocs(q);
            const studentList = querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
             // 이름순 정렬 (선택 사항)
             studentList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setStudents(studentList);
        } catch (err) {
            console.error("학생 목록 가져오기 오류:", err);
            setError("학생 목록을 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    // 컴포넌트 마운트 시 학생 목록 가져오기
    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // 학생 석식 승인 상태 업데이트 함수
    const handleApprovalChange = async (studentUid, currentApprovalStatus) => {
        console.log(`승인 상태 변경 시도: UID=${studentUid}, 현재=${currentApprovalStatus}`);
        const newApprovalStatus = !currentApprovalStatus; // 상태 반전
        const studentDocRef = doc(db, "users", studentUid);
        try {
            await updateDoc(studentDocRef, {
                dinnerApproved: newApprovalStatus // Firestore 문서 업데이트
            });
            console.log("승인 상태 업데이트 성공");
            // 로컬 상태 업데이트하여 즉시 반영
            setStudents(prevStudents =>
                prevStudents.map(student =>
                    student.uid === studentUid
                        ? { ...student, dinnerApproved: newApprovalStatus }
                        : student
                )
            );
            setError(''); // 성공 시 이전 오류 메시지 제거
        } catch (err) {
            console.error("승인 상태 업데이트 오류:", err);
            setError(`오류: ${studentUid} 학생의 승인 상태 변경 실패.`);
        }
    };

    // 전체 승인/반려 함수
    const handleBulkAction = async (approveAction) => {
        const confirmMessage = approveAction
            ? "정말 모든 '신청함' 상태의 학생들을 승인 처리하시겠습니까?"
            : "정말 모든 학생들의 석식 승인을 취소하시겠습니까?";
        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        setError('');
        const batch = writeBatch(db);
        let actionCount = 0;

        students.forEach(student => {
            // 전체 승인: 신청했고 아직 승인 안 된 학생 대상
            if (approveAction && student.dinnerApplied && !student.dinnerApproved) {
                const studentDocRef = doc(db, "users", student.uid);
                batch.update(studentDocRef, { dinnerApproved: true });
                actionCount++;
            }
            // 전체 취소: 승인된 학생 대상
            else if (!approveAction && student.dinnerApproved) {
                const studentDocRef = doc(db, "users", student.uid);
                batch.update(studentDocRef, { dinnerApproved: false });
                actionCount++;
            }
        });

        if (actionCount === 0) {
             setError("처리할 대상 학생이 없습니다.");
             setLoading(false);
             return;
        }

        try {
            await batch.commit();
            console.log(`일괄 처리 완료: ${actionCount}명 상태 변경 (${approveAction ? '승인' : '취소'})`);
            // 변경 사항 반영 위해 학생 목록 다시 불러오기
            await fetchStudents();
        } catch (err) {
            console.error("일괄 처리 오류:", err);
            setError("일괄 처리 중 오류가 발생했습니다.");
            setLoading(false);
        }
    };


    // 로그아웃 처리
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("로그아웃 오류:", error);
            setError('로그아웃 실패');
        }
    };

     // 필터링된 학생 목록 계산
     const filteredStudents = students.filter(student => {
        const matchesFilter = !filterApplied || student.dinnerApplied; // 필터링 적용 또는 전체
        const matchesSearch = !searchTerm || // 검색어 없거나
                              (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase())) || // 이름 검색
                              (student.grade && student.classNum && `${student.grade}-${student.classNum}`.includes(searchTerm)); // 학년-반 검색
        return matchesFilter && matchesSearch;
    });


    return (
        <div className="container mx-auto p-4">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">관리자 페이지</h1>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded">
                    로그아웃
                </button>
            </div>

            {error && <p className="mb-4 text-red-600 bg-red-100 p-2 rounded">{error}</p>}

             {/* 필터 및 검색 영역 */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                 <div className="flex-grow">
                     <label htmlFor="search" className="sr-only">학생 검색</label>
                     <input
                         type="text"
                         id="search"
                         placeholder="이름 또는 학년-반 검색..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                     />
                 </div>
                 <div className="flex items-center space-x-2">
                     <input
                         type="checkbox"
                         id="filterApplied"
                         checked={filterApplied}
                         onChange={(e) => setFilterApplied(e.target.checked)}
                         className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                     />
                     <label htmlFor="filterApplied" className="text-sm font-medium text-gray-700">
                         석식 신청자만 보기
                     </label>
                 </div>
                 <div className="flex items-center space-x-2">
                     <button onClick={() => handleBulkAction(true)} disabled={loading}
                         className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50">
                         신청자 전체 승인
                     </button>
                      <button onClick={() => handleBulkAction(false)} disabled={loading}
                         className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50">
                         전체 승인 취소
                     </button>
                 </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500">학생 목록 로딩 중...</p>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학년/반</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청 여부</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">승인 여부</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">승인 변경</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                <tr key={student.uid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{student.name || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.grade || '?'}-{student.classNum || '?'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            student.dinnerApplied ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {student.dinnerApplied ? '신청함' : '신청안함'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            student.dinnerApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {student.dinnerApproved ? '승인됨' : '미승인'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                        {/* 승인 상태 변경 버튼/토글 */}
                                        <button
                                            onClick={() => handleApprovalChange(student.uid, student.dinnerApproved)}
                                            disabled={!student.dinnerApplied} // 신청 안 한 학생은 변경 불가
                                            className={`px-3 py-1 text-xs rounded ${
                                                !student.dinnerApplied
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    : student.dinnerApproved
                                                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                            }`}
                                        >
                                            {student.dinnerApproved ? '승인 취소' : '승인하기'}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">
                                        {students.length === 0 ? '등록된 학생 정보가 없습니다.' : '검색/필터 결과가 없습니다.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminPage;
