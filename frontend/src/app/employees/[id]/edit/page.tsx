'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { employeeService } from '@/services/employeeService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    matricule: '',
    full_name: '',
    passport_number: '',
    position: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await employeeService.getById(params.id as string);
        const employee = data.employee;
        
        setFormData({
          matricule: employee.matricule,
          full_name: employee.full_name,
          passport_number: employee.passport_number || '',
          position: employee.position,
          email: employee.email || '',
          phone: employee.phone || ''
        });
      } catch (error) {
        console.error('Error fetching employee:', error);
        toast.error('Employé non trouvé');
        router.push('/employees');
      } finally {
        setFetchLoading(false);
      }
    };

    if (params.id) {
      fetchEmployee();
    }
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await employeeService.update(params.id as string, formData);
      toast.success('Employé modifié avec succès');
      router.push('/employees');
    } catch (error) {
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (fetchLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement de l'employé..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/employees" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier l'employé</h1>
            <p className="mt-2 text-gray-600">
              Mettre à jour les informations de l'employé
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="matricule" className="form-label">
                  Matricule *
                </label>
                <input
                  type="text"
                  id="matricule"
                  name="matricule"
                  required
                  className="form-input"
                  value={formData.matricule}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="passport_number" className="form-label">
                  Numéro de passeport
                </label>
                <input
                  type="text"
                  id="passport_number"
                  name="passport_number"
                  className="form-input"
                  value={formData.passport_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="full_name" className="form-label">
                Nom complet *
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                required
                className="form-input"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="position" className="form-label">
                Poste / Fonction *
              </label>
              <input
                type="text"
                id="position"
                name="position"
                required
                className="form-input"
                value={formData.position}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="form-label">
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="phone" className="form-label">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Information:</h4>
              <p className="text-sm text-blue-700">
                Si vous modifiez l'adresse email, l'employé recevra ses futurs ordres de mission 
                à la nouvelle adresse. Assurez-vous que l'adresse est correcte.
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/employees" className="btn-secondary">
                Annuler
              </Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Modification...
                  </>
                ) : (
                  'Modifier l\'employé'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}