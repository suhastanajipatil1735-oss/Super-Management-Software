
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { LABELS } from '../constants';
import { ArrowLeft, Save, Plus, Search, Edit3, User, Phone, MapPin, GraduationCap, IndianRupee, Trash2 } from 'lucide-react';

interface StudentsProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
  onSubscriptionReq: () => void;
  autoOpenAdd?: boolean;
}

const Students: React.FC<StudentsProps> = ({ user, lang, onBack, onSubscriptionReq, autoOpenAdd = false }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  
  const labels = LABELS[lang];

  // Determine owner mobile
  const isOwner = user.role === 'owner';
  const dataOwnerMobile = isOwner ? user.mobile : user.linkedOwnerMobile;

  // Form States
  const [formData, setFormData] = useState<Partial<Student>>({
    classGrade: '1',
    medium: 'Marathi',
    feesTotal: 0,
    feesPaid: 0
  });

  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  useEffect(() => {
    loadStudents();
  }, [user, dataOwnerMobile]);

  useEffect(() => {
    if (autoOpenAdd && isOwner && dataOwnerMobile) {
        const checkLimitAndOpen = async () => {
            const count = await db.students.where('ownerMobile').equals(dataOwnerMobile).count();
            if (count < user.studentLimit) {
                setFormData({ classGrade: '1', medium: 'Marathi', feesTotal: 0, feesPaid: 0 });
                setShowAddModal(true);
            } else {
                alert(labels.limitReached);
                onSubscriptionReq();
            }
        };
        checkLimitAndOpen();
    }
  }, [autoOpenAdd, isOwner, dataOwnerMobile, user.studentLimit, onSubscriptionReq, labels.limitReached]);

  const loadStudents = async () => {
    if (dataOwnerMobile) {
        const data = await db.students.where('ownerMobile').equals(dataOwnerMobile).toArray();
        setStudents(data);
    }
  };

  const handleAddClick = () => {
    if (!isOwner) return;
    if (students.length >= user.studentLimit) {
      alert(labels.limitReached);
      onSubscriptionReq();
      return;
    }
    setFormData({ classGrade: '1', medium: 'Marathi', feesTotal: 0, feesPaid: 0 });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!dataOwnerMobile) return;
    if (!formData.name || !formData.mobile) {
      alert("Name and Mobile are required");
      return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      ownerMobile: dataOwnerMobile,
      name: formData.name,
      mobile: formData.mobile,
      rollNo: formData.rollNo || '',
      classGrade: formData.classGrade || '1',
      medium: (formData.medium as any) || 'Marathi',
      address: formData.address || '',
      feesTotal: Number(formData.feesTotal),
      feesPaid: Number(formData.feesPaid),
    };

    await db.students.add(newStudent);
    setShowAddModal(false);
    loadStudents();
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent || !editFormData.name || !editFormData.mobile) {
        alert("Name and Mobile are required");
        return;
    }

    const updatedData = {
        ...editFormData,
        feesTotal: Number(editFormData.feesTotal),
        feesPaid: Number(editFormData.feesPaid)
    };

    await db.students.update(selectedStudent.id, updatedData);
    setIsEditingProfile(false);
    setShowProfileModal(false);
    loadStudents();
  };

  const handleDeleteStudent = async () => {
      if (!selectedStudent) return;
      if (window.confirm(`Are you sure you want to delete ${selectedStudent.name}?`)) {
          await db.students.delete(selectedStudent.id);
          setShowProfileModal(false);
          loadStudents();
      }
  };

  const handleStudentClick = (student: Student) => {
      setSelectedStudent(student);
      setEditFormData(student);
      setIsEditingProfile(false);
      setShowProfileModal(true);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === 'ALL' || student.classGrade === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  const mediumOptions = [
    { value: 'Marathi', label: 'Marathi' },
    { value: 'Semi-English', label: 'Semi-English' },
    { value: 'English', label: 'English' }
  ];

  return (
    <div className="p-4 max-w-5xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">{labels.students}</h2>
        {isOwner && (
            <div className="ml-auto">
              <Button size="sm" onClick={handleAddClick} className="bg-teal-600 hover:bg-teal-700">
                  <Plus size={18} /> {labels.addStudent}
              </Button>
            </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/3">
          <Select 
            label="Filter by Class"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Classes' },
              ...Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))
            ]}
          />
        </div>
        <div className="w-full md:w-2/3 relative">
          <label className="block text-gray-700 text-sm font-medium mb-1.5 ml-1">Search Student Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Enter student name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <Card 
            key={student.id} 
            className="relative overflow-hidden group border-l-4 border-l-blue-500 hover:shadow-md transition-all cursor-pointer active:scale-95"
            onClick={() => handleStudentClick(student)}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">{student.name}</h4>
                <div className="flex flex-wrap items-center gap-2">
                   <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase border border-blue-100">
                     Class {student.classGrade}
                   </span>
                   <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded font-bold uppercase border border-teal-100">
                     {student.medium}
                   </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Due</p>
                <p className={`font-bold text-sm ${student.feesTotal - student.feesPaid > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    ₹{student.feesTotal - student.feesPaid}
                </p>
              </div>
            </div>
          </Card>
        ))}
        {filteredStudents.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
               <Search size={48} className="mx-auto text-gray-200 mb-4" />
               <p className="text-gray-400 font-medium">No matching students found.</p>
            </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={labels.addStudent}>
        <div className="space-y-4">
          <Input 
            label="Full Name"
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <div className="flex gap-4">
            <Input 
              label="Roll No"
              className="w-1/2"
              value={formData.rollNo || ''}
              onChange={e => setFormData({...formData, rollNo: e.target.value})}
            />
            <Select 
              label="Class"
              value={formData.classGrade}
              className="w-1/2"
              onChange={e => setFormData({...formData, classGrade: e.target.value})}
              options={Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))}
            />
          </div>
          <Select 
            label="Medium"
            value={formData.medium}
            onChange={e => setFormData({...formData, medium: e.target.value as any})}
            options={mediumOptions}
          />
          <Input 
            label="Mobile"
            type="tel"
            value={formData.mobile || ''}
            onChange={e => setFormData({...formData, mobile: e.target.value})}
          />
          <Input 
            label="Address"
            value={formData.address || ''}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
          <div className="flex gap-4">
            <Input type="number" label="Total Fees" value={formData.feesTotal || 0} onChange={e => setFormData({...formData, feesTotal: Number(e.target.value)})} />
            <Input type="number" label="Paid Fees" value={formData.feesPaid || 0} onChange={e => setFormData({...formData, feesPaid: Number(e.target.value)})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => setShowAddModal(false)}>{labels.cancel}</Button>
             <Button onClick={handleSubmit}>{labels.save}</Button>
          </div>
        </div>
      </Modal>

      {/* Profile & Edit Modal */}
      <Modal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        title={isEditingProfile ? "Edit Student Profile" : "Student Profile"}
      >
        {selectedStudent && (
          <div className="space-y-5 animate-fade-in">
             {!isEditingProfile ? (
                 <>
                    {/* View Profile View */}
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner border border-blue-200">
                            {selectedStudent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h3>
                            <p className="text-sm text-gray-500">Roll No: {selectedStudent.rollNo || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><GraduationCap size={10}/> Academic</p>
                            <p className="text-sm font-bold text-gray-700">Class {selectedStudent.classGrade} ({selectedStudent.medium})</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Phone size={10}/> Contact</p>
                            <p className="text-sm font-bold text-gray-700">{selectedStudent.mobile}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><MapPin size={10}/> Address</p>
                        <p className="text-sm text-gray-700">{selectedStudent.address || 'No address provided'}</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1"><IndianRupee size={14}/> Fees Overview</p>
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                 <span className="text-gray-500">Total Fees:</span>
                                 <span className="font-bold">₹{selectedStudent.feesTotal}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                 <span className="text-gray-500">Amount Paid:</span>
                                 <span className="font-bold text-green-600">₹{selectedStudent.feesPaid}</span>
                             </div>
                             <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-800">
                                 <span>Remaining Due:</span>
                                 <span className="text-red-500">₹{selectedStudent.feesTotal - selectedStudent.feesPaid}</span>
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        {isOwner && (
                            <>
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-11" onClick={() => setIsEditingProfile(true)}>
                                    <Edit3 size={18} /> Edit Profile
                                </Button>
                                <Button variant="secondary" className="px-4 text-red-500 border-red-100 hover:bg-red-50" onClick={handleDeleteStudent}>
                                    <Trash2 size={18} />
                                </Button>
                            </>
                        )}
                        {!isOwner && <p className="text-xs text-center w-full text-gray-400 italic">Only academy owners can edit student records.</p>}
                    </div>
                 </>
             ) : (
                 <>
                    {/* Edit Mode View */}
                    <div className="space-y-4">
                        <Input label="Student Name" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                        
                        <div className="flex gap-4">
                            <Input label="Roll No" className="w-1/2" value={editFormData.rollNo || ''} onChange={e => setEditFormData({...editFormData, rollNo: e.target.value})} />
                            <Select 
                                label="Class" 
                                className="w-1/2" 
                                value={editFormData.classGrade} 
                                onChange={e => setEditFormData({...editFormData, classGrade: e.target.value})}
                                options={Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))}
                            />
                        </div>

                        <Select 
                            label="Medium" 
                            value={editFormData.medium} 
                            onChange={e => setEditFormData({...editFormData, medium: e.target.value as any})}
                            options={mediumOptions}
                        />

                        <Input label="Mobile Number" type="tel" value={editFormData.mobile || ''} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})} />
                        <Input label="Address" value={editFormData.address || ''} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />

                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                            <p className="text-sm font-bold text-blue-800">Fees Update</p>
                            <div className="flex gap-4">
                                <Input type="number" label="Total Fees" value={editFormData.feesTotal || 0} onChange={e => setEditFormData({...editFormData, feesTotal: Number(e.target.value)})} />
                                <Input type="number" label="Paid Fees" value={editFormData.feesPaid || 0} onChange={e => setEditFormData({...editFormData, feesPaid: Number(e.target.value)})} />
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase">New Balance: <span className="text-red-600">₹{(Number(editFormData.feesTotal) || 0) - (Number(editFormData.feesPaid) || 0)}</span></p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" className="flex-1" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleUpdateStudent}>
                                <Save size={18} /> Update Student
                            </Button>
                        </div>
                    </div>
                 </>
             )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Students;
