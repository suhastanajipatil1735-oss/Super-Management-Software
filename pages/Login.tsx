
import React, { useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { ADMIN_CREDS, LABELS } from '../constants';
import { db } from '../services/db';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  lang: 'en' | 'mr';
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, lang }) => {
  const [details, setDetails] = useState({ name: '', mobile: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const labels = LABELS[lang];

  const handleLogin = async () => {
    if (!details.name || !details.mobile) return alert("Please fill all details");
    if (details.mobile.length < 10) return alert("Please enter valid 10-digit mobile number");
    
    setIsLoggingIn(true);
    
    // Admin Check
    if (details.name.toLowerCase() === ADMIN_CREDS.NAME && details.mobile === ADMIN_CREDS.MOBILE) {
      const adminProfile: UserProfile = {
        id: 'admin', instituteName: 'Admin', mobile: details.mobile, role: 'admin', 
        plan: 'subscribed', subscription: { active: true, planType: null }, studentLimit: 9999, createdAt: ''
      };
      onLoginSuccess(adminProfile);
      return;
    }

    // Process Owner Login
    let user = await db.users.where('mobile').equals(details.mobile).first();
    
    if (!user) {
      user = {
        id: details.mobile,
        instituteName: details.name,
        mobile: details.mobile,
        role: 'owner',
        plan: 'free',
        subscription: { active: false, planType: null },
        studentLimit: 6,
        createdAt: new Date().toISOString()
      };
      await db.users.add(user);
    } else {
       // Ensure role is owner and update name if changed
       await db.users.update(user.id, { 
           role: 'owner',
           instituteName: details.name 
       });
       user = { ...user, role: 'owner', instituteName: details.name };
    }
    
    onLoginSuccess(user);
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f1f5f9]">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#2d3748] tracking-tight">Super Management</h1>
          <p className="text-gray-500 mt-2">{labels.welcome}</p>
        </div>

        <Card>
          <div className="space-y-6">
             <h2 className="text-xl font-semibold text-gray-700">{labels.loginTitle}</h2>
             <Input 
               label={labels.instName} 
               placeholder="Ex. Wisdom Academy" 
               value={details.name}
               onChange={e => setDetails({...details, name: e.target.value})}
             />
             <Input 
               label={labels.mobile} 
               type="tel" 
               placeholder="98XXXXXXXX"
               value={details.mobile}
               onChange={e => setDetails({...details, mobile: e.target.value})}
               maxLength={10}
             />
             <Button className="w-full" onClick={handleLogin} disabled={isLoggingIn}>
               {isLoggingIn ? "Loading..." : labels.sendCode}
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
