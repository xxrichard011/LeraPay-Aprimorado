import { createContext, ReactNode, useContext, useState } from 'react';
import { api, getAccessToken, setAccessToken } from '../api/client';
import { AuthResult, AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_USER_KEY = 'baas_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  // recupera o usuario do localStorage pra não perder o login ao dar refresh na pagina
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  // salva o token e o user depois de um login/register bem sucedido
  function applyAuthResult(result: AuthResult) {
    setAccessToken(result.accessToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }

  async function login(email: string, password: string) {
    const result = await api.post<AuthResult>('/auth/login', { email, password });
    applyAuthResult(result);
  }

  async function register(name: string, email: string, password: string) {
    const result = await api.post<AuthResult>('/auth/register', { name, email, password });
    applyAuthResult(result);
  }

  function logout() {
    setAccessToken(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: Boolean(user && getAccessToken()), login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}