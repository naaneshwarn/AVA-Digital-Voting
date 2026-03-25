import React, { useState } from 'react';
import { Page, UserData } from '../types.ts';
import Button from './Button.tsx';
import TriColorBorderBox from './TriColorBorderBox.tsx';
import InputField from './InputField.tsx';
import { validateAadhar, validateVoterId } from '../utils/validation.ts';
import BiometricVerification from './BiometricVerification.tsx';
import { backendService } from '../services/backendService.ts';

interface LoginPageProps {
  setCurrentPage: (page: Page) => void;
  onLoginSuccess: (user: UserData) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setCurrentPage, onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({ aadhar: '', voterId: '' });
  const [errors, setErrors] = useState({ aadhar: '', voterId: '' });
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'biometric'>('credentials');
  const [verifiedUser, setVerifiedUser] = useState<UserData | null>(null);
  const [showVotedModal, setShowVotedModal] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'voterId') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    if (name === 'aadhar') {
      processedValue = value.replace(/\D/g, '').slice(0, 12);
    }
    
    setCredentials(prev => ({...prev, [name]: processedValue}));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({...prev, [name]: ''}));
    }
    if (apiError) setApiError('');
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error = '';
    if (name === 'aadhar') {
        const validation = validateAadhar(value);
        if (!validation.isValid) error = validation.message;
    } else if (name === 'voterId') {
        const validation = validateVoterId(value);
        if (!validation.isValid) error = validation.message;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    
    const aadharValidation = validateAadhar(credentials.aadhar);
    const voterIdValidation = validateVoterId(credentials.voterId);

    if (!aadharValidation.isValid || !voterIdValidation.isValid) {
      setErrors({
        aadhar: aadharValidation.isValid ? '' : aadharValidation.message,
        voterId: voterIdValidation.isValid ? '' : voterIdValidation.message,
      });
      return;
    }
    
    setIsLoading(true);

    const user = await backendService.findUserByCredentials(credentials.aadhar, credentials.voterId);

    if (user) {
      const electionStatus = await backendService.getElectionStatus();
      if (user.hasVoted && electionStatus === 'IN_PROGRESS') {
        setShowVotedModal(true);
      } else {
        setVerifiedUser(user);
        setLoginStep('biometric');
      }
    } else {
      const errorMessage = `We couldn't find your registration details with the information provided. Please check your Voter ID and Aadhar number and try again. If you have not registered yet, please click 'Sign Up' to begin.`;
      setApiError(errorMessage);
    }
    setIsLoading(false);
  };

  const handleBiometricSuccess = () => {
    if (!verifiedUser) return;
    onLoginSuccess(verifiedUser);
  };

  if (loginStep === 'biometric' && verifiedUser?.photo) {
    return (
      <BiometricVerification
        registeredUserPhoto={verifiedUser.photo}
        onSuccess={handleBiometricSuccess}
        onNavigateBack={() => setCurrentPage(Page.USER_PORTAL)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 animate-[fadeIn_0.5s_ease-in-out]">
      {showVotedModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]">
            <div className="bg-[#1E293B] border-gray-700 border rounded-2xl shadow-lg p-8 text-center w-full max-w-lg m-4">
                <TriColorBorderBox borderStyle="error" className="p-1 rounded-xl mb-6 inline-block">
                   <div className="text-4xl">✋</div>
                </TriColorBorderBox>
                <h2 className="font-poppins text-3xl font-bold text-white mb-4">Vote Already Cast</h2>
                <p className="text-lg text-gray-300 mb-8">
                  Your vote has already been recorded for this election. You cannot vote again.
                  <br/>
                  Thank you for your participation.
                </p>
                <div className="flex justify-center">
                    <Button onClick={() => setCurrentPage(Page.HOME)} variant="primary">
                        Return to Home
                    </Button>
                </div>
            </div>
         </div>
      )}

       <h1 className="font-poppins text-5xl font-extrabold text-white mb-8">Voter Log In</h1>
       <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <InputField 
            label="Aadhar Number" 
            name="aadhar" 
            onChange={handleInputChange} 
            onBlur={handleBlur}
            value={credentials.aadhar} 
            error={errors.aadhar}
            required
            maxLength={12}
            inputMode="numeric"
          />
          <InputField 
            label="Voter ID" 
            name="voterId" 
            onChange={handleInputChange} 
            onBlur={handleBlur}
            value={credentials.voterId} 
            error={errors.voterId}
            required
            maxLength={10}
          />

          {apiError && <p className="text-red-400 text-sm bg-red-900/50 p-3 rounded-md">{apiError}</p>}

          <div className="flex justify-center pt-4">
            <Button type="submit" variant="primary" isLoading={isLoading}>Next</Button>
          </div>
        </form>
       </div>
       <button onClick={() => setCurrentPage(Page.HOME)} className="mt-8 text-gray-400 hover:text-white transition-colors">Back to Home</button>
    </div>
  );
};

export default LoginPage;