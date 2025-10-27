'use client';

import { useState } from 'react';
import { LockClosedIcon, CheckCircleIcon, XCircleIcon, EyeIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DocumentVerificationProps {
  missionId: string;
  missionReportUrl?: string;
  stampedOrdersUrl?: string;
  onVerificationComplete: () => void;
}

export default function DocumentVerification({ 
  missionId, 
  missionReportUrl, 
  stampedOrdersUrl, 
  onVerificationComplete 
}: DocumentVerificationProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (action === 'reject' && !verificationNotes.trim()) {
      toast.error('Veuillez préciser le motif du rejet');
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/missions/${missionId}/verify-and-close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          verification_notes: verificationNotes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la vérification');
      }

      const result = await response.json();
      toast.success(result.message);
      onVerificationComplete();
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la vérification');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <LockClosedIcon className="h-8 w-8 text-purple-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vérification et clôture de mission</h3>
          <p className="text-sm text-gray-600">
            Vérifiez les documents uploadés et clôturez la mission
          </p>
        </div>
      </div>

      {/* Documents à vérifier */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Documents à vérifier</h4>
        <div className="space-y-3">
          {missionReportUrl && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">Rapport de mission</span>
              </div>
              <a
                href={missionReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Voir
              </a>
            </div>
          )}
          
          {stampedOrdersUrl && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">Ordres de mission cachetés</span>
              </div>
              <a
                href={stampedOrdersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Voir
              </a>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Action selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Décision de vérification
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="action"
                value="approve"
                checked={action === 'approve'}
                onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <div className="ml-3 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Approuver et clôturer la mission</span>
              </div>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="action"
                value="reject"
                checked={action === 'reject'}
                onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <div className="ml-3 flex items-center">
                <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Rejeter les documents</span>
              </div>
            </label>
          </div>
        </div>

        {/* Notes de vérification */}
        {action === 'reject' && (
          <div>
            <label htmlFor="verificationNotes" className="block text-sm font-medium text-gray-700 mb-2">
              Motif du rejet *
            </label>
            <textarea
              id="verificationNotes"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              placeholder="Précisez les raisons du rejet des documents..."
              required={action === 'reject'}
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => {
              setAction('approve');
              setVerificationNotes('');
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
              action === 'approve' 
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement en cours...
              </>
            ) : (
              <>
                {action === 'approve' ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Clôturer la mission
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Rejeter les documents
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-yellow-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <LockClosedIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Important</h4>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Vérifiez que tous les documents sont complets et conformes</li>
                <li>Une fois clôturée, la mission ne pourra plus être modifiée</li>
                <li>En cas de rejet, l'ingénieur devra corriger et re-uploader les documents</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
