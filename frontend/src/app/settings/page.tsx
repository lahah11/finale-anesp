"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { institutionService } from "@/services/institutionService";
import { authService } from "@/services/authService";
import { useAuth } from "@/app/providers";
import {
  CogIcon,
  KeyIcon,
  BuildingOfficeIcon,
  UserIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("institution");
  const [loading, setLoading] = useState(false);

  // Institution settings
  const [institutionData, setInstitutionData] = useState({
    name: "",
    type: "etablissement",
    header_text: "",
    footer_text: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user?.institution_id) {
      fetchInstitutionData();
    }
  }, [user]);

  const fetchInstitutionData = async () => {
    try {
      const data = await institutionService.getById(user!.institution_id!);
      setInstitutionData(data.institution);
      if (data.institution.logo_url) {
        setLogoPreview(
          `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${
            data.institution.logo_url
          }`
        );
      }
    } catch (error) {
      console.error("Error fetching institution:", error);
    }
  };

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(institutionData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (logo) {
        formData.append("logo", logo);
      }

      await institutionService.update(user!.institution_id!, formData);
      toast.success("Institution mise à jour avec succès");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      toast.success("Mot de passe modifié avec succès");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error("Erreur lors du changement de mot de passe");
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setInstitutionData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    {
      id: "institution",
      name: "Institution",
      icon: BuildingOfficeIcon,
      show: user?.role === "admin_local" || user?.role === "super_admin",
    },
    {
      id: "profile",
      name: "Profil",
      icon: UserIcon,
      show: true,
    },
    {
      id: "password",
      name: "Mot de passe",
      icon: KeyIcon,
      show: true,
    },
  ].filter((tab) => tab.show);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="mt-2 text-gray-600">
            Gérez les paramètres de votre compte et institution
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? "bg-mauritania-green text-white"
                      : "text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === "institution" && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Paramètres de l'institution
                </h3>

                <form onSubmit={handleInstitutionSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="form-label">
                      Nom de l'institution *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="form-input"
                      value={institutionData.name}
                      onChange={handleInstitutionChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="form-label">
                      Type d'institution *
                    </label>
                    <select
                      id="type"
                      name="type"
                      required
                      className="form-input"
                      value={institutionData.type}
                      onChange={handleInstitutionChange}
                      disabled={user?.role !== "super_admin"}
                    >
                      <option value="etablissement">Établissement</option>
                      <option value="ministerial">Ministériel</option>
                    </select>
                  </div>

                  {/* Logo */}

                  {/* Logo Upload Section */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4">
                      Logos et Images
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Institution Logo */}
                      <div>
                        <label className="form-label">
                          Logo de l'institution
                        </label>
                        {logoPreview ? (
                          <div className="mt-1 border border-gray-300 rounded-md p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                Logo actuel:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLogo(null);
                                  setLogoPreview(null);
                                }}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Supprimer
                              </button>
                            </div>
                            <div className="bg-gray-50 p-4 rounded border">
                              <img
                                src={logoPreview}
                                alt="Logo"
                                className="max-h-20 max-w-full object-contain"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                <label
                                  htmlFor="logo"
                                  className="relative cursor-pointer bg-white rounded-md font-medium text-mauritania-green hover:text-mauritania-green-dark"
                                >
                                  <span>Télécharger le logo</span>
                                  <input
                                    id="logo"
                                    name="logo"
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleLogoChange}
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500">
                                PNG, JPG jusqu'à 5MB
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="mt-2 text-sm text-gray-500">
                          Ce logo apparaîtra sur tous les ordres de mission de
                          votre institution
                        </p>
                      </div>

                      {/* Mauritanian Coat of Arms Info */}
                      <div>
                        <label className="form-label">
                          Armoiries de Mauritanie
                        </label>
                        <div className="mt-1 p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center">
                            <div className="text-blue-600 mr-3">🇲🇷</div>
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Armoiries officielles
                              </p>
                              <p className="text-xs text-blue-700">
                                Les armoiries de la République Islamique de
                                Mauritanie sont automatiquement incluses sur
                                tous les documents officiels.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="header_text" className="form-label">
                      Texte d'en-tête des documents
                    </label>
                    <textarea
                      id="header_text"
                      name="header_text"
                      rows={3}
                      className="form-input"
                      value={institutionData.header_text}
                      onChange={handleInstitutionChange}
                      placeholder="RÉPUBLIQUE ISLAMIQUE DE MAURITANIE&#10;Honneur - Fraternité - Justice"
                    />
                  </div>

                  <div>
                    <label htmlFor="footer_text" className="form-label">
                      Texte de pied de page des documents
                    </label>
                    <textarea
                      id="footer_text"
                      name="footer_text"
                      rows={2}
                      className="form-input"
                      value={institutionData.footer_text}
                      onChange={handleInstitutionChange}
                      placeholder="Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2"></div>
                          Sauvegarde...
                        </>
                      ) : (
                        "Sauvegarder"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Informations du profil
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nom d'utilisateur</label>
                    <input
                      type="text"
                      className="form-input"
                      value={user?.username}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="form-label">Adresse email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={user?.email}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="form-label">Rôle</label>
                    <input
                      type="text"
                      className="form-input"
                      value={user?.role.replace("_", " ")}
                      disabled
                    />
                  </div>

                  {user?.institution_name && (
                    <div>
                      <label className="form-label">Institution</label>
                      <input
                        type="text"
                        className="form-input"
                        value={user.institution_name}
                        disabled
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Changer le mot de passe
                </h3>

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="currentPassword" className="form-label">
                      Mot de passe actuel *
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      required
                      className="form-input"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="form-label">
                      Nouveau mot de passe *
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      required
                      minLength={6}
                      className="form-input"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Le mot de passe doit contenir au moins 6 caractères
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirmer le nouveau mot de passe *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                      minLength={6}
                      className="form-input"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2"></div>
                          Changement...
                        </>
                      ) : (
                        "Changer le mot de passe"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
