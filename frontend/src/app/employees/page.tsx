'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { employeeService } from '@/services/employeeService';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showEndMissionModal, setShowEndMissionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [endingMission, setEndingMission] = useState(false);

  const fetchEmployees = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const data = await employeeService.getByInstitution(undefined, {
        page,
        limit: 20,
        search
      });
      setEmployees(data.employees);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(1, searchTerm);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    fetchEmployees(page, searchTerm);
  };

  const handleEndMission = (employee: any) => {
    setSelectedEmployee(employee);
    setShowEndMissionModal(true);
  };

  const executeEndMission = async () => {
    if (!selectedEmployee) return;

    setEndingMission(true);
    try {
      await employeeService.endCurrentMission(selectedEmployee.id);
      toast.success(`Mission terminée pour ${selectedEmployee.full_name}`);
      fetchEmployees(currentPage, searchTerm);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la fin de mission');
    } finally {
      setEndingMission(false);
      setShowEndMissionModal(false);
      setSelectedEmployee(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'employé "${name}" ?`)) {
      return;
    }

    try {
      await employeeService.delete(id);
      toast.success('Employé supprimé avec succès');
      fetchEmployees(currentPage, searchTerm);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const getEmployeeStatusBadge = (employee: any) => {
    if (employee.current_mission_id) {
      if (employee.current_mission_status === 'validated' && employee.employee_status === 'on_mission') {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            En mission
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            En mission  
          </span>
        );
      }
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Disponible
      </span>
    );
  };

  if (loading && currentPage === 1) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement des employés..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employés</h1>
            <p className="mt-2 text-gray-600">
              Gérez les employés de votre institution ({total} employés)
            </p>
          </div>
          <Link href="/employees/create" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvel employé
          </Link>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="form-input pl-10"
              placeholder="Rechercher par nom, matricule ou poste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Employees Table */}
        {employees.length > 0 ? (
          <div className="space-y-4">
            <div className="card p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Employé</th>
                      <th className="table-header">Matricule</th>
                      <th className="table-header">Poste</th>
                      <th className="table-header">Statut</th>
                      <th className="table-header">Mission actuelle</th>
                      <th className="table-header">Contact</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee: any) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">{employee.full_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="font-mono text-sm">{employee.matricule}</span>
                        </td>
                        <td className="table-cell">{employee.position}</td>
                        <td className="table-cell">
                          {getEmployeeStatusBadge(employee)}
                        </td>
                        <td className="table-cell">
                          {employee.current_mission_id ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                N° {employee.current_mission_number}
                              </p>
                              <p className="text-xs text-gray-600">
                                {employee.current_destination}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(employee.current_departure_date).toLocaleDateString('fr-FR')} - {new Date(employee.current_return_date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Aucune mission</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="space-y-1">
                            {employee.email && (
                              <p className="text-sm text-gray-600">{employee.email}</p>
                            )}
                            {employee.phone && (
                              <p className="text-sm text-gray-600">{employee.phone}</p>
                            )}
                            {!employee.email && !employee.phone && (
                              <p className="text-sm text-gray-400">Aucun contact</p>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            {employee.current_mission_id && employee.employee_status === 'on_mission' && (
                              <button
                                onClick={() => handleEndMission(employee)}
                                className="p-2 text-gray-400 hover:text-orange-600"
                                title="Terminer la mission"
                              >
                                <StopIcon className="h-4 w-4" />
                              </button>
                            )}
                            <Link 
                              href={`/employees/${employee.id}/edit`}
                              className="p-2 text-gray-400 hover:text-mauritania-green"
                              title="Modifier"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(employee.id, employee.full_name)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Supprimer"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Page {currentPage} sur {totalPages} ({total} employés au total)
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPage === page
                          ? 'bg-mauritania-green text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Aucun employé trouvé' : 'Aucun employé'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Essayez de modifier votre recherche' 
                : 'Commencez par ajouter votre premier employé.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link href="/employees/create" className="btn-primary">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Nouvel employé
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* End Mission Modal */}
      {showEndMissionModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-orange-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Terminer la mission
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
                  Êtes-vous sûr de vouloir terminer la mission en cours pour <strong>{selectedEmployee.full_name}</strong> ?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-sm font-medium text-gray-900">
                    Mission N° {selectedEmployee.current_mission_number}
                  </p>
                  <p className="text-sm text-gray-600">
                    Destination: {selectedEmployee.current_destination}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedEmployee.current_departure_date).toLocaleDateString('fr-FR')} - {new Date(selectedEmployee.current_return_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEndMissionModal(false)}
                  disabled={endingMission}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  onClick={executeEndMission}
                  disabled={endingMission}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {endingMission ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                      Terminaison...
                    </>
                  ) : (
                    'Terminer la mission'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}