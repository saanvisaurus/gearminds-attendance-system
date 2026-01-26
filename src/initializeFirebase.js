import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const initializeFirebaseData = async () => {
  try {
    // Check if data already exists
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    
    if (!studentsSnapshot.empty) {
      console.log('Data already exists in Firebase');
      return false;
    }

    console.log('Initializing Firebase with sample data...');

    // Add admin user
    await addDoc(collection(db, 'users'), {
      email: 'admin@gearminds.com',
      password: 'admin123',
      role: 'Admin',
      createdAt: new Date().toISOString()
    });

    // Add sample students
    const student1 = await addDoc(collection(db, 'students'), {
      studentId: 'GM001',
      fullName: 'Alex Johnson',
      email: 'alex@example.com',
      phone: '555-0101',
      status: 'Active',
      createdAt: new Date().toISOString()
    });

    const student2 = await addDoc(collection(db, 'students'), {
      studentId: 'GM002',
      fullName: 'Sarah Williams',
      email: 'sarah@example.com',
      phone: '555-0102',
      status: 'Active',
      createdAt: new Date().toISOString()
    });

    const student3 = await addDoc(collection(db, 'students'), {
      studentId: 'GM003',
      fullName: 'Michael Chen',
      email: 'michael@example.com',
      phone: '555-0103',
      status: 'Active',
      createdAt: new Date().toISOString()
    });

    const student4 = await addDoc(collection(db, 'students'), {
      studentId: 'GM004',
      fullName: 'Emma Davis',
      email: 'emma@example.com',
      phone: '555-0104',
      status: 'Active',
      createdAt: new Date().toISOString()
    });

    // Add sample classes
    const class1 = await addDoc(collection(db, 'classes'), {
      name: 'Elementary Robotics',
      description: 'Block coding and robots',
      startDate: '2026-01-15',
      endDate: '2026-05-30',
      status: 'Active',
      maxCapacity: 12,
      createdAt: new Date().toISOString()
    });

    const class2 = await addDoc(collection(db, 'classes'), {
      name: 'Middle School Python',
      description: 'Introduction to Python',
      startDate: '2026-01-15',
      endDate: '2026-05-30',
      status: 'Active',
      maxCapacity: 10,
      createdAt: new Date().toISOString()
    });

    // Add enrollments
    await addDoc(collection(db, 'enrollments'), {
      studentId: student1.id,
      classId: class1.id,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'enrollments'), {
      studentId: student2.id,
      classId: class1.id,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'enrollments'), {
      studentId: student3.id,
      classId: class1.id,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'enrollments'), {
      studentId: student4.id,
      classId: class2.id,
      createdAt: new Date().toISOString()
    });

    console.log('✅ Firebase initialized with sample data!');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};