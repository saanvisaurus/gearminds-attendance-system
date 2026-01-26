import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where 
} from 'firebase/firestore';

// ============================================
// STUDENTS FUNCTIONS
// ============================================

export const loadStudents = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'students'));
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error loading students:', error);
    throw error;
  }
};

export const addStudent = async (studentData) => {
  try {
    const docRef = await addDoc(collection(db, 'students'), {
      ...studentData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding student:', error);
    throw error;
  }
};

export const updateStudent = async (studentId, studentData) => {
  try {
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      ...studentData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

export const deleteStudent = async (studentId) => {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};

// ============================================
// CLASSES FUNCTIONS
// ============================================

export const loadClasses = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'classes'));
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error loading classes:', error);
    throw error;
  }
};

export const addClass = async (classData) => {
  try {
    const docRef = await addDoc(collection(db, 'classes'), {
      ...classData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding class:', error);
    throw error;
  }
};

export const updateClass = async (classId, classData) => {
  try {
    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      ...classData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
};

// ============================================
// ENROLLMENTS FUNCTIONS
// ============================================

export const loadEnrollments = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'enrollments'));
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error loading enrollments:', error);
    throw error;
  }
};

export const addEnrollment = async (enrollmentData) => {
  try {
    const docRef = await addDoc(collection(db, 'enrollments'), {
      ...enrollmentData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding enrollment:', error);
    throw error;
  }
};

// ============================================
// ATTENDANCE FUNCTIONS
// ============================================

export const loadAttendance = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'attendance'));
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error loading attendance:', error);
    throw error;
  }
};

export const saveAttendance = async (attendanceData) => {
  try {
    // Check if record already exists
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', attendanceData.studentId),
      where('classId', '==', attendanceData.classId),
      where('date', '==', attendanceData.date)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Update existing record
      const existingDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'attendance', existingDoc.id), {
        status: attendanceData.status,
        notes: attendanceData.notes || '',
        updatedAt: new Date().toISOString()
      });
      return existingDoc.id;
    } else {
      // Create new record
      const docRef = await addDoc(collection(db, 'attendance'), {
        ...attendanceData,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    throw error;
  }
};

export const deleteAttendance = async (attendanceId) => {
  try {
    await deleteDoc(doc(db, 'attendance', attendanceId));
  } catch (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }
};

// ============================================
// USERS FUNCTIONS
// ============================================

export const loadUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error loading users:', error);
    throw error;
  }
};

// ============================================
// LOAD ALL DATA AT ONCE
// ============================================

export const loadAllData = async () => {
  try {
    const [students, classes, enrollments, attendance, users] = await Promise.all([
      loadStudents(),
      loadClasses(),
      loadEnrollments(),
      loadAttendance(),
      loadUsers()
    ]);
    
    return { students, classes, enrollments, attendance, users };
  } catch (error) {
    console.error('Error loading all data:', error);
    throw error;
  }
};