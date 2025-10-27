'use client';

import { useState } from 'react';
import { DocumentArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { missionService } from '@/services/missionService';
import { useTranslation } from '@/app/providers';

interface DocumentUploadProps {
  missionId: string;
  onUploadComplete: () => void;
}

export default function DocumentUpload({ missionId, onUploadComplete }: DocumentUploadProps) {
  const [missionReportFile, setMissionReportFile] = useState<File | null>(null);
  const [stampedOrdersFile, setStampedOrdersFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!missionReportFile || !stampedOrdersFile) {
      toast.error(t('documents.upload.toast.missingFiles'));
      return;
    }

    if (missionReportFile.type !== 'application/pdf' || stampedOrdersFile.type !== 'application/pdf') {
      toast.error(t('documents.upload.toast.invalidType'));
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (missionReportFile.size > maxSize || stampedOrdersFile.size > maxSize) {
      toast.error(t('documents.upload.toast.size'));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('mission_report', missionReportFile);
      formData.append('stamped_mission_orders', stampedOrdersFile);

      const result = await missionService.uploadDocuments(missionId, formData);
      toast.success(result.message || t('documents.upload.toast.success'));
      onUploadComplete();
    } catch (error) {
      console.error('Upload documents error:', error);
      toast.error(error instanceof Error ? error.message : t('documents.upload.toast.error'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <DocumentArrowUpIcon className="h-8 w-8 text-blue-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('documents.upload.title')}</h3>
          <p className="text-sm text-gray-600">
            {t('documents.upload.subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="missionReportFile" className="block text-sm font-medium text-gray-700 mb-2">
            {t('documents.upload.label.report')}
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="missionReportFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>{t('documents.upload.select')}</span>
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
                <p className="pl-1">{t('documents.upload.dragDrop')}</p>
              </div>
              <p className="text-xs text-gray-500">{t('documents.upload.hint')}</p>
              {missionReportFile && (
                <p className="text-sm text-green-600 font-medium">
                  {t('documents.upload.fileSelected')} {missionReportFile.name} ({(missionReportFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="stampedOrdersFile" className="block text-sm font-medium text-gray-700 mb-2">
            {t('documents.upload.label.stamped')}
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="stampedOrdersFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>{t('documents.upload.select')}</span>
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
                <p className="pl-1">{t('documents.upload.dragDrop')}</p>
              </div>
              <p className="text-xs text-gray-500">{t('documents.upload.hint')}</p>
              {stampedOrdersFile && (
                <p className="text-sm text-green-600 font-medium">
                  {t('documents.upload.fileSelected')} {stampedOrdersFile.name} ({(stampedOrdersFile.size / 1024 / 1024).toFixed(2)} MB)
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
            {t('documents.upload.button.cancel')}
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('documents.upload.button.processing')}
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                {t('documents.upload.button.submit')}
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
            <h4 className="text-sm font-medium text-blue-800">{t('documents.upload.instructionsTitle')}</h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>{t('documents.upload.instructions.1')}</li>
                <li>{t('documents.upload.instructions.2')}</li>
                <li>{t('documents.upload.instructions.3')}</li>
                <li>{t('documents.upload.instructions.4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
