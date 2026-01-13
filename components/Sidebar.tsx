
import React from 'react';
import { Page } from '../types';
import Icon from './common/Icon';
import { icons } from 'lucide-react';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  pages: Page[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const pageIcons: { [key in Page]: keyof typeof icons } = {
    'Dashboard': 'LayoutDashboard',
    'Inventário de Equipamentos': 'Computer',
    'Controle de Licenças': 'ScrollText',
    'Service Desk': 'Headset',
    'Usuários e Permissões': 'Users',
    'Configurações': 'Settings',
    'Auditoria': 'History',
}
const developerPhoto = "data:image/jpeg;base64,..."; // Mantendo a foto do dev

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, pages, isSidebarOpen, setIsSidebarOpen }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-30 bg-white dark:bg-dark-card shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        {/* Header da Sidebar */}
        <div className="h-20 flex items-center justify-center border-b dark:border-dark-border relative">
             {isSidebarOpen ? (
                <div className="flex items-center gap-2 px-4">
                    <Icon name="ShieldCheck" size={32} className="text-brand-primary" />
                    <h1 className="text-xl font-bold text-brand-dark dark:text-dark-text-primary whitespace-nowrap">Inventário Pro</h1>
                </div>
            ) : (
                 <Icon name="ShieldCheck" size={32} className="text-brand-primary" />
            )}
            
             <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 lg:hidden text-gray-500"
            >
                <Icon name="X" size={24} />
            </button>
        </div>

        {/* Lista de Navegação */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {pages.map((page) => {
                const isActive = activePage === page;
                return (
                  <li key={page}>
                    <button
                      onClick={() => {
                        setActivePage(page);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200
                        ${isActive 
                          ? 'bg-brand-primary text-white shadow-md' 
                          : 'text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                        ${!isSidebarOpen ? 'justify-center' : ''}
                      `}
                      title={!isSidebarOpen ? page : ''}
                    >
                      <Icon name={pageIcons[page]} size={24} />
                      {isSidebarOpen && (
                        <span className="ml-3 font-medium text-sm">{page}</span>
                      )}
                    </button>
                  </li>
                );
            })}
          </ul>
        </nav>

        {/* Rodapé com Info do Desenvolvedor */}
        <div className="border-t dark:border-dark-border p-4 bg-gray-50 dark:bg-dark-bg/50">
            <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'justify-center' : ''}`}>
                <div className="relative group">
                    <img
                        src={developerPhoto}
                        alt="Dev"
                        className={`
                            w-10 h-10 rounded-full object-cover border-2 border-gray-300 dark:border-dark-border bg-gray-200
                            transition-transform duration-300 ease-out origin-bottom-left
                            hover:scale-[5] hover:z-50 hover:shadow-2xl cursor-pointer relative
                        `}
                    />
                </div>
                
                {isSidebarOpen && (
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-xs font-bold text-brand-secondary dark:text-dark-text-primary truncate">
                            marcelo.reis@usereserva.com
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-dark-text-secondary truncate">
                            &copy; 2025 Dev: Marcelo Reis
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
