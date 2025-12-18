
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
import { Modal, Button, Card } from './components/UI';
import { Clock, AlertTriangle, CheckCircle, Crown, Infinity as InfinityIcon, Loader2 } from 'lucide-react';

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('SPLASH');
  const [lang] = useState<'en'>('en');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [loginStep, setLoginStep] = useState<'DETAILS' | 'ROLE'>('DETAILS');
  const [cachedDetails, setCachedDetails] = useState<{name: string, mobile: string}>({name: '', mobile: ''});
  const [showSubModal, setShowSubModal] = useState(false);
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false);
  const [autoOpenAddStudent, setAutoOpenAddStudent] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // 1. Check for Sync Link
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'join') {
          setIsSyncing(true);
          try {
              const ownerMobile = atob(params.get('om') || '');
              const instName = atob(params.get('in') || '');
              const teacherCode = atob(params.get('tc') || '');

              if (ownerMobile && instName && teacherCode) {
                  // Add owner record to local DB so teacher can verify code
                  await db.users.put({
                      id: ownerMobile,
                      mobile: ownerMobile,
                      instituteName: instName,
                      teacherCode: teacherCode,
                      role: 'owner',
                      plan: 'subscribed',
                      subscription: { active: true, planType: null },
                      studentLimit: 9999,
                      createdAt: new Date().toISOString()
                  });
                  console.log("Sync Successful!");
              }
          } catch (e) {
              console.error("Sync failed", e);
          }
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsSyncing(false);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      try { await seedDatabase(); } catch (e) {}
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
    setCachedDetails({ name: user.instituteName, mobile: user.mobile });
    setCurrentUser(user);
    if (user.role === 'admin') setCurrentView('ADMIN_PANEL');
    else setCurrentView(user.role === 'owner' ? 'DASHBOARD_OWNER' : 'DASHBOARD_TEACHER');
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setCachedDetails(prev => ({ ...prev, name: updatedUser.instituteName }));
  };

  const handleLogout = () => {
    setLoginStep('DETAILS');
    setCachedDetails({name: '', mobile: ''});
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
       if (view === 'SETTINGS_VIEW') setCurrentView('SETTINGS_VIEW');
       if (view === 'SUBSCRIPTION') setShowSubModal(true);
    }
  };

  const renderView = () => {
    if (currentView === 'SPLASH' || isSyncing) {
        return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] to-[#e6fffa]">
            <h1 className="text-4xl font-bold text-[#1e293b] mb-4">Super Management</h1>
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-teal-600" size={40} />
                <p className="text-gray-500 font-medium">{isSyncing ? "Syncing Academy Data..." : "Loading Application..."}</p>
            </div>
          </div>
        );
    }
    
    if (currentView === 'LOGIN') {
        return <Login onLoginSuccess={handleLogin} lang={lang} initialStep={loginStep} initialDetails={cachedDetails} />;
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
