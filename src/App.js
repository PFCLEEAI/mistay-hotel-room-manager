import React, { useState, useEffect } from 'react';
import { Users, Home, LogOut, Download, Plus, Trash2, GripVertical, LayoutDashboard, ClipboardList, Tag, Bed, Droplet, Shirt, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Firebase 설정 (환경 변수에서 로드)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Firebase 초기화 여부 확인
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0;

const HotelRoomManager = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginCode, setLoginCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginMode, setLoginMode] = useState('worker'); // 'admin' or 'worker'
  const [firebaseError, setFirebaseError] = useState(null);
  
  // Data states
  const [workers, setWorkers] = useState([
    { id: 1, name: '김철수', code: 'HK8X2M' },
    { id: 2, name: '이영희', code: 'PQ7K9R' }
  ]);
  
  const [rooms, setRooms] = useState([
    // 시그니처
    { id: 1, number: '506' },
    { id: 2, number: '511' },
    { id: 3, number: '709' },
    { id: 4, number: '711' },
    { id: 5, number: '809' },
    { id: 6, number: '810' },
    { id: 7, number: '906' },
    { id: 8, number: '907' },
    { id: 9, number: '908' },
    { id: 10, number: '909' },
    { id: 11, number: '911' },
    { id: 12, number: '1006' },
    { id: 13, number: '1107' },
    { id: 14, number: '1206' },
    { id: 15, number: '1210' },
    { id: 16, number: '1211' },
    { id: 17, number: '1410' },
    { id: 18, number: '1510' },
    { id: 19, number: '1607' },
    { id: 20, number: '1609' },
    { id: 21, number: '1610' },
    { id: 22, number: '1611' },
    { id: 23, number: '1707' },
    { id: 24, number: '1709' },
    { id: 25, number: '1806' },
    { id: 26, number: '1810' },
    { id: 27, number: '1909' },
    // 프리미엄
    { id: 28, number: '718' },
    { id: 29, number: '816' },
    { id: 30, number: '1017' },
    { id: 31, number: '1217' },
    { id: 32, number: '1317' },
    { id: 33, number: '1416' },
    { id: 34, number: '1417' },
    { id: 35, number: '1616' },
    { id: 36, number: '1617' },
    { id: 37, number: '1618' },
    { id: 38, number: '1716' },
    { id: 39, number: '1717' },
    { id: 40, number: '1718' },
    { id: 41, number: '1916' },
    { id: 42, number: '1917' },
    // 스탠다드
    { id: 43, number: '1205' },
    { id: 44, number: '1413' },
    { id: 45, number: '1815' },
    { id: 46, number: '1904' },
    { id: 47, number: '1905' },
    { id: 48, number: '1912' },
    { id: 49, number: '1913' }
  ]);
  
  const [assignments, setAssignments] = useState([]);
  const [assignmentLogs, setAssignmentLogs] = useState([]);

  // Form states
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [logFilterDate, setLogFilterDate] = useState('');
  const [logFilterAction, setLogFilterAction] = useState('all');
  const [historyFilterDate, setHistoryFilterDate] = useState('');

  // UI states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [draggedRoom, setDraggedRoom] = useState(null);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editingWorkerCode, setEditingWorkerCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tag states
  const [availableTags, setAvailableTags] = useState([
    { id: 'bed', name: '침대추가', color: 'bg-purple-500', icon: 'Bed' },
    { id: 'bed-x2', name: '침대추가x2', color: 'bg-purple-600', icon: 'Bed' },
    { id: 'water', name: '물', color: 'bg-blue-500', icon: 'Droplet' },
    { id: 'towel', name: '수건', color: 'bg-green-500', icon: 'Shirt' },
    { id: 'towel-x2', name: '수건x2', color: 'bg-green-600', icon: 'Shirt' },
    { id: 'towel-x4', name: '수건x4', color: 'bg-green-700', icon: 'Shirt' }
  ]);
  const [draggedTag, setDraggedTag] = useState(null);
  const [newCustomTag, setNewCustomTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  // Firebase 초기화 및 데이터 로드
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setFirebaseError('Firebase가 설정되지 않았습니다. 코드에서 Firebase 설정을 입력해주세요.');
      setIsLoading(false);
      return;
    }

    const initFirebase = () => {
      try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);

        // Auth 상태 확인
        onAuthStateChanged(auth, (user) => {
          if (user) {
            // 관리자로 로그인됨
            setCurrentUser({ role: 'admin', name: '관리자', email: user.email });
          }
        });

        // Workers 실시간 구독
        onSnapshot(collection(db, 'workers'), (snapshot) => {
          const workersData = snapshot.docs.map(doc => ({
            firestoreId: doc.id,
            ...doc.data()
          }));
          if (workersData.length > 0) {
            setWorkers(workersData);
          }
        });

        // Rooms 실시간 구독
        onSnapshot(collection(db, 'rooms'), (snapshot) => {
          const roomsData = snapshot.docs.map(doc => ({
            firestoreId: doc.id,
            ...doc.data()
          }));
          if (roomsData.length > 0) {
            setRooms(roomsData);
          }
        });

        // Assignments 실시간 구독
        onSnapshot(collection(db, 'assignments'), (snapshot) => {
          const assignmentsData = snapshot.docs.map(doc => ({
            firestoreId: doc.id,
            ...doc.data()
          }));
          setAssignments(assignmentsData);
        });

        // Assignment Logs 실시간 구독
        onSnapshot(collection(db, 'assignmentLogs'), (snapshot) => {
          const logsData = snapshot.docs.map(doc => ({
            firestoreId: doc.id,
            ...doc.data()
          }));
          setAssignmentLogs(logsData);
        });

        // Firebase 함수들을 window에 저장
        window.firebaseDB = db;
        window.firebaseAuth = auth;
        window.firebaseFunctions = { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, signInWithEmailAndPassword, signOut };

        setIsLoading(false);
      } catch (error) {
        console.error('Firebase 초기화 오류:', error);
        setFirebaseError('Firebase 연결에 실패했습니다: ' + error.message);
        setIsLoading(false);
      }
    };

    initFirebase();
  }, []);

  // Helper functions
  const generateWorkerCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (workers.some(w => w.code === code)) {
      return generateWorkerCode();
    }
    return code;
  };

  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.name : '알 수 없음';
  };

  const getRoomNumber = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.number : '알 수 없음';
  };

  const getAssignedRooms = (workerId, date) => {
    return assignments.filter(a => a.workerId === workerId && a.date === date);
  };

  const getUnassignedRooms = (date) => {
    const assignedRoomIds = assignments
      .filter(a => a.date === date)
      .map(a => a.roomId);
    return rooms.filter(r => !assignedRoomIds.includes(r.id));
  };

  // Logging helper function
  const logAssignmentAction = async (action, workerId, roomId, date, additionalInfo = {}) => {
    try {
      const { addDoc, collection } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const worker = workers.find(w => w.id === workerId);
      const room = rooms.find(r => r.id === roomId);

      const logEntry = {
        action, // 'assign', 'unassign', 'complete', 'uncomplete'
        workerId,
        workerName: worker ? worker.name : '알 수 없음',
        roomId,
        roomNumber: room ? room.number : '알 수 없음',
        date,
        timestamp: new Date().toISOString(),
        performedBy: currentUser ? currentUser.role : 'system',
        performedByName: currentUser ? (currentUser.role === 'admin' ? currentUser.email : currentUser.name) : 'system',
        ...additionalInfo
      };

      await addDoc(collection(db, 'assignmentLogs'), logEntry);
    } catch (error) {
      console.error('로그 기록 오류:', error);
      // Don't alert the user for logging errors to avoid disrupting the main flow
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, roomId) => {
    setDraggedRoom(roomId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnWorker = async (e, workerId) => {
    e.preventDefault();
    if (!draggedRoom) return;

    const existingAssignment = assignments.find(
      a => a.roomId === draggedRoom && a.workerId === workerId && a.date === dashboardDate
    );

    if (existingAssignment) {
      setDraggedRoom(null);
      return;
    }

    try {
      const { addDoc, deleteDoc, doc, collection } = window.firebaseFunctions;
      const db = window.firebaseDB;

      // Remove existing assignment
      const oldAssignment = assignments.find(
        a => a.roomId === draggedRoom && a.date === dashboardDate
      );
      if (oldAssignment && oldAssignment.firestoreId) {
        await deleteDoc(doc(db, 'assignments', oldAssignment.firestoreId));
        // Log unassignment
        await logAssignmentAction('unassign', oldAssignment.workerId, draggedRoom, dashboardDate, {
          reason: 'reassignment'
        });
      }

      // Add new assignment
      const newAssignment = {
        id: Date.now(),
        workerId,
        roomId: draggedRoom,
        date: dashboardDate,
        completed: false,
        assignedAt: new Date().toISOString(),
        assignedBy: currentUser ? (currentUser.role === 'admin' ? currentUser.email : currentUser.name) : 'system',
        assignedByRole: currentUser ? currentUser.role : 'system'
      };

      await addDoc(collection(db, 'assignments'), newAssignment);

      // Log assignment
      await logAssignmentAction('assign', workerId, draggedRoom, dashboardDate, {
        method: 'drag_and_drop'
      });
    } catch (error) {
      console.error('배정 오류:', error);
      alert('배정 중 오류가 발생했습니다.');
    }

    setDraggedRoom(null);
  };

  const handleDropOnUnassigned = async (e) => {
    e.preventDefault();
    if (!draggedRoom) return;

    try {
      const { deleteDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const oldAssignment = assignments.find(
        a => a.roomId === draggedRoom && a.date === dashboardDate
      );

      if (oldAssignment && oldAssignment.firestoreId) {
        await deleteDoc(doc(db, 'assignments', oldAssignment.firestoreId));

        // Log unassignment
        await logAssignmentAction('unassign', oldAssignment.workerId, draggedRoom, dashboardDate, {
          method: 'drag_to_unassigned'
        });
      }
    } catch (error) {
      console.error('배정 해제 오류:', error);
      alert('배정 해제 중 오류가 발생했습니다.');
    }

    setDraggedRoom(null);
  };

  const removeRoomAssignment = async (roomId, date) => {
    try {
      const { deleteDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const assignment = assignments.find(
        a => a.roomId === roomId && a.date === date
      );

      if (assignment && assignment.firestoreId) {
        await deleteDoc(doc(db, 'assignments', assignment.firestoreId));

        // Log unassignment
        await logAssignmentAction('unassign', assignment.workerId, roomId, date, {
          method: 'manual_removal'
        });
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // Login handlers
  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) {
      alert('이메일과 비밀번호를 입력해주세요');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { signInWithEmailAndPassword } = window.firebaseFunctions;
      const auth = window.firebaseAuth;
      
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setCurrentUser({ role: 'admin', name: '관리자', email: userCredential.user.email });
      setAdminEmail('');
      setAdminPassword('');
    } catch (error) {
      console.error('로그인 오류:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        alert('이메일 또는 비밀번호가 올바르지 않습니다');
      } else if (error.code === 'auth/invalid-email') {
        alert('올바른 이메일 형식이 아닙니다');
      } else {
        alert('로그인 중 오류가 발생했습니다: ' + error.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleWorkerLogin = () => {
    const worker = workers.find(w => w.code === loginCode);
    if (worker) {
      setCurrentUser({ role: 'worker', ...worker });
      setLoginCode('');
    } else {
      alert('잘못된 로그인 코드입니다');
    }
  };

  const handleLogout = async () => {
    if (currentUser.role === 'admin') {
      try {
        const { signOut } = window.firebaseFunctions;
        const auth = window.firebaseAuth;
        await signOut(auth);
      } catch (error) {
        console.error('로그아웃 오류:', error);
      }
    }
    setCurrentUser(null);
  };

  // Admin functions
  const addWorker = async () => {
    if (!newWorkerName.trim()) return;
    
    const newWorker = {
      id: workers.length > 0 ? Math.max(...workers.map(w => w.id)) + 1 : 1,
      name: newWorkerName,
      code: generateWorkerCode()
    };
    
    try {
      const { addDoc, collection } = window.firebaseFunctions;
      const db = window.firebaseDB;
      await addDoc(collection(db, 'workers'), newWorker);
      alert(`직원이 추가되었습니다! 로그인 코드: ${newWorker.code}`);
      setNewWorkerName('');
      setShowAddWorker(false);
    } catch (error) {
      console.error('직원 추가 오류:', error);
      alert('직원 추가 중 오류가 발생했습니다.');
    }
  };

  const deleteWorker = async (worker) => {
    if (!window.confirm('이 직원을 삭제하시겠습니까?')) return;

    try {
      const { deleteDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      if (worker.firestoreId) {
        await deleteDoc(doc(db, 'workers', worker.firestoreId));
      }

      // Delete associated assignments
      const assignmentsToDelete = assignments.filter(a => a.workerId === worker.id);
      for (const assignment of assignmentsToDelete) {
        if (assignment.firestoreId) {
          await deleteDoc(doc(db, 'assignments', assignment.firestoreId));
        }
      }
    } catch (error) {
      console.error('직원 삭제 오류:', error);
      alert('직원 삭제 중 오류가 발생했습니다.');
    }
  };

  const startEditingCode = (worker) => {
    setEditingWorkerId(worker.id);
    setEditingWorkerCode(worker.code);
  };

  const saveWorkerCode = async (workerId) => {
    if (!editingWorkerCode.trim()) {
      alert('코드를 입력해주세요');
      return;
    }
    
    if (workers.some(w => w.code === editingWorkerCode && w.id !== workerId)) {
      alert('이미 사용 중인 코드입니다');
      return;
    }

    try {
      const { updateDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const worker = workers.find(w => w.id === workerId);
      if (worker && worker.firestoreId) {
        await updateDoc(doc(db, 'workers', worker.firestoreId), {
          code: editingWorkerCode
        });
      }

      setEditingWorkerId(null);
      setEditingWorkerCode('');
    } catch (error) {
      console.error('코드 수정 오류:', error);
      alert('코드 수정 중 오류가 발생했습니다.');
    }
  };

  const cancelEditingCode = () => {
    setEditingWorkerId(null);
    setEditingWorkerCode('');
  };

  const regenerateWorkerCode = async (workerId) => {
    const newCode = generateWorkerCode();
    
    try {
      const { updateDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const worker = workers.find(w => w.id === workerId);
      if (worker && worker.firestoreId) {
        await updateDoc(doc(db, 'workers', worker.firestoreId), {
          code: newCode
        });
        alert(`새 코드가 생성되었습니다: ${newCode}`);
      }
    } catch (error) {
      console.error('코드 재생성 오류:', error);
      alert('코드 재생성 중 오류가 발생했습니다.');
    }
  };

  const addRoom = async () => {
    if (!newRoomNumber.trim()) return;
    
    const newRoom = {
      id: rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1,
      number: newRoomNumber
    };
    
    try {
      const { addDoc, collection } = window.firebaseFunctions;
      const db = window.firebaseDB;
      await addDoc(collection(db, 'rooms'), newRoom);
      setNewRoomNumber('');
      setShowAddRoom(false);
    } catch (error) {
      console.error('객실 추가 오류:', error);
      alert('객실 추가 중 오류가 발생했습니다.');
    }
  };

  const deleteRoom = async (room) => {
    if (!window.confirm('이 객실을 삭제하시겠습니까?')) return;

    try {
      const { deleteDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      if (room.firestoreId) {
        await deleteDoc(doc(db, 'rooms', room.firestoreId));
      }

      // Delete associated assignments
      const assignmentsToDelete = assignments.filter(a => a.roomId === room.id);
      for (const assignment of assignmentsToDelete) {
        if (assignment.firestoreId) {
          await deleteDoc(doc(db, 'assignments', assignment.firestoreId));
        }
      }
    } catch (error) {
      console.error('객실 삭제 오류:', error);
      alert('객실 삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleRoomSelection = (roomId) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter(id => id !== roomId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };

  const assignRooms = async () => {
    if (!selectedWorkerId || selectedRoomIds.length === 0) {
      alert('직원과 객실을 하나 이상 선택해주세요');
      return;
    }

    try {
      const { addDoc, collection } = window.firebaseFunctions;
      const db = window.firebaseDB;

      for (const roomId of selectedRoomIds) {
        const newAssignment = {
          id: Date.now() + Math.random(),
          workerId: parseInt(selectedWorkerId),
          roomId,
          date: selectedDate,
          completed: false,
          assignedAt: new Date().toISOString(),
          assignedBy: currentUser ? (currentUser.role === 'admin' ? currentUser.email : currentUser.name) : 'system',
          assignedByRole: currentUser ? currentUser.role : 'system'
        };
        await addDoc(collection(db, 'assignments'), newAssignment);

        // Log assignment
        await logAssignmentAction('assign', parseInt(selectedWorkerId), roomId, selectedDate, {
          method: 'form_assignment',
          bulkAssignment: selectedRoomIds.length > 1
        });
      }

      setSelectedRoomIds([]);
      setSelectedWorkerId('');
      alert('객실이 배정되었습니다!');
    } catch (error) {
      console.error('배정 오류:', error);
      alert('배정 중 오류가 발생했습니다.');
    }
  };

  const toggleCompletion = async (assignment) => {
    try {
      const { updateDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      if (assignment.firestoreId) {
        const newCompletedState = !assignment.completed;
        const updateData = {
          completed: newCompletedState
        };

        // Add completion details when marking as complete
        if (newCompletedState) {
          updateData.completedAt = new Date().toISOString();
          updateData.completedBy = currentUser ? (currentUser.role === 'admin' ? currentUser.email : currentUser.name) : 'system';
          updateData.completedByRole = currentUser ? currentUser.role : 'system';
        } else {
          // Clear completion details when uncompleting
          updateData.completedAt = null;
          updateData.completedBy = null;
          updateData.completedByRole = null;
        }

        await updateDoc(doc(db, 'assignments', assignment.firestoreId), updateData);

        // Log completion toggle
        await logAssignmentAction(
          newCompletedState ? 'complete' : 'uncomplete',
          assignment.workerId,
          assignment.roomId,
          assignment.date,
          {
            completedAt: newCompletedState ? new Date().toISOString() : null,
            completedBy: updateData.completedBy,
            completedByRole: updateData.completedByRole
          }
        );
      }
    } catch (error) {
      console.error('완료 상태 변경 오류:', error);
      alert('완료 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const exportToExcel = () => {
    if (!exportStartDate || !exportEndDate) {
      alert('시작일과 종료일을 모두 선택해주세요');
      return;
    }

    const filteredAssignments = assignments.filter(a =>
      a.date >= exportStartDate && a.date <= exportEndDate
    );

    const exportData = filteredAssignments.map(a => ({
      '날짜': a.date,
      '직원': getWorkerName(a.workerId),
      '객실': getRoomNumber(a.roomId),
      '상태': a.completed ? '완료' : '대기중',
      '배정 시간': new Date(a.assignedAt).toLocaleString('ko-KR')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '객실배정');
    XLSX.writeFile(wb, `객실배정-${exportStartDate}-${exportEndDate}.xlsx`);
  };

  // Tag logging helper function
  const logTagAction = async (action, roomId, tagName) => {
    try {
      const { addDoc, collection } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const room = rooms.find(r => r.id === roomId);

      const logEntry = {
        action, // 'tag_added', 'tag_removed'
        roomId,
        roomNumber: room ? room.number : '알 수 없음',
        tagName,
        timestamp: new Date().toISOString(),
        performedBy: currentUser ? currentUser.role : 'system',
        performedByName: currentUser ? (currentUser.role === 'admin' ? currentUser.email : currentUser.name) : 'system',
        type: 'tag_operation'
      };

      await addDoc(collection(db, 'assignmentLogs'), logEntry);
    } catch (error) {
      console.error('태그 로그 기록 오류:', error);
    }
  };

  // Tag management functions
  const addTagToRoom = async (roomId, tagName) => {
    try {
      const { updateDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const currentTags = room.tags || [];

      // Don't add duplicate tags
      if (currentTags.includes(tagName)) return;

      const updatedTags = [...currentTags, tagName];

      if (room.firestoreId) {
        await updateDoc(doc(db, 'rooms', room.firestoreId), {
          tags: updatedTags
        });
      } else {
        // Update local state for rooms without firestoreId
        setRooms(rooms.map(r =>
          r.id === roomId ? { ...r, tags: updatedTags } : r
        ));
      }

      // Log tag addition
      await logTagAction('tag_added', roomId, tagName);
    } catch (error) {
      console.error('태그 추가 오류:', error);
      alert('태그 추가 중 오류가 발생했습니다.');
    }
  };

  const removeTagFromRoom = async (roomId, tagName) => {
    try {
      const { updateDoc, doc } = window.firebaseFunctions;
      const db = window.firebaseDB;

      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const currentTags = room.tags || [];
      const updatedTags = currentTags.filter(t => t !== tagName);

      if (room.firestoreId) {
        await updateDoc(doc(db, 'rooms', room.firestoreId), {
          tags: updatedTags
        });
      } else {
        // Update local state for rooms without firestoreId
        setRooms(rooms.map(r =>
          r.id === roomId ? { ...r, tags: updatedTags } : r
        ));
      }

      // Log tag removal
      await logTagAction('tag_removed', roomId, tagName);
    } catch (error) {
      console.error('태그 제거 오류:', error);
      alert('태그 제거 중 오류가 발생했습니다.');
    }
  };

  const addCustomTag = () => {
    if (!newCustomTag.trim()) return;

    const customTag = {
      id: `custom-${Date.now()}`,
      name: newCustomTag.trim(),
      color: 'bg-orange-500',
      icon: 'Tag'
    };

    setAvailableTags([...availableTags, customTag]);
    setNewCustomTag('');
    setShowAddTag(false);
  };

  // Remove tag from available tags palette
  const removeTagFromPalette = (tagId) => {
    // Only allow removal of custom tags (those with id starting with 'custom-')
    if (tagId.startsWith('custom-')) {
      setAvailableTags(availableTags.filter(tag => tag.id !== tagId));
    }
  };

  // Tag drag handlers
  const handleTagDragStart = (e, tagName) => {
    setDraggedTag(tagName);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTagDrop = async (e, roomId) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedTag) {
      await addTagToRoom(roomId, draggedTag);
      setDraggedTag(null);
    }
  };

  const handleTagDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Helper function to render tag icon
  const getTagIcon = (iconName) => {
    const iconProps = { className: "w-3 h-3" };
    switch(iconName) {
      case 'Bed': return <Bed {...iconProps} />;
      case 'Droplet': return <Droplet {...iconProps} />;
      case 'Shirt': return <Shirt {...iconProps} />;
      case 'Tag': return <Tag {...iconProps} />;
      default: return <Tag {...iconProps} />;
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Firebase error screen
  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Firebase 설정 필요</h1>
          <p className="text-gray-700 mb-4">{firebaseError}</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">설정 방법:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Firebase Console (console.firebase.google.com)에서 프로젝트 생성</li>
              <li>Firestore Database 활성화</li>
              <li>Authentication 활성화 (이메일/비밀번호)</li>
              <li>웹앱 추가 후 설정 정보 복사</li>
              <li>코드 상단의 firebaseConfig에 설정 정보 입력</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Home className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">미스테이 객실 관리 시스템</h1>
            <p className="text-gray-600 mt-2">객실 배정 관리</p>
          </div>
          
          {/* 로그인 모드 전환 */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setLoginMode('worker')}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                loginMode === 'worker' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              직원 로그인
            </button>
            <button
              onClick={() => setLoginMode('admin')}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                loginMode === 'admin' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              관리자 로그인
            </button>
          </div>

          {loginMode === 'worker' ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="로그인 코드 입력"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleWorkerLogin()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleWorkerLogin}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                직원 로그인
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="이메일"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleAdminLogin}
                disabled={isLoggingIn}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {isLoggingIn ? '로그인 중...' : '관리자 로그인'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Worker View
  if (currentUser.role === 'worker') {
    const myAssignments = assignments.filter(a => a.workerId === currentUser.id);
    const todayAssignments = myAssignments.filter(a => a.date === new Date().toISOString().split('T')[0]);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 shadow-lg">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <div>
              <h1 className="text-xl font-bold">환영합니다, {currentUser.name}님</h1>
              <p className="text-sm text-blue-100">배정된 객실</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-blue-700 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">오늘의 업무</h2>
            <p className="text-sm text-gray-600">
              대기중 {todayAssignments.filter(a => !a.completed).length}개, 완료 {todayAssignments.filter(a => a.completed).length}개
            </p>
          </div>

          <div className="space-y-3">
            {todayAssignments.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                오늘 배정된 객실이 없습니다
              </div>
            ) : (
              todayAssignments.map(assignment => {
                const room = rooms.find(r => r.id === assignment.roomId);
                return (
                  <div
                    key={assignment.firestoreId || assignment.id}
                    className={`rounded-lg shadow-md p-4 transition border-2 ${assignment.completed ? 'bg-red-50 border-red-300' : 'bg-white border-transparent'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${assignment.completed ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <Home className={`w-6 h-6 ${assignment.completed ? 'text-red-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{getRoomNumber(assignment.roomId)}호</h3>
                          <p className="text-sm text-gray-600">{assignment.date}</p>
                        </div>
                      </div>
                      {!assignment.completed ? (
                        <button
                          onClick={() => toggleCompletion(assignment)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
                        >
                          청소완료
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleCompletion(assignment)}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
                          title="완료 취소"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {/* Tags Display - Important for workers to see requirements */}
                    {room && room.tags && room.tags.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 mt-3">
                        <p className="text-xs font-semibold text-yellow-800 mb-2">필요 항목:</p>
                        <div className="flex flex-wrap gap-2">
                          {room.tags.map((tagName, idx) => {
                            const tag = availableTags.find(t => t.name === tagName);
                            const tagColor = tag ? tag.color : 'bg-gray-500';
                            const tagIcon = tag ? tag.icon : 'Tag';
                            return (
                              <div
                                key={idx}
                                className={`${tagColor} text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center space-x-1.5 shadow-md`}
                              >
                                {getTagIcon(tagIcon)}
                                <span>{tagName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {myAssignments.length > todayAssignments.length && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">전체 배정 내역</h3>
              <div className="space-y-2">
                {myAssignments
                  .filter(a => a.date !== new Date().toISOString().split('T')[0])
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(assignment => {
                    const room = rooms.find(r => r.id === assignment.roomId);
                    return (
                      <div key={assignment.firestoreId || assignment.id} className="bg-white rounded-lg shadow p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-semibold">{getRoomNumber(assignment.roomId)}호</span>
                            <span className="text-sm text-gray-600 ml-2">{assignment.date}</span>
                          </div>
                          <span className={`text-sm px-2 py-1 rounded ${assignment.completed ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {assignment.completed ? '완료' : '대기중'}
                          </span>
                        </div>
                        {/* Tags Display */}
                        {room && room.tags && room.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {room.tags.map((tagName, idx) => {
                              const tag = availableTags.find(t => t.name === tagName);
                              const tagColor = tag ? tag.color : 'bg-gray-500';
                              const tagIcon = tag ? tag.icon : 'Tag';
                              return (
                                <div
                                  key={idx}
                                  className={`${tagColor} text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center space-x-1`}
                                >
                                  {getTagIcon(tagIcon)}
                                  <span>{tagName}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">관리자 대시보드</h1>
            <p className="text-sm text-blue-100">객실 배정 관리</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-blue-700 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition flex items-center space-x-2 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>대시보드</span>
          </button>
          <button
            onClick={() => setActiveTab('assign')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition ${activeTab === 'assign' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            객실 배정
          </button>
          <button
            onClick={() => setActiveTab('workers')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition ${activeTab === 'workers' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            직원 관리
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition ${activeTab === 'rooms' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            객실 관리
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            배정 기록
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition ${activeTab === 'export' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            내보내기
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition flex items-center space-x-2 ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>활동 로그</span>
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">드래그 앤 드롭 배정판</h2>
                <input
                  type="date"
                  value={dashboardDate}
                  onChange={(e) => setDashboardDate(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>드래그 앤 드롭</strong>으로 "미배정 객실"에서 직원 영역으로 객실을 이동하여 배정하세요. 미배정으로 다시 드래그하면 배정이 취소됩니다.
                </p>
              </div>

              {/* Tag Palette */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-purple-600" />
                    태그 (객실로 드래그하세요)
                  </h3>
                  <button
                    onClick={() => setShowAddTag(!showAddTag)}
                    className="flex items-center space-x-1 text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>커스텀 태그</span>
                  </button>
                </div>

                {showAddTag && (
                  <div className="mb-3 flex space-x-2">
                    <input
                      type="text"
                      placeholder="태그 이름 입력"
                      value={newCustomTag}
                      onChange={(e) => setNewCustomTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                      className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={addCustomTag}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                    >
                      추가
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <div
                      key={tag.id}
                      draggable
                      onDragStart={(e) => handleTagDragStart(e, tag.name)}
                      className={`${tag.color} text-white px-3 py-2 rounded-full text-sm font-semibold cursor-move hover:shadow-lg transition flex items-center space-x-1 group relative`}
                    >
                      {getTagIcon(tag.icon)}
                      <span>{tag.name}</span>
                      {tag.id.startsWith('custom-') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTagFromPalette(tag.id);
                          }}
                          className="ml-1 hover:bg-white hover:bg-opacity-30 rounded-full p-0.5 transition"
                          title="태그 삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <GripVertical className="w-3 h-3 ml-1 opacity-70" />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-600 mt-2">
                  💡 태그를 드래그해서 객실 카드에 놓으면 해당 객실에 태그가 추가됩니다
                </p>
              </div>

              <div 
                className="bg-gray-100 rounded-lg p-4 mb-4"
                onDragOver={handleDragOver}
                onDrop={handleDropOnUnassigned}
              >
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <Home className="w-5 h-5 mr-2" />
                  미배정 객실 ({getUnassignedRooms(dashboardDate).length}개)
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {getUnassignedRooms(dashboardDate).length === 0 ? (
                    <p className="text-sm text-gray-500 col-span-full text-center py-2">모든 객실이 배정되었습니다</p>
                  ) : (
                    getUnassignedRooms(dashboardDate).map(room => (
                      <div
                        key={room.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, room.id)}
                        onDragOver={handleTagDragOver}
                        onDrop={(e) => handleTagDrop(e, room.id)}
                        className="bg-white border-2 border-gray-300 rounded-lg p-3 text-center cursor-move hover:border-blue-500 hover:shadow-lg transition"
                      >
                        <GripVertical className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                        <p className="font-semibold text-sm mb-2">{room.number}호</p>
                        {/* Tags Display */}
                        {room.tags && room.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mt-2">
                            {room.tags.map((tagName, idx) => {
                              const tag = availableTags.find(t => t.name === tagName);
                              const tagColor = tag ? tag.color : 'bg-gray-500';
                              const tagIcon = tag ? tag.icon : 'Tag';
                              return (
                                <div
                                  key={idx}
                                  className={`${tagColor} text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center space-x-1 group relative`}
                                >
                                  {getTagIcon(tagIcon)}
                                  <span>{tagName}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTagFromRoom(room.id, tagName);
                                    }}
                                    className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition"
                                    title="태그 제거"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map(worker => {
                  const workerAssignments = getAssignedRooms(worker.id, dashboardDate);
                  const completedCount = workerAssignments.filter(a => a.completed).length;
                  
                  return (
                    <div
                      key={worker.id}
                      className="bg-white border-2 border-gray-300 rounded-lg p-4"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnWorker(e, worker.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {worker.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{worker.name}</h3>
                            <p className="text-xs text-gray-500">{worker.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">{workerAssignments.length}개 객실</p>
                          <p className="text-xs text-gray-500">{completedCount}개 완료</p>
                        </div>
                      </div>

                      <div className="min-h-24 bg-gray-50 rounded-lg p-2 space-y-2">
                        {workerAssignments.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">여기에 객실을 놓으세요</p>
                        ) : (
                          workerAssignments.map(assignment => {
                            const room = rooms.find(r => r.id === assignment.roomId);
                            return (
                              <div
                                key={assignment.firestoreId || assignment.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, assignment.roomId)}
                                onDragOver={handleTagDragOver}
                                onDrop={(e) => handleTagDrop(e, assignment.roomId)}
                                className={`border-2 rounded-lg p-2 cursor-move hover:shadow-md transition ${assignment.completed ? 'border-red-300 bg-red-50' : 'bg-white border-gray-300'}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                    <span className="font-semibold">{getRoomNumber(assignment.roomId)}호</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {!assignment.completed ? (
                                      <button
                                        onClick={() => toggleCompletion(assignment)}
                                        className="px-2 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition"
                                      >
                                        청소완료
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => toggleCompletion(assignment)}
                                        className="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition"
                                        title="완료 취소"
                                      >
                                        ✕
                                      </button>
                                    )}
                                    <button
                                      onClick={() => removeRoomAssignment(assignment.roomId, dashboardDate)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {/* Tags Display */}
                                {room && room.tags && room.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {room.tags.map((tagName, idx) => {
                                      const tag = availableTags.find(t => t.name === tagName);
                                      const tagColor = tag ? tag.color : 'bg-gray-500';
                                      const tagIcon = tag ? tag.icon : 'Tag';
                                      return (
                                        <div
                                          key={idx}
                                          className={`${tagColor} text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center space-x-1 group relative`}
                                        >
                                          {getTagIcon(tagIcon)}
                                          <span>{tagName}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeTagFromRoom(assignment.roomId, tagName);
                                            }}
                                            className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition"
                                            title="태그 제거"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {workers.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
                  <Users className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
                  <p className="text-yellow-800 font-semibold">등록된 직원이 없습니다</p>
                  <p className="text-sm text-yellow-700 mt-1">"직원 관리" 탭에서 직원을 추가하세요</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assign' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">직원에게 객실 배정</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">직원 선택</label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">직원을 선택하세요...</option>
                    {workers.map(worker => (
                      <option key={worker.id} value={worker.id}>{worker.name} ({worker.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">날짜 선택</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">객실 선택</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {rooms.map(room => (
                      <button
                        key={room.id}
                        onClick={() => toggleRoomSelection(room.id)}
                        className={`p-3 rounded-lg font-semibold transition ${selectedRoomIds.includes(room.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {room.number}호
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={assignRooms}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  선택한 객실 배정하기
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">오늘의 배정 내역</h2>
                <input
                  type="date"
                  value={viewDate}
                  onChange={(e) => setViewDate(e.target.value)}
                  className="px-3 py-1 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-2">
                {assignments.filter(a => a.date === viewDate).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">해당 날짜의 배정 내역이 없습니다</p>
                ) : (
                  assignments.filter(a => a.date === viewDate).map(assignment => (
                    <div key={assignment.firestoreId || assignment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-semibold">{getWorkerName(assignment.workerId)}</span>
                        <span className="mx-2">→</span>
                        <span className="text-blue-600">{getRoomNumber(assignment.roomId)}호</span>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded ${assignment.completed ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {assignment.completed ? '완료' : '대기중'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">직원 관리</h2>
              <button
                onClick={() => setShowAddWorker(!showAddWorker)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>직원 추가</span>
              </button>
            </div>

            {showAddWorker && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <input
                  type="text"
                  placeholder="직원 이름"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addWorker()}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none mb-2"
                />
                <button
                  onClick={addWorker}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  직원 등록
                </button>
              </div>
            )}

            <div className="space-y-2">
              {workers.map(worker => (
                <div key={worker.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{worker.name}</p>
                    {editingWorkerId === worker.id ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="text"
                          value={editingWorkerCode}
                          onChange={(e) => setEditingWorkerCode(e.target.value.toUpperCase())}
                          className="px-3 py-1 border-2 border-blue-300 rounded font-mono text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="코드 입력"
                        />
                        <button
                          onClick={() => saveWorkerCode(worker.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEditingCode}
                          className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500 transition"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-gray-600">코드: <span className="font-mono font-semibold">{worker.code}</span></p>
                        <button
                          onClick={() => startEditingCode(worker)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => regenerateWorkerCode(worker.id)}
                          className="text-xs text-purple-600 hover:text-purple-800 underline"
                        >
                          재생성
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteWorker(worker)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition ml-4"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">객실 관리</h2>
              <button
                onClick={() => setShowAddRoom(!showAddRoom)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>객실 추가</span>
              </button>
            </div>

            {showAddRoom && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <input
                  type="text"
                  placeholder="객실 번호 또는 이름"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRoom()}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none mb-2"
                />
                <button
                  onClick={addRoom}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  객실 등록
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {rooms.map(room => (
                <div key={room.id} className="relative bg-gray-50 rounded-lg p-4 text-center">
                  <button
                    onClick={() => deleteRoom(room)}
                    className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Home className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="font-semibold text-lg">{room.number}호</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">배정 기록 & 태그 활동</h2>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={historyFilterDate}
                  onChange={(e) => setHistoryFilterDate(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="전체 날짜"
                />
                {historyFilterDate && (
                  <button
                    onClick={() => setHistoryFilterDate('')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                  >
                    전체 보기
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                // Combine assignments and tag logs
                let allActivities = [];

                // Add assignments
                assignments.forEach(assignment => {
                  allActivities.push({
                    type: 'assignment',
                    data: assignment,
                    timestamp: assignment.assignedAt,
                    date: assignment.date
                  });
                });

                // Add tag logs
                assignmentLogs.filter(log => log.type === 'tag_operation').forEach(log => {
                  allActivities.push({
                    type: 'tag',
                    data: log,
                    timestamp: log.timestamp,
                    date: log.timestamp.split('T')[0] // Extract date from ISO timestamp
                  });
                });

                // Apply date filter
                if (historyFilterDate) {
                  allActivities = allActivities.filter(activity => activity.date === historyFilterDate);
                }

                // Sort by timestamp (newest first)
                allActivities = allActivities.sort((a, b) =>
                  new Date(b.timestamp) - new Date(a.timestamp)
                );

                if (allActivities.length === 0) {
                  return (
                    <p className="text-gray-500 text-center py-4">
                      {historyFilterDate ? '해당 날짜의 기록이 없습니다' : '기록이 없습니다'}
                    </p>
                  );
                }

                return allActivities.map((activity, idx) => {
                  if (activity.type === 'assignment') {
                    const assignment = activity.data;
                    return (
                      <div key={`assignment-${assignment.firestoreId || assignment.id}`} className={`p-4 rounded-lg border-l-4 ${assignment.completed ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-blue-400'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-lg text-gray-900">
                              {getWorkerName(assignment.workerId)} → {getRoomNumber(assignment.roomId)}호
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">날짜:</span> {assignment.date}
                              </p>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">배정 시간:</span> {new Date(assignment.assignedAt).toLocaleString('ko-KR')}
                              </p>
                              {assignment.assignedBy && (
                                <p className="text-sm text-gray-700">
                                  <span className="font-semibold">배정자:</span>{' '}
                                  <span className="text-blue-600">{assignment.assignedBy}</span>
                                  {assignment.assignedByRole === 'admin' && ' (관리자)'}
                                  {assignment.assignedByRole === 'worker' && ' (직원)'}
                                </p>
                              )}
                              {assignment.completed && assignment.completedAt && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                  <p className="text-sm text-green-700">
                                    <span className="font-semibold">✓ 완료 시간:</span> {new Date(assignment.completedAt).toLocaleString('ko-KR')}
                                  </p>
                                  {assignment.completedBy && (
                                    <p className="text-sm text-green-700">
                                      <span className="font-semibold">✓ 완료자:</span>{' '}
                                      <span className="text-green-800">{assignment.completedBy}</span>
                                      {assignment.completedByRole === 'admin' && ' (관리자)'}
                                      {assignment.completedByRole === 'worker' && ' (직원)'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm px-3 py-1 rounded font-semibold ${assignment.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {assignment.completed ? '완료' : '대기중'}
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    // Tag operation
                    const log = activity.data;
                    const isAdded = log.action === 'tag_added';
                    return (
                      <div key={`tag-${log.firestoreId || idx}`} className={`p-4 rounded-lg border-l-4 ${isAdded ? 'bg-purple-50 border-purple-400' : 'bg-orange-50 border-orange-400'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-lg text-gray-900">
                              {log.roomNumber}호 - 태그 {isAdded ? '추가' : '제거'}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">태그:</span>{' '}
                                <span className={`px-2 py-1 rounded ${isAdded ? 'bg-purple-200 text-purple-800' : 'bg-orange-200 text-orange-800'}`}>
                                  {log.tagName}
                                </span>
                              </p>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">시간:</span> {new Date(log.timestamp).toLocaleString('ko-KR')}
                              </p>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">작업자:</span>{' '}
                                <span className="text-blue-600">{log.performedByName}</span>
                                {log.performedBy === 'admin' && ' (관리자)'}
                                {log.performedBy === 'worker' && ' (직원)'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm px-3 py-1 rounded font-semibold ${isAdded ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isAdded ? '태그 추가' : '태그 제거'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                });
              })()}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>전체 배정 기록:</strong> {assignments.length}건
              </p>
              <p className="text-sm text-gray-700">
                <strong>전체 태그 활동:</strong> {assignmentLogs.filter(log => log.type === 'tag_operation').length}건
              </p>
              {historyFilterDate && (
                <>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>{historyFilterDate} 배정:</strong>{' '}
                    {assignments.filter(a => a.date === historyFilterDate).length}건
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>{historyFilterDate} 태그 활동:</strong>{' '}
                    {assignmentLogs.filter(log => log.type === 'tag_operation' && log.timestamp.split('T')[0] === historyFilterDate).length}건
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">데이터 내보내기</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">시작일</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">종료일</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={exportToExcel}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                <Download className="w-5 h-5" />
                <span>엑셀로 내보내기</span>
              </button>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>전체 배정 내역:</strong> {assignments.length}건
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>포함 내용:</strong> 날짜, 직원, 객실, 상태, 배정 시간
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">활동 로그</h2>

            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">날짜 필터</label>
                  <input
                    type="date"
                    value={logFilterDate}
                    onChange={(e) => setLogFilterDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="전체 날짜"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">활동 필터</label>
                  <select
                    value={logFilterAction}
                    onChange={(e) => setLogFilterAction(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">전체 활동</option>
                    <option value="assign">배정</option>
                    <option value="unassign">배정 해제</option>
                    <option value="complete">완료 표시</option>
                    <option value="uncomplete">완료 취소</option>
                  </select>
                </div>
              </div>

              {logFilterDate || logFilterAction !== 'all' ? (
                <button
                  onClick={() => {
                    setLogFilterDate('');
                    setLogFilterAction('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  필터 초기화
                </button>
              ) : null}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                let filteredLogs = assignmentLogs;

                // Apply date filter
                if (logFilterDate) {
                  filteredLogs = filteredLogs.filter(log => log.date === logFilterDate);
                }

                // Apply action filter
                if (logFilterAction !== 'all') {
                  filteredLogs = filteredLogs.filter(log => log.action === logFilterAction);
                }

                // Sort by timestamp (newest first)
                filteredLogs = [...filteredLogs].sort((a, b) =>
                  new Date(b.timestamp) - new Date(a.timestamp)
                );

                if (filteredLogs.length === 0) {
                  return (
                    <p className="text-gray-500 text-center py-8">
                      {logFilterDate || logFilterAction !== 'all'
                        ? '필터 조건에 맞는 로그가 없습니다'
                        : '활동 로그가 없습니다'}
                    </p>
                  );
                }

                return filteredLogs.map((log) => {
                  // Determine badge color and text based on action
                  let badgeClass = '';
                  let actionText = '';

                  switch(log.action) {
                    case 'assign':
                      badgeClass = 'bg-blue-100 text-blue-700';
                      actionText = '배정';
                      break;
                    case 'unassign':
                      badgeClass = 'bg-red-100 text-red-700';
                      actionText = '배정 해제';
                      break;
                    case 'complete':
                      badgeClass = 'bg-green-100 text-green-700';
                      actionText = '완료 표시';
                      break;
                    case 'uncomplete':
                      badgeClass = 'bg-yellow-100 text-yellow-700';
                      actionText = '완료 취소';
                      break;
                    default:
                      badgeClass = 'bg-gray-100 text-gray-700';
                      actionText = log.action;
                  }

                  return (
                    <div key={log.firestoreId || log.timestamp} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${badgeClass}`}>
                          {actionText}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">직원:</span>{' '}
                          <span className="text-gray-900">{log.workerName}</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">객실:</span>{' '}
                          <span className="text-gray-900">{log.roomNumber}호</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">날짜:</span>{' '}
                          <span className="text-gray-900">{log.date}</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">수행자:</span>{' '}
                          <span className="text-gray-900">
                            {log.performedByName}
                            {log.performedBy === 'admin' && ' (관리자)'}
                            {log.performedBy === 'worker' && ' (직원)'}
                          </span>
                        </p>

                        {log.method && (
                          <p className="text-xs text-gray-600 mt-1">
                            방법: {
                              log.method === 'drag_and_drop' ? '드래그 앤 드롭' :
                              log.method === 'form_assignment' ? '폼 배정' :
                              log.method === 'manual_removal' ? '수동 삭제' :
                              log.method === 'drag_to_unassigned' ? '미배정으로 드래그' :
                              log.method
                            }
                          </p>
                        )}

                        {log.reason && (
                          <p className="text-xs text-gray-600">
                            사유: {
                              log.reason === 'reassignment' ? '재배정' : log.reason
                            }
                          </p>
                        )}

                        {log.bulkAssignment && (
                          <p className="text-xs text-purple-600 font-semibold">
                            대량 배정의 일부
                          </p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>전체 로그:</strong> {assignmentLogs.length}건
              </p>
              <p className="text-xs text-gray-600 mt-1">
                모든 배정, 배정 해제, 완료 표시 활동이 자동으로 기록됩니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelRoomManager;