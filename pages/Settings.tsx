import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../services/db';
import { Card, Button, Input } from '../components/UI';
import { LABELS } from '../constants';
import { ArrowLeft, User, Shield, Edit2, Save, X, Mail, MapPin, Key, Phone, Crown } from 'lucide-react';

interface SettingsProps {
  user: UserProfile;
  lang: 'en';
  onBack: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, lang, onBack, onUpdateUser }) => {
  const labels = LABELS[lang];
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    instituteName: user.instituteName,
    email: user.email || '',
    address: user.address || '',
    teacherCode: user.teacherCode || ''
  });

  const isOwner = user.role === 'owner';

  const handleSave = async () => {
    if (!formData.instituteName.trim()) return alert("Institute name cannot be empty");
    
    try {
        const updateData: Partial<UserProfile> = { 
            instituteName: formData.instituteName,
            email: formData.email,
            address: formData.address
        };

        if (isOwner) {
            updateData.teacherCode = formData.teacherCode;
        }

        // Update in DB
        await db.users.update(user.id, updateData);
        
        // Update local state in App
        const updatedUser = { ...user, ...updateData };
        onUpdateUser(updatedUser);
        
        setIsEditing(false);
        alert("Profile Updated Successfully!");
    } catch (e) {
        console.error("Failed to update profile", e);
        alert("Failed to update profile");
    }
  };

  const handleCancel = () => {
      setFormData({
        instituteName: user.instituteName,
        email: user.email || '',
        address: user.address || '',
        teacherCode: user.teacherCode || ''
      });
      setIsEditing(false);
  };

  const renderPlanText = () => {
      if (user.plan !== 'subscribed') return 'Free Plan';
      if (user.subscription.planType === 'lifetime') return 'Lifetime Membership';
      return 'Premium Plan Active';
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
        {/* Profile Card */}
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
              {/* Institute Name */}
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

              {/* Mobile (Read Only) */}
              <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mobile Number</label>
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <Phone size={16} className="text-gray-400" />
                      <span className="font-mono">{user.mobile}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded ml-auto">Cannot Change</span>
                  </div>
              </div>

              {/* Email */}
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

              {/* Address */}
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

              {/* Teacher Code - Owner Only */}
              {isOwner && (
                  <div className="pt-4 border-t border-gray-100 mt-4">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Teacher Access Code</label>
                      {isEditing ? (
                          <Input 
                              value={formData.teacherCode} 
                              onChange={e => setFormData({...formData, teacherCode: e.target.value})}
                              placeholder="Set a code for teachers"
                          />
                      ) : (
                          <div className="flex items-center gap-2 text-gray-700">
                              <Key size={18} className="text-gray-400" />
                              <span className="font-mono font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                                  {user.teacherCode || 'Not Set'}
                              </span>
                          </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Share this code with your teachers to let them login.</p>
                  </div>
              )}
          </div>

          {isEditing && (
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 animate-fade-in">
                  <Button variant="secondary" onClick={handleCancel}>
                      Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                      <Save size={18} /> Save Changes
                  </Button>
              </div>
          )}
        </Card>

        {/* Subscription Info Card */}
        <Card>
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
               {user.subscription.planType === 'lifetime' ? <Crown size={24} /> : <Shield size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-lg">Subscription Plan</h3>
              <p className={`${user.plan === 'subscribed' ? 'text-green-600' : 'text-gray-500'} font-semibold`}>
                {renderPlanText()}
              </p>
            </div>
          </div>
           {user.plan !== 'subscribed' && (
              <p className="text-sm text-gray-500 mt-2 pl-14">
                Current Limit: <span className="font-bold text-gray-800">{user.studentLimit} Students</span>
              </p>
           )}
        </Card>

        <div className="text-center pt-8 text-gray-400 text-sm">
          Super Management v1.0.3
        </div>
      </div>
    </div>
  );
};

export default Settings;