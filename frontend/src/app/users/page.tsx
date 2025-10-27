'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  institution_id: string;
  institution_role_id: string;
  is_active: number;
  created_at: string;
}

interface Role {
  id: string;
  role_name: string;
  role_code: string;
  description: string;
}

interface Institution {
  id: string;
  name: string;
}

function UsersManagementContent() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    institution_id: '32c5a15e4679067315c5d2bab813e6d4', // ID d'ANESP
    institution_role_id: '',
    function_name: '', // Nouveau champ pour le nom de la fonction
    is_active: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  // Fonction utilitaire pour récupérer le token
  const getAuthToken = () => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    return getCookie('token');
  };

  // Fonction utilitaire pour créer les headers avec authentification
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const headers = getAuthHeaders();
      
      const [usersRes, rolesRes, institutionsRes] = await Promise.all([
        fetch('http://localhost:5000/api/users', { headers }),
        fetch('http://localhost:5000/api/roles', { headers }),
        fetch('http://localhost:5000/api/institutions', { headers })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      }

      if (institutionsRes.ok) {
        const institutionsData = await institutionsRes.json();
        setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erreur lors du chargement des données');
      // Initialiser avec des tableaux vides en cas d'erreur
      setUsers([]);
      setRoles([]);
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Trouver le rôle correspondant au nom de fonction saisi
      const matchingRole = roles.find(role => 
        role.role_name.toLowerCase() === userForm.function_name.toLowerCase()
      );
      
      console.log('🔍 Debug - roles disponibles:', roles);
      console.log('🔍 Debug - function_name saisi:', userForm.function_name);
      console.log('🔍 Debug - matchingRole trouvé:', matchingRole);
      
      if (!matchingRole) {
        setError(`Fonction "${userForm.function_name}" non trouvée. Veuillez vérifier l'orthographe.`);
        return;
      }
      
      // Créer l'objet à envoyer avec l'institution_role_id trouvé
      const userData = {
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        institution_id: userForm.institution_id, // Toujours ANESP
        institution_role_id: matchingRole.id,
        is_active: userForm.is_active
      };
      
      console.log('🔍 Debug - userData à envoyer:', userData);
      
      const url = editingUser 
        ? `http://localhost:5000/api/users/${editingUser.id}`
        : 'http://localhost:5000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const headers = getAuthHeaders();
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        await loadData();
        setShowUserForm(false);
        setEditingUser(null);
        setUserForm({
          username: '',
          email: '',
          password: '',
          role: '',
          institution_id: '32c5a15e4679067315c5d2bab813e6d4', // ID d'ANESP
          institution_role_id: '',
          function_name: '', // Nouveau champ
          is_active: 1
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    // Récupérer le nom de la fonction à partir de l'institution_role_id
    const role = roles.find(r => r.id === user.institution_role_id);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '', // Ne pas pré-remplir le mot de passe
      role: user.role,
      institution_id: '32c5a15e4679067315c5d2bab813e6d4', // Toujours ANESP
      institution_role_id: user.institution_role_id,
      function_name: role ? role.role_name : '', // Pré-remplir avec le nom de la fonction
      is_active: user.is_active
    });
    setShowUserForm(true);
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.role_name : 'Fonction inconnue';
  };

  const getInstitutionName = (institutionId: string) => {
    return 'ANESP'; // Toujours ANESP
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
          <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
                <p className="text-gray-600">Créer et gérer les comptes utilisateurs avec leurs rôles et permissions</p>
          </div>
              <button
                onClick={() => setShowUserForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                + Nouvel Utilisateur
              </button>
        </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fonction
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution
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
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getRoleName(user.institution_role_id)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getInstitutionName(user.institution_id)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Modifier
                        </button>
                            <button
                          onClick={() => handleDeleteUser(user.id)}
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
        </div>
      </div>

      {/* Modal de création/édition d'utilisateur */}
      {showUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}
              </h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom d'utilisateur *
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingUser}
                    placeholder={editingUser ? "Laisser vide pour ne pas changer" : ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institution *
                  </label>
                  <input
                    type="text"
                    value="ANESP"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fonction *
                  </label>
                  <input
                    type="text"
                    value={userForm.function_name}
                    onChange={(e) => setUserForm({...userForm, function_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Saisir la fonction"
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Fonctions disponibles: {roles.map(role => role.role_name).join(', ')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={userForm.is_active}
                    onChange={(e) => setUserForm({...userForm, is_active: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Actif</option>
                    <option value={0}>Inactif</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false);
                      setEditingUser(null);
                      setUserForm({
                        username: '',
                        email: '',
                        password: '',
                        role: '',
                        institution_id: '',
                        institution_role_id: '',
                        is_active: 1
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editingUser ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default function UsersManagement() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'admin_local']} fallbackPath="/dashboard">
      <UsersManagementContent />
    </ProtectedRoute>
  );
}