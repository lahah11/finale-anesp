'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { missionService } from '@/services/missionService';
import { PlusIcon, EyeIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Mission {
  id: string;
  mission_reference: string;
  mission_object: string;
  departure_date: string;
  return_date: string;
  status: string;
  current_step: number;
  created_by_name: string;
  participant_count: number;
  estimated_costs?: number;
  created_at: string;
}

function MissionsPageContent() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      // Vérifier les permissions avant de charger les missions
      const response = await missionService.getAll();
      setMissions(response || []);
    } catch (error: any) {
      console.error('Error loading missions:', error);
      
      // Si c'est une erreur 403, ne pas afficher d'erreur car l'utilisateur n'a pas accès
      if (error.response?.status === 403) {
        console.log('Utilisateur non autorisé à voir les missions');
        setMissions([]);
        return;
      }
      
      toast.error('Erreur lors du chargement des missions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string, currentStep: number) => {
    const statusMap = {
      'draft': { label: 'Brouillon', color: 'gray', icon: ClockIcon },
      'pending_technical': { label: 'En attente validation technique', color: 'yellow', icon: ClockIcon },
      'pending_logistics': { label: 'En attente attribution moyens', color: 'blue', icon: ClockIcon },
      'pending_finance': { label: 'En attente validation financière', color: 'purple', icon: ClockIcon },
      'pending_dg': { label: 'En attente validation DG', color: 'orange', icon: ClockIcon },
      'validated': { label: 'Validée', color: 'green', icon: CheckCircleIcon },
      'rejected': { label: 'Rejetée', color: 'red', icon: XCircleIcon }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.draft;
  };

  const getStepLabel = (currentStep: number) => {
    const steps = [
      'Création',
      'Validation technique',
      'Attribution moyens',
      'Validation financière',
      'Validation DG',
      'Validée'
    ];
    return steps[currentStep - 1] || 'Inconnu';
  };

  const filteredMissions = missions.filter(mission => {
    if (filter === 'all') return true;
    if (filter === 'my') return mission.status === 'draft';
    if (filter === 'pending') return mission.status.startsWith('pending');
    if (filter === 'validated') return mission.status === 'validated';
    if (filter === 'rejected') return mission.status === 'rejected';
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Missions</h1>
            <p className="mt-2 text-gray-600">
              Gérez les missions et suivez leur progression dans le workflow de validation
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/missions/pending"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Missions en attente
            </Link>
            <Link
              href="/missions/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nouvelle mission
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Toutes ({missions.length})
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'my'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mes missions ({missions.filter(m => m.status === 'draft').length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              En attente ({missions.filter(m => m.status.startsWith('pending')).length})
            </button>
            <button
              onClick={() => setFilter('validated')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'validated'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Validées ({missions.filter(m => m.status === 'validated').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'rejected'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Rejetées ({missions.filter(m => m.status === 'rejected').length})
            </button>
          </div>
        </div>

        {/* Liste des missions */}
        <div className="bg-white shadow rounded-lg">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <ClockIcon className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune mission</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? 'Commencez par créer votre première mission.'
                  : 'Aucune mission ne correspond à ce filtre.'
                }
              </p>
              {filter === 'all' && (
                <div className="mt-6">
                  <Link
                    href="/missions/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Créer une mission
                  </Link>
                  </div>
                )}
        </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coût estimé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMissions.map((mission) => {
                    const statusInfo = getStatusInfo(mission.status, mission.current_step);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={mission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div className="text-sm font-medium text-gray-900">
                              {mission.mission_reference}
                        </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {mission.mission_object}
                        </div>
                            <div className="text-xs text-gray-400">
                              Créé par {mission.created_by_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(mission.departure_date).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-sm text-gray-500">
                            au {new Date(mission.return_date).toLocaleDateString('fr-FR')}
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className={`h-4 w-4 mr-2 text-${statusInfo.color}-500`} />
                            <span className={`text-sm font-medium text-${statusInfo.color}-700`}>
                              {statusInfo.label}
                          </span>
                        </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Étape: {getStepLabel(mission.current_step)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mission.participant_count} participant{mission.participant_count > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mission.estimated_costs ? `${mission.estimated_costs} MRU` : 'Non calculé'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            href={`/missions/${mission.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
      </div>
    </DashboardLayout>
  );
}

export default function MissionsPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'admin_local', 'dg', 'msgg']} fallbackPath="/dashboard">
      <MissionsPageContent />
    </ProtectedRoute>
  );
}