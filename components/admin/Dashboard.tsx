import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../context/AppContext';
import { VisitTest } from '../../types';
import {
  Activity,
  TestTube,
  Users,
  Clock,
  CheckCircle,
  FlaskConical,
  ClipboardList,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  IndianRupee,
  XCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface DashboardMetrics {
  totalVisits: number;
  totalRevenue: number;
  totalTests: number;
  totalClients: number;
  pendingTests: number;
  approvedTests: number;
  rejectedTests: number;
  avgTatHours: number;
  collectionRate: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'ytd' | 'custom';

interface RevenueData {
  byPaymentMode: any[];
  byClient: any[];
  dailyRevenue: any[];
}

interface TestData {
  byTemplate: any[];
  byStatus: any[];
  byCategory: any[];
}

interface ClientData {
  clients: any[];
  ledgerSummary: any[];
}

interface TrendData {
  visitsTrend: any[];
  testsTrend: any[];
  averageRevenue: any;
}

interface QueuePopupProps {
  title: string;
  tests: VisitTest[];
  onClose: () => void;
}

// Queue Popup Component
const QueuePopup: React.FC<QueuePopupProps> = ({ title, tests, onClose }) => {
  const { visits } = useAppContext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {tests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No tests in this queue</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Visit Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Patient Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Test Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ref. Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tests.map((test) => {
                  const visit = visits.find(v => v.id === test.visitId);
                  const refDoctor = visit?.referred_doctor_name || visit?.other_ref_doctor || 'N/A';
                  const timeAgo = test.collectedAt
                    ? new Date(test.collectedAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{test.visitCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{test.patientName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{test.template.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{refDoctor}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{timeAgo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { visits } = useAppContext();
  const [visitTests, setVisitTests] = useState<VisitTest[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [tests, setTests] = useState<TestData | null>(null);
  const [clients, setClients] = useState<ClientData | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queuePopup, setQueuePopup] = useState<{ title: string; tests: VisitTest[] } | null>(null);

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('23:59');

  // Calculate date range based on filter
  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: Date;

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(`${customStartDate}T${customStartTime || '00:00'}:00`);
          const end = new Date(`${customEndDate}T${customEndTime || '23:59'}:59`);
          return { startDate: start.toISOString(), endDate: end.toISOString() };
        }
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { startDate: startDate.toISOString(), endDate };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching dashboard data...');

      const { startDate, endDate } = getDateRange();

      const [metricsData, revenueData, testsData, clientsData, trendsData, freshVisitTests] = await Promise.all([
        apiClient.getDashboardOverview(startDate, endDate),
        apiClient.getDashboardRevenue(startDate, endDate),
        apiClient.getDashboardTests(startDate, endDate),
        apiClient.getDashboardClients(),
        apiClient.getDashboardTrends(startDate, endDate),
        apiClient.getVisitTests(), // Fetch fresh visit tests for queue counts
      ]);

      console.log('✅ Dashboard data fetched:', {
        metrics: metricsData,
        revenue: revenueData,
        tests: testsData,
        clients: clientsData,
        trends: trendsData,
        visitTestsCount: freshVisitTests.length,
      });

      setMetrics(metricsData);
      setRevenue(revenueData);
      setTests(testsData);
      setClients(clientsData);
      setTrends(trendsData);
      setVisitTests(freshVisitTests); // Update local state with fresh data
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter, customStartDate, customEndDate, customStartTime, customEndTime]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  const getFilterLabel = () => {
    switch (timeFilter) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'ytd': return 'Year to Date';
      case 'custom': return 'Custom Range';
      default: return 'Today';
    }
  };

  return (
    <>
      {/* Queue Popup */}
      {queuePopup && (
        <QueuePopup
          title={queuePopup.title}
          tests={queuePopup.tests}
          onClose={() => setQueuePopup(null)}
        />
      )}

      <div className="space-y-8">
        {/* Header with Time Filters and Refresh Button */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-gray-200 rounded-xl p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900">Laboratory Dashboard</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-11 font-medium">Comprehensive analytics and operations overview</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Time Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {(['today', 'week', 'month', 'ytd', 'custom'] as TimeFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      timeFilter === filter
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {filter === 'today' && 'Today'}
                    {filter === 'week' && 'Week'}
                    {filter === 'month' && 'Month'}
                    {filter === 'ytd' && 'YTD'}
                    {filter === 'custom' && 'Custom'}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all font-semibold shadow-sm hover:shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {timeFilter === 'custom' && (
            <div className="mt-5 flex flex-wrap gap-3 items-center p-4 bg-white rounded-lg border border-gray-200">
              <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500 font-medium">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

      {/* Overview Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Visits"
              value={metrics.totalVisits.toLocaleString('en-IN')}
              color="blue"
            />
            <MetricCard
              title="Total Revenue"
              value={`₹${metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="green"
            />
            <MetricCard
              title="Total Tests"
              value={metrics.totalTests.toLocaleString('en-IN')}
              color="blue"
            />
            <MetricCard
              title="B2B Clients"
              value={metrics.totalClients.toLocaleString('en-IN')}
              color="purple"
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Pending Tests"
              value={metrics.pendingTests.toLocaleString('en-IN')}
              color="orange"
            />
            <MetricCard
              title="Approved Tests"
              value={metrics.approvedTests.toLocaleString('en-IN')}
              color="green"
            />
            <MetricCard
              title="Rejected Tests"
              value={metrics.rejectedTests.toLocaleString('en-IN')}
              color="red"
            />
            <MetricCard
              title="Avg TAT"
              value={`${metrics.avgTatHours.toFixed(1)}h`}
              color="blue"
              subtitle="Turnaround Time"
            />
            <MetricCard
              title="Collection Rate"
              value={`${metrics.collectionRate.toFixed(1)}%`}
              color="green"
              subtitle="Tests Processed"
            />
          </div>
        </>
      )}

      {/* Queue Status Containers - Click to view details */}
      {tests && tests.byStatus && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Workflow Queues</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phlebotomy Queue */}
            <QueueCard
              title="Phlebotomy Queue"
              description="Samples awaiting collection"
              count={tests.byStatus.find((s: any) => s.status === 'PENDING')?.count || 0}
              color="yellow"
              onClick={() => {
                const pendingTests = visitTests.filter(t => t.status === 'PENDING');
                setQueuePopup({
                  title: 'Phlebotomy Queue - Samples Awaiting Collection',
                  tests: pendingTests
                });
              }}
            />

            {/* Lab Queue */}
            <QueueCard
              title="Laboratory Queue"
              description="Samples collected, awaiting results"
              count={
                Number(tests.byStatus.find((s: any) => s.status === 'SAMPLE_COLLECTED')?.count || 0) +
                Number(tests.byStatus.find((s: any) => s.status === 'IN_PROGRESS')?.count || 0)
              }
              color="blue"
              onClick={() => {
                const labTests = visitTests.filter(t => t.status === 'SAMPLE_COLLECTED' || t.status === 'IN_PROGRESS');
                setQueuePopup({
                  title: 'Laboratory Queue - Samples Collected, Awaiting Results',
                  tests: labTests
                });
              }}
            />

            {/* Approver Queue */}
            <QueueCard
              title="Approver Queue"
              description="Results awaiting approval"
              count={tests.byStatus.find((s: any) => s.status === 'AWAITING_APPROVAL')?.count || 0}
              color="green"
              onClick={() => {
                const approvalTests = visitTests.filter(t => t.status === 'AWAITING_APPROVAL');
                setQueuePopup({
                  title: 'Approver Queue - Results Awaiting Approval',
                  tests: approvalTests
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Revenue Section */}
      {revenue && (
        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-600 rounded-lg">
              <IndianRupee className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Revenue Insights</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Mode Distribution */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-blue-100">By Payment Mode</h4>
              <div className="space-y-3">
                {revenue.byPaymentMode.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <span className="text-sm font-semibold text-gray-700">{item.payment_mode || 'Unknown'}</span>
                    <span className="font-bold text-green-600 text-lg">₹{parseFloat(item.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clients */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-purple-100">Top B2B Clients (by Balance)</h4>
              <div className="space-y-3">
                {revenue.byClient.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <span className="text-sm font-semibold text-gray-700">{item.name}</span>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold text-lg ${parseFloat(item.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{parseFloat(item.balance || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">₹{parseFloat(item.total_revenue || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tests Section */}
      {tests && (
        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-600 rounded-lg">
              <TestTube className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Test Analytics</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* By Status */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-yellow-100">By Status</h4>
              <div className="space-y-3">
                {tests.byStatus.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-yellow-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <span className="text-sm font-semibold text-gray-700">{item.status}</span>
                    <span className="font-bold text-lg text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-blue-100">By Category</h4>
              <div className="space-y-3">
                {tests.byCategory.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <span className="text-sm font-semibold text-gray-700">{item.category || 'Unknown'}</span>
                    <span className="font-bold text-lg text-blue-700 bg-blue-100 px-3 py-1 rounded-lg">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Tests */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-purple-100">Top Tests</h4>
              <div className="space-y-3">
                {tests.byTemplate.slice(0, 5).map((item, idx) => {
                  const params = typeof item.parameters === 'string' ? JSON.parse(item.parameters) : item.parameters;
                  const fieldCount = params?.fields?.length || 0;
                  return (
                    <div key={idx} className="p-3 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">{item.name}</span>
                        <span className="font-bold text-lg text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">{item.count}</span>
                      </div>
                      {fieldCount > 0 && (
                        <p className="text-xs text-gray-600 mt-2 font-medium">📊 {fieldCount} parameters</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2B Clients Section */}
      {clients && (
        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">B2B Client Performance</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Client Name</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Visits</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Revenue</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pending Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.clients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 transition-all">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{client.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 font-medium">{client.visit_count || 0}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 font-medium">₹{parseFloat(client.total_revenue || 0).toFixed(2)}</td>
                    <td className="px-5 py-3 text-sm font-bold">
                      <span className={client.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{parseFloat(client.balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 font-medium">₹{parseFloat(client.pending_dues || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends Section */}
      {trends && (
        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-600 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Business Trends (Last 30 Days)</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Average Revenue */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
              <h4 className="text-lg font-bold text-blue-900 mb-3">Average Revenue Per Visit</h4>
              <p className="text-4xl font-extrabold text-blue-700 mb-3">₹{parseFloat(trends.averageRevenue.avg_revenue || 0).toFixed(2)}</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-800">Minimum:</span>
                  <span className="font-bold text-blue-700">₹{parseFloat(trends.averageRevenue.min_revenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-800">Maximum:</span>
                  <span className="font-bold text-blue-700">₹{parseFloat(trends.averageRevenue.max_revenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b-2 border-teal-100">Recent Activity (Last 7 Days)</h4>
              <div className="space-y-3">
                {trends.visitsTrend.slice(-5).reverse().map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-teal-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <span className="text-sm font-semibold text-gray-700">{item.date}</span>
                    <span className="font-bold text-lg text-teal-700 bg-teal-100 px-4 py-2 rounded-lg">{item.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  color?: string;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
}> = ({
  title,
  value,
  color = 'blue',
  subtitle,
  trend,
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      title: 'text-blue-600',
      value: 'text-blue-700',
      icon: 'bg-blue-600',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      border: 'border-orange-200',
      title: 'text-orange-600',
      value: 'text-orange-700',
      icon: 'bg-orange-600',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-200',
      title: 'text-green-600',
      value: 'text-green-700',
      icon: 'bg-green-600',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      border: 'border-red-200',
      title: 'text-red-600',
      value: 'text-red-700',
      icon: 'bg-red-600',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-200',
      title: 'text-purple-600',
      value: 'text-purple-700',
      icon: 'bg-purple-600',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-sm font-semibold ${colors.title} uppercase tracking-wider`}>{title}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trend.isPositive ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className={`text-4xl font-extrabold ${colors.value} mb-2`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-600 font-medium">{subtitle}</p>}
    </div>
  );
};

// Queue Card Component
const QueueCard: React.FC<{
  title: string;
  description: string;
  count: number;
  color: 'yellow' | 'blue' | 'green';
  onClick: () => void;
}> = ({ title, description, count, color, onClick }) => {
  const colorClasses = {
    yellow: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
      border: 'border-amber-300',
      hover: 'hover:shadow-xl hover:scale-105',
      countColor: 'text-amber-700',
      titleColor: 'text-amber-900',
      icon: 'bg-amber-600 text-amber-100',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-300',
      hover: 'hover:shadow-xl hover:scale-105',
      countColor: 'text-blue-700',
      titleColor: 'text-blue-900',
      icon: 'bg-blue-600 text-blue-100',
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      border: 'border-emerald-300',
      hover: 'hover:shadow-xl hover:scale-105',
      countColor: 'text-emerald-700',
      titleColor: 'text-emerald-900',
      icon: 'bg-emerald-600 text-emerald-100',
    },
  };

  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`w-full p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left ${colors.bg} ${colors.border} ${colors.hover}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-lg font-bold ${colors.titleColor}`}>{title}</h4>
        <span className={`text-5xl font-extrabold ${colors.countColor} opacity-90`}>
          {count}
        </span>
      </div>
      <p className="text-sm text-gray-700 font-medium mb-3">{description}</p>
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        <span>→ View Details</span>
      </div>
    </button>
  );
};

