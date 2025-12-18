
import React, { useEffect, useState } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Card, Button, Modal, Input } from '../components/UI';
import { LABELS, THEME, ADMIN_CREDS } from '../constants';
import { Users, IndianRupee, Clock, Plus, MoreHorizontal, MessageCircleQuestion, Key, GraduationCap, Briefcase, Share2, Copy } from 'lucide-react';
import { formatCurrency, openWhatsApp, generateTeacherAccessLink } from '../services/whatsapp';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onNavigate: (view: string) => void;
  onUpdateUser: (user: UserProfile) => void;
}

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  colorClass: string;
}> = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-[#1e293b]">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, lang, onNavigate, onUpdateUser }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  
  const labels = LABELS[lang];
  const isOwner = user.role === 'owner';
  const dataOwnerMobile = isOwner ? user.mobile : user.linkedOwnerMobile;

  useEffect(() => {
    setTeacherCode(user.teacherCode || '');
  }, [user.teacherCode]);

  useEffect(() => {
    const loadData = async () => {
      if (dataOwnerMobile) {
        const studData = await db.students.where('ownerMobile').equals(dataOwnerMobile).toArray();
        setStudents(studData);
        
        if (isOwner) {
            const teachers = await db.users.where('linkedOwnerMobile').equals(user.mobile).count();
            setTeacherCount(teachers);
        }
      }
    };
    loadData();
  }, [dataOwnerMobile, isOwner, user.mobile]);

  const handleSaveCode = async () => {
      if (!teacherCode) return alert("Code cannot be empty");
      await db.users.update(user.id, { teacherCode });
      const updatedUser = { ...user, teacherCode };
      onUpdateUser(updatedUser);
      setShowCodeModal(false);
  };

  const handleShareAccess = () => {
      if (!user.teacherCode) return alert("Please set a teacher code first!");
      const link = generateTeacherAccessLink(user.mobile, user.instituteName, user.teacherCode);
      const msg = `*Teacher Access Invitation*\n\nAcademy: *${user.instituteName}*\nLogin Code: *${user.teacherCode}*\n\nClick this link to join on your mobile:\n${link}`;
      openWhatsApp('', msg); // Opens WA to choose contact
  };

  const totalFees = students.reduce((acc, s) => acc + s.feesTotal, 0);
  const collectedFees = students.reduce((acc, s) => acc + s.feesPaid, 0);
  const dueFees = totalFees - collectedFees;

  const financialData = [
      { name: labels.feesCollected, amount: collectedFees },
      { name: labels.feesDue, amount: dueFees }
  ];

  const attendanceData = [
    { name: 'Present', value: 84, color: '#38a169' },
    { name: 'Absent', value: 16, color: '#fbbf24' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-end gap-3 mb-2">
         {isOwner && (
            <>
            <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => setShowCodeModal(true)} 
                className="bg-white border-none shadow-sm text-yellow-600 hover:bg-yellow-50 font-semibold"
            >
                <Key size={16} /> 
                {user.teacherCode ? `Code: ${user.teacherCode}` : "Set Teacher Code"}
            </Button>
            {user.teacherCode && (
                <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={handleShareAccess} 
                    className="bg-[#4fd1c5]/10 border-none shadow-sm text-[#319795] hover:bg-[#4fd1c5]/20 font-bold"
                >
                    <Share2 size={16} /> Share Link to Teacher
                </Button>
            )}
            </>
         )}
         <Button size="sm" variant="secondary" onClick={() => openWhatsApp(ADMIN_CREDS.MOBILE, "Hi")} className="bg-white border-none shadow-sm text-blue-600 hover:bg-blue-50">
             <MessageCircleQuestion size={16} /> Help
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={labels.totalStudents} 
            value={students.length} 
            icon={<GraduationCap size={28} />} 
            colorClass="bg-blue-100 text-blue-600"
        />
        {isOwner && (
          <>
            <StatCard 
                title="Teachers" 
                value={teacherCount} 
                icon={<Briefcase size={24} />} 
                colorClass="bg-pink-100 text-pink-500"
            />
            <StatCard 
                title={labels.feesCollected} 
                value={'₹' + (collectedFees / 1000).toFixed(1) + 'k'} 
                icon={<IndianRupee size={24} />} 
                colorClass="bg-orange-100 text-orange-500"
            />
            <StatCard 
                title={labels.feesDue} 
                value={'₹' + (dueFees / 1000).toFixed(1) + 'k'} 
                icon={<Clock size={24} />} 
                colorClass="bg-teal-100 text-teal-600"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isOwner && (
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-800">Financial Overview</h3>
                    <div className="flex gap-2">
                         <span className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-[#2d3748]"></div> Collected</span>
                         <span className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-[#e53e3e]"></div> Due</span>
                    </div>
                </div>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financialData} barSize={40}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a0aec0', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0aec0', fontSize: 12}} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                {financialData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2d3748' : '#e53e3e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
        )}

        <div className={isOwner ? "space-y-6" : "lg:col-span-3 space-y-6"}>
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${!isOwner ? 'max-w-xl' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800">Attendance</h3>
                    <MoreHorizontal size={20} className="text-gray-400" />
                </div>
                <div className="h-[200px] w-full relative flex items-center justify-center">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={attendanceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {attendanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <span className="text-3xl font-bold text-[#1e293b]">84%</span>
                         <span className="text-xs text-gray-400">Average</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <Modal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} title="Teacher Access Code">
          <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-2">
                  <p className="text-sm text-yellow-800 font-bold mb-1">Current Code</p>
                  <p className="text-2xl font-mono text-gray-800">{teacherCode || 'Not Set'}</p>
              </div>
              <p className="text-gray-600 text-sm">Set a code for your teachers. They will need this code to login on their mobile.</p>
              <Input 
                  label="Enter New Code"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  placeholder="Ex. 1234"
              />
              <Button onClick={handleSaveCode} className="w-full">Update Code</Button>
          </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
