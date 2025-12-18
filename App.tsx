
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import FeesReceipts from './pages/FeesReceipts';
import ExamReports from './pages/ExamReports';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import { Layout } from './components/Layout';
import { UserProfile, ViewState } from './types';
import { db, seedDatabase } from './services/db';
import { LABELS, ADMIN_CREDS } from './constants';
import { openWhatsApp } from './services/whatsapp';
import { Modal, Button } from './components/UI';
import { Crown, Loader2 } from 'lucide-react';

const SESSION_KEY = 'super_mgmt_user_session';

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('SPLASH');
  const [lang] = useState<'en'>('en');
  
  const [showSubModal, setShowSubModal] = useState(false);
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false);
  const [autoOpenAddStudent, setAutoOpenAddStudent] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Small delay for branding/splash feel
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      try { 
        await seedDatabase(); 
        
        // Check for existing session in localStorage
        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
            const user = await db.users.get(savedUserId);
            if (user) {
                setCurrentUser(user);
                if (user.role === 'admin') {
                    setCurrentView('ADMIN_PANEL');
                } else {
                    setCurrentView('DASHBOARD_OWNER');
                }
                return; // Exit init, we found a user
            }
        }
      } catch (e) {
        console.error("Initialization error", e);
      }
      
      // If no session or error, go to login
      setCurrentView('LOGIN');
    };
    initApp();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.subscription.active && currentUser.subscription.endDate) {
       const isValid = new Date(currentUser.subscription.endDate) > new Date();
       setIsSubscriptionValid(isValid);
    } else {
       setIsSubscriptionValid(false);
    }
  }, [currentUser, showSubModal]);

  const handleLogin = (user: UserProfile) => {
    // Save session to localStorage
    localStorage.setItem(SESSION_KEY, user.id);
    
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('ADMIN_PANEL');
    } else {
      setCurrentView('DASHBOARD_OWNER');
    }
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
    
    setCurrentUser(null);
    setCurrentView('LOGIN');
  };

  const navigate = (view: string) => {
    if (view === 'STUDENTS_ADD') {
        setAutoOpenAddStudent(true);
        setCurrentView('STUDENTS_VIEW');
    } else if (view === 'STUDENTS_LIST') {
        setAutoOpenAddStudent(false);
        setCurrentView('STUDENTS_VIEW');
    } else {
       if (view === 'ATTENDANCE_VIEW') setCurrentView('ATTENDANCE_VIEW');
       if (view === 'STUDENTS_VIEW') setCurrentView('STUDENTS_VIEW');
       if (view === 'FEES_VIEW') setCurrentView('FEES_VIEW');
       if (view === 'EXAMS_VIEW') setCurrentView('EXAMS_VIEW');
       if (view === 'DASHBOARD_OWNER') setCurrentView('DASHBOARD_OWNER');
       if (view === 'DASHBOARD_TEACHER') setCurrentView('DASHBOARD_TEACHER');
       if (view === 'SETTINGS_VIEW') setCurrentView('SETTINGS_VIEW');
       if (view === 'SUBSCRIPTION') setShowSubModal(true);
    }
  };

  const renderView = () => {
    if (currentView === 'SPLASH') {
        return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc]">
            <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white text-4xl font-bold shadow-xl animate-bounce">
                    S
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-teal-500 rounded-full border-4 border-white"></div>
            </div>
            <h1 className="text-3xl font-bold text-[#1e293b] mt-6 tracking-tight">Super Management</h1>
            <div className="flex flex-col items-center mt-8 gap-3">
                <Loader2 className="animate-spin text-teal-600" size={32} />
                <p className="text-gray-400 font-medium text-sm">Checking session...</p>
            </div>
          </div>
        );
    }
    
    if (currentView === 'LOGIN') {
        return <Login onLoginSuccess={handleLogin} lang={lang} />;
    }

    if (currentView === 'ADMIN_PANEL') return <AdminPanel onLogout={handleLogout} />;
    if (!currentUser) return null;

    let content;
    switch (currentView) {
      case 'DASHBOARD_OWNER':
      case 'DASHBOARD_TEACHER': 
        content = <Dashboard user={currentUser} lang={lang} onNavigate={navigate} onUpdateUser={handleUserUpdate} />;
        break;
      case 'STUDENTS_VIEW':
        content = <Students user={currentUser} lang={lang} onBack={() => setCurrentView('DASHBOARD_OWNER')} onSubscriptionReq={() => setShowSubModal(true)} autoOpenAdd={autoOpenAddStudent} />;
        break;
      case 'ATTENDANCE_VIEW':
        content = <Attendance user={currentUser} lang={lang} onBack={() => setCurrentView('DASHBOARD_OWNER')} />;
        break;
      case 'FEES_VIEW':
        content = <FeesReceipts user={currentUser} lang={lang} onBack={() => setCurrentView('DASHBOARD_OWNER')} />;
        break;
      case 'EXAMS_VIEW':
        content = <ExamReports user={currentUser} lang={lang} onBack={() => setCurrentView('DASHBOARD_OWNER')} />;
        break;
      case 'SETTINGS_VIEW':
        content = <Settings user={currentUser} lang={lang} onBack={() => setCurrentView('DASHBOARD_OWNER')} onUpdateUser={handleUserUpdate} />;
        break;
      default: content = <div>View Not Found</div>;
    }

    return (
        <Layout user={currentUser} currentView={currentView} onNavigate={navigate} onLogout={handleLogout} lang={lang}>
            {content}
        </Layout>
    );
  };

  return (
    <div className="min-h-screen bg-[#eef2f5] text-[#2d3748]">
      {renderView()}
      <Modal isOpen={showSubModal} onClose={() => setShowSubModal(false)} title={isSubscriptionValid ? "My Plan" : LABELS[lang].upgrade}>
          <div className="p-4 text-center">
              <Crown className="mx-auto text-yellow-500 mb-2" size={48} />
              <h3 className="text-xl font-bold mb-2">Premium Features</h3>
              <p className="text-gray-600 mb-4">Upgrade to add unlimited students and unlock all features.</p>
              <Button className="w-full" onClick={() => openWhatsApp(ADMIN_CREDS.MOBILE, "Upgrade Request")}>Contact for Upgrade</Button>
          </div>
      </Modal>
    </div>
  );
};

export default App;
