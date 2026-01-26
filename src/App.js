import React, { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, BarChart3, LogOut, Search, Plus, Edit2, Archive, CheckCircle, Upload, Mail, Sparkles } from 'lucide-react';

//new imports
import { 
  loadAllData, 
  addStudent, 
  updateStudent,
  addClass,
  updateClass,
  saveAttendance,
  deleteAttendance 
} from './databaseFunctions';


export default function GearMindsAttendance() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingClass, setEditingClass] = useState(null);

  const handleLogin = (email, password) => {
    const user = initialData.users.find(u => u.email === email && u.password === password);
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
          onSave={(student) => {
            setData(prev => {
              if (editingStudent) {
                return { ...prev, students: prev.students.map(s => s.id === editingStudent.id ? { ...student, id: editingStudent.id } : s) };
              } else {
                return { ...prev, students: [...prev.students, { ...student, id: Date.now() }] };
              }
            });
            setShowStudentModal(false);
            setEditingStudent(null);
          }}
        />
      )}
      
      {showClassModal && (
        <ClassModal
          classData={editingClass}
          onClose={() => { setShowClassModal(false); setEditingClass(null); }}
          onSave={(classData) => {
            setData(prev => {
              if (editingClass) {
                return { ...prev, classes: prev.classes.map(c => c.id === editingClass.id ? { ...classData, id: editingClass.id } : c) };
              } else {
                return { ...prev, classes: [...prev.classes, { ...classData, id: Date.now() }] };
              }
            });
            setShowClassModal(false);
            setEditingClass(null);
          }}
        />
      )}
    </div>
  );
}

