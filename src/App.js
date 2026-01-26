import React, { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, BarChart3, LogOut, Search, Plus, Edit2, Archive, CheckCircle, Upload, Mail, Sparkles } from 'lucide-react';

// Firebase imports
import { 
  loadAllData, 
  addStudent, 
  updateStudent,
  addClass,
  updateClass,
  saveAttendance,
  deleteAttendance 
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
    const dates = [];
    const start = new Date(classItem.startDate);
    const end = new Date(classItem.endDate);
    const current = new Date(start);
    
    // Generate weekly dates
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
    
    return dates.slice(0, 18); // Limit to 18 weeks
  };

  // AI Makeup class suggestions
  const getMakeupSuggestions = () => {
    const suggestions = [];
    
    data.classes.forEach(classItem => {
      const enrolledStudents = data.enrollments
        .filter(e => e.classId === classItem.id)
        .map(e => data.students.find(s => s.id === e.studentId))
        .filter(s => s);
      
      const dates = getClassDates(classItem);
      
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
  };

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

function BulkUploadModal({ onClose, onFileChange, previewData, onImport }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Bulk Upload Students (CSV)</h3>
        
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2"><strong>CSV Format:</strong></p>
          <code className="text-xs text-blue-900 block">Student ID, Full Name, Email, Phone</code>
          <p className="text-xs text-blue-700 mt-2">Example: GM001, John Doe, john@example.com, 555-0100</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {previewData.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">Preview ({previewData.length} students)</h4>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Student ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((s, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="px-3 py-2">{s.studentId}</td>
                      <td className="px-3 py-2">{s.fullName}</td>
                      <td className="px-3 py-2">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={onImport}
            disabled={previewData.length === 0}
            className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg font-medium hover:from-orange-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {previewData.length} Students
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300">
            Cancel
          </button>
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
  }, [data.attendance]);

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
      const studentNames = selectedSuggestions.map(s => s.student.fullName).join(', ');
      const totalAbsences = selectedSuggestions.reduce((sum, s) => sum + s.totalAbsences, 0);
      
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
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500