
import React, { useEffect, useState } from 'react';
import { UserProfile, Student } from '../types';
import { db } from '../services/db';
import { Button } from '../components/UI';
import { LABELS, ADMIN_CREDS } from '../constants';
import { IndianRupee, Clock, MessageCircleQuestion, GraduationCap } from 'lucide-react';
import { openWhatsApp } from '../services/whatsapp';
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

const Dashboard: React.FC<DashboardProps> = ({ user, lang }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const labels = LABELS[lang];

  useEffect(() => {
    const loadData = async () => {
      const studData = await db.students.where('ownerMobile').equals(user.mobile).toArray();
      setStudents(studData);
    };
    loadData();
  }, [user.mobile]);

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
         <Button size="sm" variant="secondary" onClick={() => openWhatsApp(ADMIN_CREDS.MOBILE, "Hi")} className="bg-white border-none shadow-sm text-blue-600 hover:bg-blue-50 font-bold">
             <MessageCircleQuestion size={16} /> Help & Support
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
            title={labels.totalStudents} 
            value={students.length} 
            icon={<GraduationCap size={28} />} 
            colorClass="bg-blue-100 text-blue-600"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800">Today's Attendance</h3>
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
    </div>
  );
};

export default Dashboard;
