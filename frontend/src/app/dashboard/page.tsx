'use client';

import { useAuth } from '@/app/providers';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { missionService } from '@/services/missionService';
import { userService } from '@/services/userService';
import { employeeService } from '@/services/employeeService';
import { institutionService } from '@/services/institutionService';
import {
  DocumentTextIcon,
  UsersIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface DashboardStats {
  totalMissions: number;
  pendingMissions: number;
  validatedMissions: number;
  totalUsers: number;
  totalEmployees: number;
  recentMissions: any[];
  allMissions: any[];
}

interface MonthlyData {
  month: string;
  missions: number;
  validated: number;
  pending: number;
}

interface YearlyData {
  year: string;
  missions: number;
}

interface StatusData {
  name: string;
  value: number;
  status: string;
}

interface TrendData {
  month: string;
  missions: number;
  cumulative: number;
}

interface ChartData {
  monthlyData: MonthlyData[];
  yearlyData: YearlyData[];
  statusData: StatusData[];
  trendData: TrendData[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0,
    pendingMissions: 0,
    validatedMissions: 0,
    totalUsers: 0,
    totalEmployees: 0,
    recentMissions: [],
    allMissions: []
  });
  const [chartData, setChartData] = useState<ChartData>({
    monthlyData: [],
    yearlyData: [],
    statusData: [],
    trendData: []
  });
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');

  const processChartData = (missions: any[]) => {
    // Monthly data for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i).toLocaleDateString('fr-FR', { month: 'short' }),
      missions: 0,
      validated: 0,
      pending: 0
    }));

    // Yearly data
    const yearlyStats: { [key: string]: number } = {};
    
    // Status breakdown
    const statusCounts = {
      draft: 0,
      pending_dg: 0,
      pending_msgg: 0,
      validated: 0,
      cancelled: 0
    };

    // Last 12 months trend
    const last12Months: TrendData[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last12Months.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        missions: 0,
        cumulative: 0
      });
    }

    missions.forEach((mission) => {
      const createdDate = new Date(mission.created_at);
      const year = createdDate.getFullYear();
      const month = createdDate.getMonth();

      // Monthly data for current year
      if (year === currentYear) {
        monthlyStats[month].missions++;
        if (mission.status === 'validated') {
          monthlyStats[month].validated++;
        } else if (mission.status === 'pending_dg' || mission.status === 'pending_msgg') {
          monthlyStats[month].pending++;
        }
      }

      // Yearly data
      yearlyStats[year] = (yearlyStats[year] || 0) + 1;

      // Status breakdown
      if (statusCounts.hasOwnProperty(mission.status)) {
        statusCounts[mission.status as keyof typeof statusCounts]++;
      }

      // Last 12 months trend
      const monthDiff = (today.getFullYear() - year) * 12 + (today.getMonth() - month);
      if (monthDiff >= 0 && monthDiff < 12) {
        last12Months[11 - monthDiff].missions++;
      }
    });

    // Calculate cumulative for trend
    let cumulative = 0;
    last12Months.forEach((item) => {
      cumulative += item.missions;
      item.cumulative = cumulative;
    });

    const processedYearlyData = Object.entries(yearlyStats)
      .map(([year, count]) => ({ year, missions: count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    const processedStatusData = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: getStatusText(status),
        value: count,
        status
      }));

    return {
      monthlyData: monthlyStats,
      yearlyData: processedYearlyData,
      statusData: processedStatusData,
      trendData: last12Months
    };
  };

  // Check if user can see charts
  const canSeeCharts = () => {
    return ['super_admin', 'admin_local', 'dg', 'msgg'].includes(user?.role || '');
  };

  // Check if user is super admin
  const isSuperAdmin = () => {
    return user?.role === 'super_admin';
  };

  useEffect(() => {
    const fetchInstitutions = async () => {
      if (isSuperAdmin()) {
        try {
          const response = await institutionService.getAll();
          setInstitutions(response.institutions || []);
        } catch (error) {
          console.error('Failed to fetch institutions:', error);
        }
      }
    };

    if (user) {
      fetchInstitutions();
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const institutionId = isSuperAdmin() && selectedInstitution ? selectedInstitution : undefined;
        
        // Charger seulement les données autorisées selon le rôle
        const promises = [];
        
        // Missions - autorisé pour tous les rôles SAUF hr
        if (user?.role === 'super_admin' || user?.role === 'admin_local' || user?.role === 'dg' || user?.role === 'msgg') {
          promises.push(
            institutionId 
              ? missionService.getByInstitution(institutionId)
              : missionService.getByInstitution()
          );
        } else {
          promises.push(Promise.resolve([]));
        }
        
        // Utilisateurs - seulement pour super_admin et admin_local
        if (user?.role === 'super_admin' || user?.role === 'admin_local') {
          promises.push(
            institutionId 
              ? userService.getByInstitution(institutionId) 
              : userService.getByInstitution()
          );
        } else {
          promises.push(Promise.resolve({ users: [] }));
        }
        
        // Employés - seulement pour super_admin, admin_local et hr
        if (user?.role === 'super_admin' || user?.role === 'admin_local' || user?.role === 'hr') {
          promises.push(
            institutionId 
              ? employeeService.getByInstitution(institutionId)
              : employeeService.getByInstitution()
          );
        } else {
          promises.push(Promise.resolve({ employees: [] }));
        }
        
        const [missionsData, usersData, employeesData] = await Promise.all(promises);

        const missions = missionsData || [];
        const pendingMissions = missions.filter((m: any) => 
          m.status === 'pending_dg' || m.status === 'pending_msgg'
        );
        const validatedMissions = missions.filter((m: any) => m.status === 'validated');

        setStats({
          totalMissions: missions.length,
          pendingMissions: pendingMissions.length,
          validatedMissions: validatedMissions.length,
          totalUsers: usersData.users?.length || 0,
          totalEmployees: employeesData.employees?.length || 0,
          recentMissions: missions.slice(0, 5),
          allMissions: missions
        });

        // Process chart data only if user can see charts
        if (canSeeCharts()) {
          const charts = processChartData(missions);
          setChartData(charts);
        }
      } catch (error: any) {
        console.error('Dashboard data fetch error:', error);
        
        // Gérer les erreurs 403 silencieusement (permissions insuffisantes)
        if (error.response?.status === 403) {
          console.log('Utilisateur non autorisé pour certaines données du dashboard');
          // Continuer avec les données par défaut
          setStats({
            totalMissions: 0,
            pendingMissions: 0,
            validatedMissions: 0,
            totalUsers: 0,
            totalEmployees: 0,
            recentMissions: [],
            allMissions: []
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedInstitution]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'text-gray-600 bg-gray-100',
      pending_dg: 'text-yellow-600 bg-yellow-100',
      pending_msgg: 'text-blue-600 bg-blue-100',
      validated: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Brouillon',
      pending_dg: 'En attente DG',
      pending_msgg: 'En attente MSGG',
      validated: 'Validé',
      cancelled: 'Annulé'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getStatusChartColor = (status: string) => {
    const colors = {
      draft: '#6B7280',
      pending_dg: '#F59E0B',
      pending_msgg: '#3B82F6',
      validated: '#10B981',
      cancelled: '#EF4444'
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  };

  // Calculate growth metrics for investors
  const calculateGrowthMetrics = () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const currentYearMissions = stats.allMissions.filter(m => 
      new Date(m.created_at).getFullYear() === currentYear
    ).length;
    
    const lastYearMissions = stats.allMissions.filter(m => 
      new Date(m.created_at).getFullYear() === lastYear
    ).length;

    const growthRate = lastYearMissions > 0 
      ? ((currentYearMissions - lastYearMissions) / lastYearMissions * 100)
      : 0;

    const validationRate = stats.totalMissions > 0 
      ? (stats.validatedMissions / stats.totalMissions * 100)
      : 0;

    return { growthRate, validationRate, currentYearMissions, lastYearMissions };
  };

  const metrics = calculateGrowthMetrics();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-mauritania-green to-mauritania-green-dark rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.username}!
          </h1>
          <p className="mt-2 opacity-90">
            Bienvenue dans le système d'ordre de mission
          </p>
          {user?.institution_name && (
            <p className="mt-1 text-mauritania-yellow font-medium">
              {user.institution_name}
            </p>
          )}
        </div>

        {/* Institution Selector for Super Admin */}
        {isSuperAdmin() && institutions.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sélectionner une institution
            </h3>
            <div className="flex flex-wrap gap-4">
              {/* <button
                onClick={() => setSelectedInstitution('')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedInstitution === '' 
                    ? 'bg-mauritania-green text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Toutes les institutions
              </button> */}
              {institutions.map((institution) => (
                <button
                  key={institution.id}
                  onClick={() => setSelectedInstitution(institution.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedInstitution === institution.id 
                      ? 'bg-mauritania-green text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {institution.name}
                </button>
              ))}
            </div>
            {selectedInstitution && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  📊 Affichage des statistiques pour: {' '}
                  <span className="font-semibold">
                    {institutions.find(i => i.id === selectedInstitution)?.name}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Stats Cards with Growth Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-mauritania-green" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Missions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMissions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingMissions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Validées</p>
                <p className="text-2xl font-bold text-gray-900">{stats.validatedMissions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Employés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Croissance</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Taux validation</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.validationRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section - Only visible to specific roles */}
        {canSeeCharts() && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mission Trends Over Time */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Évolution des missions (12 derniers mois)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.trendData}>
                    <defs>
                      <linearGradient id="colorMissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="missions" 
                      stroke="#059669" 
                      fillOpacity={1} 
                      fill="url(#colorMissions)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative Growth */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Croissance cumulative
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Distribution */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Répartition mensuelle ({new Date().getFullYear()})
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="missions" fill="#059669" name="Total" />
                    <Bar dataKey="validated" fill="#10B981" name="Validées" />
                    <Bar dataKey="pending" fill="#F59E0B" name="En attente" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Répartition par statut
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getStatusChartColor(entry.status)} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Yearly Growth Comparison */}
              {chartData.yearlyData.length > 1 && (
                <div className="card lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Évolution annuelle
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="missions" fill="#6366F1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Key Metrics for Investors */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Métriques clés pour investisseurs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{metrics.currentYearMissions}</p>
                  <p className="text-sm text-gray-500">Missions cette année</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">
                    {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">Croissance annuelle</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.validationRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">Taux de validation</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.totalEmployees}
                  </p>
                  <p className="text-sm text-gray-500">Utilisateurs actifs</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Recent Missions */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Missions récentes</h2>
            <Link href="/missions" className="text-mauritania-green hover:text-mauritania-green-dark">
              Voir tout →
            </Link>
          </div>

          {stats.recentMissions.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">N° Mission</th>
                    <th className="table-header">Employé</th>
                    <th className="table-header">Destination</th>
                    <th className="table-header">Statut</th>
                    <th className="table-header">Date création</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentMissions.map((mission) => (
                    <tr key={mission.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{mission.mission_number}</td>
                      <td className="table-cell">{mission.employee_name}</td>
                      <td className="table-cell">{mission.destination}</td>
                      <td className="table-cell">
                        <span className={`status-badge ${getStatusColor(mission.status)}`}>
                          {getStatusText(mission.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        {new Date(mission.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune mission</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer votre première mission.
              </p>
              {(user?.role === 'hr') && (
                <div className="mt-6">
                  <Link href="/missions/create" className="btn-primary">
                    Créer une mission
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {user?.role === 'hr' && (
            <Link href="/missions/create" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-mauritania-green mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Créer une mission</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Créer un nouvel ordre de mission
                </p>
              </div>
            </Link>
          )}

          {(user?.role === 'admin_local' || user?.role === 'super_admin') && (
            <Link href="/employees/create" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Ajouter un employé</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Ajouter un nouvel employé
                </p>
              </div>
            </Link>
          )}

          {(user?.role === 'admin_local' || user?.role === 'super_admin') && (
            <Link href="/users/create" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-purple-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Ajouter un utilisateur</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Créer un compte utilisateur
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}