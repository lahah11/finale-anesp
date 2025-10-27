'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { missionService } from '@/services/missionService';
import { userService } from '@/services/userService';

interface Mission {
  id: string;
  mission_number: string;
  objective: string;
  destination: string;
  departure_city: string;
  arrival_city: string;
  transport_mode: string;
  departure_date: string;
  return_date: string;
  status: string;
  created_by: string;
  employee_id: string;
  estimated_distance_km?: number;
  estimated_fuel_liters?: number;
  estimated_cost?: number;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  role: string;
  institution_id: string;
}

export default function PendingMissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
    loadPendingMissions();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      setError('Erreur lors du chargement du profil utilisateur');
    }
  };

  const loadPendingMissions = async () => {
    try {
      const response = await missionService.getAll();
      // S'assurer que nous avons un tableau
      const missionsData = Array.isArray(response) ? response : (response.missions || response.data || []);
      
      // Filtrer les missions en attente selon le rôle
      const pendingMissions = missionsData.filter((mission: Mission) => {
        if (user?.role === 'dg') {
          return mission.status === 'pending_dg';
        }
        return false;
      });
      setMissions(pendingMissions);
    } catch (error) {
      console.error('Error loading pending missions:', error);
      setError('Erreur lors du chargement des missions en attente');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Brouillon',
      'pending_dg': 'En attente DG',
      'pending_msgg': 'En attente MSGG',
      'validated': 'Validée',
      'rejected': 'Refusée',
      'cancelled': 'Annulée'
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending_dg': 'bg-yellow-100 text-yellow-800',
      'pending_msgg': 'bg-blue-100 text-blue-800',
      'validated': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: { [key: string]: string } = {
      'dg': 'Directeur Général',
      'msgg': 'Moyens Généraux',
      'daf': 'Directeur Administratif et Financier',
      'engineer': 'Ingénieur',
      'agent': 'Agent'
    };
    return roleLabels[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des missions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.push('/missions')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour aux missions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Missions en Attente de Validation
              </h1>
              <p className="text-gray-600 mt-1">
                {getRoleLabel(user?.role || '')} - {missions.length} mission(s) en attente
              </p>
            </div>
            <button
              onClick={() => router.push('/missions')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ← Retour aux missions
            </button>
          </div>
        </div>

        {/* Missions List */}
        {missions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune mission en attente
            </h3>
            <p className="text-gray-600">
              Il n'y a actuellement aucune mission en attente de votre validation.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {missions.map((mission) => (
              <div key={mission.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Mission #{mission.mission_number}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mission.status)}`}>
                        {getStatusLabel(mission.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Objectif</p>
                        <p className="text-gray-900 font-medium">{mission.objective}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Destination</p>
                        <p className="text-gray-900 font-medium">{mission.destination}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Itinéraire</p>
                        <p className="text-gray-900 font-medium">
                          {mission.departure_city} → {mission.arrival_city}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Transport</p>
                        <p className="text-gray-900 font-medium">{mission.transport_mode}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Départ</p>
                        <p className="text-gray-900 font-medium">{formatDate(mission.departure_date)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Retour</p>
                        <p className="text-gray-900 font-medium">{formatDate(mission.return_date)}</p>
                      </div>
                    </div>

                    {/* Estimations */}
                    {(mission.estimated_distance_km || mission.estimated_fuel_liters || mission.estimated_cost) && (
                      <div className="flex space-x-4 mb-4">
                        {mission.estimated_distance_km && (
                          <div className="bg-blue-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-blue-600 font-medium">
                              Distance: {mission.estimated_distance_km} km
                            </span>
                          </div>
                        )}
                        {mission.estimated_fuel_liters && (
                          <div className="bg-green-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-green-600 font-medium">
                              Carburant: {mission.estimated_fuel_liters} L
                            </span>
                          </div>
                        )}
                        {mission.estimated_cost && (
                          <div className="bg-purple-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-purple-600 font-medium">
                              Coût: {mission.estimated_cost} MRU
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => router.push(`/missions/${mission.id}`)}
                      className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      Voir détails
                    </button>
                    
                    {mission.status === 'pending_dg' && user?.role === 'dg' && (
                      <button
                        onClick={() => router.push(`/missions/${mission.id}/validate`)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
