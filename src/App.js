import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, BookOpen, BarChart3, LogOut, Search, Plus, Edit2, Archive, CheckCircle, Mail, Sparkles } from 'lucide-react';

// Firebase imports
import { 
  loadAllData, 
  addStudent, 
  updateStudent,
  addClass,
  updateClass,
  saveAttendance
} from './databaseFunctions';
import { initializeFirebaseData } from './initializeFirebase';

export default function GearMindsAttendance() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({
    users: [],
    students: [],
    classes: [],
    enrollments: [],
    attendance: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all data from Firebase when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const allData = await loadAllData();
        setData(allData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogin = (email, password) => {
    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Get dates for the selected class (weekly from start to end)
  const getClassDates = (classItem) => {
    if (!classItem) return [];
    const classDates = [];
    const start = new Date(classItem.startDate);
    const end = new Date(classItem.endDate);
    const current = new Date(start);
    
    // Generate weekly dates
    while (current <= end) {
      classDates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
    
    return classDates.slice(0, 18); // Limit to 18 weeks
  };

  // AI Makeup class suggestions
  const getMakeupSuggestions = useCallback(() => {
    const suggestions = [];
    
    data.classes.forEach(classItem => {
      const enrolledStudents = data.enrollments
        .filter(e => e.classId === classItem.id)
        .map(e => data.students.find(s => s.id === e.studentId))
        .filter(s => s);
      
      const classDates = getClassDates(classItem);
      
      enrolledStudents.forEach(student => {
        const attendanceRecords = data.attendance.filter(a => 
          a.studentId === student.id && 
          a.classId === classItem.id
        );
        
        const absentDates = attendanceRecords
          .filter(a => a.status === 'A')
          .map(a => a.date);
        
        if (absentDates.length > 0) {
          suggestions.push({
            student,
            class: classItem,
            absentDates,
            totalAbsences: absentDates.length
          });
        }
      });
    });
    
    return suggestions.sort((a, b) => b.totalAbsences - a.totalAbsences);
  }, [data.classes, data.enrollments, data.students, data.attendance]);

  // Show loading screen while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-800">Loading GearMinds...</p>
          <p className="text-sm text-gray-600 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Show error if data failed to load
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-orange-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Login Component
  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <Header user={currentUser} onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'dashboard' && <Dashboard data={data} setActiveTab={setActiveTab} setShowStudentModal={setShowStudentModal} setShowClassModal={setShowClassModal} setEditingStudent={setEditingStudent} setEditingClass={setEditingClass} />}
        {activeTab === 'students' && <StudentsTab data={data} setData={setData} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setShowStudentModal={setShowStudentModal} setEditingStudent={setEditingStudent} />}
        {activeTab === 'classes' && <ClassesTab data={data} setData={setData} setShowClassModal={setShowClassModal} setEditingClass={setEditingClass} />}
        {activeTab === 'attendance' && <AttendanceTab data={data} setData={setData} selectedClass={selectedClass} setSelectedClass={setSelectedClass} getClassDates={getClassDates} />}
        {activeTab === 'makeup' && <MakeupClassesTab data={data} getMakeupSuggestions={getMakeupSuggestions} />}
        {activeTab === 'reports' && <ReportsTab data={data} />}
      </div>

      {showStudentModal && (
        <StudentModal
          student={editingStudent}
          onClose={() => { setShowStudentModal(false); setEditingStudent(null); }}
          onSave={async (student) => {
            try {
              if (editingStudent) {
                await updateStudent(editingStudent.id, student);
                setData(prev => ({
                  ...prev,
                  students: prev.students.map(s => s.id === editingStudent.id ? { ...student, id: editingStudent.id } : s)
                }));
              } else {
                const newId = await addStudent(student);
                setData(prev => ({
                  ...prev,
                  students: [...prev.students, { ...student, id: newId }]
                }));
              }
              setShowStudentModal(false);
              setEditingStudent(null);
            } catch (error) {
              console.error('Error saving student:', error);
              alert('Failed to save student. Please try again.');
            }
          }}
        />
      )}
      
      {showClassModal && (
        <ClassModal
          classData={editingClass}
          onClose={() => { setShowClassModal(false); setEditingClass(null); }}
          onSave={async (classData) => {
            try {
              if (editingClass) {
                await updateClass(editingClass.id, classData);
                setData(prev => ({
                  ...prev,
                  classes: prev.classes.map(c => c.id === editingClass.id ? { ...classData, id: editingClass.id } : c)
                }));
              } else {
                const newId = await addClass(classData);
                setData(prev => ({
                  ...prev,
                  classes: [...prev.classes, { ...classData, id: newId }]
                }));
              }
              setShowClassModal(false);
              setEditingClass(null);
            } catch (error) {
              console.error('Error saving class:', error);
              alert('Failed to save class. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}
//login form component updated
function LoginForm({ onLogin }) {
  const [initializing, setInitializing] = useState(false);
  
  const quickLogin = () => {
    onLogin('admin@gearminds.com', 'admin123');
  };

  const handleInitialize = async () => {
    if (!window.confirm('This will add sample data to your database. Continue?')) {
      return;
    }
    
    setInitializing(true);
    try {
      const success = await initializeFirebaseData();
      if (success) {
        alert('✅ Firebase initialized successfully! Please refresh the page.');
        window.location.reload();
      } else {
        alert('ℹ️ Data already exists in Firebase. You can login now.');
      }
    } catch (error) {
      alert('❌ Failed to initialize: ' + error.message);
    }
    setInitializing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-blue-600 text-white text-3xl font-bold py-3 px-6 rounded-lg inline-block mb-4">
            GearMinds
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Student Attendance System</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value="admin@gearminds.com"
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value="admin123"
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          
          <button 
            type="button"
            onClick={quickLogin} 
            className="w-full bg-gradient-to-r from-orange-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-orange-600 hover:to-blue-700 transition-all"
          >
            Sign In
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">First time setup</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleInitialize}
            disabled={initializing}
            className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {initializing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Initializing Database...
              </>
            ) : (
              <>
                <span>🔧</span>
                Initialize Firebase Database
              </>
            )}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            First time? Click "Initialize" to add sample data
          </p>
        </div>
      </div>
    </div>
  );
}

function MakeupClassesTab({ data, getMakeupSuggestions }) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [useCustomTimes, setUseCustomTimes] = useState(false);
  const [customTimes, setCustomTimes] = useState([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' }
  ]);

  useEffect(() => {
    setSuggestions(getMakeupSuggestions());
  }, [data.attendance, getMakeupSuggestions]);

  const toggleSelection = (suggestion) => {
    setSelectedSuggestions(prev => {
      const exists = prev.find(s => s.student.id === suggestion.student.id && s.class.id === suggestion.class.id);
      if (exists) {
        return prev.filter(s => !(s.student.id === suggestion.student.id && s.class.id === suggestion.class.id));
      } else {
        return [...prev, suggestion];
      }
    });
  };

  const addCustomTimeSlot = () => {
    setCustomTimes([...customTimes, { date: '', time: '' }]);
  };

  const removeCustomTimeSlot = (index) => {
    setCustomTimes(customTimes.filter((_, i) => i !== index));
  };

  const updateCustomTime = (index, field, value) => {
    const newTimes = [...customTimes];
    newTimes[index][field] = value;
    setCustomTimes(newTimes);
  };

  const generateAISuggestedTimes = () => {
    const today = new Date();
    const suggestedTimes = [];
    
    for (let i = 1; i <= 3; i++) {
      const nextSaturday = new Date(today);
      nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7) + (7 * (i - 1)));
      
      suggestedTimes.push({
        date: nextSaturday.toISOString().split('T')[0],
        time: '10:00 AM - 12:00 PM'
      });
    }
    
    return suggestedTimes;
  };

  const formatTimeSlots = (times) => {
    return times
      .filter(t => t.date && t.time)
      .map(t => {
        const date = new Date(t.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        });
        return `• ${formattedDate} - ${t.time}`;
      })
      .join('\n');
  };

  const generateEmail = async () => {
    setIsGenerating(true);
    
    const timesToUse = useCustomTimes ? customTimes : generateAISuggestedTimes();
    const formattedTimes = formatTimeSlots(timesToUse);
    
    setTimeout(() => {
      const email = `Subject: Makeup Class Opportunity - GearMinds Academy

Dear Parents and Students,

We hope this message finds you well. We've noticed that some students have missed classes recently and we'd like to offer makeup sessions to ensure everyone stays on track with their learning goals.

Students Eligible for Makeup Classes:
${selectedSuggestions.map(s => `• ${s.student.fullName} - ${s.class.name} (${s.totalAbsences} missed session${s.totalAbsences > 1 ? 's' : ''})`).join('\n')}

Proposed Makeup Sessions:
${formattedTimes || 'Please contact us to schedule a makeup session.'}

These sessions will cover the material missed and provide additional hands-on practice. Please RSVP by replying to this email or calling us at (469) 290-4561.

Location: GearMinds Academy
11511 Independence Pkwy, Suite #101, Frisco, TX 75035

We're committed to your child's success and want to ensure they don't fall behind. These makeup sessions are complimentary and designed to help students catch up and build confidence.

Please let us know which session(s) work best for your schedule.

Best regards,
GearMinds Academy Team
contactus@gearmindsacademy.com
(469) 290-4561`;

      setGeneratedEmail(email);
      setIsGenerating(false);
      setShowTimeOptions(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI-Powered Makeup Classes</h2>
          <p className="text-sm text-gray-600 mt-1">Smart suggestions based on attendance patterns</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">AI Powered</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Students Needing Makeup Classes</h3>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p>Great! All students are up to date.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleSelection(suggestion)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSuggestions.find(s => s.student.id === suggestion.student.id && s.class.id === suggestion.class.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{suggestion.student.fullName}</p>
                      <p className="text-sm text-gray-600">{suggestion.class.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Email: {suggestion.student.email}</p>
                    </div>
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                      {suggestion.totalAbsences} Absent
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Missed: {suggestion.absentDates.map(d => new Date(d).toLocaleDateString()).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {selectedSuggestions.length > 0 && (
            <div className="mt-4 space-y-3">
              <button
                onClick={() => setShowTimeOptions(!showTimeOptions)}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
              >
                <Calendar className="w-4 h-4" />
                {showTimeOptions ? 'Hide' : 'Set'} Makeup Times
              </button>

              {showTimeOptions && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useCustomTimes}
                        onChange={() => setUseCustomTimes(false)}
                        className="w-4 h-4 text-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-700">AI Suggest Times</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useCustomTimes}
                        onChange={() => setUseCustomTimes(true)}
                        className="w-4 h-4 text-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enter Custom Times</span>
                    </label>
                  </div>

                  {!useCustomTimes ? (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-2">AI will suggest:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {generateAISuggestedTimes().map((time, idx) => (
                          <li key={idx}>• {new Date(time.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} - {time.time}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customTimes.map((slot, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={slot.date}
                            onChange={(e) => updateCustomTime(idx, 'date', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            placeholder="e.g., 10:00 AM - 12:00 PM"
                            value={slot.time}
                            onChange={(e) => updateCustomTime(idx, 'time', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          {customTimes.length > 1 && (
                            <button
                              onClick={() => removeCustomTimeSlot(idx)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addCustomTimeSlot}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Add Another Time Slot
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={generateEmail}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Generate Email for {selectedSuggestions.length} Student{selectedSuggestions.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Email</h3>
          
          {generatedEmail ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{generatedEmail}</pre>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedEmail);
                    alert('Email copied to clipboard!');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                >
                  Copy Email
                </button>
                <button
                  onClick={() => {
                    const emails = selectedSuggestions.map(s => s.student.email).join(',');
                    window.location.href = `mailto:${emails}?subject=Makeup Class Opportunity - GearMinds Academy&body=${encodeURIComponent(generatedEmail)}`;
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
                >
                  Send Email
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Generate an email to send makeup class notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Header({ user, onLogout }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-orange-500 to-blue-600 text-white text-xl font-bold py-2 px-4 rounded-lg">
            GearMinds
          </div>
          <span className="text-gray-600">Student Attendance System</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-700">Welcome, {user.email}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'makeup', label: 'Makeup Classes', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="bg-white rounded-xl shadow-sm p-2 mb-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}


function Dashboard({ data, setActiveTab, setShowStudentModal, setShowClassModal }) {
  const totalStudents = data.students.length;
  const totalClasses = data.classes.length;
  const presentCount = data.attendance.filter(a => a.status === 'P').length;
  const absentCount = data.attendance.filter(a => a.status === 'A').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-800">{totalStudents}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <BookOpen className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-800">{totalClasses}</div>
          <div className="text-sm text-gray-600">Total Classes</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-800">{presentCount}</div>
          <div className="text-sm text-gray-600">Present Today</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <Archive className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-800">{absentCount}</div>
          <div className="text-sm text-gray-600">Absent Today</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowStudentModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-5 h-5" />
              Add New Student
            </button>
            <button
              onClick={() => setShowClassModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600"
            >
              <Plus className="w-5 h-5" />
              Add New Class
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600"
            >
              <Calendar className="w-5 h-5" />
              Take Attendance
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• System initialized with sample data</p>
            <p>• Attendance tracking active</p>
            <p>• Reports available</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ data, setData, searchTerm, setSearchTerm, setShowStudentModal, setEditingStudent }) {
  const filteredStudents = data.students.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Students</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={() => setShowStudentModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map(student => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.studentId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingStudent(student);
                      setShowStudentModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassesTab({ data, setShowClassModal, setEditingClass }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Classes</h2>
        <button
          onClick={() => setShowClassModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.classes.map(classItem => (
          <div key={classItem.id} className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{classItem.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{classItem.description}</p>
            <p className="text-sm text-gray-500">Start: {new Date(classItem.startDate).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">End: {new Date(classItem.endDate).toLocaleDateString()}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setEditingClass(classItem);
                  setShowClassModal(true);
                }}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceTab({ data, setData, selectedClass, setSelectedClass, getClassDates }) {
  const handleAttendanceChange = async (studentId, date, status) => {
    try {
      await saveAttendance({
        studentId,
        classId: selectedClass,
        date,
        status
      });
      
      // Update local state
      const existing = data.attendance.find(a => a.studentId === studentId && a.classId === selectedClass && a.date === date);
      if (existing) {
        setData(prev => ({
          ...prev,
          attendance: prev.attendance.map(a => a.id === existing.id ? { ...a, status } : a)
        }));
      } else {
        // Reload data for new records
        const allData = await loadAllData();
        setData(allData);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    }
  };

  const enrolledStudents = selectedClass ? data.enrollments
    .filter(e => e.classId === selectedClass)
    .map(e => data.students.find(s => s.id === e.studentId))
    .filter(s => s) : [];

  const classDates = selectedClass ? getClassDates(data.classes.find(c => c.id === selectedClass)) : [];

  const getStatus = (studentId, date) => {
    const record = data.attendance.find(a => a.studentId === studentId && a.classId === selectedClass && a.date === date);
    return record ? record.status : '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Attendance</h2>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select a class</option>
            {data.classes.map(classItem => (
              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left border border-gray-300">Student</th>
                  {classDates.map(date => (
                    <th key={date} className="px-4 py-2 text-center border border-gray-300 min-w-[100px]">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map(student => (
                  <tr key={student.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium border border-gray-300">{student.fullName}</td>
                    {classDates.map(date => (
                      <td key={date} className="px-4 py-2 text-center border border-gray-300">
                        <select
                          value={getStatus(student.id, date)}
                          onChange={(e) => handleAttendanceChange(student.id, date, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value=""></option>
                          <option value="P">P</option>
                          <option value="A">A</option>
                          <option value="E">E</option>
                          <option value="L">L</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsTab({ data }) {
  const attendanceStats = data.attendance.reduce((acc, a) => {
    if (!acc[a.classId]) acc[a.classId] = { P: 0, A: 0, L: 0 };
    acc[a.classId][a.status]++;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Reports</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Summary</h3>
          <div className="space-y-2">
            {data.classes.map(classItem => (
              <div key={classItem.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{classItem.name}</span>
                <div className="text-sm text-gray-600">
                  P: {attendanceStats[classItem.id]?.P || 0} | A: {attendanceStats[classItem.id]?.A || 0} | L: {attendanceStats[classItem.id]?.L || 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Student Statistics</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.students.map(student => {
              const studentAttendance = data.attendance.filter(a => a.studentId === student.id);
              const present = studentAttendance.filter(a => a.status === 'P').length;
              const total = studentAttendance.length;
              const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
              return (
                <div key={student.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{student.fullName}</span>
                  <span className="text-sm text-gray-600">{percentage}% ({present}/{total})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ student, onClose, onSave }) {
  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (student) {
      setFormData(student);
    } else {
      setFormData({ studentId: '', fullName: '', email: '', phone: '' });
    }
  }, [student]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{student ? 'Edit Student' : 'Add Student'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
            >
              {student ? 'Update' : 'Add'} Student
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClassModal({ classData, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (classData) {
      setFormData(classData);
    } else {
      setFormData({ name: '', description: '', startDate: '', endDate: '' });
    }
  }, [classData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{classData ? 'Edit Class' : 'Add Class'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
            >
              {classData ? 'Update' : 'Add'} Class
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}