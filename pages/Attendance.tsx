import React, { useState, useEffect } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Select } from '../components/UI';
import { LABELS } from '../constants';
import { openWhatsApp } from '../services/whatsapp';
import { ArrowLeft, CheckCircle, XCircle, Share2 } from 'lucide-react';

interface AttendanceProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, lang, onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('10');
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present'|'absent'>>({});
  const labels = LABELS[lang];

  // Determine owner mobile
  const isOwner = user.role === 'owner';
  const dataOwnerMobile = isOwner ? user.mobile : user.linkedOwnerMobile;

  useEffect(() => {
    loadClassStudents();
  }, [selectedClass, user, dataOwnerMobile]);

  const loadClassStudents = async () => {
    if (!dataOwnerMobile) return;

    const data = await db.students
      .where('ownerMobile').equals(dataOwnerMobile)
      .and(s => s.classGrade === selectedClass)
      .toArray();
      
    setStudents(data);
    
    // Init state
    const initial: Record<string, 'present'|'absent'> = {};
    data.forEach(s => initial[s.id] = 'present');
    setAttendanceState(initial);
  };

  const toggleAttendance = (id: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSendReport = () => {
    const absentStudents = students.filter(s => attendanceState[s.id] === 'absent');
    const absentNames = absentStudents.map(s => s.name).join(', ');
    const date = new Date().toLocaleDateString();
    const msg = `Absent students on ${date}: ${absentNames || 'None'} - ${user.instituteName}`;
    
    // Send to the registered mobile of the account (or owner's mobile if we prefer)
    // Here we send to the current user's mobile so they can forward it.
    openWhatsApp(user.mobile, msg);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in">
       <div className="flex items-center gap-4 mb-6">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">{labels.attendance}</h2>
      </div>

      <div className="mb-6">
         <Select 
            label="Select Class"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            options={Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))}
            className="max-w-xs"
         />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-20">
        {students.map(student => (
          <Card key={student.id} className="flex justify-between items-center py-4" onClick={() => toggleAttendance(student.id)}>
            <div>
              <p className="font-bold">{student.name}</p>
              <p className="text-sm text-gray-500">Roll: {student.rollNo}</p>
            </div>
            <div className="flex items-center gap-2">
               {attendanceState[student.id] === 'present' ? (
                 <span className="flex items-center gap-1 text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">
                    <CheckCircle size={16} /> Present
                 </span>
               ) : (
                 <span className="flex items-center gap-1 text-red-500 font-bold bg-red-100 px-3 py-1 rounded-full">
                    <XCircle size={16} /> Absent
                 </span>
               )}
            </div>
          </Card>
        ))}
         {students.length === 0 && <p className="text-gray-500">No students found for this class.</p>}
      </div>

      {/* Floating Action Button for Report */}
      <div className="fixed bottom-6 right-6">
        <Button onClick={handleSendReport} className="shadow-xl">
           <Share2 size={20} /> {labels.sendReport}
        </Button>
      </div>
    </div>
  );
};

export default Attendance;