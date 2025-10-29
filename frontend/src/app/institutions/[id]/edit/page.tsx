'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { institutionService } from '@/services/institutionService';
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditInstitutionPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: 'etablissement',
    header_text: '',
    footer_text: ''
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const data = await institutionService.getById(params.id as string);
        const institution = data.institution;
        
        setFormData({
          name: institution.name,
          type: institution.type,
          header_text: institution.header_text || '',
          footer_text: institution.footer_text || ''
        });

        if (institution.logo_url) {
          setLogoPreview(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${institution.logo_url}`);
        }
      } catch (error) {
        console.error('Error fetching institution:', error);
        toast.error('Institution non trouvée');
        router.push('/institutions');
      } finally {
        setFetchLoading(false);
      }
    };

    if (params.id) {
      fetchInstitution();
    }
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      
      if (logo) {
        formDataToSend.append('logo', logo);
      }

      await institutionService.update(params.id as string, formDataToSend);
      toast.success('Institution modifiée avec succès');
      router.push('/institutions');
    } catch (error) {
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    setLogo(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  if (fetchLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Chargement de l'institution..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/institutions" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier l'institution</h1>
            <p className="mt-2 text-gray-600">
              Mettre à jour les informations de l'institution
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="card space-y-6">
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
                value={formData.name}
                onChange={handleChange}
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
                value={formData.type}
                onChange={handleChange}
              >
                <option value="etablissement">Établissement</option>
                <option value="ministerial">Ministériel</option>
              </select>
            </div>

            {/* Logo with Drag & Drop */}
            <div>
              <label className="form-label">Logo de l'institution</label>
              
              {logoPreview ? (
                <div className="mt-1 border border-gray-300 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Logo actuel:</span>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border">
                    <img src={logoPreview} alt="Logo" className="max-h-20 max-w-full object-contain" />
                  </div>
                  <div className="mt-3">
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        isDragOver 
                          ? 'border-mauritania-green bg-mauritania-green bg-opacity-5' 
                          : 'border-gray-300 hover:border-mauritania-green'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <CloudArrowUpIcon className={`mx-auto h-8 w-8 ${isDragOver ? 'text-mauritania-green' : 'text-gray-400'}`} />
                      <p className={`mt-1 text-sm ${isDragOver ? 'text-mauritania-green' : 'text-gray-600'}`}>
                        {isDragOver ? 'Déposez l\'image ici' : 'Glissez une nouvelle image ici ou'}
                      </p>
                      <label htmlFor="logo_update" className="mt-1 inline-block cursor-pointer text-mauritania-green hover:text-mauritania-green-dark font-medium text-sm">
                        parcourir
                        <input
                          id="logo_update"
                          name="logo_update"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleLogoChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                    isDragOver 
                      ? 'border-mauritania-green bg-mauritania-green bg-opacity-5' 
                      : 'border-gray-300 hover:border-mauritania-green'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${isDragOver ? 'text-mauritania-green' : 'text-gray-400'}`} />
                    <div className="flex flex-col text-sm text-gray-600">
                      <p className={`${isDragOver ? 'text-mauritania-green font-medium' : ''}`}>
                        {isDragOver ? 'Déposez l\'image ici' : 'Glissez et déposez votre logo ici, ou'}
                      </p>
                      {!isDragOver && (
                        <label htmlFor="logo" className="mt-1 cursor-pointer bg-white rounded-md font-medium text-mauritania-green hover:text-mauritania-green-dark">
                          <span>parcourir</span>
                          <input
                            id="logo"
                            name="logo"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleLogoChange}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG jusqu'à 5MB</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="header_text" className="form-label">
                Texte d'en-tête
              </label>
              <textarea
                id="header_text"
                name="header_text"
                rows={3}
                className="form-input"
                value={formData.header_text}
                onChange={handleChange}
                placeholder="RÉPUBLIQUE ISLAMIQUE DE MAURITANIE&#10;Honneur - Fraternité - Justice"
              />
            </div>

            <div>
              <label htmlFor="footer_text" className="form-label">
                Texte de pied de page
              </label>
              <textarea
                id="footer_text"
                name="footer_text"
                rows={2}
                className="form-input"
                value={formData.footer_text}
                onChange={handleChange}
                placeholder="Avenue Moktar Ould Daddah ZRB 0441 Nouakchott - Mauritanie"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/institutions" className="btn-secondary">
                Annuler
              </Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Modification...
                  </>
                ) : (
                  'Modifier l\'institution'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}