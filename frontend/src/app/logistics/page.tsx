'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Vehicle, Driver } from '@/types/logistics';
import ProtectedRoute from '@/components/ProtectedRoute';

function LogisticsPageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // États pour les formulaires
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // États pour les formulaires
  const [vehicleForm, setVehicleForm] = useState({
    license_plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    status: 'available' as 'available' | 'maintenance' | 'out_of_service'
  });

  const [driverForm, setDriverForm] = useState({
    full_name: '',
    phone_number: '',
    license_number: '',
    license_type: '',
    license_expiry: '',
    status: 'available' as 'available' | 'busy' | 'unavailable'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const [vehiclesRes, driversRes] = await Promise.all([
        fetch('/api/logistics/vehicles', { headers }),
        fetch('/api/logistics/drivers', { headers })
      ]);

      // Gérer les erreurs 403 (accès refusé) silencieusement
      if (vehiclesRes.status === 403) {
        console.log('Utilisateur non autorisé à voir les véhicules');
        setVehicles([]);
      } else if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData);
      } else {
        console.error('Erreur chargement véhicules:', vehiclesRes.status);
      }

      if (driversRes.status === 403) {
        console.log('Utilisateur non autorisé à voir les chauffeurs');
        setDrivers([]);
      } else if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData);
      } else {
        console.error('Erreur chargement chauffeurs:', driversRes.status);
      }
    } catch (error) {
      console.error('Error loading logistics data:', error);
      // Ne pas afficher d'erreur si c'est un problème de permissions
      if (!error.message?.includes('403')) {
        setError('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingVehicle 
        ? `/api/logistics/vehicles/${editingVehicle.id}`
        : '/api/logistics/vehicles';
      
      const method = editingVehicle ? 'PUT' : 'POST';
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(vehicleForm)
      });

      if (response.ok) {
        await loadData();
        setShowVehicleForm(false);
        setEditingVehicle(null);
        setVehicleForm({
          license_plate: '',
          brand: '',
          model: '',
          year: '',
          color: '',
          status: 'available'
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDriver 
        ? `/api/logistics/drivers/${editingDriver.id}`
        : '/api/logistics/drivers';
      
      const method = editingDriver ? 'PUT' : 'POST';
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(driverForm)
      });

      if (response.ok) {
        await loadData();
        setShowDriverForm(false);
        setEditingDriver(null);
        setDriverForm({
          full_name: '',
          phone_number: '',
          license_number: '',
          license_type: '',
          license_expiry: '',
          status: 'available'
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving driver:', error);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      license_plate: vehicle.license_plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      color: vehicle.color || '',
      status: vehicle.status
    });
    setShowVehicleForm(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      full_name: driver.full_name,
      phone_number: driver.phone_number,
      license_number: driver.license_number,
      license_type: driver.license_type || '',
      license_expiry: driver.license_expiry || '',
      status: driver.status
    });
    setShowDriverForm(true);
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return;
    
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(`/api/logistics/vehicles/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce chauffeur ?')) return;
    
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(`/api/logistics/drivers/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Moyens Logistiques</h1>
          <p className="mt-2 text-gray-600">Gérez les véhicules et chauffeurs de votre institution</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'vehicles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Véhicules ({vehicles.length})
              </button>
              <button
                onClick={() => setActiveTab('drivers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'drivers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chauffeurs ({drivers.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Véhicules</h2>
              <button
                onClick={() => {
                  setEditingVehicle(null);
                  setVehicleForm({
                    license_plate: '',
                    brand: '',
                    model: '',
                    year: '',
                    color: '',
                    status: 'available'
                  });
                  setShowVehicleForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Ajouter un véhicule
              </button>
            </div>

            {/* Vehicles List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matricule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marque/Modèle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Année
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.license_plate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vehicle.status === 'available' 
                            ? 'bg-green-100 text-green-800'
                            : vehicle.status === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vehicle.status === 'available' ? 'Disponible' : 
                           vehicle.status === 'maintenance' ? 'Maintenance' : 'Hors service'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Chauffeurs</h2>
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setDriverForm({
                    full_name: '',
                    phone_number: '',
                    license_number: '',
                    license_type: '',
                    license_expiry: '',
                    status: 'available'
                  });
                  setShowDriverForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Ajouter un chauffeur
              </button>
            </div>

            {/* Drivers List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom complet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {driver.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.license_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          driver.status === 'available' 
                            ? 'bg-green-100 text-green-800'
                            : driver.status === 'busy'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {driver.status === 'available' ? 'Disponible' : 
                           driver.status === 'busy' ? 'Occupé' : 'Indisponible'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditDriver(driver)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicle Form Modal */}
        {showVehicleForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
                </h3>
                <form onSubmit={handleVehicleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Matricule *</label>
                    <input
                      type="text"
                      value={vehicleForm.license_plate}
                      onChange={(e) => setVehicleForm({...vehicleForm, license_plate: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marque *</label>
                    <input
                      type="text"
                      value={vehicleForm.brand}
                      onChange={(e) => setVehicleForm({...vehicleForm, brand: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Modèle *</label>
                    <input
                      type="text"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Année</label>
                    <input
                      type="number"
                      value={vehicleForm.year}
                      onChange={(e) => setVehicleForm({...vehicleForm, year: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Couleur</label>
                    <input
                      type="text"
                      value={vehicleForm.color}
                      onChange={(e) => setVehicleForm({...vehicleForm, color: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <select
                      value={vehicleForm.status}
                      onChange={(e) => setVehicleForm({...vehicleForm, status: e.target.value as any})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="available">Disponible</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out_of_service">Hors service</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowVehicleForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingVehicle ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Driver Form Modal */}
        {showDriverForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingDriver ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}
                </h3>
                <form onSubmit={handleDriverSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom complet *</label>
                    <input
                      type="text"
                      value={driverForm.full_name}
                      onChange={(e) => setDriverForm({...driverForm, full_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Téléphone *</label>
                    <input
                      type="tel"
                      value={driverForm.phone_number}
                      onChange={(e) => setDriverForm({...driverForm, phone_number: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Numéro de permis *</label>
                    <input
                      type="text"
                      value={driverForm.license_number}
                      onChange={(e) => setDriverForm({...driverForm, license_number: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type de permis</label>
                    <input
                      type="text"
                      value={driverForm.license_type}
                      onChange={(e) => setDriverForm({...driverForm, license_type: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiration du permis</label>
                    <input
                      type="date"
                      value={driverForm.license_expiry}
                      onChange={(e) => setDriverForm({...driverForm, license_expiry: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <select
                      value={driverForm.status}
                      onChange={(e) => setDriverForm({...driverForm, status: e.target.value as any})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="available">Disponible</option>
                      <option value="busy">Occupé</option>
                      <option value="unavailable">Indisponible</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDriverForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingDriver ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogisticsPage() {
  return (
    <ProtectedRoute requiredRoles={['msgg']} fallbackPath="/dashboard">
      <LogisticsPageContent />
    </ProtectedRoute>
  );
}
