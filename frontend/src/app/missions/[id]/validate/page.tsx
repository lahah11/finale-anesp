'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  participants: any[];
  created_at: string;
}

interface User {
  id: string;
  username: string;
  role: string;
  institution_id: string;
}

export default function MissionValidationPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
    loadMission();
  }, [missionId]);

  const loadUser = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      setError('Erreur lors du chargement du profil utilisateur');
    }
  };

  const loadMission = async () => {
    try {
      const missionData = await missionService.getMissionById(missionId);
      setMission(missionData);
    } catch (error) {
      console.error('Error loading mission:', error);
      setError('Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (action: 'approve' | 'reject') => {
    if (!mission || !user) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Veuillez préciser le motif du refus');
      return;
    }

    setValidating(true);
    setError('');

    try {
      if (action === 'approve') {
        await missionService.validateMission(missionId, {
          validated_by: user.id,
          validation_type: 'dg',
          status: 'pending_msgg'
        });
      } else {
        await missionService.rejectMission(missionId, {
          rejected_by: user.id,
          rejection_reason: rejectionReason,
          status: 'rejected'
        });
      }

      // Recharger la mission pour voir le nouveau statut
      await loadMission();
      
      // Rediriger vers la liste des missions
      router.push('/missions');
    } catch (error: any) {
      console.error('Error validating mission:', error);
      setError(error.response?.data?.error || 'Erreur lors de la validation');
    } finally {
      setValidating(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la mission...</p>
        </div>
      </div>
    );
  }

  if (error && !mission) {
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

  if (!mission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Mission non trouvée</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Validation de Mission
              </h1>
              <p className="text-gray-600 mt-1">
                Mission #{mission.mission_number}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(mission.status)}`}>
                {getStatusLabel(mission.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Mission Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informations de la Mission
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Objectif</h3>
              <p className="text-gray-900">{mission.objective}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Destination</h3>
              <p className="text-gray-900">{mission.destination}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Itinéraire</h3>
              <p className="text-gray-900">
                {mission.departure_city} → {mission.arrival_city}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Moyen de transport</h3>
              <p className="text-gray-900">{mission.transport_mode}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Date de départ</h3>
              <p className="text-gray-900">{formatDate(mission.departure_date)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Date de retour</h3>
              <p className="text-gray-900">{formatDate(mission.return_date)}</p>
            </div>
          </div>

          {/* Distance et coûts */}
          {(mission.estimated_distance_km || mission.estimated_fuel_liters || mission.estimated_cost) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Estimations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mission.estimated_distance_km && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Distance</p>
                    <p className="text-lg font-semibold text-blue-900">{mission.estimated_distance_km} km</p>
                  </div>
                )}
                {mission.estimated_fuel_liters && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Carburant</p>
                    <p className="text-lg font-semibold text-green-900">{mission.estimated_fuel_liters} L</p>
                  </div>
                )}
                {mission.estimated_cost && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Coût estimé</p>
                    <p className="text-lg font-semibold text-purple-900">{mission.estimated_cost} MRU</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participants */}
          {mission.participants && mission.participants.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Participants</h3>
              <div className="space-y-2">
                {mission.participants.map((participant: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-gray-900">{participant.full_name}</p>
                    <p className="text-sm text-gray-600">{participant.position}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Validation Actions */}
        {mission.status === 'pending_dg' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Décision de Validation
            </h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Motif de refus */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif de refus (si applicable)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Précisez le motif du refus..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex space-x-4">
                <button
                  onClick={() => handleValidation('approve')}
                  disabled={validating}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating && action === 'approve' ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validation...
                    </span>
                  ) : (
                    '✅ Valider la Mission'
                  )}
                </button>
                
                <button
                  onClick={() => handleValidation('reject')}
                  disabled={validating}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating && action === 'reject' ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Refus...
                    </span>
                  ) : (
                    '❌ Refuser la Mission'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions de navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => router.push('/missions')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Retour aux missions
          </button>
          
          <button
            onClick={() => router.push(`/missions/${missionId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voir les détails
          </button>
        </div>
      </div>
    </div>
  );
}



