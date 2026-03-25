import React, { useState, useEffect } from 'react';
import { Page, UserData } from './types.ts';
import Background from './components/Background.tsx';
import HomePage from './components/HomePage.tsx';
import UserPortalPage from './components/UserPortalPage.tsx';
import SignUpPage from './components/SignUpPage.tsx';
import LoginPage from './components/LoginPage.tsx';
import PollingPage from './components/PollingPage.tsx';
import Footer from './components/Footer.tsx';
import AdminLoginPage from './components/AdminLoginPage.tsx';
import AdminDashboardPage from './components/AdminDashboardPage.tsx';
import { backendService } from './services/backendService.ts';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  useEffect(() => {
    // Initialize the backend data and listeners on first load.
    backendService.seedDatabase();
    backendService.initializeListeners();
  }, []); // The empty dependency array ensures this runs only once.


  const handleLoginSuccess = (user: UserData) => {
    setCurrentUser(user);
    setCurrentPage(Page.POLLING);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage(Page.HOME);
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.USER_PORTAL:
        return <UserPortalPage setCurrentPage={setCurrentPage} />;
      case Page.SIGNUP:
        return <SignUpPage setCurrentPage={setCurrentPage} />;
      case Page.LOGIN:
        return <LoginPage setCurrentPage={setCurrentPage} onLoginSuccess={handleLoginSuccess} />;
      case Page.POLLING:
        return <PollingPage setCurrentPage={handleLogout} currentUser={currentUser} />;
      case Page.ADMIN_LOGIN:
        return <AdminLoginPage setCurrentPage={setCurrentPage} />;
      case Page.ADMIN_DASHBOARD:
        return <AdminDashboardPage setCurrentPage={setCurrentPage} />;
      case Page.HOME:
      default:
        return <HomePage setCurrentPage={setCurrentPage} />;
    }
  };

  const isAdminDashboard = currentPage === Page.ADMIN_DASHBOARD;

  return (
    <main className="relative min-h-screen bg-[#0F172A] font-lato text-gray-200 flex flex-col">
      <Background />
      <div className={`relative z-10 flex-grow ${isAdminDashboard ? 'flex' : 'flex items-center justify-center p-4'}`}>
        {renderPage()}
      </div>
      {!isAdminDashboard && <Footer />}
    </main>
  );
}

export default App;