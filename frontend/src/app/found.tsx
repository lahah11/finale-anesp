import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Mauritanian Flag Colors */}
        <div className="mx-auto h-20 w-20 bg-gradient-to-br from-mauritania-green to-mauritania-yellow rounded-full flex items-center justify-center mb-6">
          <ExclamationTriangleIcon className="h-10 w-10 text-white" />
        </div>

        {/* 404 */}
        <h1 className="text-6xl font-bold text-mauritania-green mb-4">404</h1>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Page non trouvée
        </h2>
        
        <p className="text-gray-600 mb-8">
          Désolé, nous ne pouvons pas trouver la page que vous recherchez. 
          Vérifiez l'URL ou retournez à l'accueil.
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <Link href="/dashboard" className="btn-primary w-full">
            Retour au tableau de bord
          </Link>
          <Link href="/login" className="btn-secondary w-full">
            Page de connexion
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