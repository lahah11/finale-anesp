'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { authService } from '@/services/authService';
import { dictionary, SupportedLanguage } from '@/i18n/dictionary';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  institution_id?: string;
  institution_name?: string;
  institution_type?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<SupportedLanguage>('fr');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          const userData = await authService.getProfile();
          setUser(userData.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.removeToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const storedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('anesp-lang') : null;
    if (storedLanguage === 'fr' || storedLanguage === 'ar') {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('anesp-lang', language);
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const login = async (username: string, password: string) => {
    const response = await authService.login(username, password);
    setUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  const languageContextValue = useMemo(() => {
    const translations = dictionary[language];
    const t = (key: string) => translations[key] || key;
    return {
      language,
      setLanguage,
      t,
      direction: language === 'ar' ? 'rtl' : 'ltr'
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={languageContextValue}>
      <AuthContext.Provider value={value}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              direction: languageContextValue.direction
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#006233',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
}