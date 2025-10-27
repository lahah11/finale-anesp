'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { missionService } from '@/services/missionService';
import LogisticsAssignment from '@/components/LogisticsAssignment';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentVerification from '@/components/DocumentVerification';
import { useAuth } from '@/app/providers';
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Mission {
  id: string;
  mission_reference: string;
  mission_object: string;
  departure_date: string;
  return_date: string;
  transport_mode: string;
  transport_type?: string;
  status: string;
  current_step: number | string;
  estimated_costs?: number;
  estimated_fuel?: number;
  distance_km?: number;
  created_by_name: string;
  participants: any[];
  created_at: string;
  technical_validated_by?: string;
  technical_validated_at?: string;
  technical_rejection_reason?: string;
  logistics_validated_by?: string;
  logistics_validated_at?: string;
  finance_validated_by?: string;
  finance_validated_at?: string;
  finance_rejection_reason?: string;
  dg_validated_by?: string;
  dg_validated_at?: string;
  dg_rejection_reason?: string;
  vehicle_id?: string;
  driver_id?: string;
  mission_report_url?: string;
  stamped_mission_orders_url?: string;
  documents_uploaded_at?: string;
}

interface Participant {
  id: string;
  participant_type: 'anesp' | 'external';
  employee_id?: string;
  external_name?: string;
  external_firstname?: string;
  external_nni?: string;
  external_profession?: string;
  external_ministry?: string;
  external_phone?: string;
  external_email?: string;
  role_in_mission: string;
  daily_allowance?: number;
  accommodation_allowance?: number;
  transport_allowance?: number;
  total_allowance?: number;
}

