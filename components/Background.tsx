import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full -z-20 overflow-hidden bg-[#0F172A]">
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-radial-gradient from-[#FF9933]/20 via-transparent to-transparent blur-3xl animate-[spin_20s_linear_infinite]"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-radial-gradient from-[#138808]/20 via-transparent to-transparent blur-3xl animate-[spin_20s_linear_infinite_reverse]"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-radial-gradient from-white/10 via-transparent to-transparent blur-3xl animate-[spin_25s_linear_infinite]"></div>
      <div className="absolute inset-0 bg-black/20"></div>
    </div>
  );
};

export default Background;