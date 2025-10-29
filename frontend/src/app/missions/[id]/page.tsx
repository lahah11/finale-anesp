'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
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
  LockClosedIcon,
  PaperAirplaneIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import LogisticsAssignment from '@/components/LogisticsAssignment';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentVerification from '@/components/DocumentVerification';
import { MissionHistoryTimeline } from '@/components/MissionHistoryTimeline';
import { missionService } from '@/services/missionService';
import { useAuth, useTranslation } from '@/app/providers';

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
  logistics_validated_by?: string;
  logistics_validated_at?: string;
  finance_validated_by?: string;
  finance_validated_at?: string;
  dg_validated_by?: string;
  dg_validated_at?: string;
  vehicle_id?: string;
  driver_id?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_brand?: string;
  driver_name?: string;
  driver_phone?: string;
  air_ticket_pdf?: string;
  airline_name?: string;
  flight_number?: string;
  ticket_reference?: string;
  travel_agency?: string;
  accommodation_details?: string;
  local_transport_details?: string;
  logistics_notes?: string;
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
  total_allowance?: number;
}

interface TimelineResponse {
  history: Array<{
    step?: string;
    actor?: string;
    status?: string;
    timestamp?: string;
    notes?: string | null;
  }>;
  audit: Array<{
    id: string;
    action: string;
    details?: string | null;
    user_id?: string | null;
    created_at?: string;
  }>;
}

