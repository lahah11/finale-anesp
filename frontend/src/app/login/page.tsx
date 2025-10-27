'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    general: ''
  });
  const { login, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setIsRedirecting(true);
      router.push('/dashboard');
    }
  }, [user, router]);

  // Show loading if redirecting
  if (isRedirecting || user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mauritania-green to-mauritania-green-dark flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-white">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  const clearErrors = () => {
    setErrors({
      username: '',
      password: '',
      general: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErrors();

    try {
      await login(username, password);
      toast.success('Connexion réussie!');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur de connexion';
      
      // Check for specific error types
      if (errorMessage.toLowerCase().includes('utilisateur') || 
          errorMessage.toLowerCase().includes('username') ||
          errorMessage.toLowerCase().includes('user not found') ||
          errorMessage.toLowerCase().includes('utilisateur introuvable')) {
        setErrors(prev => ({
          ...prev,
          username: 'Nom d\'utilisateur incorrect ou inexistant'
        }));
        toast.error('Nom d\'utilisateur incorrect');
      } else if (errorMessage.toLowerCase().includes('mot de passe') || 
                 errorMessage.toLowerCase().includes('password') ||
                 errorMessage.toLowerCase().includes('invalid password') ||
                 errorMessage.toLowerCase().includes('incorrect password')) {
        setErrors(prev => ({
          ...prev,
          password: 'Mot de passe incorrect'
        }));
        toast.error('Mot de passe incorrect');
      } else if (errorMessage.toLowerCase().includes('invalid credentials') ||
                 errorMessage.toLowerCase().includes('identifiants invalides') ||
                 errorMessage.toLowerCase().includes('unauthorized')) {
        setErrors(prev => ({
          ...prev,
          general: 'Nom d\'utilisateur ou mot de passe incorrect'
        }));
        toast.error('Identifiants incorrects');
      } else {
        // Generic error
        setErrors(prev => ({
          ...prev,
          general: errorMessage
        }));
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    // Clear username error when user starts typing
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mauritania-green to-mauritania-green-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 p-1/2">
            <Image
              src="/logo.png"
              alt="République Islamique de la Mauritanie"
              width={80}
              height={80}
              className="rounded-full object-contain"
              priority
            />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Système d'Ordre de Mission
          </h2>
          <p className="mt-2 text-mauritania-yellow">
            République Islamique de la Mauritanie
          </p>
          <p className="mt-1 text-white text-sm opacity-90">
            Honneur - Fraternité - Justice
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* General Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="form-label">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`form-input ${errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Entrez votre nom d'utilisateur"
                value={username}
                onChange={handleUsernameChange}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`form-input pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={handlePasswordChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Identifiants de démonstration:
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>👑 Super Admin: <code>superadmin</code> / <code>admin123</code></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white text-sm opacity-75">
          © 2025 République Islamique de la Mauritanie
        </div>
      </div>
    </div>
  );
}