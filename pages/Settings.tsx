
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../services/db';
import { Card, Button, Input } from '../components/UI';
import { LABELS } from '../constants';
import { ArrowLeft, Edit2, Save, Mail, MapPin, Phone, Crown, Shield } from 'lucide-react';

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
                     <p className="text-xs text-gray-500">Manage your account info</p>
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
                  <label className="block text-sm font-medium text-gray-500 mb-1">Institute / Academy Name</label>
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

              <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mobile Number</label>
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <Phone size={16} className="text-gray-400" />
                      <span className="font-mono">{user.mobile}</span>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                  {isEditing ? (
                      <Input 
                          type="email"
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="Enter Email Address"
                      />
                  ) : (
                      <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={18} className="text-gray-400" />
                          {user.email || <span className="text-gray-400 italic">Not set</span>}
                      </div>
                  )}
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                  {isEditing ? (
                      <Input 
                          value={formData.address} 
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          placeholder="Enter Address"
                      />
                  ) : (
                      <div className="flex items-center gap-2 text-gray-700">
                          <MapPin size={18} className="text-gray-400" />
                          {user.address || <span className="text-gray-400 italic">Not set</span>}
                      </div>
                  )}
              </div>
          </div>

          {isEditing && (
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 animate-fade-in">
                  <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                      <Save size={18} /> Save Changes
                  </Button>
              </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
               {user.subscription.planType === 'lifetime' ? <Crown size={24} /> : <Shield size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-lg">Subscription Plan</h3>
              <p className={`${user.plan === 'subscribed' ? 'text-green-600' : 'text-gray-500'} font-semibold`}>
                {user.plan === 'subscribed' ? 'Premium Plan Active' : 'Free Plan'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
