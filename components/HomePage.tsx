import React from 'react';
import { Page } from '../types.ts';
import Button from './Button.tsx';

interface HomePageProps {
  setCurrentPage: (page: Page) => void;
}

const HomePage: React.FC<HomePageProps> = ({ setCurrentPage }) => {

  const handleAdminLogin = () => {
    setCurrentPage(Page.ADMIN_LOGIN);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-[fadeIn_1s_ease-in-out]">
      <header className="mb-12">
        <h1 className="font-poppins text-6xl md:text-8xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] via-white to-[#138808] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          AVA Digital Voting
        </h1>
        <p className="font-poppins text-2xl text-gray-400 font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Welcome to the Future of Secure Elections</p>
      </header>

      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-10 max-w-lg">
         <h2 className="font-poppins text-3xl font-bold text-white mb-6">Choose Your Portal</h2>
         <div className="flex flex-col gap-6">
            <Button onClick={handleAdminLogin} variant="secondary">Admin Login</Button>
            <Button onClick={() => setCurrentPage(Page.USER_PORTAL)} variant="primary">User Sign Up / Login</Button>
         </div>
      </div>
    </div>
  );
};

export default HomePage;