'use client';

import { useMemo } from 'react';
import { ClockIcon, CheckCircleIcon, XCircleIcon, UserCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/app/providers';

type HistoryEntry = {
  step?: string;
  actor?: string;
  status?: string;
  timestamp?: string;
  notes?: string | null;
};

type AuditEntry = {
  id: string;
  action: string;
  details?: string | null;
  user_id?: string | null;
  created_at?: string;
};

interface MissionHistoryTimelineProps {
  history: HistoryEntry[];
  audit: AuditEntry[];
}

const statusIconMap: Record<string, typeof CheckCircleIcon> = {
  approved: CheckCircleIcon,
  completed: CheckCircleIcon,
  rejected: XCircleIcon,
  pending: ClockIcon
};

export function MissionHistoryTimeline({ history, audit }: MissionHistoryTimelineProps) {
  const { t } = useTranslation();

  const timeline = useMemo(() => history ?? [], [history]);
  const auditLogs = useMemo(() => audit ?? [], [audit]);

  const stepLabel = (step?: string) => {
    const key = step ? step.toLowerCase() : '';
    const map: Record<string, string> = {
      creation: t('mission.steps.creation'),
      technical: t('mission.steps.technical'),
      logistics: t('mission.steps.logistics'),
      finance: t('mission.steps.finance'),
      final: t('mission.steps.final'),
      documents: t('mission.steps.documents'),
      closure: t('mission.steps.closure')
    };
    return map[key] || step || '-';
  };

  const statusLabel = (status?: string) => {
    const key = (status || 'pending').toLowerCase();
    const map: Record<string, string> = {
      approved: t('mission.detail.history.status.approved'),
      completed: t('mission.detail.history.status.completed'),
      rejected: t('mission.detail.history.status.rejected'),
      pending: t('mission.detail.history.status.pending')
    };
    return map[key] || map.pending;
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">{t('mission.detail.history.title')}</h3>
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500">{t('mission.detail.history.empty')}</p>
        ) : (
          <ul className="space-y-4">
            {timeline.map((entry, index) => {
              const Icon = statusIconMap[(entry.status || '').toLowerCase()] || ClockIcon;
              return (
                <li key={`${entry.step}-${entry.timestamp}-${index}`} className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Icon className={`h-5 w-5 ${entry.status === 'rejected' ? 'text-red-500' : 'text-green-500'}`} />
                  </div>
                  <div className="ml-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{stepLabel(entry.step)}</span>
                      <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      <UserCircleIcon className="h-4 w-4" />
                      <span>{entry.actor || '-'}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {statusLabel(entry.status)}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-500 mt-1">{t('mission.detail.history.notes')}: {entry.notes}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <DocumentTextIcon className="h-5 w-5 text-indigo-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">{t('mission.detail.history.auditTitle')}</h3>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">{t('mission.detail.history.auditEmpty')}</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{log.action}</span>
                  <span>{formatDate(log.created_at)}</span>
                </div>
                {log.details && (
                  <p className="mt-2 text-xs text-gray-500">{log.details}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
