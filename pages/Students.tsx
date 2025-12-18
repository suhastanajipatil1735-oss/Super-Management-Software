
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { LABELS, FREE_STUDENT_LIMIT } from '../constants';
import { ArrowLeft, Save, Plus, Search, Filter } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  
  const labels = LABELS[lang];

  // Determine owner mobile
  const isOwner = user.role === 'owner';
  const dataOwnerMobile = isOwner ? user.mobile : user.linkedOwnerMobile;

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    classGrade: '1',
    feesTotal: 0,
    feesPaid: 0
  });

  useEffect(() => {
    loadStudents();
  }, [user, dataOwnerMobile]);

  // Handle Auto Open Add Modal
  useEffect(() => {
    if (autoOpenAdd && isOwner && dataOwnerMobile) {
        const checkLimitAndOpen = async () => {
            const count = await db.students.where('ownerMobile').equals(dataOwnerMobile).count();
            if (count < user.studentLimit) {
                setFormData({ classGrade: '1', feesTotal: 0, feesPaid: 0 });
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
    setFormData({ classGrade: '1', feesTotal: 0, feesPaid: 0 });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!dataOwnerMobile) return;
    if (!formData.name || !formData.mobile) {
      alert("Name and Mobile are required");
      return;
    }

    const count = await db.students.where('ownerMobile').equals(dataOwnerMobile).count();
    if (count >= user.studentLimit) {
        alert(labels.limitReached);
        setShowAddModal(false);
        onSubscriptionReq();
        return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      ownerMobile: dataOwnerMobile,
      name: formData.name,
      mobile: formData.mobile,
      rollNo: formData.rollNo || '',
      classGrade: formData.classGrade || '1',
      address: formData.address || '',
      feesTotal: Number(formData.feesTotal),
      feesPaid: Number(formData.feesPaid),
    };

    await db.students.add(newStudent);
    setShowAddModal(false);
    setFormData({ classGrade: '1', feesTotal: 0, feesPaid: 0 });
    loadStudents();
  };

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === 'ALL' || student.classGrade === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  const calculateDueFees = () => {
    const total = Number(formData.feesTotal) || 0;
    const paid = Number(formData.feesPaid) || 0;
    return total - paid;
  };

  const dueAmount = calculateDueFees();

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
          <Card key={student.id} className="relative overflow-hidden group border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-gray-800 leading-tight">{student.name}</h4>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-100">
                     Class {student.classGrade}
                   </span>
                   <span className="text-gray-400 text-xs">Roll: {student.rollNo || 'N/A'}</span>
                </div>
                <p className="text-gray-500 text-xs font-mono">{student.mobile}</p>
              </div>
              {isOwner && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Balance</p>
                    <p className={`font-bold text-sm ${student.feesTotal - student.feesPaid > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {student.feesTotal - student.feesPaid > 0 ? `₹${student.feesTotal - student.feesPaid}` : 'Paid'}
                    </p>
                  </div>
              )}
            </div>
          </Card>
        ))}
        {filteredStudents.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
               <Search size={48} className="mx-auto text-gray-200 mb-4" />
               <p className="text-gray-400 font-medium">No matching students found.</p>
               {searchTerm || selectedClass !== 'ALL' ? (
                 <button onClick={() => {setSearchTerm(''); setSelectedClass('ALL');}} className="text-blue-500 text-sm mt-2 hover:underline">Clear all filters</button>
               ) : null}
            </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={labels.addStudent}>
        <div className="space-y-4">
          <Input 
            placeholder="Student Name" 
            label="Name"
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <div className="flex gap-4">
            <Input 
              placeholder="Roll No" 
              label="Roll No"
              className="w-1/2"
              value={formData.rollNo || ''}
              onChange={e => setFormData({...formData, rollNo: e.target.value})}
            />
            <Select 
              label="Class"
              value={formData.classGrade}
              onChange={e => setFormData({...formData, classGrade: e.target.value})}
              options={Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))}
            />
          </div>
          <Input 
            placeholder="Mobile Number" 
            label="Mobile"
            type="tel"
            value={formData.mobile || ''}
            onChange={e => setFormData({...formData, mobile: e.target.value})}
          />
          <Input 
            placeholder="Address" 
            label="Address"
            value={formData.address || ''}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
          <div className="flex gap-4">
            <Input 
              type="number"
              label="Total Fees"
              value={formData.feesTotal || 0}
              onChange={e => setFormData({...formData, feesTotal: Number(e.target.value)})}
            />
            <Input 
              type="number"
              label="Paid Fees"
              value={formData.feesPaid || 0}
              onChange={e => setFormData({...formData, feesPaid: Number(e.target.value)})}
            />
          </div>
          
          <div className="flex justify-end -mt-2">
             <div className={`px-3 py-1 rounded-md text-sm font-bold ${dueAmount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                Due Fees: ₹{dueAmount}
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => setShowAddModal(false)}>{labels.cancel}</Button>
             <Button onClick={handleSubmit}>{labels.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Students;
