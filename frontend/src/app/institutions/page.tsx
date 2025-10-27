'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { institutionService } from '@/services/institutionService';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInstitutions = async () => {
    try {
      const data = await institutionService.getAll();
      setInstitutions(data.institutions);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'institution "${name}" ?`)) {
      return;
    }

    try {
      await institutionService.delete(id);
      toast.success('Institution supprimée avec succès');
      fetchInstitutions();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'ministerial' ? 'Ministériel' : 'Établissement';
  };

  const getTypeBadge = (type: string) => {
    const isMinisterial = type === 'ministerial';
    return (
      <span className={`status-badge ${
        isMinisterial 
          ? 'bg-purple-100 text-purple-800' 
          : 'bg-blue-100 text-blue-800'
      }`}>
        {getTypeLabel(type)}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement des institutions..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
            <p className="mt-2 text-gray-600">
              Gérez les ministères et établissements
            </p>
          </div>
          <Link href="/institutions/create" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle institution
          </Link>
        </div>

        {/* Institutions Grid */}
        {institutions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((institution: any) => (
              <div key={institution.id} className="card hover:shadow-lg transition-shadow group">
                {/* Institution Header */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {institution.logo_url ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${institution.logo_url}`}
                        alt={institution.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-mauritania-green rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {institution.name}
                    </h3>
                    <div className="mt-1">
                      {getTypeBadge(institution.type)}
                    </div>
                  </div>
                </div>

                {/* Institution Description */}
                <div className="mt-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {institution.header_text || 'Aucune description'}
                  </p>
                </div>

                {/* Institution Footer with Date and Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Créée le {new Date(institution.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  
                  {/* Action Buttons - Better positioned at bottom right */}
                  <div className="flex items-center space-x-1">
                    <Link 
                      href={`/institutions/${institution.id}/edit`}
                      className="p-1.5 rounded-md text-gray-400 hover:text-mauritania-green hover:bg-gray-50 transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(institution.id, institution.name)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune institution</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre première institution.
            </p>
            <div className="mt-6">
              <Link href="/institutions/create" className="btn-primary">
                <PlusIcon className="h-5 w-5 mr-2" />
                Nouvelle institution
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}