
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { login, checkApiStatus } from '../services/apiService';
import Icon from './common/Icon';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  isSsoEnabled: boolean;
}

const developerPhoto = "data:image/jpeg;base64,..."; // Mantendo a foto do dev

const Login: React.FC<LoginProps> = ({ onLoginSuccess, isSsoEnabled }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const isDemoMode = localStorage.getItem('demo_mode') === 'true';

  useEffect(() => {
    const checkStatus = async () => {
        const status = await checkApiStatus();
        setServerOnline(status.ok);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = await login({ username, password });
      onLoginSuccess(user);
    } catch (err: any) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Não foi possível conectar ao servidor real. Verifique se a API está rodando ou use o Modo Demo.');
      } else {
        setError(err.message || 'Usuário ou senha inválidos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateDemo = async () => {
    setIsLoading(true);
    localStorage.setItem('demo_mode', 'true');
    setTimeout(async () => {
        try {
            const user = await login({ username: 'admin', password: 'any' });
            onLoginSuccess(user);
        } catch (e) {
            setError("Erro ao iniciar modo demo.");
            setIsLoading(false);
        }
    }, 400);
  };

  const handleDeactivateDemo = () => {
    localStorage.setItem('demo_mode', 'false');
    window.location.reload();
  };
  
  const handleSsoLogin = () => {
    window.location.href = '/api/sso/login';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100 dark:bg-dark-bg p-4">
      <div className="bg-white dark:bg-dark-card p-8 rounded-lg shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <Icon name="ShieldCheck" size={48} className="mx-auto text-brand-primary mb-2" />
          <h1 className="text-3xl font-bold text-brand-dark dark:text-dark-text-primary">Inventário Pro</h1>
          
          <div className="flex items-center justify-center gap-2 mt-2 text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${serverOnline === null ? 'bg-gray-400' : serverOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
            <span className={serverOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {serverOnline === null ? 'Verificando servidor...' : serverOnline ? 'Servidor Real Online' : 'Servidor Real Offline'}
            </span>
          </div>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-dark-text-secondary text-sm font-bold mb-2" htmlFor="username">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow appearance-none border dark:border-dark-border rounded w-full py-2 px-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-dark-text-primary leading-tight focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: admin"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-dark-text-secondary text-sm font-bold mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border dark:border-dark-border rounded w-full py-2 px-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-dark-text-primary mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="********"
            />
          </div>
          <div className="flex flex-col items-center justify-between gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors disabled:bg-gray-400 flex justify-center items-center gap-2"
            >
              {isLoading ? <><Icon name="LoaderCircle" className="animate-spin" size={18}/> Entrando...</> : 'Entrar no Sistema Real'}
            </button>

            {isDemoMode ? (
                <button
                    type="button"
                    onClick={handleDeactivateDemo}
                    className="text-orange-600 dark:text-orange-400 text-xs font-bold hover:underline py-1 flex items-center gap-1"
                >
                    <Icon name="Power" size={12} /> Desativar Modo Demo
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleActivateDemo}
                    className="text-brand-secondary dark:text-brand-primary text-xs font-bold hover:underline py-1"
                >
                    Ativar Modo de Demonstração (DADOS FICTÍCIOS)
                </button>
            )}

            {isSsoEnabled && (
                <>
                    <div className="relative w-full my-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-dark-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-dark-card text-gray-500 dark:text-dark-text-secondary">ou</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSsoLogin}
                        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-dark-text-primary font-semibold py-2 px-4 border border-gray-300 dark:border-dark-border rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 w-full flex items-center justify-center gap-2"
                    >
                        <Icon name="KeyRound" size={18}/> Entrar com SSO
                    </button>
                </>
            )}
          </div>
        </form>
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 text-xs">
        <div className="relative group">
             <img
              src={developerPhoto}
              alt="Dev"
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-dark-border bg-gray-200 transition-transform duration-300 ease-out origin-bottom hover:scale-[5] hover:z-50 hover:shadow-2xl cursor-pointer relative"
            />
        </div>
        <div className="text-left text-gray-500 dark:text-dark-text-secondary">
          <p className="font-semibold">marcelo.reis@usereserva.com</p>
          <p className="text-gray-400 dark:text-gray-500">&copy; 2025 Dev: Marcelo Reis</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
