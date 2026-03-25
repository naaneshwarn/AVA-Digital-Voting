import React, { useState } from 'react';
import { Page, AdminPage } from '../types.ts';
import DashboardIcon from './icons/DashboardIcon.tsx';
import CandidatesIcon from './icons/CandidatesIcon.tsx';
import UsersIcon from './icons/UsersIcon.tsx';
import TallyIcon from './icons/TallyIcon.tsx';
import LiveTracking from './admin/LiveTracking.tsx';
import CandidateManager from './admin/CandidateManager.tsx';
import VoterList from './admin/VoterList.tsx';
import ResultsPage from './admin/ResultsPage.tsx';
import LogoutIcon from './icons/LogoutIcon.tsx';

const AdminDashboardPage: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [activePage, setActivePage] = useState<AdminPage>(AdminPage.LIVE_TRACKING);

  const navItems = [
    { id: AdminPage.LIVE_TRACKING, label: 'Live Tracking', icon: DashboardIcon },
    { id: AdminPage.CANDIDATES, label: 'Candidates', icon: CandidatesIcon },
    { id: AdminPage.VOTERS, label: 'Voters', icon: UsersIcon },
    { id: AdminPage.RESULTS, label: 'Results', icon: TallyIcon },
  ];

  const renderContent = () => {
    switch (activePage) {
      case AdminPage.CANDIDATES: return <CandidateManager />;
      case AdminPage.VOTERS: return <VoterList />;
      case AdminPage.RESULTS: return <ResultsPage />;
      case AdminPage.LIVE_TRACKING:
      default:
        return <LiveTracking />;
    }
  };
  
  const getPageTitle = () => {
      return navItems.find(item => item.id === activePage)?.label || 'Dashboard';
  }

  return (
    <div className="flex h-full w-full bg-[#0F172A] text-gray-200 animate-[fadeIn_0.5s_ease-in-out]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900/70 p-6 flex flex-col">
        {/* Top section with title and navigation */}
        <div>
          <h1 className="font-poppins text-2xl font-bold text-white mb-10 text-center">
            AVA<span className="text-[#FF9933]">Admin</span>
          </h1>
          <nav className="space-y-4">
            {navItems.map(item => {
                const IsActive = activePage === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`w-full flex items-center gap-4 py-3 px-4 rounded-lg text-lg font-poppins font-semibold transition-colors duration-200 ${
                            IsActive
                            ? 'bg-gradient-to-r from-[#FF9933] to-[#E3842D] text-white shadow-[0_0_15px_#FF9933]'
                            : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <item.icon className="w-6 h-6" />
                        <span>{item.label}</span>
                    </button>
                )
            })}
          </nav>
        </div>
        
        {/* Logout button pushed to the bottom with mt-auto */}
        <div className="mt-auto">
           <button
             onClick={() => setCurrentPage(Page.HOME)}
             className="w-full flex items-center gap-4 py-3 px-4 rounded-lg text-lg font-poppins font-semibold transition-colors duration-200 text-gray-400 hover:bg-slate-800 hover:text-white"
           >
             <LogoutIcon className="w-6 h-6" />
             <span>Logout</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-900/50 p-6 shadow-md z-10">
          <h2 className="font-poppins text-3xl font-extrabold text-white">{getPageTitle()}</h2>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0F172A]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;