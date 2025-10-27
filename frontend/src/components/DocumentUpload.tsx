'use client';

import { useState } from 'react';
import { DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  missionId: string;
  onUploadComplete: () => void;
}

export default function DocumentUpload({ missionId, onUploadComplete }: DocumentUploadProps) {
  const [missionReportFile, setMissionReportFile] = useState<File | null>(null);
  const [stampedOrdersFile, setStampedOrdersFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!missionReportFile || !stampedOrdersFile) {
      toast.error('Veuillez sélectionner les deux fichiers');
      return;
    }

    // Vérifier le type de fichier (PDF uniquement)
    if (missionReportFile.type !== 'application/pdf' || stampedOrdersFile.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }

    // Vérifier la taille des fichiers (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (missionReportFile.size > maxSize || stampedOrdersFile.size > maxSize) {
      toast.error('La taille des fichiers ne doit pas dépasser 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('mission_report', missionReportFile);
      formData.append('stamped_mission_orders', stampedOrdersFile);

      const response = await fetch(`http://localhost:5000/api/missions/${missionId}/upload-documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload des documents');
      }

      const result = await response.json();
      toast.success(result.message);
      onUploadComplete();
    } catch (error) {
      console.error('Upload documents error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload des documents');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <DocumentArrowUpIcon className="h-8 w-8 text-blue-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upload des documents justificatifs</h3>
          <p className="text-sm text-gray-600">
            Veuillez uploader le rapport de mission et les ordres de mission cachetés
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="missionReportFile" className="block text-sm font-medium text-gray-700 mb-2">
            Rapport de mission (PDF) *
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="missionReportFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Choisir un fichier</span>
                  <input
                    id="missionReportFile"
                    name="missionReportFile"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setMissionReportFile(e.target.files?.[0] || null)}
                    className="sr-only"
                    required
                  />
                </label>
                <p className="pl-1">ou glisser-déposer</p>
              </div>
              <p className="text-xs text-gray-500">PDF jusqu'à 10MB</p>
              {missionReportFile && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {missionReportFile.name} ({(missionReportFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="stampedOrdersFile" className="block text-sm font-medium text-gray-700 mb-2">
            Ordres de mission cachetés (PDF) *
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="stampedOrdersFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Choisir un fichier</span>
                  <input
                    id="stampedOrdersFile"
                    name="stampedOrdersFile"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setStampedOrdersFile(e.target.files?.[0] || null)}
                    className="sr-only"
                    required
                  />
                </label>
                <p className="pl-1">ou glisser-déposer</p>
              </div>
              <p className="text-xs text-gray-500">PDF jusqu'à 10MB</p>
              {stampedOrdersFile && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {stampedOrdersFile.name} ({(stampedOrdersFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => {
              setMissionReportFile(null);
              setStampedOrdersFile(null);
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Upload en cours...
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Uploader les documents
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Instructions</h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Assurez-vous que les documents sont clairement lisibles</li>
                <li>Les ordres de mission doivent être cachetés et signés</li>
                <li>Le rapport de mission doit être complet et détaillé</li>
                <li>Une fois uploadés, les documents seront vérifiés par le Service Moyens Généraux</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
