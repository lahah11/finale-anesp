'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import logisticsService, { Vehicle, Driver } from '../services/logisticsService';
import { useAuth, useTranslation } from '../app/providers';

interface LogisticsAssignmentProps {
  missionId: string;
  transportMode: string;
  transportType?: string;
  onAssignmentComplete: (assignment: any) => void;
}

const LogisticsAssignment: React.FC<LogisticsAssignmentProps> = ({
  missionId,
  transportMode,
  transportType: _transportType,
  onAssignmentComplete
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [flightTicketFile, setFlightTicketFile] = useState<File | null>(null);
  const [flightTicketUrl, setFlightTicketUrl] = useState<string | null>(null);
  const [airlineName, setAirlineName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [ticketReference, setTicketReference] = useState('');
  const [travelAgency, setTravelAgency] = useState('');
  const [accommodationDetails, setAccommodationDetails] = useState('');
  const [localTransportDetails, setLocalTransportDetails] = useState('');
  const [logisticsNotes, setLogisticsNotes] = useState('');
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
      setError(t('logistics.assign.error.load'));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFlightTicketFile(file);
      setError('');
    } else {
      setError(t('logistics.assign.error.invalidFile'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let ticketUrl = flightTicketUrl;

      if (isCarAnesp && (!selectedVehicle || !selectedDriver)) {
        setError(t('logistics.assign.error.vehicle'));
        setLoading(false);
        return;
      }

      if (isPlane) {
        if (!airlineName.trim() || !flightNumber.trim()) {
          setError(t('logistics.assign.error.flightInfo'));
          setLoading(false);
          return;
        }

        if (!flightTicketFile && !ticketUrl) {
          setError(t('logistics.assign.ticketRequired'));
          setLoading(false);
          return;
        }
      }

      if (transportMode === 'plane' && flightTicketFile) {
        const uploadResult = await logisticsService.uploadTicket(missionId, flightTicketFile);
        ticketUrl = uploadResult.ticket_url;
        setFlightTicketUrl(uploadResult.ticket_url);
      }

      const vehicleObj = vehicles.find(v => v.id === selectedVehicle);
      const driverObj = drivers.find(d => d.id === selectedDriver);

      const assignment: any = {
        vehicle_id: transportMode === 'car' ? selectedVehicle : undefined,
        driver_id: transportMode === 'car' ? selectedDriver : undefined,
        logistics_notes: logisticsNotes || null,
        flight_ticket_pdf: transportMode === 'plane' ? ticketUrl : undefined,
        airline_name: transportMode === 'plane' ? airlineName || null : undefined,
        flight_number: transportMode === 'plane' ? flightNumber || null : undefined,
        ticket_reference: transportMode === 'plane' ? ticketReference || null : undefined,
        travel_agency: transportMode === 'plane' ? travelAgency || null : undefined,
        accommodation_details: transportMode === 'plane' ? accommodationDetails || null : undefined,
        local_transport_details: transportMode === 'plane' ? localTransportDetails || null : undefined
      };

      if (vehicleObj) {
        assignment.vehicle_plate = (vehicleObj as any).license_plate;
        assignment.vehicle_model = (vehicleObj as any).model;
        assignment.vehicle_brand = (vehicleObj as any).brand;
      }

      if (driverObj) {
        assignment.driver_name = (driverObj as any).full_name;
        assignment.driver_phone = (driverObj as any).phone || (driverObj as any).phone_number || undefined;
        assignment.driver_license = (driverObj as any).license_number;
      }

      const result = await logisticsService.assignLogistics(missionId, assignment);

      toast.success(t('logistics.assign.success'));
      setError('');
      onAssignmentComplete(result);
    } catch (error: any) {
      console.error('Error assigning logistics:', error);
      const serverError = error.response?.data?.error;
      setError(serverError || t('logistics.assign.error.assignment'));
    } finally {
      setLoading(false);
    }
  };

  const isCarAnesp = transportMode === 'car';
  const isPlane = transportMode === 'plane';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('logistics.assign.title')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isCarAnesp && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.vehicle')} *
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('logistics.assign.vehiclePlaceholder')}</option>
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
                {t('logistics.assign.driver')} *
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('logistics.assign.driverPlaceholder')}</option>
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

        {isPlane && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {t('logistics.assign.flightSectionTitle')}
              </h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.airline')} *
              </label>
              <input
                type="text"
                value={airlineName}
                onChange={(e) => setAirlineName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.flightNumber')} *
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.ticketRef')}
              </label>
              <input
                type="text"
                value={ticketReference}
                onChange={(e) => setTicketReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.travelAgency')}
              </label>
              <input
                type="text"
                value={travelAgency}
                onChange={(e) => setTravelAgency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.ticket')} *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!flightTicketUrl}
              />
              {(flightTicketFile || flightTicketUrl) && (
                <p className="mt-2 text-sm text-green-600">
                  {t('logistics.assign.ticketSelected')} {flightTicketFile?.name || flightTicketUrl?.split('/').pop()}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.accommodation')}
              </label>
              <textarea
                value={accommodationDetails}
                onChange={(e) => setAccommodationDetails(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('logistics.assign.accommodationPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logistics.assign.localTransport')}
              </label>
              <textarea
                value={localTransportDetails}
                onChange={(e) => setLocalTransportDetails(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('logistics.assign.localTransportPlaceholder')}
              />
            </div>
          </div>
        )}

        {!isCarAnesp && !isPlane && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800">
              {t('logistics.assign.noLogisticsRequired')}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('logistics.assign.notes')}
          </label>
          <textarea
            value={logisticsNotes}
            onChange={(e) => setLogisticsNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('logistics.assign.notesPlaceholder')}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('logistics.assign.loading') : t('logistics.assign.submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LogisticsAssignment;
