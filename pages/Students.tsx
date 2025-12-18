import React, { useState, useEffect } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { LABELS, FREE_STUDENT_LIMIT } from '../constants';
import { ArrowLeft, Save, Plus } from 'lucide-react';

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
        // Check limit directly from DB to be safe
        const checkLimitAndOpen = async () => {
            const count = await db.students.where('ownerMobile').equals(dataOwnerMobile).count();
            if (count < user.studentLimit) {
                // Clear form and open
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
    if (!isOwner) return; // Extra safety
    if (students.length >= user.studentLimit) {
      alert(labels.limitReached);
      onSubscriptionReq();
      return;
    }
    // Clear form and open
    setFormData({ classGrade: '1', feesTotal: 0, feesPaid: 0 });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!dataOwnerMobile) return;
    if (!formData.name || !formData.mobile) {
      alert("Name and Mobile are required");
      return;
    }

    // Double check limit before saving
    const count = await db.students.where('ownerMobile').equals(dataOwnerMobile).count();
    if (count >= user.studentLimit) {
        alert(labels.limitReached);
        setShowAddModal(false);
        onSubscriptionReq();
        return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      ownerMobile: dataOwnerMobile, // Assign to correct owner
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

  const calculateDueFees = () => {
    const total = Number(formData.feesTotal) || 0;
    const paid = Number(formData.feesPaid) || 0;
    return total - paid;
  };

  const dueAmount = calculateDueFees();

  return (
    <div className="p-4 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">{labels.students}</h2>
        {isOwner && (
            <div className="ml-auto">
            <Button size="sm" onClick={handleAddClick}>
                <Plus size={18} /> {labels.addStudent}
            </Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {students.map((student) => (
          <Card key={student.id} className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-lg">{student.name}</h4>
              <p className="text-gray-500 text-sm">Class: {student.classGrade} • Roll: {student.rollNo}</p>
              <p className="text-gray-400 text-xs">{student.mobile}</p>
            </div>
            {isOwner && (
                <div className="text-right">
                <p className="text-xs text-gray-500">Fees</p>
                <p className={`font-bold ${student.feesTotal - student.feesPaid > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {student.feesTotal - student.feesPaid > 0 ? `Due: ₹${student.feesTotal - student.feesPaid}` : 'Paid'}
                </p>
                </div>
            )}
          </Card>
        ))}
        {students.length === 0 && (
            <p className="text-center text-gray-400 col-span-2 mt-10">No students added yet.</p>
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
          
          {/* Due Fees Calculation Display */}
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