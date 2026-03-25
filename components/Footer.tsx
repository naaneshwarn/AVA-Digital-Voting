import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full py-4 mt-auto bg-transparent text-center text-gray-400 text-sm">
      <div className="container mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} AVA Digital Voting Machine. All Rights Reserved.</p>
        <p className="font-semibold text-gray-300 mt-1">Jai Hind! 🇮🇳</p>
      </div>
    </footer>
  );
};

export default Footer;