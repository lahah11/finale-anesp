'use client';

import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallbackPath = '/dashboard' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Si aucun rôle requis, autoriser l'accès
      if (requiredRoles.length === 0) {
        setIsAuthorized(true);
        return;
      }

      // Vérifier si l'utilisateur a un des rôles requis
      const hasRequiredRole = requiredRoles.includes(user.role);
      
      if (hasRequiredRole) {
        setIsAuthorized(true);
      } else {
        console.log(`Accès refusé: rôle ${user.role} non autorisé pour cette page`);
        router.push(fallbackPath);
      }
    }
  }, [user, loading, requiredRoles, router, fallbackPath]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
