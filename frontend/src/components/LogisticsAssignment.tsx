'use client';

import React, { useState, useEffect } from 'react';
import { Vehicle, Driver } from '../services/logisticsService';
import logisticsService from '../services/logisticsService';
import { useAuth } from '../app/providers';

interface LogisticsAssignmentProps {
  missionId: string;
  transportMode: string;
  transportType?: string;
  onAssignmentComplete: (assignment: any) => void;
}

const LogisticsAssignment: React.FC<LogisticsAssignmentProps> = ({
  missionId,
  transportMode,
  transportType,
  onAssignmentComplete
}) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [flightTicketFile, setFlightTicketFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadLogisticsData();
  }, []);

  const loadLogisticsData = async () => {
    try {
      if (user?.institution_id) {
        const [vehiclesData, driversData] = await Promise.all([
          logisticsService.getVehicles(user.institution_id),
          logisticsService.getDrivers(user.institution_id)
        ]);
        
        setVehicles(vehiclesData.vehicles || vehiclesData);
        setDrivers(driversData.drivers || driversData);
      }
    } catch (error) {
      console.error('Error loading logistics data:', error);
      setError('Erreur lors du chargement des données logistiques');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFlightTicketFile(file);
    } else {
      setError('Veuillez sélectionner un fichier PDF valide');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let flightTicketPdf = null;
      
      // Si c'est une mission par voie aérienne et qu'un fichier est sélectionné
      if (transportMode === 'plane' && flightTicketFile) {
        // uploader avec missionId
        flightTicketPdf = await logisticsService.uploadTicket(missionId, flightTicketFile);
      }

      // Récupérer les objets sélectionnés pour enrichir le payload
      const vehicleObj = vehicles.find(v => v.id === selectedVehicle);
      const driverObj = drivers.find(d => d.id === selectedDriver);

      const assignment: any = {
        vehicle_id: transportMode === 'car' ? selectedVehicle : undefined,
        driver_id: transportMode === 'car' ? selectedDriver : undefined,
        flight_ticket_pdf: flightTicketPdf || undefined
      };

      // Métadonnées véhicule
      if (vehicleObj) {
        assignment.vehicle_plate = (vehicleObj as any).license_plate;
        assignment.vehicle_model = (vehicleObj as any).model;
        assignment.vehicle_brand = (vehicleObj as any).brand;
      }

      // Métadonnées chauffeur
      if (driverObj) {
        assignment.driver_name = (driverObj as any).full_name;
        assignment.driver_phone = (driverObj as any).phone || (driverObj as any).phone_number || undefined;
        assignment.driver_license = (driverObj as any).license_number;
      }

      const result = await logisticsService.assignLogistics(missionId, assignment);
      
      onAssignmentComplete(result);
    } catch (error: any) {
      console.error('Error assigning logistics:', error);
      setError(error.response?.data?.error || 'Erreur lors de l\'attribution des moyens logistiques');
    } finally {
      setLoading(false);
    }
  };

  // Pour les missions créées avec "Voiture ANESP", transport_mode = 'car' et transport_type n'est pas défini
  // Donc on considère que si transport_mode === 'car', c'est forcément ANESP
  const isCarAnesp = transportMode === 'car';
  const isPlane = transportMode === 'plane';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Attribution des Moyens Logistiques
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Attribution véhicule et chauffeur pour voiture ANESP */}
        {isCarAnesp && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Véhicule ANESP *
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un véhicule</option>
                {vehicles
                  .filter(v => v.is_available)
                  .map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.license_plate} - {vehicle.brand} {vehicle.model} ({vehicle.year})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chauffeur *
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un chauffeur</option>
                {drivers
                  .filter(d => d.is_available)
                  .map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name} - {driver.license_number} ({driver.license_type})
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        {/* Upload billet d'avion pour mission aérienne */}
        {isPlane && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billet d'avion (PDF) *
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {flightTicketFile && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Fichier sélectionné: {flightTicketFile.name}
              </p>
            )}
          </div>
        )}

        {/* Message d'information pour autres modes de transport */}
        {!isCarAnesp && !isPlane && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800">
              Aucune attribution logistique requise pour ce mode de transport.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={loading || (!isCarAnesp && !isPlane)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Attribution...' : 'Valider l\'attribution'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LogisticsAssignment;
