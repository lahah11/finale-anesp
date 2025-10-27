'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { missionService } from '@/services/missionService';
import { employeeService } from '@/services/employeeService';
import { 
  ArrowLeftIcon, 
  UserIcon, 
  MapPinIcon, 
  TruckIcon, 
  CalendarIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Employee {
  id: string;
  full_name: string;
  matricule: string;
  position: string;
  email?: string;
  phone?: string;
}

interface Mission {
  id: string;
  mission_number: string;
  employee_id: string;
  employee_name: string;
  matricule: string;
  position: string;
  destination: string;
  transport_mode: string;
  objective: string;
  departure_date: string;
  return_date: string;
  status: string;
}

interface UpdateMissionData {
  employee_id?: string;
  destination?: string;
  transport_mode?: string;
  objective?: string;
  departure_date?: string;
  return_date?: string;
}

export default function EditMissionPage() {
  const params = useParams();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showActiveMissionError, setShowActiveMissionError] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<UpdateMissionData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch mission details
        const missionData = await missionService.getById(params.id as string);
        const missionDetails = missionData.mission;
        setMission(missionDetails);

        // **IMPORTANT: Set initial form data with proper date formatting**
        setFormData({
          employee_id: missionDetails.employee_id,
          destination: missionDetails.destination,
          transport_mode: missionDetails.transport_mode,
          objective: missionDetails.objective,
          departure_date: missionDetails.departure_date, // Backend should return YYYY-MM-DD format
          return_date: missionDetails.return_date // Backend should return YYYY-MM-DD format
        });

        // Set selected employee
        setSelectedEmployee({
          id: missionDetails.employee_id,
          full_name: missionDetails.employee_name,
          matricule: missionDetails.matricule || '',
          position: missionDetails.position || ''
        });

        // Fetch available employees (including current employee)
        const employeesData = await employeeService.getAvailableEmployees();
        
        // Add current employee to the list if not already there
        const currentEmployeeInList = employeesData.employees.find((emp: Employee) => emp.id === missionDetails.employee_id);
        if (!currentEmployeeInList) {
          employeesData.employees.unshift({
            id: missionDetails.employee_id,
            full_name: missionDetails.employee_name,
            matricule: missionDetails.matricule || '',
            position: missionDetails.position || ''
          });
        }
        
        setEmployees(employeesData.employees);
        setFilteredEmployees(employeesData.employees);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erreur lors du chargement des données');
        router.push('/missions');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  // Filter employees based on search
  useEffect(() => {
    if (employeeSearch.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter((employee) => 
        employee.full_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        employee.matricule.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        employee.position.toLowerCase().includes(employeeSearch.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [employeeSearch, employees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData(prev => ({ ...prev, employee_id: employee.id }));
    setEmployeeSearch('');
    setShowDropdown(false);
    if (errors.employee_id) {
      setErrors(prev => ({ ...prev, employee_id: '' }));
    }
  };

  const clearEmployeeSelection = () => {
    setSelectedEmployee(null);
    setFormData(prev => ({ ...prev, employee_id: '' }));
    setEmployeeSearch('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) newErrors.employee_id = 'Employé requis';
    if (!formData.destination?.trim()) newErrors.destination = 'Destination requise';
    if (!formData.transport_mode) newErrors.transport_mode = 'Mode de transport requis';
    if (!formData.objective?.trim()) newErrors.objective = 'Objet de la mission requis';
    if (!formData.departure_date) newErrors.departure_date = 'Date de départ requise';
    if (!formData.return_date) newErrors.return_date = 'Date de retour requise';

    if (formData.departure_date && formData.return_date) {
      if (new Date(formData.return_date) <= new Date(formData.departure_date)) {
        newErrors.return_date = 'La date de retour doit être après la date de départ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !mission) return;

    setSubmitting(true);
    try {
      await missionService.update(mission.id, formData);
      toast.success('Mission mise à jour avec succès');
      router.push(`/missions/${mission.id}`);
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already has an active mission')) {
        setShowActiveMissionError(true);
      } else {
        toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour de la mission');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement..." />
      </DashboardLayout>
    );
  }

  if (!mission) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Mission non trouvée</h3>
          <div className="mt-6">
            <Link href="/missions" className="btn-primary">
              Retour aux missions
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if mission can be edited
  if (!['draft', 'pending_dg', 'pending_msgg'].includes(mission.status)) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-orange-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Mission non modifiable</h3>
          <p className="mt-1 text-sm text-gray-500">
            Cette mission ne peut plus être modifiée car elle est {mission.status === 'validated' ? 'validée' : 'annulée'}.
          </p>
          <div className="mt-6">
            <Link href={`/missions/${mission.id}`} className="btn-primary">
              Voir la mission
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href={`/missions/${mission.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier la Mission N° {mission.mission_number}</h1>
            <p className="text-gray-600">Modifier les détails de l'ordre de mission</p>
          </div>
        </div>

        {/* Status Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 text-sm">
              Cette mission est actuellement en statut "{mission.status}". Certaines modifications peuvent nécessiter une nouvelle validation.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* **NEW: Modern Searchable Employee Combobox** */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <UserIcon className="h-5 w-5 text-mauritania-green" />
                  <h3 className="text-lg font-semibold text-gray-900">Sélectionner un employé</h3>
                  <span className="text-sm text-gray-500">({employees.length} disponibles)</span>
                </div>

                <div className="relative" ref={dropdownRef}>
                  {/* Selected Employee or Search Input */}
                  {selectedEmployee ? (
                    <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {selectedEmployee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedEmployee.full_name}</p>
                          <p className="text-sm text-gray-600">{selectedEmployee.matricule} • {selectedEmployee.position}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearEmployeeSelection}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className={`relative border rounded-lg ${errors.employee_id ? 'border-red-300' : 'border-gray-300'} ${showDropdown ? 'border-mauritania-green' : ''}`}
                    >
                      <div className="flex items-center">
                        <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un employé..."
                          value={employeeSearch}
                          onChange={(e) => {
                            setEmployeeSearch(e.target.value);
                            setShowDropdown(true);
                          }}
                          onFocus={() => setShowDropdown(true)}
                          className="w-full pl-10 pr-10 py-3 rounded-lg border-0 focus:ring-0 focus:outline-none"
                          disabled={employees.length === 0}
                        />
                        <ChevronDownIcon 
                          className={`absolute right-3 h-5 w-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Dropdown Menu */}
                  {showDropdown && !selectedEmployee && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredEmployees.length > 0 ? (
                        <div className="py-1">
                          {filteredEmployees.slice(0, 50).map((employee) => (
                            <button
                              key={employee.id}
                              type="button"
                              onClick={() => handleEmployeeSelect(employee)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{employee.full_name}</p>
                                  <p className="text-sm text-gray-600 truncate">{employee.matricule} • {employee.position}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                          {filteredEmployees.length > 50 && (
                            <div className="px-4 py-2 text-sm text-gray-500 border-t">
                              {filteredEmployees.length - 50} autres résultats... Affinez votre recherche.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <UserIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            {employeeSearch ? 'Aucun employé trouvé' : 'Aucun employé disponible'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {errors.employee_id && (
                  <p className="text-red-600 text-sm mt-2">{errors.employee_id}</p>
                )}
              </div>

              {/* Mission Details */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <MapPinIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Détails de la mission</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Destination*</label>
                    <input
                      type="text"
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      className={`form-input ${errors.destination ? 'border-red-300' : ''}`}
                      placeholder="Ex: Paris, France"
                    />
                    {errors.destination && (
                      <p className="text-red-600 text-sm mt-1">{errors.destination}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Mode de transport*</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Terrestre', 'Aérien', 'Maritime'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, transport_mode: mode }))}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            formData.transport_mode === mode
                              ? 'border-mauritania-green bg-green-50 text-mauritania-green'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">
                              {mode === 'Aérien' ? '✈️' : mode === 'Maritime' ? '🚢' : '🚗'}
                            </div>
                            <span className="text-sm font-medium">{mode}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {errors.transport_mode && (
                      <p className="text-red-600 text-sm mt-1">{errors.transport_mode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Dates */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Période</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Date de départ*</label>
                    <input
                      type="date"
                      name="departure_date"
                      value={formData.departure_date}
                      onChange={handleInputChange}
                      className={`form-input ${errors.departure_date ? 'border-red-300' : ''}`}
                    />
                    {errors.departure_date && (
                      <p className="text-red-600 text-sm mt-1">{errors.departure_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Date de retour*</label>
                    <input
                      type="date"
                      name="return_date"
                      value={formData.return_date}
                      onChange={handleInputChange}
                      className={`form-input ${errors.return_date ? 'border-red-300' : ''}`}
                    />
                    {errors.return_date && (
                      <p className="text-red-600 text-sm mt-1">{errors.return_date}</p>
                    )}
                  </div>

                  {/* Duration Calculator */}
                  {formData.departure_date && formData.return_date && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Durée: {Math.ceil((new Date(formData.return_date).getTime() - new Date(formData.departure_date).getTime()) / (1000 * 60 * 60 * 24))} jours
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Objective */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Objet de la mission</h3>
                </div>
                
                <div>
                  <label className="form-label">Description*</label>
                  <textarea
                    name="objective"
                    value={formData.objective}
                    onChange={handleInputChange}
                    rows={6}
                    className={`form-input ${errors.objective ? 'border-red-300' : ''}`}
                    placeholder="Décrivez l'objet et les objectifs de la mission..."
                  />
                  {errors.objective && (
                    <p className="text-red-600 text-sm mt-1">{errors.objective}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.objective?.length || 0}/500 caractères
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Link href={`/missions/${mission.id}`} className="btn-secondary">
              Annuler
            </Link>
            <button 
              type="submit" 
              disabled={submitting || !selectedEmployee}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Mise à jour...
                </>
              ) : (
                'Mettre à jour'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Active Mission Error Modal */}
      {showActiveMissionError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Employé non disponible
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
                  L'employé sélectionné a déjà une mission active. Veuillez sélectionner un autre employé.
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowActiveMissionError(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}