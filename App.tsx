
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import EquipmentList from './components/EquipmentList';
import LicenseControl from './components/LicenseControl';
import ServiceDesk from './components/ServiceDesk';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import AuditLog from './components/AuditLog';
import Login from './components/Login';
import TwoFactorAuth from './components/TwoFactorAuth';
import TwoFactorSetup from './components/TwoFactorSetup';
import { Page, User, UserRole } from './types';
import { getSettings } from './services/apiService';
import AIAssistantWidget from './components/AIAssistantWidget';
import Icon from './components/common/Icon';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userFor2FA, setUserFor2FA] = useState<User | null>(null);
  const [userFor2FASetup, setUserFor2FASetup] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [companyName, setCompanyName] = useState('MRR INFORMATICA');
  const [isSsoEnabled, setIsSsoEnabled] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(localStorage.getItem('demo_mode') === 'true');

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.is2FAEnabled && !sessionStorage.getItem('2fa_verified')) {
        setUserFor2FA(user);
      } else {
        setCurrentUser(user);
      }
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }

    // Listener para mudanças no modo demo via localStorage (outras abas ou componentes)
    const interval = setInterval(() => {
        const currentMode = localStorage.getItem('demo_mode') === 'true';
        if (currentMode !== isDemoMode) {
            setIsDemoMode(currentMode);
        }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isDemoMode]);
  
  const fetchSettings = useCallback(async () => {
        try {
            const settings = await getSettings();
            setCompanyName(settings.companyName || 'MRR INFORMATICA');
            setIsSsoEnabled(settings.isSsoEnabled || false);
        } catch (error) {
            console.error("Failed to fetch settings from API:", error);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings, isDemoMode, currentUser]);


  const handleLoginSuccess = (user: User & { requires2FASetup?: boolean }) => {
    if (user.requires2FASetup) {
      setUserFor2FASetup(user);
    } else if (user.is2FAEnabled) {
      setUserFor2FA(user);
    } else {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  };
  
  const handle2FAVerificationSuccess = (user: User) => {
    sessionStorage.setItem('2fa_verified', 'true');
    setCurrentUser(user);
    setUserFor2FA(null);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };
  
  const handle2FASetupSuccess = (user: User) => {
    const updatedUser = { ...user, is2FAEnabled: true };
    sessionStorage.setItem('2fa_verified', 'true');
    setCurrentUser(updatedUser);
    setUserFor2FASetup(null);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserFor2FA(null);
    setUserFor2FASetup(null);
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('2fa_verified');
    setActivePage('Dashboard');
  };

  const deactivateDemoMode = () => {
    console.log("Desativando Modo Demo e limpando caches...");
    localStorage.setItem('demo_mode', 'false');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('2fa_verified');
    // Forçar limpeza de estados
    setIsDemoMode(false);
    setCurrentUser(null);
    // Recarregar a página para garantir que o apiService use o novo valor de demo_mode
    window.location.href = window.location.origin;
  };
  
  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newIsDark = !prev;
      if (newIsDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newIsDark;
    });
  };

  const pages: Page[] = [
    'Dashboard',
    'Inventário de Equipamentos',
    'Controle de Licenças',
    'Service Desk',
  ];

  if (currentUser && [UserRole.Admin, UserRole.UserManager].includes(currentUser.role)) {
    pages.push('Usuários e Permissões');
  }

  if (currentUser && currentUser.role === UserRole.Admin) {
    pages.push('Auditoria');
    pages.push('Configurações');
  }

  const renderPage = () => {
    if (!currentUser) return null;
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard setActivePage={setActivePage} currentUser={currentUser} />;
      case 'Inventário de Equipamentos':
        return <EquipmentList currentUser={currentUser} companyName={companyName} />;
      case 'Controle de Licenças':
        return <LicenseControl currentUser={currentUser} />;
      case 'Service Desk':
        return <ServiceDesk currentUser={currentUser} />;
      case 'Usuários e Permissões':
        return <UserManagement currentUser={currentUser} />;
      case 'Auditoria':
        return <AuditLog />;
      case 'Configurações':
        return <Settings currentUser={currentUser} onUserUpdate={handleUserUpdate}/>;
      default:
        return <Dashboard setActivePage={setActivePage} currentUser={currentUser} />;
    }
  };

  const DemoBanner = () => (
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-md z-[100] animate-fade-in">
       <Icon name="TriangleAlert" size={18} />
       MODO DE DEMONSTRAÇÃO ATIVO - DADOS FICTÍCIOS
       <button 
        onClick={deactivateDemoMode}
        className="ml-4 bg-white/20 hover:bg-white/30 px-3 py-1 rounded border border-white/50 transition-all hover:scale-105 active:scale-95"
       >
         Sair e Voltar ao Sistema Real (MariaDB)
       </button>
    </div>
  );

  if (userFor2FASetup) {
    return <TwoFactorSetup user={userFor2FASetup} onSetupSuccess={handle2FASetupSuccess} onCancel={handleLogout} />
  }

  if (userFor2FA) {
      return <TwoFactorAuth user={userFor2FA} onVerificationSuccess={handle2FAVerificationSuccess} onCancel={handleLogout} />
  }

  if (!currentUser) {
    return (
      <>
        {isDemoMode && <DemoBanner />}
        <Login onLoginSuccess={handleLoginSuccess} isSsoEnabled={isSsoEnabled} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-dark-bg text-gray-800 dark:text-dark-text-primary">
      {isDemoMode && <DemoBanner />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          pages={pages}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            pageTitle={activePage}
            user={currentUser}
            onLogout={handleLogout}
            toggleTheme={toggleTheme}
            isDarkMode={isDarkMode}
            setIsSidebarOpen={setIsSidebarOpen}
            onUserUpdate={handleUserUpdate}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
             {renderPage()}
          </main>
          <AIAssistantWidget currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};

export default App;
