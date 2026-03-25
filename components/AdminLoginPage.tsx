import React, { useState } from 'react';
import { Page } from '../types.ts';
import Button from './Button.tsx';
import InputField from './InputField.tsx';
import CloseIcon from './icons/CloseIcon.tsx';

interface AdminLoginPageProps {
  setCurrentPage: (page: Page) => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ setCurrentPage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorType, setErrorType] = useState<'username' | 'password' | null>(null);

  const correctUsername = 'ECI123';
  const correctPassword = 'PassWord';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (username !== correctUsername) {
      setErrorType('username');
    } else if (password !== correctPassword) {
      setErrorType('password');
    } else {
      setCurrentPage(Page.ADMIN_DASHBOARD);
    }
  };

  const handleTryAgain = () => {
    if (errorType === 'username') {
      setUsername('');
    } else if (errorType === 'password') {
      setPassword('');
    }
    setErrorType(null);
  };

  const getErrorMessage = () => {
    if (errorType === 'username') return 'Incorrect Username';
    if (errorType === 'password') return 'Incorrect Password';
    return '';
  };
  
  return (
    <div className="relative flex flex-col items-center justify-center h-full p-8 w-full animate-[fadeIn_0.5s_ease-in-out]">
      {errorType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]">
          <div className="relative bg-[#1E293B] border-gray-700 border rounded-2xl shadow-lg p-8 text-center w-full max-w-md m-4">
            <button
              onClick={() => setCurrentPage(Page.HOME)}
              className="absolute top-4 right-4 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg"
              aria-label="Close and return to home page"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            <h2 className="font-poppins text-3xl font-bold text-red-400 mb-4">Login Failed</h2>
            <p className="text-lg text-gray-300 mb-8">{getErrorMessage()}</p>
            <div className="flex justify-center">
              <Button onClick={handleTryAgain} variant="primary">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      <h1 className="font-poppins text-5xl font-extrabold text-white mb-8">Admin Login</h1>
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <form onSubmit={handleConfirm} className="space-y-6" noValidate>
          <InputField
            label="Username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-center pt-4">
            <Button type="submit" variant="primary">
              Confirm
            </Button>
          </div>
        </form>
      </div>
      <button onClick={() => setCurrentPage(Page.HOME)} className="mt-8 text-gray-400 hover:text-white transition-colors">
        Return to Home
      </button>
    </div>
  );
};

export default AdminLoginPage;