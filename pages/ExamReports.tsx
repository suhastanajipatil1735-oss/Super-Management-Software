import React, { useState, useEffect } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select } from '../components/UI';
import { LABELS } from '../constants';
import { openWhatsApp } from '../services/whatsapp';
import { ArrowLeft, Send, ClipboardList } from 'lucide-react';

interface ExamReportsProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
}

const ExamReports: React.FC<ExamReportsProps> = ({ user, lang, onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('1');
  const [examName, setExamName] = useState('');
  const [totalMarks, setTotalMarks] = useState<string>('50');
  
  // Store marks as: { studentId: marks }
  const [marksData, setMarksData] = useState<Record<string, string>>({});

  const isOwner = user.role === 'owner';
  const dataOwnerMobile = isOwner ? user.mobile : user.linkedOwnerMobile;

  useEffect(() => {
    const loadStudents = async () => {
      if (dataOwnerMobile) {
        const data = await db.students
            .where('ownerMobile').equals(dataOwnerMobile)
            .and(s => s.classGrade === selectedClass)
            .toArray();
        setStudents(data);
        
        // Reset marks when class changes
        const initialMarks: Record<string, string> = {};
        data.forEach(s => initialMarks[s.id] = '');
        setMarksData(initialMarks);
      }
    };
    loadStudents();
  }, [selectedClass, dataOwnerMobile]);

  const handleMarkChange = (studentId: string, value: string) => {
    // Validate number
    const num = parseInt(value);
    const max = parseInt(totalMarks) || 0;
    
    if (value !== '' && (isNaN(num) || num < 0 || num > max)) {
        return; // Reject invalid input
    }
    
    setMarksData(prev => ({
        ...prev,
        [studentId]: value
    }));
  };

  const handleSendReport = () => {
      if (!examName.trim()) {
          alert("Please enter Exam/Test Name");
          return;
      }
      if (!totalMarks || parseInt(totalMarks) <= 0) {
          alert("Please enter valid Total Marks");
          return;
      }
      if (students.length === 0) {
          alert("No students in selected class");
          return;
      }

      // Construct Report
      let report = `*📋 EXAM REPORT 📋*\n`;
      report += `*${user.instituteName}*\n\n`;
      report += `📝 Test Name: *${examName}*\n`;
      report += `🏫 Class: *${selectedClass}*\n`;
      report += `💯 Total Marks: *${totalMarks}*\n`;
      report += `--------------------------------\n`;
      
      let filledCount = 0;
      students.forEach((student, index) => {
          const marks = marksData[student.id];
          if (marks && marks.trim() !== '') {
              report += `${index + 1}. ${student.name}: *${marks}/${totalMarks}*\n`;
              filledCount++;
          } else {
              report += `${index + 1}. ${student.name}: *AB*\n`; // Absent or Not entered
          }
      });
      
      report += `--------------------------------\n`;
      report += `Generated on: ${new Date().toLocaleDateString()}`;

      if (filledCount === 0) {
          if (!window.confirm("No marks entered. Send empty report?")) return;
      }

      // Send to User's OWN mobile
      openWhatsApp(user.mobile, report);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="text-blue-600" /> Test/Exam Report
        </h2>
      </div>

      <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                  <Input 
                      label="Exam/Test Name"
                      placeholder="e.g. Unit Test 1"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                  />
              </div>
              <div>
                  <Input 
                      label="Total Marks"
                      type="number"
                      placeholder="e.g. 50"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(e.target.value)}
                  />
              </div>
              <div>
                  <Select 
                    label="Select Class"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    options={Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))}
                  />
              </div>
          </div>
      </Card>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-20">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Student Marks Entry</h3>
              <span className="text-sm text-gray-500">Total: {totalMarks}</span>
          </div>
          
          <div className="divide-y divide-gray-100">
              {students.map((student) => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                          <span className="font-bold text-gray-800">{student.name}</span>
                          <span className="text-xs text-gray-500">Roll No: {student.rollNo || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number" 
                              className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-center font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="0"
                              value={marksData[student.id] || ''}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          />
                          <span className="text-gray-400 font-medium text-sm">/ {totalMarks}</span>
                      </div>
                  </div>
              ))}
              {students.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                      No students found in Class {selectedClass}
                  </div>
              )}
          </div>
      </div>

      {/* Floating Send Button */}
      {students.length > 0 && (
          <div className="fixed bottom-6 right-6 z-20">
             <Button size="lg" onClick={handleSendReport} className="shadow-xl bg-green-600 hover:bg-green-700">
                 <Send size={20} /> Generate & Send Report
             </Button>
          </div>
      )}
    </div>
  );
};

export default ExamReports;