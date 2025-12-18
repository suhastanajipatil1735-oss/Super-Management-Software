
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
import { Modal, Button, Input } from './components/UI';
import { Crown, Loader2, CheckCircle2, Clock, Infinity as InfinityIcon, ShieldCheck, HelpCircle, MessageCircle } from 'lucide-react';

const SESSION_KEY = 'super_mgmt_user_session';

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('SPLASH');
  const [lang] = useState<'en'>('en');
  
  const [showSubModal, setShowSubModal] = useState(false);
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false);
  const [autoOpenAddStudent, setAutoOpenAddStudent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<SubscriptionRequest | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [hasSentCurrentRequest, setHasSentCurrentRequest] = useState(false);

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
          .then(req => {
              if (req) {
                setPendingRequest(req);
                setHasSentCurrentRequest(true);
              }
          });
    }
  }, [currentUser, showSubModal]);

  const handleLogin = (user: UserProfile) => {
    localStorage.setItem(SESSION_KEY, user.id);
    setCurrentUser(user);
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

  const handleSubscribeClick = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
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
      setHasSentCurrentRequest(true);
      
      openWhatsApp(ADMIN_CREDS.MOBILE, `New Lifetime Subscription Request\n\nAcademy: ${currentUser.instituteName}\nMobile: ${currentUser.mobile}\nPrice: ₹${SUBSCRIPTION_PRICE}\n\nPlease verify my payment and send activation code.`);
    } catch (e) {
      alert("Error processing request.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!currentUser) return;
    if (activationCode.trim().toLowerCase() === 'suhaspatilsir666666') {
        setIsProcessing(true);
        try {
            const updatedUser: UserProfile = {
                ...currentUser,
                plan: 'subscribed',
                studentLimit: 99999,
                subscription: {
                    active: true,
                    planType: 'lifetime',
                    startDate: new Date().toISOString(),
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString()
                }
            };
            await db.users.update(currentUser.id, updatedUser);
            setCurrentUser(updatedUser);
            setIsSubscriptionValid(true);
            setActivationCode('');
            alert("Success! Lifetime Premium Access Activated.");
            setShowSubModal(false);
        } catch (e) {
            alert("Activation failed.");
        } finally {
            setIsProcessing(false);
        }
    } else {
        alert("Incorrect activation code. Please contact Admin.");
    }
  };

  const handleRequestCodeFromAdmin = () => {
    if (!currentUser) return;
    openWhatsApp(ADMIN_CREDS.MOBILE, `Hi Suhas Patil Sir,\n\nI have already requested/paid for the subscription for my academy: ${currentUser.instituteName} (${currentUser.mobile}).\n\nPlease send me the activation code.`);
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
                <p className="text-gray-400 font-medium text-sm">Opening Secure Workspace...</p>
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
            {content}
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
                        <h3 className="text-2xl font-bold">Lifetime Subscription</h3>
                        <div className="text-4xl font-black text-[#1e293b] py-2">₹{SUBSCRIPTION_PRICE}</div>
                        
                        <div className="text-left space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                            <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Unlimited Students Entry</p>
                            <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Professional Report Generation</p>
                            <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-green-500" /> No Monthly Expiry</p>
                        </div>

                        {!hasSentCurrentRequest ? (
                            <Button 
                              className="w-full h-12 text-lg bg-[#1e293b] hover:bg-black text-white mt-4 shadow-lg transition-all active:scale-95" 
                              onClick={handleSubscribeClick}
                              disabled={isProcessing}
                            >
                                {isProcessing ? "Processing..." : "Subscribe Now"}
                            </Button>
                        ) : (
                            <div className="mt-4 space-y-4 animate-fade-in">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <label className="text-xs font-bold text-blue-700 uppercase block mb-2">Enter Activation Code</label>
                                    <Input 
                                        placeholder="Paste your code here" 
                                        value={activationCode}
                                        onChange={e => setActivationCode(e.target.value)}
                                        className="text-center font-mono"
                                    />
                                    <Button className="w-full mt-3 bg-teal-600 hover:bg-teal-700 text-white font-bold" onClick={handleVerifyCode} disabled={!activationCode}>
                                        Verify & Activate
                                    </Button>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 mb-2">Need a code? Contact Admin Suhas Patil Sir</p>
                                    <Button variant="secondary" className="w-full border-blue-200 text-blue-700 font-bold" onClick={handleRequestCodeFromAdmin}>
                                        <HelpCircle size={18} className="mr-1" /> Help / Get Code
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {!hasSentCurrentRequest && (
                           <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">
                             Click Subscribe to contact admin
                           </p>
                        )}
                    </div>
                )}
            </div>
      </Modal>
    </div>
  );
};

export default App;
