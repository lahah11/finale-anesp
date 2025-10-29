'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { signatureService } from '@/services/signatureService';
import { useAuth } from '@/app/providers';
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreateSignaturePage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    signed_by: '',
    title: '',
    role: 'dg'
  });
  const [signature, setSignature] = useState<File | null>(null);
  const [stamp, setStamp] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragOverSignature, setIsDragOverSignature] = useState(false);
  const [isDragOverStamp, setIsDragOverStamp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      
      if (signature) {
        formDataToSend.append('signature', signature);
      }
      
      if (stamp) {
        formDataToSend.append('stamp', stamp);
      }

      await signatureService.create(formDataToSend);
      toast.success('Signature créée avec succès');
      router.push('/signatures');
    } catch (error) {
      toast.error('Erreur lors de la création');
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

  const processFile = (file: File, type: 'signature' | 'stamp') => {
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

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'signature') {
        setSignature(file);
        setSignaturePreview(e.target?.result as string);
      } else {
        setStamp(file);
        setStampPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], 'signature');
    }
  };

  const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], 'stamp');
    }
  };

  // Signature Drag & Drop handlers
  const handleSignatureDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(true);
  };

  const handleSignatureDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(false);
  };

  const handleSignatureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0], 'signature');
    }
  };

  // Stamp Drag & Drop handlers
  const handleStampDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverStamp(true);
  };

  const handleStampDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverStamp(false);
  };

  const handleStampDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverStamp(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0], 'stamp');
    }
  };

  const removeSignature = () => {
    setSignature(null);
    setSignaturePreview(null);
  };

  const removeStamp = () => {
    setStamp(null);
    setStampPreview(null);
  };

  const getRoleOptions = () => {
    const options = [
      { value: 'dg', label: 'Directeur Général (DG)' }
    ];

    // Add MSGG only for ministerial institutions
    if (user?.institution_type === 'ministerial') {
      options.push({ value: 'msgg', label: 'MSGG' });
    }

    return options;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/signatures" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle signature</h1>
            <p className="mt-2 text-gray-600">
              Ajouter une signature numérique et un cachet officiel
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="signed_by" className="form-label">
                  Nom du signataire *
                </label>
                <input
                  type="text"
                  id="signed_by"
                  name="signed_by"
                  required
                  className="form-input"
                  value={formData.signed_by}
                  onChange={handleChange}
                  placeholder="Ex: Mohamed Ould Ahmed"
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
                  {getRoleOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="title" className="form-label">
                Titre/Fonction *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Directeur Général"
              />
            </div>

            {/* Signature Upload with Drag & Drop */}
            <div>
              <label className="form-label">
                Signature numérique
              </label>
              
              {!signaturePreview ? (
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                    isDragOverSignature 
                      ? 'border-mauritania-green bg-mauritania-green bg-opacity-5' 
                      : 'border-gray-300 hover:border-mauritania-green'
                  }`}
                  onDragOver={handleSignatureDragOver}
                  onDragLeave={handleSignatureDragLeave}
                  onDrop={handleSignatureDrop}
                >
                  <div className="space-y-1 text-center">
                    <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${isDragOverSignature ? 'text-mauritania-green' : 'text-gray-400'}`} />
                    <div className="flex flex-col text-sm text-gray-600">
                      <p className={`${isDragOverSignature ? 'text-mauritania-green font-medium' : ''}`}>
                        {isDragOverSignature ? 'Déposez la signature ici' : 'Glissez et déposez votre signature ici, ou'}
                      </p>
                      {!isDragOverSignature && (
                        <label htmlFor="signature" className="mt-1 cursor-pointer bg-white rounded-md font-medium text-mauritania-green hover:text-mauritania-green-dark">
                          <span>parcourir</span>
                          <input
                            id="signature"
                            name="signature"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleSignatureChange}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 5MB</p>
                  </div>
                </div>
              ) : (
                <div className="mt-1 border border-gray-300 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Aperçu de la signature:</span>
                    <button
                      type="button"
                      onClick={removeSignature}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border">
                    <img src={signaturePreview} alt="Signature" className="max-h-20 max-w-full object-contain" />
                  </div>
                  <div className="mt-3">
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        isDragOverSignature 
                          ? 'border-mauritania-green bg-mauritania-green bg-opacity-5' 
                          : 'border-gray-300 hover:border-mauritania-green'
                      }`}
                      onDragOver={handleSignatureDragOver}
                      onDragLeave={handleSignatureDragLeave}
                      onDrop={handleSignatureDrop}
                    >
                      <CloudArrowUpIcon className={`mx-auto h-8 w-8 ${isDragOverSignature ? 'text-mauritania-green' : 'text-gray-400'}`} />
                      <p className={`mt-1 text-sm ${isDragOverSignature ? 'text-mauritania-green' : 'text-gray-600'}`}>
                        {isDragOverSignature ? 'Déposez la nouvelle signature ici' : 'Glissez une nouvelle signature ici ou'}
                      </p>
                      <label htmlFor="signature_update" className="mt-1 inline-block cursor-pointer text-mauritania-green hover:text-mauritania-green-dark font-medium text-sm">
                        parcourir
                        <input
                          id="signature_update"
                          name="signature_update"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleSignatureChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stamp Upload with Drag & Drop */}
            <div>
              <label className="form-label">
                Cachet officiel
              </label>
              
              {!stampPreview ? (
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                    isDragOverStamp 
                      ? 'border-mauritania-green bg-mauritania-green bg-opacity-5' 
                      : 'border-gray-300 hover:border-mauritania-green'
                  }`}
                  onDragOver={handleStampDragOver}
                  onDragLeave={handleStampDragLeave}
                  onDrop={handleStampDrop}
                >
                  <div className="space-y-1 text-center">
                    <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${isDragOverStamp ? 'text-mauritania-green' : 'text-gray-400'}`} />
                    <div className="flex flex-col text-sm text-gray-600">
                      <p className={`${isDragOverStamp ? 'text-mauritania-green font-medium' : ''}`}>
                        {isDragOverStamp ? 'Déposez le cachet ici' : 'Glissez et déposez votre cachet ici, ou'}
                      </p>
                      {!isDragOverStamp && (
                        <label htmlFor="stamp" className="mt-1 cursor-pointer bg-white rounded-md font-medium text-mauritania-green hover:text-mauritania-green-dark">
                          <span>parcourir</span>
                          <input
                            id="stamp"
                            name="stamp"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleStampChange}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 5MB</p>
                  </div>
                </div>
              ) : (
                <div className="mt-1 border border-gray-300 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Aperçu du cachet:</span>
                    <button
                      type="button"
                      onClick={removeStamp}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border">
                    <img src={stampPreview} alt="Cachet" className="max-h-20 max-w-full object-contain" />
                  </div>
                  <div className="mt-3">
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        isDragOverStamp 
                          ? 'border-mauritania-green bg-mauritania-green bg-opacity-5' 
                          : 'border-gray-300 hover:border-mauritania-green'
                      }`}
                      onDragOver={handleStampDragOver}
                      onDragLeave={handleStampDragLeave}
                      onDrop={handleStampDrop}
                    >
                      <CloudArrowUpIcon className={`mx-auto h-8 w-8 ${isDragOverStamp ? 'text-mauritania-green' : 'text-gray-400'}`} />
                      <p className={`mt-1 text-sm ${isDragOverStamp ? 'text-mauritania-green' : 'text-gray-600'}`}>
                        {isDragOverStamp ? 'Déposez le nouveau cachet ici' : 'Glissez un nouveau cachet ici ou'}
                      </p>
                      <label htmlFor="stamp_update" className="mt-1 inline-block cursor-pointer text-mauritania-green hover:text-mauritania-green-dark font-medium text-sm">
                        parcourir
                        <input
                          id="stamp_update"
                          name="stamp_update"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleStampChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Important
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Une seule signature peut être active par rôle à la fois</li>
                      <li>Cette signature remplacera l'ancienne signature du même rôle</li>
                      <li>Assurez-vous que les fichiers sont de bonne qualité</li>
                      <li>Les signatures seront utilisées sur les documents officiels</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/signatures" className="btn-secondary">
                Annuler
              </Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Création...
                  </>
                ) : (
                  'Créer la signature'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}