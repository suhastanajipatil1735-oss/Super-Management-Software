import React, { useState } from 'react';
import { UserProfile, ViewState } from '../types';
import { 
  LayoutDashboard, Users, Calendar, Wallet, Settings, 
  LogOut, Search, Menu, X, Crown, ClipboardList
} from 'lucide-react';
import { LABELS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  currentView: ViewState;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  lang: 'en' | 'mr';
}

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4 ${
      active 
        ? 'bg-[#34495e] border-[#4fd1c5] text-white shadow-lg' 
        : 'border-transparent text-gray-400 hover:text-white hover:bg-[#34495e]/50'
    }`}
  >
    <span className={active ? 'text-[#4fd1c5]' : ''}>{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onNavigate, onLogout, lang }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const labels = LABELS[lang];

  const getViewName = (view: ViewState) => {
    switch (view) {
      case 'DASHBOARD_OWNER': return 'Dashboard';
      case 'DASHBOARD_TEACHER': return 'Dashboard';
      case 'STUDENTS_VIEW': return 'Students';
      case 'ATTENDANCE_VIEW': return 'Attendance';
      case 'FEES_VIEW': return 'Fees & Receipts';
      case 'EXAMS_VIEW': return 'Exam Reports';
      case 'SETTINGS_VIEW': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const navItems = [
    { 
      id: 'DASHBOARD', 
      view: user.role === 'owner' ? 'DASHBOARD_OWNER' : 'DASHBOARD_TEACHER', 
      icon: <LayoutDashboard size={20} />, 
      label: labels.dashboard 
    },
    { 
      id: 'STUDENTS', 
      view: 'STUDENTS_VIEW', 
      icon: <Users size={20} />, 
      label: labels.students 
    },
    { 
      id: 'ATTENDANCE', 
      view: 'ATTENDANCE_VIEW', 
      icon: <Calendar size={20} />, 
      label: labels.attendance 
    },
    { 
      id: 'EXAMS', 
      view: 'EXAMS_VIEW', 
      icon: <ClipboardList size={20} />, 
      label: 'Test/Exam Report' 
    },
    ...(user.role === 'owner' ? [
      { 
        id: 'FEES', 
        view: 'FEES_VIEW', 
        icon: <Wallet size={20} />, 
        label: labels.fees 
      },
      { 
        id: 'SUBSCRIPTION', 
        view: 'SUBSCRIPTION', 
        icon: <Crown size={20} />, 
        label: 'Subscription' 
      }
    ] : []),
    { 
      id: 'SETTINGS', 
      view: 'SETTINGS_VIEW', 
      icon: <Settings size={20} />, 
      label: labels.settings 
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-poppins">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e293b] transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4fd1c5] to-[#38a169] flex items-center justify-center text-white font-bold text-xl">
               S
             </div>
             <h1 className="text-xl font-bold text-white tracking-wide">SCHOOL</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map(item => (
            <SidebarItem 
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={currentView === item.view || (item.id === 'DASHBOARD' && (currentView === 'DASHBOARD_OWNER' || currentView === 'DASHBOARD_TEACHER'))}
              onClick={() => {
                if (item.id === 'SUBSCRIPTION') {
                    onNavigate('SUBSCRIPTION');
                } else {
                    onNavigate(item.view);
                }
                setIsMobileMenuOpen(false);
              }}
            />
          ))}
          
          <div className="pt-8 mt-8 border-t border-gray-700/50">
             <SidebarItem 
               icon={<LogOut size={20} />} 
               label={labels.logout} 
               active={false} 
               onClick={onLogout} 
             />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-20 bg-white shadow-sm flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-600">
               <Menu size={24} />
             </button>
             <h2 className="text-2xl font-bold text-[#1e293b] hidden md:block">{getViewName(currentView)}</h2>
           </div>

           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center bg-[#f8fafc] px-4 py-2 rounded-full border border-gray-100 w-80">
                 <Search size={18} className="text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="Search for students..." 
                   className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-600"
                 />
              </div>

              <div className="flex items-center gap-4">
                 {/* Clickable Profile Section */}
                 <div 
                    className="flex items-center gap-3 pl-4 border-l border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 group"
                    onClick={() => onNavigate('SETTINGS_VIEW')}
                    title="View Profile Settings"
                 >
                    <div className="text-right hidden md:block">
                       <p className="text-sm font-bold text-[#1e293b]">{user.instituteName}</p>
                       <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#1e293b] text-white flex items-center justify-center font-bold text-lg border-2 border-gray-100 shadow-sm transform transition-transform group-hover:scale-105">
                       {user.instituteName.charAt(0).toUpperCase()}
                    </div>
                 </div>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-8 overflow-y-auto flex-1">
           {children}
        </main>
      </div>
    </div>
  );
};