function LoginForm({ onLogin }) {
  const quickLogin = () => {
    onLogin('admin@gearminds.com', 'admin123');
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
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Click Sign In to access the system</p>
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
    // AI suggests optimal times based on current date
    const today = new Date();
    const suggestedTimes = [];
    
    // Suggest next 3 Saturdays
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
    
    // Simulate AI generation
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
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-blue-700"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Mail className="w-16 h-16 mx-auto mb-3" />
              <p>Select students and click "Generate Email"</p>
              <p className="text-sm mt-2">AI will craft a personalized makeup class email</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-orange-500 to-blue-600 text-white text-xl font-bold py-2 px-4 rounded-lg">
            GearMinds
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Attendance System</h1>
            <p className="text-sm text-gray-600">Welcome, {user.email}</p>
          </div>
        </div>
        
        <button onClick={onLogout} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
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
    { id: 'makeup', label: 'AI Makeup Classes', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-2 mb-6">
      <nav className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Dashboard({ data, setActiveTab, setShowStudentModal, setShowClassModal, setEditingStudent, setEditingClass }) {
  const today = new Date().toISOString().split('T')[0];
  const activeStudents = data.students.filter(s => s.status === 'Active').length;
  const activeClasses = data.classes.filter(c => c.status === 'Active').length;
  const todayAttendance = data.attendance.filter(a => a.date === today);
  const presentToday = todayAttendance.filter(a => a.status === 'Present').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Active Students</p>
              <p className="text-3xl font-bold mt-1">{activeStudents}</p>
            </div>
            <Users className="w-12 h-12 text-orange-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Active Classes</p>
              <p className="text-3xl font-bold mt-1">{activeClasses}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Present Today</p>
              <p className="text-3xl font-bold mt-1">{presentToday}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Records</p>
              <p className="text-3xl font-bold mt-1">{data.attendance.length}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => setActiveTab('attendance')} className="flex items-center justify-center gap-2 bg-orange-50 text-orange-600 py-3 px-4 rounded-lg hover:bg-orange-100">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Take Attendance</span>
          </button>
          <button onClick={() => { setShowStudentModal(true); setEditingStudent(null); }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-100">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Student</span>
          </button>
          <button onClick={() => { setShowClassModal(true); setEditingClass(null); }} className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-3 px-4 rounded-lg hover:bg-green-100">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Create Class</span>
          </button>
          <button onClick={() => setActiveTab('reports')} className="flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-3 px-4 rounded-lg hover:bg-purple-100">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendanceTab({ data, setData, selectedClass, setSelectedClass, getClassDates }) {
  const [makeupDates, setMakeupDates] = useState([]);
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [newMakeupDate, setNewMakeupDate] = useState('');
  
  const activeClasses = data.classes.filter(c => c.status === 'Active');
  const enrolledStudents = selectedClass 
    ? data.enrollments
        .filter(e => e.classId === selectedClass.id)
        .map(e => data.students.find(s => s.id === e.studentId))
        .filter(s => s && s.status === 'Active')
    : [];
  
  const dates = selectedClass ? getClassDates(selectedClass) : [];
  const allDates = [...dates, ...makeupDates].sort();

  const getAttendanceStatus = (studentId, date) => {
    const record = data.attendance.find(a => 
      a.studentId === studentId && 
      a.classId === selectedClass.id && 
      a.date === date
    );
    return record?.status || '';
  };

  const handleStatusClick = (studentId, date, currentStatus) => {
    const statuses = ['', 'P', 'A', 'L', 'E']; // Empty, Present, Absent, Late, Excused
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    setData(prev => {
      const existingIndex = prev.attendance.findIndex(a => 
        a.studentId === studentId && 
        a.classId === selectedClass.id && 
        a.date === date
      );

      if (nextStatus === '') {
        // Remove the record
        return {
          ...prev,
          attendance: prev.attendance.filter((_, i) => i !== existingIndex)
        };
      } else if (existingIndex >= 0) {
        // Update existing record
        const newAttendance = [...prev.attendance];
        newAttendance[existingIndex] = { ...newAttendance[existingIndex], status: nextStatus };
        return { ...prev, attendance: newAttendance };
      } else {
        // Create new record
        return {
          ...prev,
          attendance: [...prev.attendance, {
            id: Date.now() + Math.random(),
            studentId,
            classId: selectedClass.id,
            date,
            status: nextStatus,
            notes: ''
          }]
        };
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'P': return 'bg-green-100 text-green-800 border-green-300';
      case 'A': return 'bg-red-100 text-red-800 border-red-300';
      case 'L': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'E': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const isMakeupDate = (dateStr) => makeupDates.includes(dateStr);

  const addMakeupDate = () => {
    if (newMakeupDate && !allDates.includes(newMakeupDate)) {
      setMakeupDates([...makeupDates, newMakeupDate].sort());
      setNewMakeupDate('');
      setShowMakeupModal(false);
    }
  };

  const removeMakeupDate = (dateStr) => {
    setMakeupDates(makeupDates.filter(d => d !== dateStr));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Sheet</h2>
        <div className="flex gap-3 items-center">
          {selectedClass && (
            <button
              onClick={() => setShowMakeupModal(true)}
              className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
            >
              <Plus className="w-4 h-4" />
              Add Makeup Date
            </button>
          )}
          <div className="w-64">
            <select
              value={selectedClass?.id || ''}
              onChange={(e) => setSelectedClass(activeClasses.find(c => c.id === parseInt(e.target.value)))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a class...</option>
              {activeClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedClass ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-orange-500 to-blue-600 text-white">
            <h3 className="text-lg font-bold">{selectedClass.name}</h3>
            <p className="text-sm text-orange-100">Click cells to cycle: Empty → P (Present) → A (Absent) → L (Late) → E (Excused)</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-sm font-bold text-gray-700 border-r-2 border-gray-300 min-w-[200px]">
                    Student Name
                  </th>
                  {allDates.map(date => (
                    <th key={date} className={`px-3 py-3 text-center text-xs font-semibold border-r border-gray-200 min-w-[60px] ${isMakeupDate(date) ? 'bg-purple-100 text-purple-700' : 'text-gray-700'}`}>
                      <div>{formatDate(date)}</div>
                      {isMakeupDate(date) && (
                        <div className="text-[10px] font-bold mt-1">MAKEUP</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map((student, idx) => (
                  <tr key={student.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="sticky left-0 z-10 px-4 py-3 text-sm font-medium text-gray-900 border-r-2 border-gray-300 bg-inherit">
                      <div>
                        <div>{student.fullName}</div>
                        <div className="text-xs text-gray-500">{student.studentId}</div>
                      </div>
                    </td>
                    {allDates.map(date => {
                      const status = getAttendanceStatus(student.id, date);
                      return (
                        <td key={date} className={`border-r border-gray-200 p-1 ${isMakeupDate(date) ? 'bg-purple-50' : ''}`}>
                          <button
                            onClick={() => handleStatusClick(student.id, date, status)}
                            className={`w-full h-10 rounded border-2 font-bold text-sm transition-all ${getStatusColor(status)}`}
                          >
                            {status}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded flex items-center justify-center text-green-800 font-bold text-xs">P</div>
                <span className="text-gray-700">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded flex items-center justify-center text-red-800 font-bold text-xs">A</div>
                <span className="text-gray-700">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-300 rounded flex items-center justify-center text-yellow-800 font-bold text-xs">L</div>
                <span className="text-gray-700">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center text-blue-800 font-bold text-xs">E</div>
                <span className="text-gray-700">Excused</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Select a class to view the attendance sheet</p>
        </div>
      )}

      {showMakeupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Makeup Class Date</h3>
            
            {makeupDates.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Makeup Dates:</p>
                <div className="space-y-2">
                  {makeupDates.map(date => (
                    <div key={date} className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-lg">
                      <span className="text-sm text-purple-800">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => removeMakeupDate(date)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={newMakeupDate}
                onChange={(e) => setNewMakeupDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={addMakeupDate}
                disabled={!newMakeupDate}
                className="flex-1 bg-purple-500 text-white py-2 rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Makeup Date
              </button>
              <button
                onClick={() => { setShowMakeupModal(false); setNewMakeupDate(''); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentsTab({ data, setData, searchTerm, setSearchTerm, setShowStudentModal, setEditingStudent }) {
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  
  const filteredStudents = data.students.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',').map(h => h.trim());
        
        const students = rows.slice(1).map((row, idx) => {
          const values = row.split(',').map(v => v.trim());
          return {
            studentId: values[0] || `GM${1000 + idx}`,
            fullName: values[1] || '',
            email: values[2] || '',
            phone: values[3] || '',
            status: 'Active'
          };
        }).filter(s => s.fullName);
        
        setPreviewData(students);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkImport = () => {
    const newStudents = previewData.map((s, idx) => ({
      ...s,
      id: Date.now() + idx
    }));
    
    setData(prev => ({
      ...prev,
      students: [...prev.students, ...newStudents]
    }));
    
    setShowBulkUpload(false);
    setCsvFile(null);
    setPreviewData([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Students</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkUpload(true)} className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
            <Upload className="w-4 h-4" />
            Bulk Upload CSV
          </button>
          <button onClick={() => { setShowStudentModal(true); setEditingStudent(null); }} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-blue-700">
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>
      
      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => { setShowBulkUpload(false); setCsvFile(null); setPreviewData([]) }}
          onFileChange={handleFileChange}
          previewData={previewData}
          onImport={handleBulkImport}
        />
      )}

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{student.studentId}</td>
                  <td className="py-3 px-4 text-sm font-medium">{student.fullName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {student.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => { setEditingStudent(student); setShowStudentModal(true); }} className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClassesTab({ data, setData, setShowClassModal, setEditingClass }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Classes</h2>
        <button onClick={() => { setShowClassModal(true); setEditingClass(null); }} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-blue-700">
          <Plus className="w-4 h-4" />
          Create Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.classes.map(classItem => {
          const enrolledCount = data.enrollments.filter(e => e.classId === classItem.id).length;
          return (
            <div key={classItem.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{classItem.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{classItem.description}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {classItem.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{classItem.startDate} to {classItem.endDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{enrolledCount} students enrolled</span>
                </div>
              </div>

              <button onClick={() => { setEditingClass(classItem); setShowClassModal(true); }} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100">
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsTab({ data }) {
  const getStudentStats = (studentId) => {
    const records = data.attendance.filter(a => a.studentId === studentId);
    const present = records.filter(r => r.status === 'P').length;
    return { total: records.length, present, rate: records.length > 0 ? Math.round((present / records.length) * 100) : 0 };
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Attendance Reports</h2>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Student Attendance Summary</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Sessions</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Present</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.students.filter(s => s.status === 'Active').map(student => {
                const stats = getStudentStats(student.id);
                return (
                  <tr key={student.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-medium">{student.fullName}</td>
                    <td className="py-3 px-4 text-sm">{stats.total}</td>
                    <td className="py-3 px-4 text-sm">{stats.present}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                          <div
                            className={`h-2 rounded-full ${stats.rate >= 90 ? 'bg-green-500' : stats.rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${stats.rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ student, onClose, onSave }) {
  const [formData, setFormData] = useState(student || { studentId: '', fullName: '', email: '', phone: '', status: 'Active' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{student ? 'Edit Student' : 'Add New Student'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg font-medium hover:from-orange-600 hover:to-blue-700">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClassModal({ classData, onClose, onSave }) {
  const [formData, setFormData] = useState(classData || { name: '', description: '', startDate: '', endDate: '', maxCapacity: '', status: 'Active' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{classData ? 'Edit Class' : 'Create New Class'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              rows="2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
            <input
              type="number"
              value={formData.maxCapacity}
              onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-2 rounded-lg font-medium hover:from-orange-600 hover:to-blue-700">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}