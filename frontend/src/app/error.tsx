'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ExclamationCircleIcon className="h-10 w-10 text-red-600" />
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Une erreur est survenue
        </h1>
        
        <p className="text-gray-600 mb-8">
          Nous rencontrons des difficultés techniques. 
          Veuillez réessayer ou contacter l'administrateur si le problème persiste.
        </p>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <h3 className="font-medium text-red-800 mb-2">Détails de l'erreur:</h3>
            <p className="text-sm text-red-700 font-mono">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">ID: {error.digest}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <button onClick={reset} className="btn-primary w-full">
            Réessayer
          </button>
          <Link href="/dashboard" className="btn-secondary w-full">
            Retour au tableau de bord
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          République Islamique de Mauritanie<br />
          Système d'Ordre de Mission
        </div>
      </div>
    </div>
  );
}