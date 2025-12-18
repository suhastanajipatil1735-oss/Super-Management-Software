
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
import { checkAirtableStatus, sendRequestToAirtable } from './services/airtable';

const SESSION_KEY = 'super_mgmt_user_session';

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('SPLASH');
  const [lang] = useState<'en'>('en');
  
  const [showSubModal, setShowSubModal] = useState(false);
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false);
  const [autoOpenAddStudent, setAutoOpenAddStudent] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<SubscriptionRequest | null>(null);

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
                syncWithAirtable(user);
                
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
   * Poll Airtable to check if Admin has accepted the request or paused the account
   */
  const syncWithAirtable = async (user: UserProfile) => {
    if (user.role !== 'owner') return;
    setIsCloudSyncing(true);
    
    const status = await checkAirtableStatus(user.mobile);
    if (status) {
      let updatedUser = { ...user };
      let changed = false;

      // Acceptance: If Admin set Acceptance to True in Airtable
      if (status.acceptance && user.plan !== 'subscribed') {
        updatedUser.plan = 'subscribed';
        updatedUser.studentLimit = 99999;
        updatedUser.subscription = {
          active: true,
          planType: 'lifetime',
          startDate: new Date().toISOString()
        };
        changed = true;
      }

      // Check for remote Pause
      const shouldBeActive = !status.paused;
      if (user.subscription.active !== shouldBeActive) {
        updatedUser.subscription.active = shouldBeActive;
        changed = true;
      }

      if (changed) {
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
    
    if (currentUser) {
        db.subscriptionRequests
          .where('ownerMobile').equals(currentUser.mobile)
          .and(r => r.status === 'pending')
          .first()
          .then(req => setPendingRequest(req || null));
    }
  }, [currentUser, showSubModal]);

  const handleLogin = (user: UserProfile) => {
    localStorage.setItem(SESSION_KEY, user.id);
    setCurrentUser(user);
    syncWithAirtable(user);
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
    
    const newRequest: SubscriptionRequest = {
        id: Date.now(),
        ownerMobile: currentUser.mobile,
        instituteName: currentUser.instituteName,
        monthsRequested: 999,
        status: 'pending',
        requestDate: new Date().toISOString()
    };

    await db.subscriptionRequests.add(newRequest);
    setPendingRequest(newRequest);
    
    // Sync to Airtable
    await sendRequestToAirtable(currentUser.mobile);
    
    openWhatsApp(ADMIN_CREDS.MOBILE, `New Subscription Request for ${currentUser.instituteName} (${currentUser.mobile}). Request logged in Airtable.`);
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
        if (currentUser) syncWithAirtable(currentUser);
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
                <p className="text-gray-400 font-medium text-sm">Syncing with Airtable...</p>
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
                    <CloudSync size={10} /> Syncing Airtable...
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
          {!currentUser?.subscription.active && currentUser?.plan === 'subscribed' ? (
              <div className="p-4 text-center">
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Subscription Paused</h3>
                  <p className="text-gray-500 mt-2">Your academy access has been temporarily suspended by the administrator in Airtable.</p>
                  <Button variant="secondary" className="w-full mt-6" onClick={() => openWhatsApp(ADMIN_CREDS.MOBILE, "Why is my subscription paused?")}>
                      Contact Support
                  </Button>
              </div>
          ) : (
            <div className="p-4 text-center">
                {isSubscriptionValid ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                          <InfinityIcon size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">Premium Active</h3>
                        <p className="text-gray-500">Full permanent access enabled for your academy.</p>
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 inline-flex items-center gap-2 text-green-700 font-bold">
                            <CheckCircle2 size={18} /> Verified Airtable Plan
                        </div>
                    </div>
                ) : pendingRequest ? (
                    <div className="space-y-4">
                        <Clock className="mx-auto text-orange-500 animate-pulse" size={56} />
                        <h3 className="text-xl font-bold text-orange-600">Verification Pending</h3>
                        <p className="text-gray-700 font-medium">Your request for Lifetime Access is being reviewed in Airtable.</p>
                        <p className="text-sm text-gray-500">Admin will update your "Acceptance" column shortly.</p>
                        <Button variant="secondary" className="w-full" onClick={() => openWhatsApp(ADMIN_CREDS.MOBILE, "Enquiry about my pending activation")}>
                            Message Admin
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Crown className="mx-auto text-yellow-500" size={56} />
                        <h3 className="text-2xl font-bold">Upgrade Now</h3>
                        <div className="text-3xl font-black text-[#1e293b]">₹{SUBSCRIPTION_PRICE}</div>
                        
                        <div className="text-left space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
                            <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Unlimited Student Records</p>
                            <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Airtable Cloud Data Sync</p>
                        </div>

                        <Button className="w-full h-12 text-lg bg-[#1e293b] hover:bg-black text-white mt-4" onClick={handleSendSubscriptionRequest}>
                            Request Lifetime Access
                        </Button>
                    </div>
                )}
            </div>
          )}
      </Modal>
    </div>
  );
};

export default App;
