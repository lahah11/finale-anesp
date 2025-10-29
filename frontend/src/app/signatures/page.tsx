'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { signatureService } from '@/services/signatureService';
import { useAuth } from '@/app/providers';
import { PlusIcon, PencilIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SignaturesPage() {
  const { user } = useAuth();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSignatures = async () => {
    try {
      const data = await signatureService.getByInstitution();
      setSignatures(data.signatures);
    } catch (error) {
      console.error('Error fetching signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la signature de "${name}" ?`)) {
      return;
    }

    try {
      await signatureService.delete(id);
      toast.success('Signature supprimée avec succès');
      fetchSignatures();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'dg' ? 'Directeur Général' : 'MSGG';
  };

  const getRoleBadge = (role: string) => {
    return (
      <span className={`status-badge ${
        role === 'dg' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-blue-100 text-blue-800'
      }`}>
        {getRoleLabel(role)}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement des signatures..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Signatures et Cachets</h1>
            <p className="mt-2 text-gray-600">
              Gérez les signatures numériques et cachets officiels
            </p>
          </div>
          <Link href="/signatures/create" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle signature
          </Link>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <PencilSquareIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                À propos des signatures
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Les signatures numériques sont utilisées pour signer automatiquement les ordres de mission. 
                  Chaque rôle (DG, MSGG) ne peut avoir qu'une seule signature active à la fois.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures Grid */}
        {signatures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {signatures.map((signature: any) => (
              <div key={signature.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{signature.signed_by}</h3>
                    <p className="text-sm text-gray-600">{signature.title}</p>
                    <div className="mt-2">
                      {getRoleBadge(signature.role)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link 
                      href={`/signatures/${signature.id}/edit`}
                      className="p-2 text-gray-400 hover:text-mauritania-green"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(signature.id, signature.signed_by)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Signature Preview */}
                  {signature.signature_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Signature:</h4>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${signature.signature_url}`}
                          alt="Signature"
                          className="max-h-20 max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Stamp Preview */}
                  {signature.stamp_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Cachet:</h4>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${signature.stamp_url}`}
                          alt="Cachet"
                          className="max-h-20 max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Créée le {new Date(signature.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <PencilSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune signature</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par ajouter les signatures officielles.
            </p>
            <div className="mt-6">
              <Link href="/signatures/create" className="btn-primary">
                <PlusIcon className="h-5 w-5 mr-2" />
                Nouvelle signature
              </Link>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Guide d'utilisation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Signatures numériques:</h4>
              <ul className="space-y-1">
                <li>• Format recommandé: PNG avec fond transparent</li>
                <li>• Résolution minimale: 300x100 pixels</li>
                <li>• Taille maximale: 5MB</li>
                <li>• Une seule signature active par rôle</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Cachets officiels:</h4>
              <ul className="space-y-1">
                <li>• Format recommandé: PNG avec fond transparent</li>
                <li>• Résolution minimale: 200x200 pixels</li>
                <li>• Taille maximale: 5MB</li>
                <li>• Doit être le cachet officiel de l'institution</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}