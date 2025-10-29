'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { missionService } from '@/services/missionService';
import { PlusIcon, EyeIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useTranslation } from '@/app/providers';

interface Mission {
  id: string;
  mission_reference: string;
  mission_object: string;
  departure_date: string;
  return_date: string;
  status: string;
  current_step: number;
  created_by_name: string;
  participant_count: number;
  estimated_costs?: number;
  created_at: string;
  arrival_city_name?: string;
}

function MissionsPageContent() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [filters, setFilters] = useState({
    agent: '',
    destination: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const { t } = useTranslation();

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const response = await missionService.getAll();
      setMissions(response || []);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error(t('missions.toast.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      draft: { label: t('missions.status.draft'), color: 'gray', icon: ClockIcon },
      pending_technical: { label: t('missions.status.pending_technical'), color: 'yellow', icon: ClockIcon },
      pending_logistics: { label: t('missions.status.pending_logistics'), color: 'blue', icon: ClockIcon },
      pending_finance: { label: t('missions.status.pending_finance'), color: 'purple', icon: ClockIcon },
      pending_dg: { label: t('missions.status.pending_dg'), color: 'orange', icon: ClockIcon },
      validated: { label: t('missions.status.validated'), color: 'green', icon: CheckCircleIcon },
      rejected: { label: t('missions.status.rejected'), color: 'red', icon: XCircleIcon },
      archived: { label: t('missions.status.archived'), color: 'gray', icon: CheckCircleIcon },
      completed: { label: t('missions.status.completed'), color: 'gray', icon: ClockIcon },
      closed: { label: t('missions.status.closed'), color: 'gray', icon: CheckCircleIcon }
    } as const;

    return statusMap[status as keyof typeof statusMap] || statusMap.draft;
  };

  const getStepLabel = (currentStep: number) => {
    const steps = [
      t('mission.steps.creation'),
      t('missions.status.pending_technical'),
      t('missions.status.pending_logistics'),
      t('missions.status.pending_finance'),
      t('missions.status.pending_dg'),
      t('missions.status.validated')
    ];
    return steps[currentStep - 1] || '';
  };

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      if (filter === 'my' && mission.status !== 'draft') return false;
      if (filter === 'pending' && !mission.status.startsWith('pending')) return false;
      if (filter === 'validated' && mission.status !== 'validated') return false;
      if (filter === 'rejected' && mission.status !== 'rejected') return false;

      if (filters.agent && !mission.created_by_name?.toLowerCase().includes(filters.agent.toLowerCase())) {
        return false;
      }

      if (filters.destination) {
        const destination = `${mission.arrival_city_name || ''} ${mission.mission_object}`.toLowerCase();
        if (!destination.includes(filters.destination.toLowerCase())) {
          return false;
        }
      }

      if (filters.status && mission.status !== filters.status) {
        return false;
      }

      if (filters.startDate && new Date(mission.departure_date) < new Date(filters.startDate)) {
        return false;
      }

      if (filters.endDate && new Date(mission.return_date) > new Date(filters.endDate)) {
        return false;
      }

      return true;
    });
  }, [missions, filter, filters]);

  const resetFilters = () => {
    setFilters({ agent: '', destination: '', status: '', startDate: '', endDate: '' });
  };

  const badgeColorClass = {
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  } as const;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('missions.list.title')}</h1>
            <p className="mt-2 text-gray-600">{t('missions.list.subtitle')}</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/missions/pending"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              {t('missions.pendingLink')}
            </Link>
            <Link
              href="/missions/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('missions.create')}
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">{t('missions.filters.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              value={filters.agent}
              onChange={(e) => setFilters((prev) => ({ ...prev, agent: e.target.value }))}
              placeholder={t('missions.filters.agent')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={filters.destination}
              onChange={(e) => setFilters((prev) => ({ ...prev, destination: e.target.value }))}
              placeholder={t('missions.filters.destination')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('missions.filters.status')}</option>
              <option value="pending_technical">{t('missions.status.pending_technical')}</option>
              <option value="pending_logistics">{t('missions.status.pending_logistics')}</option>
              <option value="pending_finance">{t('missions.status.pending_finance')}</option>
              <option value="pending_dg">{t('missions.status.pending_dg')}</option>
              <option value="validated">{t('missions.status.validated')}</option>
              <option value="rejected">{t('missions.status.rejected')}</option>
              <option value="archived">{t('missions.status.archived')}</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('missions.tabs.all')} ({missions.length})
              </button>
              <button
                onClick={() => setFilter('my')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'my'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('missions.tabs.drafts')} ({missions.filter(m => m.status === 'draft').length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'pending'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('missions.tabs.pending')} ({missions.filter(m => m.status.startsWith('pending')).length})
              </button>
              <button
                onClick={() => setFilter('validated')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'validated'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('missions.tabs.validated')} ({missions.filter(m => m.status === 'validated').length})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'rejected'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('missions.tabs.rejected')} ({missions.filter(m => m.status === 'rejected').length})
              </button>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {t('missions.filters.reset')}
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <ClockIcon className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('missions.empty')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' && !filters.agent && !filters.destination && !filters.status && !filters.startDate && !filters.endDate
                  ? t('missions.empty.all')
                  : t('missions.empty.filter')}
              </p>
              <div className="mt-6">
                <Link
                  href="/missions/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('missions.create')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="align-middle inline-block min-w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('missions.table.reference')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('missions.table.object')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('missions.table.period')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('missions.table.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('missions.table.participants')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('missions.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMissions.map((mission) => {
                      const statusInfo = getStatusInfo(mission.status);
                      return (
                        <tr key={mission.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mission.mission_reference}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mission.mission_object}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mission.departure_date} → {mission.return_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColorClass[statusInfo.color as keyof typeof badgeColorClass]}`}>
                              <statusInfo.icon className="h-4 w-4 mr-1" />
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mission.participant_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-3">
                              <Link
                                href={`/missions/${mission.id}`}
                                className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                              >
                                <EyeIcon className="h-4 w-4 mr-1" />
                                {t('missions.actions.view')}
                              </Link>
                              <Link
                                href={`/missions/${mission.id}?tab=history`}
                                className="text-green-600 hover:text-green-800 inline-flex items-center"
                              >
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {t('missions.actions.history')}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MissionsPage() {
  return (
    <ProtectedRoute>
      <MissionsPageContent />
    </ProtectedRoute>
  );
}
