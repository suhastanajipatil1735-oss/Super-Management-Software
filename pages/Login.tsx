
import React, { useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { ADMIN_CREDS, LABELS } from '../constants';
import { db } from '../services/db';
import { UserProfile } from '../types';
import { syncToAirtable } from '../services/airtable';

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
    
    try {
      // 1. Admin Check
      if (details.name.toLowerCase() === ADMIN_CREDS.NAME && details.mobile === ADMIN_CREDS.MOBILE) {
        const adminProfile: UserProfile = {
          id: 'admin', 
          instituteName: 'Admin', 
          mobile: details.mobile, 
          role: 'admin', 
          plan: 'subscribed', 
          subscription: { active: true, planType: null }, 
          studentLimit: 9999, 
          createdAt: new Date().toISOString()
        };
        onLoginSuccess(adminProfile);
        setIsLoggingIn(false);
        return;
      }

      // 2. Process Owner Login
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
         await db.users.update(user.id, { instituteName: details.name });
         user = { ...user, instituteName: details.name };
      }

      // 3. Sync to Airtable
      syncToAirtable({
        instituteName: user.instituteName,
        mobile: user.mobile
      }).catch(err => console.warn("Airtable sync failed", err));
      
      onLoginSuccess(user);
    } catch (err) {
      console.error("Critical login error:", err);
      alert("A system error occurred. Please refresh the page and try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f1f5f9]">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#1e293b] text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-xl">S</div>
          <h1 className="text-4xl font-bold text-[#2d3748] tracking-tight">Super Management</h1>
          <p className="text-gray-500 mt-2 text-sm">{labels.welcome}</p>
        </div>

        <Card>
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-700">{labels.loginTitle}</h2>
                <div className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase">Airtable Cloud</div>
             </div>
             <Input 
               label={labels.instName} 
               placeholder="Ex. Wisdom Academy" 
               value={details.name}
               onChange={e => setDetails({...details, name: e.target.value})}
               disabled={isLoggingIn}
             />
             <Input 
               label={labels.mobile} 
               type="tel" 
               placeholder="98XXXXXXXX"
               value={details.mobile}
               onChange={e => setDetails({...details, mobile: e.target.value})}
               maxLength={10}
               disabled={isLoggingIn}
             />
             <Button className="w-full h-12 text-lg font-bold" onClick={handleLogin} disabled={isLoggingIn}>
               {isLoggingIn ? "Connecting to Airtable..." : labels.sendCode}
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
