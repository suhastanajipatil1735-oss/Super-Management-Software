
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { SubscriptionRequest, UserProfile } from '../types';
import { Button, Modal, Input } from '../components/UI';
import { openWhatsApp } from '../services/whatsapp';
import { 
    LogOut, RefreshCw, Eye, MessageCircle, 
    Building2, Crown, Clock, Infinity as InfinityIcon, 
    ShieldCheck, Search, Trash2, PauseCircle, PlayCircle, XCircle, AlertTriangle, Calendar
} from 'lucide-react';

type AdminTab = 'ALL_USERS' | 'REQUESTS' | 'SUBSCRIBERS';

const AdminPanel: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('REQUESTS'); 
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState({
    totalInstitutes: 0,
    activeSubscriptions: 0,
    pendingRequests: 0,
    totalStudents: 0
  });
  
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
    setUsers(usrs.reverse());
    setStats({
        totalInstitutes: usrs.length,
        activeSubscriptions: activeSubs,
        pendingRequests: pending,
        totalStudents: allStudentsCount
    });
  };

  const handleSubscriptionAction = async (req: SubscriptionRequest, status: 'accepted' | 'declined') => {
    await db.subscriptionRequests.update(req.id, { status });

    if (status === 'accepted') {
      const user = await db.users.where('mobile').equals(req.ownerMobile).first();
      if (user) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        // Always lifetime for this model
        endDate.setFullYear(endDate.getFullYear() + 100);

        await db.users.update(user.id, {
          plan: 'subscribed',
          studentLimit: 99999,
          subscription: {
            active: true,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            planType: 'lifetime'
          }
        });
        openWhatsApp(user.mobile, `Congratulations! Your subscription for ${user.instituteName} has been ACTIVATED. You now have lifetime premium access with unlimited students.`);
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
      const updated = { ...selectedProfile, subscription: { ...selectedProfile.subscription, active: newStatus } };
      setSelectedProfile(updated);
      setUsers(users.map(u => u.id === updated.id ? updated : u));
  };

  const handleDeleteUser = async () => {
      if (!selectedProfile) return;
      if (confirm(`Permanently delete ${selectedProfile.instituteName}?`)) {
          await db.users.delete(selectedProfile.id);
          await db.students.where('ownerMobile').equals(selectedProfile.mobile).delete();
          setShowProfileModal(false);
          refreshData();
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

  const getDisplayData = () => {
      let data = users;
      if (activeTab === 'SUBSCRIBERS') data = users.filter(u => u.plan === 'subscribed');
      if (searchTerm) {
          data = data.filter(u => u.instituteName.toLowerCase().includes(searchTerm.toLowerCase()) || u.mobile.includes(searchTerm));
      }
      return data;
  };

  const displayUsers = getDisplayData();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-poppins pb-10">
      <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="bg-[#1e293b] p-2 rounded-lg">
                      <ShieldCheck className="text-white" size={24} />
                  </div>
                  <h1 className="text-xl font-bold text-[#1e293b]">Admin Panel</h1>
              </div>
              <Button variant="secondary" size="sm" onClick={onLogout} className="text-red-500">
                  <LogOut size={18} /> Logout
              </Button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-bold">Institutes</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.totalInstitutes}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-purple-600 uppercase font-bold">Premium</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.activeSubscriptions}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-orange-600 uppercase font-bold">Requests</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.pendingRequests}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-blue-600 uppercase font-bold">Students</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.totalStudents}</h3>
            </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-full md:w-auto">
                <button onClick={() => setActiveTab('REQUESTS')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'REQUESTS' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>
                    Requests ({stats.pendingRequests})
                </button>
                <button onClick={() => setActiveTab('ALL_USERS')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'ALL_USERS' ? 'bg-[#1e293b] text-white' : 'text-gray-500'}`}>
                    All
                </button>
                <button onClick={() => setActiveTab('SUBSCRIBERS')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'SUBSCRIBERS' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>
                    Premium
                </button>
            </div>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200" />
            </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            {activeTab === 'REQUESTS' && (
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600"><Clock size={20}/> New Lifetime Activation Requests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.filter(r => r.status === 'pending').map(req => (
                            <div key={req.id} className="border border-orange-100 rounded-xl p-5 bg-orange-50/20 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{req.instituteName}</h3>
                                        <p className="text-sm font-mono text-gray-600">{req.ownerMobile}</p>
                                    </div>
                                    <div className="bg-orange-100 text-orange-700 p-2 rounded-lg"><InfinityIcon size={20}/></div>
                                </div>
                                <div className="space-y-2 mb-5">
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Plan:</span>
                                        <span className="font-bold text-gray-700">Lifetime Premium</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Price:</span>
                                        <span className="font-bold text-gray-900">₹4,999</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleSubscriptionAction(req, 'accepted')} className="bg-green-600 hover:bg-green-700 flex-1 font-bold">APPROVE</Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleSubscriptionAction(req, 'declined')} className="text-red-500 flex-1">Decline</Button>
                                </div>
                            </div>
                        ))}
                        {requests.filter(r => r.status === 'pending').length === 0 && (
                            <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center gap-2">
                                <ShieldCheck size={48} className="opacity-20" />
                                <p>No new requests pending.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {(activeTab === 'ALL_USERS' || activeTab === 'SUBSCRIBERS') && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="py-4 px-6">Institute</th>
                                <th className="py-4 px-6">Mobile</th>
                                <th className="py-4 px-6">Plan Status</th>
                                <th className="py-4 px-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {displayUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-gray-800">{user.instituteName}</td>
                                    <td className="py-4 px-6 font-mono text-gray-600">{user.mobile}</td>
                                    <td className="py-4 px-6">
                                        {user.plan === 'subscribed' ? (
                                            <div className="flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded-md w-fit text-[10px]">
                                                <InfinityIcon size={12} /> PREMIUM {user.subscription.active ? 'ACTIVE' : 'PAUSED'}
                                            </div>
                                        ) : <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">FREE</span>}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <Button size="sm" variant="secondary" onClick={() => handleViewProfile(user.mobile)} className="h-8"><Eye size={14}/> View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </main>

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Institute Details">
        {selectedProfile && (
            <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="w-14 h-14 bg-[#1e293b] text-white rounded-full flex items-center justify-center font-bold text-xl">{selectedProfile.instituteName.charAt(0)}</div>
                    <div>
                        <h3 className="text-xl font-bold">{selectedProfile.instituteName}</h3>
                        <p className="text-gray-500">{selectedProfile.mobile}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold uppercase">Students</p>
                        <p className="text-xl font-bold text-gray-800">{profileStats?.studentCount}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                         <p className="text-xs text-purple-600 font-bold uppercase">Plan</p>
                         <p className="text-sm font-bold text-gray-800 capitalize flex items-center gap-1">
                            {selectedProfile.plan === 'subscribed' ? <><InfinityIcon size={14}/> Lifetime</> : 'Free'}
                         </p>
                    </div>
                </div>
                {selectedProfile.plan === 'subscribed' && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Crown size={16} className="text-yellow-600" /> Controls</h4>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleTogglePause} className={selectedProfile.subscription.active ? "bg-yellow-500 flex-1" : "bg-green-600 flex-1"}>
                                {selectedProfile.subscription.active ? 'Pause Access' : 'Resume Access'}
                            </Button>
                        </div>
                    </div>
                )}
                <Button onClick={handleDeleteUser} className="w-full bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white"><Trash2 size={18} /> Permanently Delete Data</Button>
            </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPanel;
