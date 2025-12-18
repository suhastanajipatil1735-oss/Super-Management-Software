
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import RemoveStudents from './pages/RemoveStudents';
import Attendance from './pages/Attendance';
import FeesReceipts from './pages/FeesReceipts';
import ExamReports from './pages/ExamReports';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import { Layout } from './components/Layout';
import { UserProfile, ViewState, SubscriptionRequest } from './types';
import { db, seedDatabase } from './services/db';
import { LABELS, ADMIN_CREDS, SUBSCRIPTION_PRICE } from './constants';
import { openWhatsApp } from './services/whatsapp';
import { Modal, Button } from './components/UI';
import { Crown, Loader2, CheckCircle2, Clock, Infinity as InfinityIcon, CloudSync } from 'lucide-react';
import { fetchUserSupabaseStatus, sendSubscriptionRequestToSupabase } from './services/supabase';

const SESSION_KEY = 'super_mgmt_user_session';

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('SPLASH');
  const [lang] = useState<'en'>('en');
  
  const [showSubModal, setShowSubModal] = useState(false);
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false);
  const [autoOpenAddStudent, setAutoOpenAddStudent] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      try { 
        await seedDatabase(); 
        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
            const user = await db.users.get(savedUserId);
            if (user) {
                setCurrentUser(user);
                // Initial cloud check
                checkSupabaseApproval(user);
                
                if (user.role === 'admin') {
                    setCurrentView('ADMIN_PANEL');
                } else {
                    setCurrentView(user.role === 'owner' ? 'DASHBOARD_OWNER' : 'DASHBOARD_TEACHER');
                }
                return;
            }
        }
      } catch (e) {
        console.error("Initialization error", e);
      }
      setCurrentView('LOGIN');
    };
    initApp();
  }, []);

  /**
   * Check Supabase for the 'acceptance' flag.
   * If true, unlock Lifetime Premium instantly.
   */
  const checkSupabaseApproval = async (user: UserProfile) => {
    if (user.role !== 'owner') return;
    setIsCloudSyncing(true);
    
    const cloudStatus = await fetchUserSupabaseStatus(user.mobile);
    if (cloudStatus) {
      let updatedUser = { ...user };
      let hasChanged = false;

      // Acceptance Logic: If Admin set Acceptance to True in Supabase
      if (cloudStatus.acceptance && user.plan !== 'subscribed') {
        updatedUser.plan = 'subscribed';
        updatedUser.studentLimit = 99999;
        updatedUser.subscription = {
          active: true,
          planType: 'lifetime',
          startDate: new Date().toISOString()
        };
        hasChanged = true;
      }

      // Handle remote plan status updates if needed
      if (hasChanged) {
        await db.users.update(user.id, updatedUser);
        setCurrentUser(updatedUser);
      }
    }
    setIsCloudSyncing(false);
  };

  useEffect(() => {
    if (currentUser && currentUser.plan === 'subscribed' && currentUser.subscription.active) {
       setIsSubscriptionValid(true);
    } else {
       setIsSubscriptionValid(false);
    }
  }, [currentUser, showSubModal]);

  const handleLogin = (user: UserProfile) => {
    localStorage.setItem(SESSION_KEY, user.id);
    setCurrentUser(user);
    checkSupabaseApproval(user);
    if (user.role === 'admin') {
      setCurrentView('ADMIN_PANEL');
    } else {
      setCurrentView(user.role === 'owner' ? 'DASHBOARD_OWNER' : 'DASHBOARD_TEACHER');
    }
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setCurrentView('LOGIN');
  };

  const handleSendSubscriptionRequest = async () => {
    if (!currentUser) return;
    
    // 1. Update Supabase (request_sent = true)
    setIsCloudSyncing(true);
    const success = await sendSubscriptionRequestToSupabase(currentUser.mobile);
    setIsCloudSyncing(false);

    if (success) {
        alert("Request sent successfully! Your academy status will update as soon as the administrator accepts it.");
        // Notify admin via WhatsApp too
        openWhatsApp(ADMIN_CREDS.MOBILE, `New Lifetime Subscription Request for ${currentUser.instituteName} (${currentUser.mobile}). Please review in Supabase.`);
        setShowSubModal(false);
    } else {
        alert("Sync error. Please try again.");
    }
  };

  const navigate = (view: string) => {
    if (view === 'STUDENTS_ADD') {
        setAutoOpenAddStudent(true);
        setCurrentView('STUDENTS_VIEW');
    } else if (view === 'STUDENTS_LIST') {
        setAutoOpenAddStudent(false);
        setCurrentView('STUDENTS_VIEW');
    } else if (view === 'SUBSCRIPTION') {
        setShowSubModal(true);
        if (currentUser) checkSupabaseApproval(currentUser); // Refresh on open
    } else {
        setCurrentView(view as ViewState);
    }
  };

  const renderView = () => {
    if (currentView === 'SPLASH') {
        return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc]">
            <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white text-4xl font-bold shadow-xl animate-bounce">S</div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-teal-500 rounded-full border-4 border-white"></div>
            </div>
            <h1 className="text-3xl font-bold text-[#1e293b] mt-6 tracking-tight">Super Management</h1>
            <div className="flex flex-col items-center mt-8 gap-3">
                <Loader2 className="animate-spin text-teal-600" size={32} />
                <p className="text-gray-400 font-medium text-sm">Initializing Supabase Cloud...</p>
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
      case 'REMOVE_STUDENTS_VIEW':
        content = <RemoveStudents user={currentUser} lang={lang} onBack={() => setCurrentView('DASHBOARD_OWNER')} />;
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
      default: 
        content = <Dashboard user={currentUser} lang={lang} onNavigate={navigate} onUpdateUser={handleUserUpdate} />;
    }

    return (
        <Layout user={currentUser} currentView={currentView} onNavigate={navigate} onLogout={handleLogout} lang={lang}>
            <div className="relative">
                {isCloudSyncing && (
                  <div className="absolute -top-6 right-0 flex items-center gap-1 text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full animate-pulse z-50">
                    <CloudSync size={10} /> Cloud Syncing...
                  </div>
                )}
                {content}
            </div>
        </Layout>
    );
  };

  return (
    <div className="min-h-screen bg-[#eef2f5] text-[#2d3748]">
      {renderView()}
      <Modal 
        isOpen={showSubModal} 
        onClose={() => setShowSubModal(false)} 
        title={isSubscriptionValid ? "Active Subscription" : "Get Lifetime Access"}
      >
          <div className="p-4 text-center">
              {isSubscriptionValid ? (
                  <div className="space-y-4 animate-fade-in">
                      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <InfinityIcon size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">Premium Active</h3>
                      <p className="text-gray-500">Full permanent access enabled for your academy.</p>
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100 inline-flex items-center gap-2 text-green-700 font-bold">
                          <CheckCircle2 size={18} /> Verified Lifetime Plan
                      </div>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <Crown className="mx-auto text-yellow-500" size={56} />
                      <h3 className="text-2xl font-bold">Upgrade Now</h3>
                      <div className="text-3xl font-black text-[#1e293b]">₹{SUBSCRIPTION_PRICE}</div>
                      <div className="flex items-center justify-center gap-1 text-teal-600 font-bold bg-teal-50 py-1 px-3 rounded-full w-fit mx-auto text-sm">
                         <InfinityIcon size={16} /> One-time Payment
                      </div>
                      
                      <div className="text-left space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
                          <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Professional PDF Receipts</p>
                          <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Unlimited Student Records</p>
                          <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Cloud Database Access</p>
                      </div>

                      <Button 
                        className="w-full h-12 text-lg bg-[#1e293b] hover:bg-black text-white mt-4" 
                        onClick={handleSendSubscriptionRequest}
                        disabled={isCloudSyncing}
                      >
                        {isCloudSyncing ? "Connecting..." : "Request Lifetime Access"}
                      </Button>
                      <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-tighter">Request is automatically stored in Supabase for Admin review</p>
                  </div>
              )}
          </div>
      </Modal>
    </div>
  );
};

export default App;
