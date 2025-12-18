
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../services/db';
import { Card, Button, Input } from '../components/UI';
import { LABELS } from '../constants';
import { ArrowLeft, Edit2, Save, Mail, MapPin, Phone, Crown, Infinity as InfinityIcon, ShieldCheck } from 'lucide-react';

interface SettingsProps {
  user: UserProfile;
  lang: 'en';
  onBack: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, lang, onBack, onUpdateUser }) => {
  const labels = LABELS[lang];
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    instituteName: user.instituteName,
    email: user.email || '',
    address: user.address || ''
  });

  const handleSave = async () => {
    if (!formData.instituteName.trim()) return alert("Institute name cannot be empty");
    
    try {
        const updateData: Partial<UserProfile> = { 
            instituteName: formData.instituteName,
            email: formData.email,
            address: formData.address
        };

        await db.users.update(user.id, updateData);
        onUpdateUser({ ...user, ...updateData });
        setIsEditing(false);
        alert("Profile Updated Successfully!");
    } catch (e) {
        alert("Failed to update profile");
    }
  };

  const handleCancel = () => {
      setFormData({
        instituteName: user.instituteName,
        email: user.email || '',
        address: user.address || ''
      });
      setIsEditing(false);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">{labels.settings}</h2>
      </div>

      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-[#2d3748] text-white rounded-full flex items-center justify-center text-xl font-bold">
                     {user.instituteName.charAt(0).toUpperCase()}
                 </div>
                 <div>
                     <h3 className="font-bold text-lg text-gray-800">Profile Details</h3>
                     <p className="text-xs text-gray-500">Manage your academy info</p>
                 </div>
            </div>
            {!isEditing && (
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                    <Edit2 size={16} /> Edit
                </Button>
            )}
          </div>

          <div className="space-y-5">
              <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Academy Name</label>
                  {isEditing ? (
                      <Input 
                          value={formData.instituteName} 
                          onChange={e => setFormData({...formData, instituteName: e.target.value})}
                          placeholder="Enter Institute Name"
                          className="font-semibold"
                      />
                  ) : (
                      <div className="flex items-center gap-3 text-lg font-bold text-gray-800">
                          {user.instituteName}
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mobile</label>
                    <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <Phone size={14} className="text-gray-400" />
                        <span className="font-mono text-sm">{user.mobile}</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    {isEditing ? (
                        <Input 
                            type="email"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="Email Address"
                            className="h-9"
                        />
                    ) : (
                        <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <Mail size={14} className="text-gray-400" />
                            <span className="text-sm truncate">{user.email || 'Not set'}</span>
                        </div>
                    )}
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                  {isEditing ? (
                      <Input 
                          value={formData.address} 
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          placeholder="Full Address"
                      />
                  ) : (
                      <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="text-sm">{user.address || 'Not set'}</span>
                      </div>
                  )}
              </div>
          </div>

          {isEditing && (
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 animate-fade-in">
                  <Button variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                      <Save size={18} /> Save Changes
                  </Button>
              </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-4">
             <div className={`p-4 rounded-2xl flex items-center justify-center ${user.plan === 'subscribed' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
               {user.plan === 'subscribed' ? <InfinityIcon size={32} /> : <ShieldCheck size={32} />}
            </div>
            <div>
              <h3 className="font-bold text-lg">Subscription Plan</h3>
              <div className="flex items-center gap-2">
                  <p className={`${user.plan === 'subscribed' ? 'text-purple-700' : 'text-gray-500'} font-bold flex items-center gap-1`}>
                    {user.plan === 'subscribed' ? <><Crown size={14} /> Lifetime Premium</> : 'Free Plan'}
                  </p>
                  {user.plan === 'subscribed' && (
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Active Forever</span>
                  )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
