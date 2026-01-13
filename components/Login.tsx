
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { login } from '../services/apiService';
import Icon from './common/Icon';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  isSsoEnabled: boolean;
}

// CAMPO DE IMAGEM EM BRANCO - ADICIONE SEU BASE64 AQUI
const developerPhoto = "data:image/jpeg;base64,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";

const Login: React.FC<LoginProps> = ({ onLoginSuccess, isSsoEnabled }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = await login({ username, password });
      onLoginSuccess(user);
    } catch (err: any) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Não foi possível conectar ao servidor. Verifique se a API está em execução.');
      } else {
        setError(err.message || 'Usuário ou senha inválidos.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSsoLogin = () => {
    // Use a URL relativa para que o Nginx gerencie o redirecionamento
    window.location.href = '/api/sso/login';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100 dark:bg-dark-bg p-4">
      <div className="bg-white dark:bg-dark-card p-8 rounded-lg shadow-lg w-full max-w-sm">
        <div className="text-center mb-8">
            <Icon name="ShieldCheck" size={48} className="mx-auto text-brand-primary mb-2" />
          <h1 className="text-3xl font-bold text-brand-dark dark:text-dark-text-primary">Inventário Pro</h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mt-1">Faça login para continuar</p>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-dark-text-secondary text-sm font-bold mb-2" htmlFor="username">
              Usuário
            </label>
            <input
              id="username"
              data-testid="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow appearance-none border dark:border-dark-border rounded w-full py-2 px-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-dark-text-primary leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Ex: admin"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-dark-text-secondary text-sm font-bold mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border dark:border-dark-border rounded w-full py-2 px-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-dark-text-primary mb-3 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="********"
            />
          </div>
          <div className="flex flex-col items-center justify-between gap-4">
            <button
              type="submit"
              data-testid="login-button"
              disabled={isLoading}
              className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
            {isSsoEnabled && (
                <>
                    <div className="relative w-full my-2">
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
            {/* Foto com efeito de Zoom */}
             <img
              src={developerPhoto}
              alt="Dev"
              className={`
                w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-dark-border bg-gray-200 
                transition-transform duration-300 ease-out origin-bottom
                hover:scale-[5] hover:z-50 hover:shadow-2xl cursor-pointer relative
              `}
            />
        </div>
        <div className="text-left text-gray-500 dark:text-dark-text-secondary">
          <p className="font-semibold" title="marcelo.reis@usereserva.com">marcelo.reis@usereserva.com</p>
          <p className="text-gray-400 dark:text-gray-500">&copy; 2025 Dev: Marcelo Reis</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
