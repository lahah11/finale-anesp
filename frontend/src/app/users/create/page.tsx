'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { userService } from '@/services/userService';
import { institutionService } from '@/services/institutionService';
import { useAuth } from '@/app/providers';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Select from 'react-select';

export default function CreateUserPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: user?.role === 'super_admin' ? 'admin_local' : 'hr',
    institution_id: user?.institution_id || ''
  });
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const router = useRouter();

  // Fetch institutions for Super Admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      const fetchInstitutions = async () => {
        setLoadingInstitutions(true);
        try {
          const data = await institutionService.getAll();
          setInstitutions(data.institutions);
        } catch (error) {
          console.error('Error fetching institutions:', error);
          toast.error('Erreur lors du chargement des institutions');
        } finally {
          setLoadingInstitutions(false);
        }
      };
      fetchInstitutions();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate for Super Admin
      if (user?.role === 'super_admin' && !formData.institution_id) {
        toast.error('Veuillez sélectionner une institution');
        setLoading(false);
        return;
      }

      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.institution_id && { institution_id: formData.institution_id })
      };

      await userService.create(payload);
      
      const roleText = user?.role === 'super_admin' ? 'Admin Local' : 'Utilisateur';
      toast.success(`${roleText} créé avec succès`);
      router.push('/users');
    } catch (error: any) {
      console.error('Create user error:', error);
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = errors.map((err: any) => err.msg).join(', ');
        toast.error(errorMessages);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleInstitutionChange = (selectedOption: any) => {
    setFormData(prev => ({
      ...prev,
      institution_id: selectedOption ? selectedOption.value : ''
    }));
  };

  const getRoleOptions = () => {
    if (user?.role === 'super_admin') {
      return [{ value: 'admin_local', label: 'Admin Local' }];
    }

    const allRoles = [
      { value: 'hr', label: 'Ressources Humaines' },
      { value: 'dg', label: 'Directeur Général' },
      { value: 'agent', label: 'Agent' },
      { value: 'police', label: 'Police' }
    ];

    // Add MSGG only for ministerial institutions
    if (user?.institution_type === 'ministerial') {
      allRoles.splice(2, 0, { value: 'msgg', label: 'MSGG' });
    }

    return allRoles;
  };

  const institutionOptions = institutions.map((institution: any) => ({
    value: institution.id,
    label: `${institution.name} (${institution.type === 'ministerial' ? 'Ministériel' : 'Établissement'})`
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/users" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === 'super_admin' ? 'Nouvel Admin Local' : 'Nouvel utilisateur'}
            </h1>
            <p className="mt-2 text-gray-600">
              {user?.role === 'super_admin' 
                ? 'Créer un administrateur local pour une institution'
                : 'Créer un nouveau compte utilisateur pour votre institution'
              }
            </p>
          </div>
        </div>

        {/* Workflow Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            {user?.role === 'super_admin' ? 'Workflow Super Admin' : 'Workflow Admin Local'}
          </h3>
          <div className="text-sm text-blue-700">
            {user?.role === 'super_admin' ? (
              <ul className="list-disc list-inside space-y-1">
                <li>Vous ne pouvez créer que des <strong>Admin Local</strong></li>
                <li>Chaque Admin Local gère une institution spécifique</li>
                <li>L'Admin Local créera ensuite les autres utilisateurs (RH, DG, etc.)</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                <li>Vous créez des utilisateurs pour votre institution: <strong>{user?.institution_name}</strong></li>
                <li>Rôles disponibles: RH, DG, {user?.institution_type === 'ministerial' && 'MSGG, '}Agent, Police</li>
              </ul>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Institution Selection (Super Admin only) */}
            {user?.role === 'super_admin' && (
              <div>
                <label className="form-label">
                  Institution *
                </label>
                {loadingInstitutions ? (
                  <div className="form-input flex items-center">
                    <div className="spinner mr-2"></div>
                    Chargement des institutions...
                  </div>
                ) : (
                  <div className="react-select-container">
                    <Select
                      className="react-select"
                      classNamePrefix="react-select"
                      options={institutionOptions}
                      onChange={handleInstitutionChange}
                      placeholder="Sélectionner une institution..."
                      noOptionsMessage={() => "Aucune institution trouvée"}
                      isSearchable
                      required
                    />
                  </div>
                )}
              </div>
            )}

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
                placeholder="Ex: ahmed.mohamed"
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
                placeholder="Ex: ahmed.mohamed@institution.mr"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe temporaire *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={6}
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 caractères"
              />
              <p className="mt-1 text-sm text-gray-500">
                L'utilisateur pourra changer ce mot de passe lors de sa première connexion
              </p>
            </div>

            {/* Role (only for Admin Local) */}
            {user?.role !== 'super_admin' && (
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
            )}

            {/* Current institution info for Admin Local */}
            {user?.role === 'admin_local' && user?.institution_name && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Institution:</h4>
                <p className="text-sm text-green-800">{user.institution_name}</p>
                <p className="text-xs text-green-600 mt-1">
                  L'utilisateur sera créé pour cette institution
                </p>
              </div>
            )}

            {/* Role descriptions */}
            {user?.role !== 'super_admin' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Description des rôles:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>RH:</strong> Crée les ordres de mission</li>
                  <li><strong>DG:</strong> Valide les ordres de mission</li>
                  {user?.institution_type === 'ministerial' && (
                    <li><strong>MSGG:</strong> Validation finale pour les institutions ministérielles</li>
                  )}
                  <li><strong>Agent:</strong> Reçoit les ordres de mission</li>
                  <li><strong>Police:</strong> Vérifie les ordres via l'application mobile</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link href="/users" className="btn-secondary">
                Annuler
              </Link>
              <button type="submit" disabled={loading || (user?.role === 'super_admin' && loadingInstitutions)} className="btn-primary">
                {loading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Création...
                  </>
                ) : (
                  user?.role === 'super_admin' ? 'Créer l\'Admin Local' : 'Créer l\'utilisateur'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}