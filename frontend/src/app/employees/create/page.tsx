'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { employeeService } from '@/services/employeeService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreateEmployeePage() {
  const [formData, setFormData] = useState({
    matricule: '',
    full_name: '',
    passport_number: '',
    position: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await employeeService.create(formData);
      toast.success('Employé créé avec succès');
      router.push('/employees');
    } catch (error) {
      toast.error('Erreur lors de la création');
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/employees" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvel employé</h1>
            <p className="mt-2 text-gray-600">
              Ajouter un nouvel employé à votre institution
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
                  placeholder="Ex: EMP001"
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
                  placeholder="Ex: P123456789"
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
                placeholder="Ex: Ahmed Mohamed Ould Salem"
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
                placeholder="Ex: Ingénieur Informatique"
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
                  placeholder="ahmed.mohamed@institution.mr"
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
                  placeholder="Ex: +222 12 34 56 78"
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Information importante:</h4>
              <p className="text-sm text-yellow-700">
                L'adresse email est nécessaire pour que l'employé puisse recevoir ses ordres de mission par email. 
                Si aucune email n'est fournie, les ordres devront être remis manuellement.
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
                    Création...
                  </>
                ) : (
                  'Créer l\'employé'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}