export default function MissionDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      loadMission();
    }
  }, [params.id]);

  const loadMission = async () => {
    try {
      const response = await missionService.getById(params.id, { noCache: true });
      console.log('Mission chargée:', response.mission);
      setMission(response.mission);
      
      const participantsResponse = await missionService.getParticipants(params.id);
      setParticipants(participantsResponse.participants || []);
    } catch (error) {
      console.error('Error loading mission:', error);
      toast.error('Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (action: string, rejectionReason?: string) => {
    setActionLoading(true);
    try {
      if (action === 'approve') {
        // Déterminer quelle validation appeler selon l'étape actuelle
        if (mission?.current_step === 2) {
          const res = await missionService.validateTechnical(params.id, 'approve');
          if (res?.mission) {
            setMission(res.mission);
          }
          const fresh = await missionService.getById(params.id, { noCache: true });
          if (fresh?.mission) {
            setMission(fresh.mission);
          }
          router.refresh();
        } else if ((mission?.current_step as any) === 3) {
          // Attribution des moyens - nécessite véhicule et chauffeur
          toast('Fonctionnalité d\'attribution des moyens à implémenter');
        } else if ((mission?.current_step as any) === 4 || String(mission?.current_step) === 'finance_validation') {
          const res = await missionService.validateFinance(params.id, 'approve');
          if (res?.mission) {
            setMission(res.mission);
          }
          const fresh = await missionService.getById(params.id, { noCache: true });
          if (fresh?.mission) {
            setMission(fresh.mission);
          }
          router.refresh();
        } else if ((mission?.current_step as any) === 5) {
          const res = await missionService.validateFinal(params.id, 'approve');
          if (res?.mission) {
            setMission(res.mission);
          }
          const fresh = await missionService.getById(params.id, { noCache: true });
          if (fresh?.mission) {
            setMission(fresh.mission);
          }
          router.refresh();
        }
        toast.success('Mission validée avec succès');
      } else {
        // Rejet
        if ((mission?.current_step as any) === 2) {
          const res = await missionService.validateTechnical(params.id, 'reject', rejectionReason);
          if (res?.mission) {
            setMission(res.mission);
          }
          const fresh = await missionService.getById(params.id, { noCache: true });
          if (fresh?.mission) {
            setMission(fresh.mission);
          }
          router.refresh();
        } else if ((mission?.current_step as any) === 4 || String(mission?.current_step) === 'finance_validation') {
          const res = await missionService.validateFinance(params.id, 'reject', rejectionReason);
          if (res?.mission) {
            setMission(res.mission);
          }
          const fresh = await missionService.getById(params.id, { noCache: true });
          if (fresh?.mission) {
            setMission(fresh.mission);
          }
          router.refresh();
        } else if ((mission?.current_step as any) === 5) {
          const res = await missionService.validateFinal(params.id, 'reject', rejectionReason);
          if (res?.mission) {
            setMission(res.mission);
          }
          const fresh = await missionService.getById(params.id, { noCache: true });
          if (fresh?.mission) {
            setMission(fresh.mission);
          }
          router.refresh();
        }
        toast.success('Mission rejetée');
      }
      
      await loadMission();
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error validating mission:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setActionLoading(false);
    }
  };

  const getWorkflowSteps = () => {
    const stepNum = Number(mission?.current_step ?? 0);
    return [
      { 
        id: 1, 
        name: 'Création', 
        description: 'Mission créée par l\'ingénieur',
        icon: DocumentTextIcon,
        completed: stepNum >= 1
      },
      { 
        id: 2, 
        name: 'Validation technique', 
        description: 'Directeur Technique',
        icon: ShieldCheckIcon,
        completed: stepNum >= 2,
        current: stepNum === 2
      },
      { 
        id: 3, 
        name: 'Attribution moyens', 
        description: 'Service Moyens Généraux',
        icon: TruckIcon,
        completed: stepNum >= 3,
        current: stepNum === 3
      },
      { 
        id: 4, 
        name: 'Validation financière', 
        description: 'Directeur Administratif et Financier',
        icon: CurrencyDollarIcon,
        completed: stepNum >= 4,
        current: stepNum === 4
      },
      { 
        id: 5, 
        name: 'Validation finale', 
        description: 'Directeur Général',
        icon: CheckCircleIcon,
        completed: stepNum >= 5,
        current: stepNum === 5
      },
      { 
        id: 6, 
        name: 'Upload documents', 
        description: 'Documents justificatifs par l\'ingénieur',
        icon: DocumentArrowUpIcon,
        completed: stepNum >= 6,
        current: stepNum === 6
      },
      { 
        id: 7, 
        name: 'Vérification et clôture', 
        description: 'Service Moyens Généraux',
        icon: LockClosedIcon,
        completed: stepNum >= 7,
        current: stepNum === 7
      }
    ];
  };

  const canValidate = () => {
    // Logique pour déterminer si l'utilisateur peut valider selon son rôle
    console.log('canValidate - user:', user?.role, 'mission step:', mission?.current_step);
    const stepNum = Number(mission?.current_step ?? 0);

    if (user?.role === 'admin_local' && (stepNum === 2 || String(mission?.current_step) === 'technical_validation')) {
      return true; // DT peut valider techniquement
    }
    if ((user as any)?.institution_role_id === 'role-daf' && (stepNum === 4 || String(mission?.current_step) === 'finance_validation')) {
      return true; // DAF peut valider financièrement
    }
    if ( (user as any)?.institution_role_id === 'role-directeur_general' && (stepNum === 5 || String(mission?.current_step) === 'pending_dg')) {
      return true; // DG peut valider finalement
    }
    return false;
  };

  const canUploadDocuments = () => {
    // L'ingénieur peut uploader des documents si la mission est validée (step 6)
    return mission?.current_step === 6 && user?.role === 'agent';
  };

  const canVerifyDocuments = () => {
    // Le Service Moyens Généraux peut vérifier les documents (step 7)
    return mission?.current_step === 7 && user?.role === 'msgg';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!mission) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Mission non trouvée</h3>
          <p className="mt-2 text-gray-500">La mission demandée n'existe pas.</p>
          <Link href="/missions" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Retour aux missions
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const workflowSteps = getWorkflowSteps();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/missions" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{mission.mission_reference}</h1>
            <p className="mt-2 text-gray-600">{mission.mission_object}</p>
          </div>
          {canValidate() && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleValidation('approve')}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Valider
              </button>
              <button
                onClick={() => {
                  setCurrentAction('reject');
                  setShowRejectionModal(true);
                }}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <XCircleIcon className="h-4 w-4 mr-2" />
                Rejeter
              </button>
            </div>
          )}
        </div>

        {/* Workflow de validation */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow de validation</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {workflowSteps.map((step, stepIdx) => {
                const StepIcon = step.icon;
                return (
                  <li key={step.id}>
                    <div className="relative pb-8">
                      {stepIdx !== workflowSteps.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            step.completed 
                              ? 'bg-green-500 text-white' 
                              : step.current 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-300 text-gray-500'
                          }`}>
                            <StepIcon className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className={`text-sm font-medium ${
                              step.completed || step.current ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.name}
                            </p>
                            <p className="text-sm text-gray-500">{step.description}</p>
                          </div>
                          {step.completed && (
                            <div className="text-right text-sm whitespace-nowrap text-green-600">
                              <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                              Terminé
                            </div>
                          )}
                          {step.current && (
                            <div className="text-right text-sm whitespace-nowrap text-blue-600">
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              En cours
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Informations de la mission */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Détails de la mission */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la mission</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Référence</dt>
                <dd className="text-sm text-gray-900">{mission.mission_reference}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Objet</dt>
                <dd className="text-sm text-gray-900">{mission.mission_object}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Dates</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(mission.departure_date).toLocaleDateString('fr-FR')} - {new Date(mission.return_date).toLocaleDateString('fr-FR')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Moyen de transport</dt>
                <dd className="text-sm text-gray-900 capitalize">{mission.transport_mode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Coût estimé</dt>
                <dd className="text-sm text-gray-900">{mission.estimated_costs || 'Non calculé'} MRU</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Carburant estimé</dt>
                <dd className="text-sm text-gray-900">{mission.estimated_fuel || 'Non calculé'} litres</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Statut de validation</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    mission.status === 'pending_technical' ? 'bg-yellow-100 text-yellow-800' :
                    mission.status === 'pending_logistics' ? 'bg-blue-100 text-blue-800' :
                    mission.status === 'pending_finance' ? 'bg-orange-100 text-orange-800' :
                    mission.status === 'pending_dg' ? 'bg-purple-100 text-purple-800' :
                    mission.status === 'validated' ? 'bg-green-100 text-green-800' :
                    mission.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                    mission.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {mission.status === 'pending_technical' ? 'En attente validation technique' :
                     mission.status === 'pending_logistics' ? 'En attente attribution moyens' :
                     mission.status === 'pending_finance' ? 'En attente validation financière' :
                     mission.status === 'pending_dg' ? 'En attente validation DG' :
                     mission.status === 'validated' ? 'Validée' :
                     mission.status === 'completed' ? 'En attente vérification documents' :
                     mission.status === 'closed' ? 'Clôturée' :
                     'Rejetée'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Participants */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div key={participant.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {participant.participant_type === 'anesp' 
                          ? `${participant.external_name} ${participant.external_firstname}`
                          : `${participant.external_name} ${participant.external_firstname}`
                        }
                      </p>
                      <p className="text-sm text-gray-500">{participant.role_in_mission}</p>
                      {participant.participant_type === 'external' && (
                        <p className="text-xs text-gray-400">
                          {participant.external_profession} - {participant.external_ministry}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {participant.total_allowance || 0} MRU
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Véhicules assignés */}
        {mission.vehicle_id && mission.driver_id && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Moyens logistiques assignés</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TruckIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900">Véhicule assigné</h4>
                </div>
                <p className="text-sm text-gray-600">ID: {mission.vehicle_id}</p>
                <p className="text-xs text-gray-500">Véhicule attribué par le Service Moyens Généraux</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900">Chauffeur assigné</h4>
                </div>
                <p className="text-sm text-gray-600">ID: {mission.driver_id}</p>
                <p className="text-xs text-gray-500">Chauffeur attribué par le Service Moyens Généraux</p>
              </div>
            </div>
          </div>
        )}

        {/* Documents uploadés */}
        {(mission.mission_report_url || mission.stamped_mission_orders_url) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents justificatifs</h3>
            <div className="space-y-4">
              {mission.mission_report_url && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentArrowUpIcon className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Rapport de mission</h4>
                        <p className="text-xs text-gray-500">Uploadé le {mission.documents_uploaded_at ? new Date(mission.documents_uploaded_at).toLocaleDateString('fr-FR') : ''}</p>
                      </div>
                    </div>
                    <a
                      href={mission.mission_report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      Voir le document
                    </a>
                  </div>
                </div>
              )}
              
              {mission.stamped_mission_orders_url && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentArrowUpIcon className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Ordres de mission cachetés</h4>
                        <p className="text-xs text-gray-500">Uploadé le {mission.documents_uploaded_at ? new Date(mission.documents_uploaded_at).toLocaleDateString('fr-FR') : ''}</p>
                      </div>
                    </div>
                    <a
                      href={mission.stamped_mission_orders_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-md hover:bg-green-200"
                    >
                      Voir le document
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attribution logistique pour Service Moyens Généraux */}
        {user?.role === 'msgg' && mission.status === 'pending_logistics' && (
          <LogisticsAssignment
            missionId={mission.id}
            transportMode={mission.transport_mode}
            transportType={mission.transport_type}
            onAssignmentComplete={async (result) => {
              toast.success('Moyens logistiques attribués avec succès');
              // Mise à jour immédiate de l'UI pour éviter de rester à l'étape 3
              if (result?.mission) {
                setMission((prev) => ({
                  ...(prev as Mission),
                  ...result.mission,
                  status: result.mission.status || 'pending_finance',
                  current_step: (result.mission as any).current_step ?? 4
                }));
              } else {
                setMission((prev) => (
                  prev
                    ? { ...prev, status: 'pending_finance', current_step: 4 }
                    : prev
                ));
              }
              const fresh = await missionService.getById(mission.id, { noCache: true });
              if (fresh?.mission) {
                const next = fresh.mission;
                setMission((prev) => {
                  const prevStep = Number((prev as Mission)?.current_step ?? 0);
                  const nextStep = Number((next as any)?.current_step ?? prevStep);
                  const enforcedStep = nextStep < 4 ? 4 : nextStep;
                  const enforcedStatus = next.status === 'pending_logistics' ? 'pending_finance' : next.status;
                  return { ...(prev as Mission), ...next, status: enforcedStatus, current_step: enforcedStep } as Mission;
                });
              }
              router.refresh();
            }}
          />
        )}

        {/* Upload des documents pour l'ingénieur */}
        {canUploadDocuments() && (
          <DocumentUpload
            missionId={mission.id}
            onUploadComplete={() => {
              toast.success('Documents uploadés avec succès');
              loadMission();
            }}
          />
        )}

        {/* Vérification des documents pour le Service Moyens Généraux */}
        {canVerifyDocuments() && (
          <DocumentVerification
            missionId={mission.id}
            missionReportUrl={mission.mission_report_url}
            stampedOrdersUrl={mission.stamped_mission_orders_url}
            onVerificationComplete={() => {
              toast.success('Mission vérifiée et clôturée avec succès');
              loadMission();
            }}
          />
        )}

        {/* Modal de rejet */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Motif du rejet</h3>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Expliquez les raisons du rejet de cette mission..."
                />
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setShowRejectionModal(false);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleValidation('reject', rejectionReason)}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}