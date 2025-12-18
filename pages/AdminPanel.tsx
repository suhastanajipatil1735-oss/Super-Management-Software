import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { SubscriptionRequest, UserProfile } from '../types';
import { Button, Modal, Input } from '../components/UI';
import { openWhatsApp } from '../services/whatsapp';
import { 
    LogOut, RefreshCw, Eye, MessageCircle, 
    Building2, Crown, Clock, Infinity as InfinityIcon, 
    ShieldCheck, Search, Trash2, PauseCircle, PlayCircle, XCircle, AlertTriangle 
} from 'lucide-react';

type AdminTab = 'ALL_USERS' | 'REQUESTS' | 'SUBSCRIBERS';

const AdminPanel: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('ALL_USERS');
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalInstitutes: 0,
    activeSubscriptions: 0,
    pendingRequests: 0,
    totalStudents: 0
  });
  
  // Profile View State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [profileStats, setProfileStats] = useState<{studentCount: number} | null>(null);
  const [selectedUserRequests, setSelectedUserRequests] = useState<SubscriptionRequest[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const reqs = await db.subscriptionRequests.toArray();
    const usrs = await db.users.where('role').equals('owner').toArray();
    const allStudentsCount = await db.students.count();

    const activeSubs = usrs.filter(u => u.plan === 'subscribed' && u.subscription.active).length;
    const pending = reqs.filter(r => r.status === 'pending').length;

    setRequests(reqs.reverse());
    setUsers(usrs.reverse()); // Newest users first
    setStats({
        totalInstitutes: usrs.length,
        activeSubscriptions: activeSubs,
        pendingRequests: pending,
        totalStudents: allStudentsCount
    });
  };

  // --- ACTIONS ---

  const handleSubscriptionAction = async (req: SubscriptionRequest, status: 'accepted' | 'declined') => {
    await db.subscriptionRequests.update(req.id, { status });

    if (status === 'accepted') {
      const user = await db.users.where('mobile').equals(req.ownerMobile).first();
      if (user) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        const isLifetime = req.monthsRequested === 999;
        
        if (isLifetime) {
            endDate.setFullYear(endDate.getFullYear() + 100);
        } else {
            endDate.setMonth(endDate.getMonth() + req.monthsRequested);
        }

        await db.users.update(user.id, {
          plan: 'subscribed',
          studentLimit: isLifetime ? 99999 : 1000,
          subscription: {
            active: true,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            planType: isLifetime ? 'lifetime' : (req.monthsRequested === 12 ? '12_months' : '1_month')
          }
        });
        openWhatsApp(user.mobile, `Your subscription for ${user.instituteName} has been APPROVED.`);
      }
    }
    refreshData();
  };

  const handleTogglePause = async () => {
      if (!selectedProfile) return;
      const newStatus = !selectedProfile.subscription.active;
      
      await db.users.update(selectedProfile.id, {
          subscription: { ...selectedProfile.subscription, active: newStatus }
      });
      
      // Update local state
      const updated = { ...selectedProfile, subscription: { ...selectedProfile.subscription, active: newStatus } };
      setSelectedProfile(updated);
      
      // Update main list
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      
      alert(`Subscription ${newStatus ? 'Resumed' : 'Paused'}`);
  };

  const handleCancelSubscription = async () => {
      if (!selectedProfile) return;
      if (!confirm("Are you sure you want to CANCEL this subscription? The user will be downgraded to Free plan.")) return;

      const updatedUser = {
          ...selectedProfile,
          plan: 'free' as const,
          studentLimit: 6,
          subscription: {
              active: false,
              planType: null as any,
              startDate: undefined,
              endDate: undefined
          }
      };

      await db.users.put(updatedUser);
      setSelectedProfile(updatedUser);
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      alert("Subscription Cancelled.");
  };

  const handleDeleteUser = async () => {
      if (!selectedProfile) return;
      const confirmMsg = `DANGER: This will permanently delete ${selectedProfile.instituteName}, all students, attendance, and receipts.\n\nType "DELETE" to confirm.`;
      const input = prompt(confirmMsg);
      
      if (input === 'DELETE') {
          // Delete User
          await db.users.delete(selectedProfile.id);
          // Delete Linked Students
          await db.students.where('ownerMobile').equals(selectedProfile.mobile).delete();
          // Delete Linked Attendance
          await db.attendance.where('ownerMobile').equals(selectedProfile.mobile).delete();
          // Delete Linked Receipts
          await db.receiptLogs.where('ownerMobile').equals(selectedProfile.mobile).delete();
          // Delete Linked Teachers
          await db.users.where('linkedOwnerMobile').equals(selectedProfile.mobile).delete();

          setShowProfileModal(false);
          refreshData();
          alert("User and all associated data deleted.");
      }
  };

  const handleViewProfile = async (mobile: string) => {
    const user = await db.users.where('mobile').equals(mobile).first();
    if (user) {
        const studentCount = await db.students.where('ownerMobile').equals(mobile).count();
        const userReqs = requests.filter(r => r.ownerMobile === mobile);
        
        setSelectedProfile(user);
        setProfileStats({ studentCount });
        setSelectedUserRequests(userReqs);
        setShowProfileModal(true);
    }
  };

  // --- FILTERING ---
  
  const getDisplayData = () => {
      let data = users;
      
      // Filter by Tab
      if (activeTab === 'SUBSCRIBERS') {
          data = users.filter(u => u.plan === 'subscribed');
      } else if (activeTab === 'REQUESTS') {
          // For requests tab, we actually want to show the requests list, handled separately in render, 
          // but if we want to show users *who have pending requests*:
          const pendingMobiles = requests.filter(r => r.status === 'pending').map(r => r.ownerMobile);
          data = users.filter(u => pendingMobiles.includes(u.mobile));
      }

      // Filter by Search
      if (searchTerm) {
          data = data.filter(u => 
            u.instituteName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.mobile.includes(searchTerm)
          );
      }
      
      return data;
  };

  const displayUsers = getDisplayData();

  const renderRequestDuration = (months: number) => {
      if (months === 999) return <span className="flex items-center gap-1"><InfinityIcon size={12}/> Lifetime</span>;
      return <span>{months} Months</span>;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-poppins">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="bg-[#1e293b] p-2 rounded-lg">
                      <ShieldCheck className="text-white" size={24} />
                  </div>
                  <div>
                      <h1 className="text-xl font-bold text-[#1e293b] hidden md:block">Admin Console</h1>
                      <h1 className="text-xl font-bold text-[#1e293b] md:hidden">Admin</h1>
                  </div>
              </div>
              <Button variant="secondary" size="sm" onClick={onLogout} className="text-red-500 hover:bg-red-50 border-red-100">
                  <LogOut size={18} /> Logout
              </Button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-bold">Total Institutes</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.totalInstitutes}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-bold text-purple-600">Premium Users</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.activeSubscriptions}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-bold text-orange-600">Pending Req.</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.pendingRequests}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-bold text-blue-600">Total Students</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.totalStudents}</h3>
            </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-full md:w-auto overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('ALL_USERS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ALL_USERS' ? 'bg-[#1e293b] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    All Institutes ({stats.totalInstitutes})
                </button>
                <button 
                    onClick={() => setActiveTab('REQUESTS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'REQUESTS' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Requests ({stats.pendingRequests})
                </button>
                <button 
                    onClick={() => setActiveTab('SUBSCRIBERS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'SUBSCRIBERS' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Subscribers ({stats.activeSubscriptions})
                </button>
            </div>

            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search name or mobile..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            
            {/* View: Subscription Requests Cards */}
            {activeTab === 'REQUESTS' && (
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.filter(r => r.status === 'pending').map(req => (
                            <div key={req.id} className="border border-orange-100 rounded-xl p-5 bg-orange-50/30 relative">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800">{req.instituteName}</h3>
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">
                                        {renderRequestDuration(req.monthsRequested)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">{req.ownerMobile}</p>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleSubscriptionAction(req, 'accepted')} className="bg-green-600 hover:bg-green-700 flex-1">
                                        Accept
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleSubscriptionAction(req, 'declined')} className="text-red-500 border-red-100 flex-1">
                                        Decline
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleViewProfile(req.ownerMobile)}>
                                        <Eye size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {requests.filter(r => r.status === 'pending').length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <ShieldCheck size={32} />
                                </div>
                                <p>No pending subscription requests.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View: User List (All or Subscribers) */}
            {(activeTab === 'ALL_USERS' || activeTab === 'SUBSCRIBERS') && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="py-4 px-6">Institute</th>
                                <th className="py-4 px-6">Mobile</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">Joined</th>
                                <th className="py-4 px-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {displayUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-gray-800">
                                        {user.instituteName}
                                    </td>
                                    <td className="py-4 px-6 text-gray-600 font-mono">
                                        {user.mobile}
                                    </td>
                                    <td className="py-4 px-6">
                                        {user.plan === 'subscribed' ? (
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${user.subscription.active ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                                {user.subscription.active ? 'PREMIUM' : 'PAUSED'}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                FREE
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <Button size="sm" variant="secondary" onClick={() => handleViewProfile(user.mobile)}>
                                            <Eye size={16} /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {displayUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-400">No records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </main>

      {/* Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Institute Profile">
        {selectedProfile && (
            <div className="space-y-6">
                {/* Header Info */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="w-14 h-14 bg-[#1e293b] text-white rounded-full flex items-center justify-center font-bold text-xl">
                        {selectedProfile.instituteName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedProfile.instituteName}</h3>
                        <p className="text-gray-500 text-sm">{selectedProfile.mobile}</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold uppercase">Students</p>
                        <p className="text-xl font-bold text-gray-800">{profileStats?.studentCount}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                         <p className="text-xs text-purple-600 font-bold uppercase">Plan Type</p>
                         <p className="text-sm font-bold text-gray-800 capitalize">
                             {selectedProfile.plan === 'subscribed' ? (selectedProfile.subscription.planType === 'lifetime' ? 'Lifetime' : 'Premium') : 'Free Plan'}
                         </p>
                    </div>
                </div>

                {/* Subscription Management Section */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Crown size={16} className="text-yellow-600" /> Subscription Management
                    </h4>
                    
                    {selectedProfile.plan === 'subscribed' ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Status: {selectedProfile.subscription.active ? 'Active' : 'Paused'}</p>
                                    <p className="text-xs text-gray-500">Exp: {selectedProfile.subscription.endDate ? new Date(selectedProfile.subscription.endDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={handleTogglePause}
                                    className={selectedProfile.subscription.active ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"}
                                >
                                    {selectedProfile.subscription.active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                                    {selectedProfile.subscription.active ? 'Pause' : 'Resume'}
                                </Button>
                            </div>
                            
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={handleCancelSubscription} 
                                className="w-full text-red-600 hover:bg-red-50 border-red-200"
                            >
                                <XCircle size={16} /> Cancel Subscription
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">User is on Free Plan. No active subscription to manage.</p>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="pt-2 border-t border-gray-100">
                    <Button onClick={handleDeleteUser} className="w-full bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 size={18} /> Delete User & Data
                    </Button>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                        Warning: This action cannot be undone.
                    </p>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPanel;