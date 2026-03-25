import React, { useState } from 'react';
import { Page } from '../types.ts';
import Button from './Button.tsx';

interface UserPortalPageProps {
  setCurrentPage: (page: Page) => void;
}

const UserPortalPage: React.FC<UserPortalPageProps> = ({ setCurrentPage }) => {
  const [script] = useState('Namaskar, and welcome to AVA Voting, for a stronger Bharat. Our secure digital platform makes your vote count. First, sign up with your details, and a quick photo. Next, log in using your Aadhar and Voter ID. Our advanced AI will confirm your identity using your face. Once verified, simply select your candidate and confirm your vote. Your voice, your vote, your nation.');

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-[fadeIn_1s_ease-in-out]">
      <header className="mb-12">
        <h1 className="font-poppins text-6xl md:text-8xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] via-white to-[#138808] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          Voter Portal
        </h1>
        <p className="font-poppins text-2xl text-gray-400 font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Secure. Accessible. Patriotic.</p>
      </header>

      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-8 max-w-3xl mb-12">
        <h2 className="font-poppins text-3xl font-bold text-[#FF9933] mb-4">How to Vote</h2>
        <p className="text-lg leading-relaxed text-gray-300">{script}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-8">
        <Button onClick={() => setCurrentPage(Page.SIGNUP)} variant="primary">Sign Up</Button>
        <Button onClick={() => setCurrentPage(Page.LOGIN)} variant="secondary">Log In</Button>
      </div>
    </div>
  );
};

export default UserPortalPage;