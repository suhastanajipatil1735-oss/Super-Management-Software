import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import { ADMIN_CREDS, LABELS } from '../constants';
import { db } from '../services/db';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  lang: 'en' | 'mr';
  initialStep?: 'DETAILS' | 'ROLE';
  initialDetails?: { name: string; mobile: string };
}

const Login: React.FC<LoginProps> = ({ 
  onLoginSuccess, 
  lang, 
  initialStep = 'DETAILS', 
  initialDetails = { name: '', mobile: '' } 
}) => {
  const [step, setStep] = useState<'DETAILS' | 'ROLE' | 'TEACHER_CODE'>(initialStep);
  const [details, setDetails] = useState(initialDetails);
  const [teacherCode, setTeacherCode] = useState('');
  
  const labels = LABELS[lang];

  useEffect(() => {
    setStep(initialStep);
    setDetails(initialDetails);
  }, [initialStep, initialDetails]);

  const handleDetailSubmit = () => {
    if (!details.name || !details.mobile) return alert("Please fill all details");
    
    // Admin Check
    if (details.name.toLowerCase() === ADMIN_CREDS.NAME && details.mobile === ADMIN_CREDS.MOBILE) {
      const adminProfile: UserProfile = {
        id: 'admin', instituteName: 'Admin', mobile: details.mobile, role: 'admin', 
        plan: 'subscribed', subscription: { active: true, planType: null }, studentLimit: 9999, createdAt: ''
      };
      onLoginSuccess(adminProfile);
      return;
    }

    setStep('ROLE');
  };

  const handleOwnerSelect = async () => {
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
        // Force update to owner if they are selecting Owner role
        // This fixes the issue where a user previously logged in as teacher gets stuck with teacher view
        if (user.role !== 'owner') {
            user.role = 'owner';
            user.instituteName = details.name; // Restore the name entered in the form
            user.linkedOwnerMobile = undefined; // Remove link
            await db.users.put(user);
        }
     }
     onLoginSuccess(user);
  };

  const handleTeacherSelect = () => {
      setStep('TEACHER_CODE');
  };

  const verifyTeacherCode = async () => {
      if (!teacherCode) {
          alert("Please enter the code provided by the Academy Owner");
          return;
      }

      // Find owner with this code
      const owner = await db.users.where('teacherCode').equals(teacherCode).first();

      if (!owner) {
          alert("Invalid Code. Please check with the Academy Owner.");
          return;
      }

      // Create or Update Teacher Profile
      // NOTE: We overwrite the Institute Name with the Owner's Institute Name so the dashboard looks correct
      let user = await db.users.where('mobile').equals(details.mobile).first();
      
      const teacherProfile: UserProfile = {
          id: details.mobile,
          instituteName: owner.instituteName, // Use Owner's Institute Name
          mobile: details.mobile,
          role: 'teacher',
          plan: 'free', 
          subscription: { active: false, planType: null },
          studentLimit: 0,
          createdAt: new Date().toISOString(),
          linkedOwnerMobile: owner.mobile // Crucial: Link to owner
      };

      if (!user) {
          await db.users.add(teacherProfile);
      } else {
          // Update existing user to be a teacher linked to this owner
          await db.users.put(teacherProfile);
      }

      onLoginSuccess(teacherProfile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#2d3748] tracking-tight">Super Management</h1>
          <p className="text-gray-500 mt-2">{labels.welcome}</p>
        </div>

        <Card>
          {step === 'DETAILS' && (
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
               <Button className="w-full" onClick={handleDetailSubmit}>
                 {labels.sendCode}
               </Button>
            </div>
          )}

          {step === 'ROLE' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-700 text-center">Select your role</h2>
              <div className="flex flex-col gap-4">
                <Button variant="secondary" size="lg" onClick={handleOwnerSelect}>
                  {labels.roleOwner}
                </Button>
                <Button variant="secondary" size="lg" onClick={handleTeacherSelect}>
                  {labels.roleTeacher}
                </Button>
                <div className="text-center mt-2">
                   <button onClick={() => setStep('DETAILS')} className="text-sm text-gray-500 hover:text-gray-800 underline">
                     Back to Details
                   </button>
                </div>
              </div>
            </div>
          )}

          {step === 'TEACHER_CODE' && (
             <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-700 text-center">Teacher Access</h2>
                <p className="text-sm text-gray-500 text-center">Enter the code set by the Academy Owner.</p>
                <Input 
                  label="Institute Code" 
                  placeholder="Enter Code" 
                  value={teacherCode}
                  onChange={e => setTeacherCode(e.target.value)}
                />
                <Button className="w-full" onClick={verifyTeacherCode}>
                  Login as Teacher
                </Button>
                 <div className="text-center mt-2">
                   <button onClick={() => setStep('ROLE')} className="text-sm text-gray-500 hover:text-gray-800 underline">
                     Back to Role Selection
                   </button>
                </div>
             </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;