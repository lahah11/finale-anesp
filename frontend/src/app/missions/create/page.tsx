'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { missionService } from '@/services/missionService';
import { cityService } from '@/services/cityService';
import { employeeService } from '@/services/employeeService';
import { engineerService, Engineer } from '@/services/engineerService';
import { missionExpenseService, ExpenseScale, ExpenseCalculation } from '@/services/missionExpenseService';
import { useAuth } from '@/app/providers';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Participant {
  id: string;
  participant_type: 'anesp' | 'external';
  employee_id?: string;
  grade?: string;
  position?: string;
  external_name?: string;
  external_firstname?: string;
  external_nni?: string;
  external_profession?: string;
  external_ministry?: string;
  external_phone?: string;
  external_email?: string;
  role_in_mission: string;
  daily_allowance?: number;
  accommodation_allowance?: number;
  transport_allowance?: number;
  total_allowance?: number;
  calculated_fees?: any;
}

interface Employee {
  id: string;
  full_name: string;
  matricule: string;
  position: string;
  grade: string;
  is_available: boolean;
}

export default function CreateMissionPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    mission_object: '',
    departure_city: '',
    arrival_city: '',
    departure_date: '',
    return_date: '',
    transport_mode: 'car',
    estimated_fuel: '',
    mission_fees: ''
  });
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [currentEngineer, setCurrentEngineer] = useState<Engineer | null>(null);
  const [expenseScale, setExpenseScale] = useState<ExpenseScale | null>(null);
  const [calculatedExpenses, setCalculatedExpenses] = useState<ExpenseCalculation | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [autoCalculateExpenses, setAutoCalculateExpenses] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [costs, setCosts] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadEmployees();
    loadCities();
    loadCurrentEngineer();
    loadExpenseScale();
  }, [user]);

  // Ajouter automatiquement l'ingénieur connecté comme chef de mission
  useEffect(() => {
    if (currentEngineer && participants.length === 0) {
      addEngineerAsChief();
    }
  }, [currentEngineer]);

  // Assigner automatiquement le grade de l'ingénieur connecté
  useEffect(() => {
    if (currentEngineer && currentEngineer.grade) {
      setSelectedGrade(currentEngineer.grade);
    }
  }, [currentEngineer]);

  // Calculer automatiquement la distance et le carburant quand les deux villes sont sélectionnées
  useEffect(() => {
    if (formData.departure_city && formData.arrival_city) {
      calculateDistanceAndFuel();
    }
  }, [formData.departure_city, formData.arrival_city]);

  // Calcul automatique des frais quand les données changent
  useEffect(() => {
    if (selectedGrade && selectedDestination && formData.departure_date && formData.return_date) {
      calculateMissionExpenses();
    }
  }, [selectedGrade, selectedDestination, formData.departure_date, formData.return_date]);

  // Calcul automatique des frais quand le type de destination change
  useEffect(() => {
    if (selectedGrade && selectedDestination && formData.departure_date && formData.return_date) {
      calculateMissionExpenses();
    }
  }, [selectedDestination]);

  // Calculer automatiquement les frais de tous les participants
  useEffect(() => {
    if (selectedDestination && formData.departure_date && formData.return_date && participants.length > 0) {
      calculateAllParticipantsFees();
    }
  }, [selectedDestination, formData.departure_date, formData.return_date, participants.length]);

  const loadEmployees = async () => {
    try {
      // Charger les employés disponibles depuis l'API backend
      const data = await employeeService.getAvailableEmployees();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadCities = async () => {
    try {
      // Charger les villes disponibles depuis l'API backend
      const data = await cityService.getAllCities();
      setCities(data.cities || []);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadCurrentEngineer = async () => {
    if (!user?.id) return;
    
    try {
      const engineer = await engineerService.getEngineerByUserId(user.id);
      setCurrentEngineer(engineer);
    } catch (error) {
      console.error('Error loading current engineer:', error);
      // Si l'ingénieur n'est pas trouvé, on continue sans erreur
    }
  };

  const loadExpenseScale = async () => {
    try {
      const scale = await missionExpenseService.getExpenseScale();
      setExpenseScale(scale);
    } catch (error) {
      console.error('Error loading expense scale:', error);
    }
  };

  const calculateMissionExpenses = async () => {
    if (!selectedGrade || !selectedDestination) {
      toast.error('Veuillez sélectionner un grade et une destination');
      return;
    }

    setCalculating(true);
    try {
      const duration = Math.ceil(
        (new Date(formData.return_date).getTime() - new Date(formData.departure_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const expenses = await missionExpenseService.calculateExpenses(
        selectedGrade,
        selectedDestination,
        duration
      );
      
      setCalculatedExpenses(expenses);
      
      // Appliquer automatiquement les frais calculés au formulaire
      setFormData(prev => ({
        ...prev,
        mission_fees: expenses.amount.toString()
      }));
      
      toast.success('Frais calculés avec succès');
    } catch (error) {
      console.error('Error calculating expenses:', error);
      toast.error('Erreur lors du calcul des frais');
    } finally {
      setCalculating(false);
    }
  };

  // Calcul automatique des frais quand les données changent
  const autoCalculateExpensesFunction = async () => {
    if (!autoCalculateExpenses || !selectedGrade || !selectedDestination || !formData.departure_date || !formData.return_date) {
      return;
    }

    try {
      const duration = Math.ceil(
        (new Date(formData.return_date).getTime() - new Date(formData.departure_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const expenses = await missionExpenseService.calculateExpenses(
        selectedGrade,
        selectedDestination,
        duration
      );
      
      setCalculatedExpenses(expenses);
      setFormData(prev => ({
        ...prev,
        mission_fees: expenses.amount.toString()
      }));
    } catch (error) {
      console.error('Error auto-calculating expenses:', error);
    }
  };

  const addEngineerAsChief = () => {
    if (!currentEngineer) return;

    const engineerParticipant: Participant = {
      id: 'engineer-chief-' + Date.now(),
      participant_type: 'anesp', // Marquer comme personnel ANESP
      employee_id: currentEngineer.id,
      external_name: currentEngineer.last_name,
      external_firstname: currentEngineer.first_name,
      external_nni: currentEngineer.nni,
      external_profession: currentEngineer.position,
      external_ministry: 'MINISTERE DE L\'HABITAT, DE L\'URBANISME ET DE L\'AMENAGEMENT DU TERRITOIRE',
      external_phone: currentEngineer.phone_number || '',
      external_email: currentEngineer.email || '',
      role_in_mission: 'Chef de mission',
      grade: currentEngineer.grade || 'A2-A1' // Grade par défaut pour l'ingénieur
    };

    setParticipants([engineerParticipant]);
    
    // Assigner automatiquement le grade pour le calcul des frais
    if (currentEngineer.grade) {
      setSelectedGrade(currentEngineer.grade);
    }
    
    // Calculer automatiquement les frais du chef de mission après un délai
    setTimeout(async () => {
      if (selectedDestination && formData.departure_date && formData.return_date) {
        const fees = await calculateParticipantFees(engineerParticipant);
        if (fees) {
          setParticipants(prev => prev.map(p => 
            p.id === engineerParticipant.id 
              ? { ...p, calculated_fees: fees, total_allowance: fees.amount }
              : p
          ));
          await calculateTotalMissionFees();
        }
      }
    }, 500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateDistanceAndFuel = async () => {
    if (!formData.departure_city || !formData.arrival_city) return;

    try {
      // Convertir les IDs en noms de villes
      const departureCity = cities.find(city => city.id === formData.departure_city);
      const arrivalCity = cities.find(city => city.id === formData.arrival_city);
      
      if (!departureCity || !arrivalCity) {
        console.warn('Villes non trouvées pour le calcul de distance');
        return;
      }
      
      const data = await cityService.getCityDistance(departureCity.name, arrivalCity.name);
      
      if (data.distance) {
        const distanceKm = data.distance.distance_km;
        
        // Calcul du carburant selon la formule : distance × 2 × (11L/100km)
        // Distance aller-retour × consommation de 11L pour 100km
        const totalDistance = distanceKm * 2; // Aller-retour
        const fuelConsumption = (totalDistance / 100) * 11; // 11L pour 100km
        
        setFormData(prev => ({
          ...prev,
          estimated_fuel: Math.ceil(fuelConsumption).toString() // Arrondir à l'entier supérieur et convertir en string
        }));
        
        toast.success(`Distance calculée : ${distanceKm} km (${totalDistance} km aller-retour) - Carburant : ${Math.ceil(fuelConsumption)}L`);
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
      toast.error('Erreur lors du calcul de la distance');
    }
  };


  const addParticipant = () => {
    // Rôles disponibles (excluant "Chef de mission" qui est réservé au créateur)
    const availableRoles = [
      'Ingénieur',
      'Technicien', 
      'Assistant',
      'Observateur',
      'Expert',
      'Chargé de mission',
      'Conseiller',
      'Spécialiste'
    ];
    
    // Trouver un rôle non utilisé
    const usedRoles = participants.map(p => p.role_in_mission);
    const unusedRole = availableRoles.find(role => !usedRoles.includes(role)) || 'Participant';
    
    const newParticipant: Participant = {
      id: Date.now().toString(),
      participant_type: 'anesp',
      role_in_mission: unusedRole, // Assigner un rôle unique par défaut
      employee_id: '',
      external_name: '',
      external_firstname: '',
      external_nni: '',
      external_profession: '',
      external_ministry: '',
      external_phone: '',
      external_email: ''
    };
    setParticipants(prev => [...prev, newParticipant]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const updateParticipant = async (id: string, field: string, value: any) => {
    setParticipants(prev => prev.map(p => {
      // Si c'est le chef de mission et qu'on essaie de changer son rôle, l'empêcher
      if (p.role_in_mission === 'Chef de mission' && field === 'role_in_mission' && value !== 'Chef de mission') {
        alert('Le rôle du chef de mission ne peut pas être modifié. Il reste "Chef de mission".');
        return p; // Garder le participant inchangé
      }
      
      const updatedParticipant = { ...p, [field]: value };
      
      // Si c'est un employé ANESP, assigner automatiquement le grade
      if (field === 'employee_id' && value) {
        const employee = employees.find(emp => emp.id === value);
        if (employee) {
          updatedParticipant.grade = employee.grade;
          updatedParticipant.position = employee.position;
        }
      }
      
      // Vérifier la duplication des rôles (sauf pour "Chef de mission")
      if (field === 'role_in_mission' && value && value !== 'Chef de mission') {
        const otherParticipants = prev.filter(p => p.id !== id);
        const isDuplicate = otherParticipants.some(p => p.role_in_mission === value);
        
        if (isDuplicate) {
          // Afficher une alerte et empêcher la modification
          alert(`Le rôle "${value}" est déjà attribué à un autre participant. Veuillez choisir un rôle unique.`);
          return p; // Revert to previous participant state
        }
      }
      
      return updatedParticipant;
    }));
    
    // Calculer les frais pour le participant modifié après la mise à jour
    setTimeout(async () => {
      const participant = participants.find(p => p.id === id);
      if (participant && participant.grade && selectedDestination && formData.departure_date && formData.return_date) {
        const fees = await calculateParticipantFees(participant);
        if (fees) {
          setParticipants(prev => prev.map(p => 
            p.id === id 
              ? { ...p, calculated_fees: fees, total_allowance: fees.amount }
              : p
          ));
          await calculateTotalMissionFees();
        }
      }
    }, 100);
  };

  // Calculer automatiquement les frais d'un participant
  const calculateParticipantFees = async (participant: Participant) => {
    if (!participant.grade || !selectedDestination || !formData.departure_date || !formData.return_date) {
      return null;
    }

    try {
      const startDate = new Date(formData.departure_date);
      const endDate = new Date(formData.return_date);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const response = await missionExpenseService.calculateExpenses(
        participant.grade || '',
        selectedDestination,
        duration
      );

      return response;
    } catch (error) {
      console.error('Erreur calcul frais participant:', error);
      return null;
    }
  };

  // Calculer le total des frais de tous les participants
  const calculateTotalMissionFees = async () => {
    let totalFees = 0;
    
    for (const participant of participants) {
      if (participant.calculated_fees && participant.calculated_fees.amount) {
        totalFees += participant.calculated_fees.amount;
      }
    }
    
    // Mettre à jour le champ des frais de mission
    setFormData(prev => ({
      ...prev,
      mission_fees: totalFees.toString()
    }));
    
    return totalFees;
  };

  // Calculer les frais de tous les participants
  const calculateAllParticipantsFees = async () => {
    const updatedParticipants = [];
    
    for (const participant of participants) {
      if (participant.grade && selectedDestination && formData.departure_date && formData.return_date) {
        const fees = await calculateParticipantFees(participant);
        if (fees) {
          updatedParticipants.push({
            ...participant,
            calculated_fees: fees,
            total_allowance: fees.amount
          });
        } else {
          updatedParticipants.push(participant);
        }
      } else {
        updatedParticipants.push(participant);
      }
    }
    
    setParticipants(updatedParticipants);
    await calculateTotalMissionFees();
  };

  const calculateFuelEstimate = async () => {
    if (!formData.departure_date || !formData.return_date) {
      toast.error('Sélectionnez les dates de départ et retour');
      return;
    }

    setCalculating(true);
    try {
      // Calculer l'estimation du carburant basée sur la distance
      const response = await missionService.calculateFuelEstimate({
        transport_mode: formData.transport_mode,
        departure_date: formData.departure_date,
        return_date: formData.return_date
      });
      setFormData(prev => ({
        ...prev,
        estimated_fuel: response.estimated_fuel
      }));
      toast.success('Estimation du carburant calculée');
    } catch (error) {
      console.error('Error calculating fuel estimate:', error);
      toast.error('Erreur lors du calcul de l\'estimation du carburant');
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupérer les noms des villes sélectionnées
      const departureCity = cities.find(city => city.id === formData.departure_city);
      const arrivalCity = cities.find(city => city.id === formData.arrival_city);

      const missionData = {
        ...formData,
        // Ajouter les noms des villes
        departure_city_name: departureCity?.name || '',
        arrival_city_name: arrivalCity?.name || '',
        participants: participants.map(p => ({
          ...p,
          id: undefined // Retirer l'ID temporaire
        })),
        estimated_fuel: parseFloat(formData.estimated_fuel) || 0,
        mission_fees: parseFloat(formData.mission_fees) || 0
      };

      console.log('📤 Données envoyées au backend:', missionData);
      console.log('🏙️ Villes sélectionnées:');
      console.log(`   - Départ: ${departureCity?.name} (ID: ${formData.departure_city})`);
      console.log(`   - Arrivée: ${arrivalCity?.name} (ID: ${formData.arrival_city})`);

      await missionService.create(missionData);
      toast.success('Mission créée avec succès');
      router.push('/missions');
    } catch (error) {
      console.error('Error creating mission:', error);
      toast.error('Erreur lors de la création de la mission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/missions" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Créer une mission</h1>
            <p className="mt-2 text-gray-600">
              Créez une nouvelle mission avec ses participants et calculez automatiquement les frais
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de l'ingénieur connecté */}
          {currentEngineer && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingénieur responsable de la mission (Informations non modifiables)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-700 font-medium">Nom complet:</span>
                  <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded border">{currentEngineer.first_name} {currentEngineer.last_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-700 font-medium">Profession:</span>
                  <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded border">{currentEngineer.position}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-700 font-medium">NNI:</span>
                  <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded border">{currentEngineer.nni}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-700 font-medium">Email:</span>
                  <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded border">{currentEngineer.email || 'Non renseigné'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-700 font-medium">Téléphone:</span>
                  <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded border">{currentEngineer.phone_number || 'Non renseigné'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-700 font-medium">Ministère:</span>
                  <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded border">MINISTERE DE L'HABITAT, DE L'URBANISME ET DE L'AMENAGEMENT DU TERRITOIRE</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-800">
                  <strong>Note:</strong> Vous serez automatiquement ajouté comme chef de mission dans la composition de la mission.
                </p>
              </div>
            </div>
          )}

          {/* Informations de base */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de la mission</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objet de la mission *
                </label>
                <textarea
                  name="mission_object"
                  value={formData.mission_object}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez l'objectif de la mission..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville de départ *
                </label>
                <select
                  name="departure_city"
                  value={formData.departure_city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner une ville</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name} - {city.region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville d'arrivée *
                </label>
                <select
                  name="arrival_city"
                  value={formData.arrival_city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner une ville</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name} - {city.region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moyen de transport *
                </label>
                <select
                  name="transport_mode"
                  value={formData.transport_mode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="car">Voiture ANESP</option>
                  <option value="plane">Avion</option>
                  <option value="train">Train</option>
                  <option value="other">Autre</option>
                </select>
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de départ *
                </label>
                <input
                  type="date"
                  name="departure_date"
                  value={formData.departure_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                        </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de retour *
                </label>
                <input
                  type="date"
                  name="return_date"
                  value={formData.return_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carburant estimé (litres)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="estimated_fuel"
                    value={formData.estimated_fuel}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="Calculé automatiquement"
                    min="0"
                    step="0.1"
                    readOnly
                    disabled
                  />
                  <button
                    type="button"
                    onClick={calculateDistanceAndFuel}
                    disabled={calculating || !formData.departure_city || !formData.arrival_city}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {calculating ? 'Calcul...' : 'Calculer'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Calcul automatique selon la formule : Distance × 2 (aller-retour) × 11L/100km
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade du chef de mission
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  disabled
                >
                  <option value="">Sélectionner un grade</option>
                  {expenseScale?.grades.map((grade, index) => (
                    <option key={`grade-${grade.grade}-${index}`} value={grade.grade}>
                      {grade.grade} ({grade.newClassification})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Grade automatiquement assigné selon le profil de l'ingénieur connecté
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de destination
                </label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une destination</option>
                  {expenseScale?.destinations.map((dest, index) => (
                    <option key={`dest-${dest.type}-${index}`} value={dest.type}>
                      {dest.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frais de mission (MRU) *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="mission_fees"
                    value={formData.mission_fees}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="Calculé automatiquement selon le barème"
                    min="0"
                    step="0.01"
                    readOnly
                    disabled
                    required
                  />
                  <button
                    type="button"
                    onClick={calculateMissionExpenses}
                    disabled={calculating || !selectedGrade || !selectedDestination || !formData.departure_date || !formData.return_date}
                    className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Recalculer manuellement (calcul automatique activé)"
                  >
                    {calculating ? 'Calcul...' : '↻'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Calcul automatique selon le barème officiel ANESP
                  </span>
                </p>
                {calculatedExpenses && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="text-green-800">
                      <strong>Calculé:</strong> {calculatedExpenses.amount} {calculatedExpenses.currency} 
                      ({calculatedExpenses.duration} jour(s) × {calculatedExpenses.dailyRate} {calculatedExpenses.currency}/jour)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barème des frais de mission - Version compacte */}
          {expenseScale && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Barème des frais par grade</h2>
                <CalculatorIcon className="h-6 w-6 text-blue-600" />
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">National (UM)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Europe (€)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amérique ($)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asie-Océanie ($)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Afrique (€)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenseScale.grades.map((grade, index) => (
                      <tr key={`table-grade-${grade.grade}-${index}`} className={selectedGrade === grade.grade ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {grade.grade}
                          <br />
                          <span className="text-xs text-gray-500">{grade.newClassification}</span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{grade.national.amount}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{grade.europe.amount || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{grade.america.amount || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{grade.asiaOceania.amount || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{grade.africa.amount || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Composition de la mission</h2>
              <button
                type="button"
                onClick={addParticipant}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Ajouter un participant
              </button>
            </div>

            {participants.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Aucun participant ajouté. Cliquez sur "Ajouter un participant" pour commencer.
              </p>
            ) : (
              <div className="space-y-4">
                {participants.map((participant, index) => (
                  <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-medium text-gray-900">
                        Participant {index + 1}
                        {participant.role_in_mission === 'Chef de mission' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Chef de mission
                          </span>
                        )}
                      </h3>
                      {participant.role_in_mission !== 'Chef de mission' && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(participant.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de participant *
                        </label>
                        <select
                          value={participant.participant_type}
                          onChange={(e) => updateParticipant(participant.id, 'participant_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="anesp">Personnel ANESP</option>
                          <option value="external">Personnel externe</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rôle dans la mission *
                        </label>
                        {participant.role_in_mission === 'Chef de mission' ? (
                          <input
                            type="text"
                            value="Chef de mission"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                            disabled
                          />
                        ) : (
                          <select
                            value={participant.role_in_mission}
                            onChange={(e) => updateParticipant(participant.id, 'role_in_mission', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Sélectionner un rôle</option>
                            <option value="Ingénieur">Ingénieur</option>
                            <option value="Technicien">Technicien</option>
                            <option value="Assistant">Assistant</option>
                            <option value="Observateur">Observateur</option>
                            <option value="Expert">Expert</option>
                            <option value="Chargé de mission">Chargé de mission</option>
                            <option value="Conseiller">Conseiller</option>
                            <option value="Spécialiste">Spécialiste</option>
                            <option value="Autre">Autre (saisie libre)</option>
                          </select>
                        )}
                        {participant.role_in_mission === 'Chef de mission' && (
                          <p className="mt-1 text-sm text-gray-500">
                            Le rôle de chef de mission ne peut pas être modifié
                          </p>
                        )}
                        {participant.role_in_mission === 'Autre' && (
                          <input
                            type="text"
                            placeholder="Saisir le rôle personnalisé"
                            onChange={(e) => updateParticipant(participant.id, 'role_in_mission', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                          />
                        )}
                      </div>

                      {participant.participant_type === 'anesp' ? (
                        <>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Personnel ANESP *
                            </label>
                            <select
                              value={participant.employee_id || ''}
                              onChange={(e) => updateParticipant(participant.id, 'employee_id', e.target.value)}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                participant.role_in_mission === 'Chef de mission' ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                              disabled={participant.role_in_mission === 'Chef de mission'}
                              required
                            >
                              <option value="">Sélectionner un employé</option>
                              {employees
                                .filter(emp => emp.is_available)
                                .map(emp => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.full_name} - {emp.matricule} ({emp.position}) - Grade: {emp.grade}
                                  </option>
                                ))}
                            </select>
                            {participant.role_in_mission === 'Chef de mission' && (
                              <p className="mt-1 text-sm text-gray-500">
                                Le chef de mission est automatiquement assigné
                              </p>
                            )}
                          </div>
                          
                          {participant.employee_id && (
                            <div className="md:col-span-2">
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Informations du participant ANESP (Non modifiables)</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-800">Nom complet:</span>
                                    <span className="ml-2 text-gray-700">{participant.external_firstname} {participant.external_name}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">NNI:</span>
                                    <span className="ml-2 text-gray-700">{participant.external_nni}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">Grade:</span>
                                    <span className="ml-2 text-gray-700">{participant.grade || 'Non assigné'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">Position:</span>
                                    <span className="ml-2 text-gray-700">{participant.position || 'Non assignée'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">Profession:</span>
                                    <span className="ml-2 text-gray-700">{participant.external_profession}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">Ministère:</span>
                                    <span className="ml-2 text-gray-700">{participant.external_ministry}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">Téléphone:</span>
                                    <span className="ml-2 text-gray-700">{participant.external_phone}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">Email:</span>
                                    <span className="ml-2 text-gray-700">{participant.external_email}</span>
                                  </div>
                                </div>
                                {participant.grade && selectedDestination && formData.departure_date && formData.return_date && (
                                  <div className="mt-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const fees = await calculateParticipantFees(participant);
                                        if (fees) {
                                          toast.success(`Frais calculés: ${fees.amount} ${fees.currency}`);
                                        }
                                      }}
                                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                    >
                                      Calculer les frais
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nom *
                            </label>
                            <input
                              type="text"
                              value={participant.external_name || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                        </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Prénom *
                            </label>
                            <input
                              type="text"
                              value={participant.external_firstname || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_firstname', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              NNI
                            </label>
                            <input
                              type="text"
                              value={participant.external_nni || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_nni', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
              </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Profession
                            </label>
                            <input
                              type="text"
                              value={participant.external_profession || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_profession', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Grade (pour calcul des frais)
                            </label>
                            <select
                              value={participant.grade || ''}
                              onChange={(e) => updateParticipant(participant.id, 'grade', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Sélectionner un grade</option>
                              {expenseScale?.grades.map((grade, index) => (
                                <option key={`participant-grade-${grade.grade}-${index}`} value={grade.grade}>
                                  {grade.grade} ({grade.newClassification})
                                </option>
                              ))}
                            </select>
                          </div>
                
                  <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ministère
                            </label>
                    <input
                      type="text"
                              value={participant.external_ministry || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_ministry', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                  </div>

                  <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              value={participant.external_phone || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_phone', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              value={participant.external_email || ''}
                              onChange={(e) => updateParticipant(participant.id, 'external_email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Section calcul des frais pour tous les participants */}
                      {participant.grade && selectedDestination && formData.departure_date && formData.return_date && (
                        <div className="md:col-span-2 mt-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-green-900 mb-2">Calcul des frais de mission</h4>
                            <div className="flex items-center space-x-4">
                              <div className="text-sm">
                                <span className="font-medium text-green-800">Grade:</span>
                                <span className="ml-2 text-green-700">{participant.grade}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-green-800">Destination:</span>
                                <span className="ml-2 text-green-700">{selectedDestination}</span>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const fees = await calculateParticipantFees(participant);
                                  if (fees) {
                                    toast.success(`Frais calculés: ${fees.amount} ${fees.currency}`);
                                    // Mettre à jour le participant avec les frais calculés
                                    setParticipants(prev => prev.map(p => 
                                      p.id === participant.id 
                                        ? { ...p, calculated_fees: fees, total_allowance: fees.amount }
                                        : p
                                    ));
                                    await calculateTotalMissionFees();
                                  }
                                }}
                                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                              >
                                Calculer les frais
                              </button>
                            </div>
                            {participant.calculated_fees && (
                              <div className="mt-2 p-2 bg-green-100 rounded text-sm">
                                <p className="text-green-800">
                                  <strong>Frais calculés:</strong> {participant.calculated_fees.amount} {participant.calculated_fees.currency}
                                  ({participant.calculated_fees.duration} jour(s) × {participant.calculated_fees.dailyRate} {participant.calculated_fees.currency}/jour)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Résumé de la mission */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé de la mission</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-md font-semibold text-blue-800 mb-3">Informations saisies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Objet:</span>
                  <p className="text-sm font-medium text-gray-900">{formData.mission_object || 'Non renseigné'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Itinéraire:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.departure_city && formData.arrival_city 
                      ? `${formData.departure_city} → ${formData.arrival_city}`
                      : 'Non renseigné'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Moyen de transport:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.transport_mode === 'car' ? 'Voiture ANESP' : 
                     formData.transport_mode === 'plane' ? 'Avion' :
                     formData.transport_mode === 'train' ? 'Train' : 'Autre'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Dates:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.departure_date && formData.return_date 
                      ? `${formData.departure_date} → ${formData.return_date}`
                      : 'Non renseignées'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Carburant estimé:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.estimated_fuel ? `${formData.estimated_fuel} litres` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Frais de mission:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.mission_fees ? `${formData.mission_fees} MRU` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Participants:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {participants.length} participant{participants.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/missions"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button 
              type="submit" 
              disabled={loading || participants.length === 0}
              className="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer la mission'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}