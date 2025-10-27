'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import missionService from '@/services/missionService';
import logisticsService from '@/services/logisticsService';
import userService from '@/services/userService';

interface Mission {
  id: string;
  mission_reference: string;
  mission_object: string;
  departure_date: string;
  return_date: string;
  transport_mode: string;
  status: string;
  vehicle_id?: string;
  driver_id?: string;
  ticket_file?: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  is_available: boolean;
}

interface Driver {
  id: string;
  name: string;
  full_name: string;
  license_number: string;
  is_available: boolean;
}

export default function LogisticsValidationPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form data
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, [missionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les données utilisateur
      const userData = await userService.getProfile();
      setUser(userData);

      // Charger la mission
      const missionData = await missionService.getById(missionId);
      setMission(missionData);

      // Charger les véhicules et chauffeurs si transport par voiture
      if (missionData.transport_mode === 'car') {
        try {
          const [vehiclesData, driversData] = await Promise.all([
            logisticsService.getVehicles(userData.institution_id),
            logisticsService.getDrivers(userData.institution_id)
          ]);
          setVehicles(vehiclesData.vehicles || []);
          setDrivers(driversData.drivers || []);
        } catch (error: any) {
          console.error('Erreur lors du chargement des données logistiques:', error);
          // Ne pas faire de logout automatique, juste afficher l'erreur
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Ne pas faire de logout automatique
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (action === 'approve') {
      if (mission?.transport_mode === 'car' && (!selectedVehicle || !selectedDriver)) {
        alert('Veuillez sélectionner un véhicule et un chauffeur');
        return;
      }
    } else if (action === 'reject' && !rejectionReason.trim()) {
      alert('Veuillez préciser le motif de refus');
      return;
    }

    try {
      setSubmitting(true);
      
      const data: any = {
        action,
        rejection_reason: action === 'reject' ? rejectionReason : undefined
      };

      if (action === 'approve') {
        if (mission?.transport_mode === 'car') {
          data.vehicle_id = selectedVehicle;
          data.driver_id = selectedDriver;
        } else if (ticketFile) {
          // Upload du billet si transport aérien/autre
          const uploadResult = await logisticsService.uploadTicket(missionId, ticketFile);
          data.ticket_file = uploadResult.file_path;
        }
      }

      await logisticsService.validateLogistics(missionId, data);
      
      alert('Validation logistique effectuée avec succès');
      router.push('/missions');
    } catch (error) {
      console.error('Error validating logistics:', error);
      alert('Erreur lors de la validation logistique');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mission non trouvée</h1>
          <button
            onClick={() => router.push('/missions')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Validation Logistique - {mission.mission_reference}
            </h1>
            <p className="text-gray-600 mt-2">{mission.mission_object}</p>
          </div>

          <div className="px-6 py-4">
            {/* Informations de la mission */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la mission</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Départ:</span> {new Date(mission.departure_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Retour:</span> {new Date(mission.return_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Transport:</span> {
                    mission.transport_mode === 'car' ? 'Voiture ANESP' :
                    mission.transport_mode === 'plane' ? 'Avion' :
                    mission.transport_mode === 'train' ? 'Train' : 'Autre'
                  }</p>
                  <p><span className="font-medium">Statut:</span> {
                    mission.status === 'pending_logistics' ? 'En attente validation logistique' :
                    mission.status === 'pending_finance' ? 'En attente validation financière' :
                    mission.status
                  }</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="approve"
                          checked={action === 'approve'}
                          onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                          className="mr-2"
                        />
                        Approuver
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="reject"
                          checked={action === 'reject'}
                          onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                          className="mr-2"
                        />
                        Rejeter
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire selon le mode de transport */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {action === 'approve' && (
                <>
                  {mission.transport_mode === 'car' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sélection véhicule */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Véhicule *
                        </label>
                        <select
                          value={selectedVehicle}
                          onChange={(e) => setSelectedVehicle(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Sélectionner un véhicule</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sélection chauffeur */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chauffeur *
                        </label>
                        <select
                          value={selectedDriver}
                          onChange={(e) => setSelectedDriver(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Sélectionner un chauffeur</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.full_name || driver.name} - {driver.license_number}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* Upload billet pour transport aérien/autre */
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billet de transport (PDF)
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setTicketFile(e.target.files?.[0] || null)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Téléchargez le billet de transport au format PDF
                      </p>
                    </div>
                  )}
                </>
              )}

              {action === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif de refus *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Précisez le motif de refus..."
                    required
                  />
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/missions')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2 rounded-md text-white ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {submitting ? 'Traitement...' : action === 'approve' ? 'Approuver' : 'Rejeter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
