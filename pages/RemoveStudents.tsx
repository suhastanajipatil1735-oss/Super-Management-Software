
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Select } from '../components/UI';
import { Trash2, UserMinus, Search, CheckSquare, Square, AlertTriangle } from 'lucide-react';

interface RemoveStudentsProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
}

const RemoveStudents: React.FC<RemoveStudentsProps> = ({ user, lang, onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('1');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine owner mobile
  const isOwner = user.role === 'owner';
  const dataOwnerMobile = isOwner ? user.mobile : user.linkedOwnerMobile;

  useEffect(() => {
    loadClassStudents();
  }, [selectedClass, dataOwnerMobile]);

  const loadClassStudents = async () => {
    if (!dataOwnerMobile) return;
    const data = await db.students
      .where('ownerMobile').equals(dataOwnerMobile)
      .and(s => s.classGrade === selectedClass)
      .toArray();
    setStudents(data);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to remove ${selectedIds.size} student(s) from Class ${selectedClass}? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await db.students.bulkDelete(Array.from(selectedIds));
      await loadClassStudents();
      alert('Students removed successfully. Dashboard statistics updated.');
    } catch (error) {
      alert('Error removing students.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-red-600">
            <UserMinus /> Remove Students
          </h2>
          <p className="text-gray-500 text-sm">Select a class to manage and remove records.</p>
        </div>
        <div className="w-full md:w-64">
          <Select 
            label="Filter by Class"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            options={Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAll}
              disabled={students.length === 0}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {selectedIds.size === students.length && students.length > 0 ? (
                <CheckSquare size={18} className="text-blue-600" />
              ) : (
                <Square size={18} />
              )}
              Select All
            </button>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              {students.length} Students found
            </span>
          </div>
          {selectedIds.size > 0 && (
            <Button 
              size="sm" 
              variant="danger" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="animate-fade-in"
            >
              <Trash2 size={16} /> Remove Selected ({selectedIds.size})
            </Button>
          )}
        </div>

        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          {students.map(student => (
            <div 
              key={student.id} 
              className={`p-4 flex items-center gap-4 transition-colors cursor-pointer hover:bg-gray-50 ${selectedIds.has(student.id) ? 'bg-red-50/30' : ''}`}
              onClick={() => toggleSelect(student.id)}
            >
              <div className="shrink-0">
                {selectedIds.has(student.id) ? (
                  <CheckSquare size={20} className="text-red-500" />
                ) : (
                  <Square size={20} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{student.name}</p>
                <p className="text-xs text-gray-500">Roll: {student.rollNo || 'N/A'} | Medium: {student.medium}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-gray-400">{student.mobile}</p>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-2">
              <Search size={48} className="text-gray-200" />
              <p className="text-gray-400">No students found in Class {selectedClass}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3">
        <AlertTriangle className="text-orange-500 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-orange-800">Important Note</h4>
          <p className="text-xs text-orange-700 leading-relaxed">
            Removing students will permanently delete their records, including attendance links and fee logs associated with their ID. 
            The Dashboard student count and fee analytics will update automatically after removal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RemoveStudents;