export default function MissionDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [mission, setMission] = useState<Mission | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentAction, setCurrentAction] = useState<'approve' | 'reject' | ''>('');
  const [timeline, setTimeline] = useState<TimelineResponse['history']>([]);
  const [auditLogs, setAuditLogs] = useState<TimelineResponse['audit']>([]);

  useEffect(() => {
    if (params.id) {
      loadMission();
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadMission = async () => {
    try {
      setLoading(true);
      const response = await missionService.getById(params.id, { noCache: true });
      const missionData = response.mission as Mission;
      setMission(missionData);

      const participantsResponse = await missionService.getParticipants(params.id);
      setParticipants(participantsResponse.participants || []);
    } catch (error) {
      console.error('Error loading mission:', error);
      toast.error(t('mission.detail.toast.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await missionService.getMissionHistory(params.id);
      setTimeline(result.history || []);
      setAuditLogs(result.audit || []);
    } catch (error) {
      console.error('Error loading mission history:', error);
    }
  };

  const statusInfo = useMemo(() => ({
    pending_technical: { label: t('mission.detail.statusBadge.pending_technical'), className: 'bg-yellow-100 text-yellow-800' },
    pending_logistics: { label: t('mission.detail.statusBadge.pending_logistics'), className: 'bg-blue-100 text-blue-800' },
    pending_finance: { label: t('mission.detail.statusBadge.pending_finance'), className: 'bg-orange-100 text-orange-800' },
    pending_dg: { label: t('mission.detail.statusBadge.pending_dg'), className: 'bg-purple-100 text-purple-800' },
    validated: { label: t('mission.detail.statusBadge.validated'), className: 'bg-green-100 text-green-800' },
    completed: { label: t('mission.detail.statusBadge.completed'), className: 'bg-indigo-100 text-indigo-800' },
    closed: { label: t('mission.detail.statusBadge.closed'), className: 'bg-gray-200 text-gray-800' },
    archived: { label: t('mission.detail.statusBadge.archived'), className: 'bg-gray-200 text-gray-800' },
    rejected: { label: t('mission.detail.statusBadge.rejected'), className: 'bg-red-100 text-red-800' },
    draft: { label: t('missions.status.draft'), className: 'bg-gray-100 text-gray-800' }
  }), [t]);

  const getWorkflowSteps = () => {
    const stepNum = Number(mission?.current_step ?? 0);
    return [
      {
        id: 1,
        name: t('mission.steps.creation'),
        description: t('mission.detail.workflow.desc.creation'),
        icon: DocumentTextIcon,
        completed: stepNum >= 1
      },
      {
        id: 2,
        name: t('mission.steps.technical'),
        description: t('mission.detail.workflow.desc.technical'),
        icon: ShieldCheckIcon,
        completed: stepNum >= 2,
        current: stepNum === 2
      },
      {
        id: 3,
        name: t('mission.steps.logistics'),
        description: t('mission.detail.workflow.desc.logistics'),
        icon: TruckIcon,
        completed: stepNum >= 3,
        current: stepNum === 3
      },
      {
        id: 4,
        name: t('mission.steps.finance'),
        description: t('mission.detail.workflow.desc.finance'),
        icon: CurrencyDollarIcon,
        completed: stepNum >= 4,
        current: stepNum === 4
      },
      {
        id: 5,
        name: t('mission.steps.final'),
        description: t('mission.detail.workflow.desc.final'),
        icon: CheckCircleIcon,
        completed: stepNum >= 5,
        current: stepNum === 5
      },
      {
        id: 6,
        name: t('mission.steps.documents'),
        description: t('mission.detail.workflow.desc.documents'),
        icon: DocumentArrowUpIcon,
        completed: stepNum >= 6,
        current: stepNum === 6
      },
      {
        id: 7,
        name: t('mission.steps.closure'),
        description: t('mission.detail.workflow.desc.closure'),
        icon: LockClosedIcon,
        completed: stepNum >= 7,
        current: stepNum === 7
      }
    ];
  };

  const canValidate = () => {
    const stepNum = Number(mission?.current_step ?? 0);

    if (user?.role === 'admin_local' && (stepNum === 2 || String(mission?.current_step) === 'technical_validation')) {
      return true;
    }
    if ((user as any)?.institution_role_id === 'role-daf' && (stepNum === 4 || String(mission?.current_step) === 'finance_validation')) {
      return true;
    }
    if ((user as any)?.institution_role_id === 'role-directeur_general' && (stepNum === 5 || String(mission?.current_step) === 'pending_dg')) {
      return true;
    }
    return false;
  };

  const canUploadDocuments = () => mission?.current_step === 6 && user?.role === 'agent';
  const canVerifyDocuments = () => mission?.current_step === 7 && user?.role === 'msgg';

  const handleValidation = async (action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(true);
    try {
      if (mission?.current_step === 2) {
        await missionService.validateTechnical(params.id, action, reason);
      } else if (mission?.current_step === 4 || String(mission?.current_step) === 'finance_validation') {
        await missionService.validateFinance(params.id, action, reason);
      } else if (mission?.current_step === 5) {
        await missionService.validateFinal(params.id, action, reason);
      }

      toast.success(action === 'approve' ? t('mission.detail.validation.success.approve') : t('mission.detail.validation.success.reject'));
      await loadMission();
      await loadHistory();
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error validating mission:', error);
      toast.error(t('mission.detail.validation.error'));
    } finally {
      setActionLoading(false);
    }
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
          <h3 className="text-lg font-medium text-gray-900">{t('mission.detail.notFound.title')}</h3>
          <p className="mt-2 text-gray-500">{t('mission.detail.notFound.description')}</p>
          <Link href="/missions" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('mission.detail.notFound.back')}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const workflowSteps = getWorkflowSteps();
  const badge = statusInfo[mission.status as keyof typeof statusInfo] || statusInfo.draft;

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
                {t('mission.detail.validation.approve')}
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
                {t('mission.detail.validation.reject')}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('mission.detail.workflow.title')}</h2>
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
                              {t('mission.detail.workflow.completed')}
                            </div>
                          )}
                          {step.current && (
                            <div className="text-right text-sm whitespace-nowrap text-blue-600">
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              {t('mission.detail.workflow.current')}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('mission.detail.details.title')}</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.reference')}</dt>
                <dd className="text-sm text-gray-900">{mission.mission_reference}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.object')}</dt>
                <dd className="text-sm text-gray-900">{mission.mission_object}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.dates')}</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(mission.departure_date).toLocaleDateString()} - {new Date(mission.return_date).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.transport')}</dt>
                <dd className="text-sm text-gray-900 capitalize">{mission.transport_mode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.estimatedCosts')}</dt>
                <dd className="text-sm text-gray-900">{mission.estimated_costs || 0} MRU</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.estimatedFuel')}</dt>
                <dd className="text-sm text-gray-900">{mission.estimated_fuel || 0} L</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('mission.detail.details.status')}</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('mission.detail.participants.title')}</h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {participant.external_name} {participant.external_firstname}
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

        {(mission.vehicle_id || mission.air_ticket_pdf) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('mission.detail.logistics.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mission.vehicle_id && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <TruckIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">{t('mission.detail.logistics.vehicle')}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{mission.vehicle_brand} {mission.vehicle_model}</p>
                  <p className="text-xs text-gray-500">{mission.vehicle_plate}</p>
                </div>
              )}

              {mission.driver_name && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">{t('mission.detail.logistics.driver')}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{mission.driver_name}</p>
                  {mission.driver_phone && (
                    <p className="text-xs text-gray-500">{t('mission.detail.logistics.driverPhone')}: {mission.driver_phone}</p>
                  )}
                </div>
              )}

              {mission.transport_mode === 'plane' && (
                <div className="border border-gray-200 rounded-lg p-4 md:col-span-2">
                  <div className="flex items-center mb-2">
                    <PaperAirplaneIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">{t('mission.detail.logistics.flightInfo')}</h4>
                  </div>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                      <dt className="font-medium">{t('mission.detail.logistics.airline')}</dt>
                      <dd>{mission.airline_name || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">{t('mission.detail.logistics.flightNumber')}</dt>
                      <dd>{mission.flight_number || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">{t('mission.detail.logistics.ticketReference')}</dt>
                      <dd>{mission.ticket_reference || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">{t('mission.detail.logistics.travelAgency')}</dt>
                      <dd>{mission.travel_agency || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">{t('mission.detail.logistics.accommodation')}</dt>
                      <dd>{mission.accommodation_details || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">{t('mission.detail.logistics.localTransport')}</dt>
                      <dd>{mission.local_transport_details || '-'}</dd>
                    </div>
                  </dl>
                  {mission.air_ticket_pdf && (
                    <a
                      href={mission.air_ticket_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-3 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                      {t('mission.detail.logistics.ticket.download')}
                    </a>
                  )}
                </div>
              )}

              {mission.logistics_notes && (
                <div className="border border-gray-200 rounded-lg p-4 md:col-span-2">
                  <div className="flex items-center mb-2">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">{t('mission.detail.logistics.notes')}</h4>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{mission.logistics_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(mission.mission_report_url || mission.stamped_mission_orders_url) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('mission.detail.documents.sectionTitle')}</h3>
            <div className="space-y-3">
              {mission.mission_report_url && (
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{t('mission.detail.documents.missionReport')}</h4>
                    <p className="text-xs text-gray-500">{t('mission.detail.documents.uploadedAt')} {mission.documents_uploaded_at ? new Date(mission.documents_uploaded_at).toLocaleDateString() : ''}</p>
                  </div>
                  <a
                    href={mission.mission_report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    {t('mission.detail.documents.view')}
                  </a>
                </div>
              )}

              {mission.stamped_mission_orders_url && (
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{t('mission.detail.documents.stampedOrders')}</h4>
                    <p className="text-xs text-gray-500">{t('mission.detail.documents.uploadedAt')} {mission.documents_uploaded_at ? new Date(mission.documents_uploaded_at).toLocaleDateString() : ''}</p>
                  </div>
                  <a
                    href={mission.stamped_mission_orders_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-md hover:bg-green-200"
                  >
                    {t('mission.detail.documents.view')}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {user?.role === 'msgg' && mission.status === 'pending_logistics' && (
          <LogisticsAssignment
            missionId={mission.id}
            transportMode={mission.transport_mode}
            transportType={mission.transport_type}
            onAssignmentComplete={async () => {
              toast.success(t('mission.detail.logistics.success'));
              await loadMission();
              await loadHistory();
            }}
          />
        )}

        {canUploadDocuments() && (
          <DocumentUpload
            missionId={mission.id}
            onUploadComplete={async () => {
              toast.success(t('mission.detail.documents.uploadSuccess'));
              await loadMission();
              await loadHistory();
            }}
          />
        )}

        {canVerifyDocuments() && (
          <DocumentVerification
            missionId={mission.id}
            missionReportUrl={mission.mission_report_url}
            stampedOrdersUrl={mission.stamped_mission_orders_url}
            onVerificationComplete={async () => {
              toast.success(t('mission.detail.documents.verified'));
              await loadMission();
              await loadHistory();
            }}
          />
        )}

        <MissionHistoryTimeline history={timeline} audit={auditLogs} />

        {showRejectionModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('mission.detail.rejection.title')}</h3>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('mission.detail.rejection.placeholder')}
                />
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setShowRejectionModal(false);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {t('mission.detail.rejection.cancel')}
                  </button>
                  <button
                    onClick={() => handleValidation(currentAction || 'reject', rejectionReason)}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {t('mission.detail.rejection.submit')}
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
