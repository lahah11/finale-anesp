'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { userService } from '@/services/userService';
import { useAuth } from '@/app/providers';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditUserPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'hr',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // We'll fetch user data from the users list since we don't have a getById endpoint
        const data = await userService.getByInstitution();
        const userData = data.users.find((u: any) => u.id === params.id);
        
        if (userData) {
          setFormData({
            username: userData.username,
            email: userData.email,
            role: userData.role,
            is_active: userData.is_active
          });
        } else {
          toast.error('Utilisateur non trouvé');
          router.push('/users');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Erreur lors du chargement');
        router.push('/users');
      } finally {
        setFetchLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userService.update(params.id as string, formData);
      toast.success('Utilisateur modifié avec succès');
      router.push('/users');
    } catch (error) {
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  const getRoleOptions = () => {
    const allRoles = [
      { value: 'admin_local', label: 'Admin Local' },
      { value: 'hr', label: 'Ressources Humaines' },
      { value: 'dg', label: 'Directeur Général' },
      { value: 'agent', label: 'Agent' },
      { value: 'police', label: 'Police' }
    ];

    // Add MSGG only for ministerial institutions
    if (user?.institution_type === 'ministerial') {
      allRoles.splice(3, 0, { value: 'msgg', label: 'MSGG' });
    }

    return allRoles;
  };

  if (fetchLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement de l'utilisateur..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/users" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier l'utilisateur</h1>
            <p className="mt-2 text-gray-600">
              Mettre à jour les informations de l'utilisateur
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <label htmlFor="username" className="form-label">
                Nom d'utilisateur *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                className="form-input"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Adresse email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="form-input"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="role" className="form-label">
                Rôle *
              </label>
              <select
                id="role"
                name="role"
                required
                className="form-input"
                value={formData.role}
                onChange={handleChange}
              >
                {getRoleOptions().map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                className="h-4 w-4 text-mauritania-green focus:ring-mauritania-green border-gray-300 rounded"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Compte actif
              </label>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Note:</h4>
              <p className="text-sm text-yellow-700">
                La modification du rôle peut affecter les permissions de l'utilisateur. 
                Assurez-vous que le nouvel rôle correspond aux responsabilités de la personne.
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/users" className="btn-secondary">
                Annuler
              </Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Modification...
                  </>
                ) : (
                  'Modifier l\'utilisateur'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}