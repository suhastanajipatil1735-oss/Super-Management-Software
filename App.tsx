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
import { Clock, AlertTriangle, CheckCircle, Crown, Infinity as InfinityIcon } from 'lucide-react';

// Timer Component
const SubscriptionTimer: React.FC<{ endDateStr: string; onExpire: () => void; isLifetime: boolean }> = ({ endDateStr, onExpire, isLifetime }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    if (isLifetime) return;

    const calculateTime = () => {
      const difference = new Date(endDateStr).getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
        onExpire();
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [endDateStr, onExpire, isLifetime]);

  if (isLifetime) {
      return (
        <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-4 border border-blue-100">
            <InfinityIcon className="w-16 h-16 text-blue-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-blue-800">Lifetime Access</p>
            <p className="text-sm text-blue-600">Your subscription never expires</p>
        </div>
      );
  }

  if (!timeLeft) return <div className="text-red-500 font-bold">Expired</div>;

  return (
    <div className="text-center p-4 bg-gray-50 rounded-xl mb-4 border border-gray-200">
      <p className="text-sm text-gray-500 mb-2 font-medium uppercase tracking-wider">Time Remaining</p>
      <div className="flex justify-center gap-4 text-[#2d3748]">
        <div className="flex flex-col">
          <span className="text-3xl font-bold font-mono">{timeLeft.days}</span>
          <span className="text-xs text-gray-400">Days</span>
        </div>
        <span className="text-2xl font-bold mt-1">:</span>
        <div className="flex flex-col">
          <span className="text-3xl font-bold font-mono">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-xs text-gray-400">Hrs</span>
        </div>
        <span className="text-2xl font-bold mt-1">:</span>
        <div className="flex flex-col">
          <span className="text-3xl font-bold font-mono">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-xs text-gray-400">Min</span>
        </div>
        <span className="text-2xl font-bold mt-1">:</span>
        <div className="flex flex-col">
          <span className="text-3xl font-bold font-mono text-blue-500">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-xs text-gray-400">Sec</span>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('SPLASH');
  const [lang] = useState<'en'>('en'); // Forced to English
  
  // Login State Management
  const [loginStep, setLoginStep] = useState<'DETAILS' | 'ROLE'>('DETAILS');
  const [cachedDetails, setCachedDetails] = useState<{name: string, mobile: string}>({name: '', mobile: ''});

  // Subscription Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  // Track if subscription is technically valid for UI
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false);

  // Auto Open Add Student Modal
  const [autoOpenAddStudent, setAutoOpenAddStudent] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Minimum splash time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await seedDatabase();
      } catch (e) {
        console.error("Database initialization failed:", e);
      }
      
      setCurrentView('LOGIN');
    };

    initApp();
  }, []);

  // Check subscription validity whenever user or modal changes
  useEffect(() => {
    if (currentUser && currentUser.subscription.active && currentUser.subscription.endDate) {
       const isValid = new Date(currentUser.subscription.endDate) > new Date();
       setIsSubscriptionValid(isValid);
    } else {
       setIsSubscriptionValid(false);
    }
  }, [currentUser, showSubModal]);

  const handleLogin = (user: UserProfile) => {
    // Cache details for potential back navigation
    setCachedDetails({ name: user.instituteName, mobile: user.mobile });
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('ADMIN_PANEL');
    } else if (user.role === 'owner') {
      setCurrentView('DASHBOARD_OWNER');
    } else {
      // Teachers also see dashboard
      setCurrentView('DASHBOARD_TEACHER'); 
    }
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setCachedDetails(prev => ({ ...prev, name: updatedUser.instituteName }));
  };

  const handleLogout = () => {
    setLoginStep('DETAILS'); // Full logout resets to details
    setCachedDetails({name: '', mobile: ''});
    setCurrentUser(null);
    setCurrentView('LOGIN');
  };

  const handleSubscriptionRequest = async (months: number) => {
    if (!currentUser) return;
    
    // We treat 999 as code for Lifetime
    const isLifetime = months === 999;
    
    // Add local request
    await db.subscriptionRequests.add({
        ownerMobile: currentUser.mobile,
        instituteName: currentUser.instituteName,
        monthsRequested: months,
        status: 'pending',
        requestDate: new Date().toISOString()
    });

    // Send WhatsApp to Admin
    const planName = isLifetime ? "LIFETIME (₹4999)" : `${months} Months`;
    const msg = `Subscription Request\nFrom: ${currentUser.instituteName}\nMobile: ${currentUser.mobile}\nPlan: ${planName}`;
    openWhatsApp(ADMIN_CREDS.MOBILE, msg);

    setShowSubModal(false);
    alert(LABELS[lang].requestSent);
  };

  const handleExpire = async () => {
      setIsSubscriptionValid(false);
      // Optional: Update DB to mark inactive, but comparison logic handles UI
      if (currentUser) {
          const updatedUser = {...currentUser, plan: 'free' as const, subscription: {...currentUser.subscription, active: false}};
          await db.users.update(currentUser.id, { plan: 'free', subscription: { ...currentUser.subscription, active: false } });
          setCurrentUser(updatedUser);
      }
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

  // View Router
  const renderView = () => {
    if (currentView === 'SPLASH') {
        return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#eef2f5] to-[#e6fffa]">
            <h1 className="text-5xl font-bold text-[#2d3748] animate-bounce">Super Management</h1>
            <div className="mt-8 animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        );
    }
    
    if (currentView === 'LOGIN') {
        return (
          <Login 
            onLoginSuccess={handleLogin} 
            lang={lang} 
            initialStep={loginStep}
            initialDetails={cachedDetails}
          />
        );
    }

    if (currentView === 'ADMIN_PANEL') {
        return <AdminPanel onLogout={handleLogout} />;
    }

    // Authenticated Views Wrapped in Layout
    if (!currentUser) return null;

    let content;
    switch (currentView) {
      case 'DASHBOARD_OWNER':
      case 'DASHBOARD_TEACHER':
        content = (
          <Dashboard 
            user={currentUser} 
            lang={lang} 
            onNavigate={navigate}
            onUpdateUser={handleUserUpdate}
          />
        );
        break;
      case 'STUDENTS_VIEW':
        content = (
             <Students 
                user={currentUser} 
                lang={lang} 
                onBack={() => {
                    setAutoOpenAddStudent(false);
                    setCurrentView('DASHBOARD_OWNER');
                }} 
                onSubscriptionReq={() => setShowSubModal(true)}
                autoOpenAdd={autoOpenAddStudent}
            />
        );
        break;
      case 'ATTENDANCE_VIEW':
        content = (
            <Attendance 
                user={currentUser} 
                lang={lang} 
                onBack={() => setCurrentView('DASHBOARD_OWNER')} 
            />
        );
        break;
      case 'FEES_VIEW':
        content = (
             <FeesReceipts 
                user={currentUser} 
                lang={lang} 
                onBack={() => setCurrentView('DASHBOARD_OWNER')} 
            />
        );
        break;
      case 'EXAMS_VIEW':
        content = (
            <ExamReports 
                user={currentUser} 
                lang={lang} 
                onBack={() => setCurrentView('DASHBOARD_OWNER')} 
            />
        );
        break;
      case 'SETTINGS_VIEW':
        content = (
             <Settings 
                user={currentUser} 
                lang={lang} 
                onBack={() => setCurrentView('DASHBOARD_OWNER')} 
                onUpdateUser={handleUserUpdate}
            />
        );
        break;
      default:
        content = <div>View Not Found</div>;
    }

    return (
        <Layout 
            user={currentUser} 
            currentView={currentView} 
            onNavigate={navigate} 
            onLogout={handleLogout}
            lang={lang}
        >
            {content}
        </Layout>
    );
  };

  const renderSubscriptionModalContent = () => {
      const isLifetime = currentUser?.subscription?.planType === 'lifetime';

      if (isSubscriptionValid && currentUser?.subscription?.endDate) {
          const planName = isLifetime ? 'LIFETIME MEMBERSHIP' : (currentUser.subscription.planType?.replace('_', ' ').toUpperCase() || 'PREMIUM');
          
          return (
              <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-600 rounded-full mb-3">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Active Subscription</h3>
                    <p className="text-blue-600 font-semibold mt-1">{planName}</p>
                  </div>

                  <SubscriptionTimer 
                    endDateStr={currentUser.subscription.endDate} 
                    onExpire={handleExpire} 
                    isLifetime={isLifetime} 
                  />

                  <p className="text-center text-sm text-gray-500">
                      {isLifetime ? "You have unlimited access." : "Your plan is currently active. You will be able to renew once the timer expires."}
                  </p>
                  
                  <Button variant="secondary" className="w-full" onClick={() => setShowSubModal(false)}>Close</Button>
              </div>
          );
      }

      return (
        <div className="grid gap-4">
           {currentUser?.role === 'owner' && currentUser.subscription.active === false && currentUser.plan === 'subscribed' && (
               <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-2 text-sm">
                   <AlertTriangle size={16} /> Subscription Expired. Please renew.
               </div>
           )}
           
           <div className="relative group cursor-pointer" onClick={() => handleSubscriptionRequest(999)}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl transform transition-transform group-hover:scale-[1.02] shadow-xl"></div>
              <div className="relative bg-white m-[1px] rounded-2xl p-6 overflow-hidden">
                   <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                       BEST VALUE
                   </div>
                   <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                           <Crown size={24} />
                       </div>
                       <div>
                           <h3 className="font-bold text-xl text-gray-800">Lifetime Membership</h3>
                           <p className="text-sm text-gray-500">One time payment</p>
                       </div>
                   </div>
                   <div className="space-y-3 mb-6">
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                           <CheckCircle size={16} className="text-green-500" /> Unlimited Students
                       </div>
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                           <CheckCircle size={16} className="text-green-500" /> Advanced Reports
                       </div>
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                           <CheckCircle size={16} className="text-green-500" /> Priority Support
                       </div>
                   </div>
                   <div className="flex justify-between items-end border-t border-gray-100 pt-4">
                       <div>
                           <span className="text-3xl font-bold text-gray-900">₹4999</span>
                           <span className="text-gray-400 text-sm ml-1 line-through">₹9999</span>
                       </div>
                       <Button size="sm" className="bg-blue-600 hover:bg-blue-700 border-none">
                           Select Plan
                       </Button>
                   </div>
              </div>
           </div>

           <p className="text-center text-xs text-gray-400 mt-2">
               Valid for one institute account. Non-refundable.
           </p>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#eef2f5] text-[#2d3748]">
      {renderView()}

      <Modal isOpen={showSubModal} onClose={() => setShowSubModal(false)} title={isSubscriptionValid ? "My Plan" : LABELS[lang].upgrade}>
        {renderSubscriptionModalContent()}
      </Modal>
    </div>
  );
};

export default App;