import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import Pagination from '../../components/common/Pagination';
import ExportButton from '../../components/common/ExportButton';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Analytics = () => {
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;

  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    overview: null,
    registrations: null,
    approvals: null,
    logins: null,
    properties: null,
    commissions: null
  });

  // Pagination for login records
  const [loginPage, setLoginPage] = useState(1);
  const [loginRecordsPerPage, setLoginRecordsPerPage] = useState(10);

  // Pagination for other tabs
  const [registrationPage, setRegistrationPage] = useState(1);
  const [registrationRecordsPerPage, setRegistrationRecordsPerPage] = useState(10);
  const [approvalPage, setApprovalPage] = useState(1);
  const [approvalRecordsPerPage, setApprovalRecordsPerPage] = useState(10);
  const [propertyPage, setPropertyPage] = useState(1);
  const [propertyRecordsPerPage, setPropertyRecordsPerPage] = useState(10);
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionRecordsPerPage, setCommissionRecordsPerPage] = useState(10);

  // Get human-readable period label
  const getPeriodLabel = () => {
    const labels = {
      week: 'Past Week',
      month: 'Past Month',
      quarter: 'Past Quarter',
      year: 'Past Year'
    };
    return labels[period] || 'Past Month';
  };

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, registrationsRes, approvalsRes, loginsRes, propertiesRes, commissionsRes] = await Promise.all([
        api.get(`/analytics/overview?period=${period}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/registrations?period=${period}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/approvals?period=${period}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/logins?period=${period}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/properties?period=${period}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/commissions?period=${period}`).catch(() => ({ data: { data: null } }))
      ]);

      setData({
        overview: overviewRes.data?.data,
        registrations: registrationsRes.data?.data,
        approvals: approvalsRes.data?.data,
        logins: loginsRes.data?.data,
        properties: propertiesRes.data?.data,
        commissions: commissionsRes.data?.data
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy');
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy, HH:mm');
  };


  const StatCard = ({ title, value, change, icon, color = 'indigo' }) => {
    const colorClasses = {
      indigo: 'bg-indigo-100 text-indigo-600',
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
              <p className={`text-xs sm:text-sm mt-1 flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                <span className="hidden sm:inline">{Math.abs(change)}% vs previous</span>
                <span className="sm:hidden">{Math.abs(change)}%</span>
              </p>
            )}
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  const PeriodSelector = () => (
    <div className="flex gap-1 sm:gap-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
      {['week', 'month', 'quarter', 'year'].map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${period === p
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );

  const TabButton = ({ id, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${active
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      {label}
    </button>
  );


  // Table Component with Pagination support
  const DataTable = ({ records, columns, loading, page = 1, onPageChange, totalRecords, itemsPerPage = 10, onItemsPerPageChange }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (!records || records.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No records found for this period</p>
        </div>
      );
    }

    // Filter out columns that are only for export (render: null means display only in export)
    const displayColumns = columns.filter(col => col.render !== null);

    // Calculate pagination
    const totalPages = Math.ceil((totalRecords || records.length) / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return (
      <>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[600px] sm:min-w-full">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sr. No.</th>
                  {displayColumns.map((col, index) => (
                    <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRecords.map((record, rowIndex) => (
                  <tr key={record._id || rowIndex} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {(page - 1) * itemsPerPage + rowIndex + 1}
                    </td>
                    {displayColumns.map((col, colIndex) => {
                      let value = col.key.split('.').reduce((obj, key) => obj?.[key], record);

                      // Check if column has a custom render function
                      if (col.render) {
                        value = col.render(record, value);
                      } else if (col.format === 'date') {
                        value = formatDate(value);
                      } else if (col.format === 'datetime') {
                        value = formatDateTime(value);
                      } else if (col.format === 'currency') {
                        value = formatCurrency(value);
                      }

                      return (
                        <td key={colIndex} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {col.badge && value ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${col.badge[value] || 'bg-gray-100 text-gray-800'}`}>
                              {typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : value}
                            </span>
                          ) : (
                            value ?? '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && onPageChange && (
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={totalRecords || records.length}
              onPageChange={onPageChange}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={onItemsPerPageChange}
            />
          </div>
        )}
        {totalPages <= 1 && onItemsPerPageChange && (
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={totalRecords || records.length}
              onPageChange={onPageChange}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={onItemsPerPageChange}
            />
          </div>
        )}
      </>
    );
  };

  // Column definitions for each table
  const registrationColumns = [
    { key: 'firstName', header: 'First Name' },
    { key: 'lastName', header: 'Last Name' },
    { key: 'email', header: 'Email ID' },
    { key: 'status', header: 'Status', badge: { active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', suspended: 'bg-red-100 text-red-800' } },
    { key: 'tier', header: 'Tier', badge: { bronze: 'bg-orange-100 text-orange-800', silver: 'bg-gray-200 text-gray-800', gold: 'bg-yellow-100 text-yellow-800', platinum: 'bg-purple-100 text-purple-800' } },
    { key: 'kycStatus', header: 'KYC Status', badge: { verified: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', submitted: 'bg-blue-100 text-blue-800', rejected: 'bg-red-100 text-red-800' } },
    { key: 'createdAt', header: 'Registered', format: 'date' }
  ];

  const approvalColumns = [
    { key: 'partnerName', header: 'Partner Name' },
    { key: 'partnerEmail', header: 'Email ID' },
    { key: 'status', header: 'Status', badge: { active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', suspended: 'bg-red-100 text-red-800' } },
    { key: 'tier', header: 'Tier', badge: { bronze: 'bg-orange-100 text-orange-800', silver: 'bg-gray-200 text-gray-800', gold: 'bg-yellow-100 text-yellow-800', platinum: 'bg-purple-100 text-purple-800' } },
    { key: 'kycStatus', header: 'KYC Status', badge: { verified: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', under_review: 'bg-blue-100 text-blue-800', rejected: 'bg-red-100 text-red-800' } },
    { key: 'createdAt', header: 'Applied', format: 'date' },
    { key: 'approvedAt', header: 'Approved', format: 'date' }
  ];

  // Format function for role display
  const formatRoleName = (role) => {
    if (!role) return 'Unknown';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const loginColumns = [
    {
      key: 'userId',
      header: 'User',
      format: (record) => record.userId ? `${record.userId.firstName || ''} ${record.userId.lastName || ''}`.trim() || 'Unknown' : 'Unknown User',
      render: (record, value) => (
        <div>
          <p className="font-medium text-gray-900">
            {record.userId ? `${record.userId.firstName || ''} ${record.userId.lastName || ''}`.trim() || 'Unknown' : 'Unknown User'}
          </p>
          <p className="text-sm text-gray-500">{record.email}</p>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email ID',
      format: (record) => record.email || '-',
      render: null
    },
    {
      key: 'userId.role',
      header: 'Role',
      format: (record) => formatRoleName(record.userId?.role),
      render: (record, value) => {
        const roleStyles = {
          company_superadmin: 'bg-purple-100 text-purple-800',
          partner_manager: 'bg-blue-100 text-blue-800',
          property_manager: 'bg-orange-100 text-orange-800',
          finance_manager: 'bg-green-100 text-green-800',
          viewer: 'bg-gray-100 text-gray-800',
          partner: 'bg-indigo-100 text-indigo-800',
          platform_admin: 'bg-red-100 text-red-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleStyles[record.userId?.role] || 'bg-gray-100 text-gray-800'}`}>
            {formatRoleName(record.userId?.role)}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      format: (record) => record.status === 'success' ? 'Success' : 'Failed',
      render: (record, value) => {
        const statusStyles = {
          success: 'bg-green-100 text-green-800',
          failed: 'bg-red-100 text-red-800'
        };
        return (
          <div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[record.status] || 'bg-gray-100 text-gray-800'}`}>
              {record.status === 'success' ? 'Success' : 'Failed'}
            </span>
            {record.status === 'failed' && record.failureReason && (
              <p className="text-xs text-red-600 mt-1">
                {record.failureReason.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        );
      }
    },
    {
      key: 'failureReason',
      header: 'Failure Reason',
      format: (record) => record.failureReason ? record.failureReason.replace(/_/g, ' ') : '-'
    },
    {
      key: 'device',
      header: 'Device Type',
      format: (record) => record.device?.type || 'Desktop',
      render: (record, value) => {
        const getDeviceIcon = (deviceType) => {
          switch (deviceType) {
            case 'mobile': return '📱';
            case 'tablet': return '📟';
            default: return '💻';
          }
        };
        return (
          <div className="flex items-center gap-2">
            <span title={record.device?.type || 'desktop'}>{getDeviceIcon(record.device?.type)}</span>
            <span className="text-sm text-gray-900">{record.device?.type || 'Desktop'}</span>
          </div>
        );
      }
    },
    {
      key: 'os.name',
      header: 'OS',
      format: (record) => record.os?.name || 'Unknown'
    },
    {
      key: 'browser.name',
      header: 'Browser',
      format: (record) => record.browser?.name || 'Unknown'
    },
    {
      key: 'browser.version',
      header: 'Browser Version',
      format: (record) => record.browser?.version || '-'
    },
    {
      key: 'location',
      header: 'Location',
      format: (record) => record.location?.city && record.location?.country
        ? `${record.location.city}, ${record.location.country}`
        : record.location?.country || 'Unknown',
      render: (record, value) => (
        <p className="text-sm text-gray-900">
          {record.location?.city && record.location?.country
            ? `${record.location.city}, ${record.location.country}`
            : record.location?.country || 'Unknown'}
        </p>
      )
    },
    {
      key: 'ip',
      header: 'IP Address',
      format: (record) => record.ip || '-',
      render: (record, value) => (
        <p className="text-sm text-gray-500 font-mono">{record.ip}</p>
      )
    },
    { key: 'timestamp', header: 'Time', format: 'datetime' }
  ];

  const propertyColumns = [
    { key: 'name', header: 'Property Name' },
    { key: 'type', header: 'Type', badge: { residential: 'bg-blue-100 text-blue-800', commercial: 'bg-purple-100 text-purple-800', industrial: 'bg-orange-100 text-orange-800', land: 'bg-green-100 text-green-800' } },
    { key: 'status', header: 'Status', badge: { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', sold_out: 'bg-red-100 text-red-800' } },
    { key: 'region', header: 'Region', badge: { india: 'bg-orange-100 text-orange-800', dubai: 'bg-blue-100 text-blue-800' } },
    {
      key: 'pricing.basePrice',
      header: 'Price',
      render: (record, value) => record.pricing?.priceOnRequest ? 'Price on Request' : formatCurrency(value, record.pricing?.currency)
    },
    { key: 'createdAt', header: 'Created', format: 'date' }
  ];

  const commissionColumns = [
    { key: 'partner.firstName', header: 'Partner First Name' },
    { key: 'partner.lastName', header: 'Partner Last Name' },
    { key: 'partner.email', header: 'Partner Email ID' },
    { key: 'property.name', header: 'Property' },
    {
      key: 'commission.calculatedAmount',
      header: 'Amount',
      render: (record, value) => formatCurrency(value, record.commission?.currency)
    },
    { key: 'status', header: 'Status', badge: { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', paid: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' } },
    { key: 'commission.partnerTier', header: 'Tier', badge: { bronze: 'bg-orange-100 text-orange-800', silver: 'bg-gray-200 text-gray-800', gold: 'bg-yellow-100 text-yellow-800', platinum: 'bg-purple-100 text-purple-800' } },
    { key: 'createdAt', header: 'Created', format: 'date' }
  ];

  // Helper to format dates for charts
  const formatDateForChart = (dateStr) => {
    if (!dateStr) return dateStr;
    const dateParts = dateStr.split('-');
    if (dateParts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[parseInt(dateParts[1], 10) - 1];
      return `${month} ${dateParts[2]}`;
    } else if (dateParts.length === 2) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[parseInt(dateParts[1], 10) - 1];
      return `${month} ${dateParts[0]}`;
    }
    return dateStr;
  };

  // Chart data transformation functions
  const getRegistrationTrendData = () => {
    if (!data.registrations?.trends) return [];
    return data.registrations.trends.map(item => ({
      date: formatDateForChart(item.date),
      registrations: item.count
    }));
  };

  const getRegistrationByStatusData = () => {
    if (!data.registrations?.byStatus) return [];
    const { byStatus } = data.registrations;
    return [
      { name: 'Active', value: byStatus.active || 0, color: '#22c55e' },
      { name: 'Pending', value: byStatus.pending || 0, color: '#f59e0b' },
      { name: 'Suspended', value: byStatus.suspended || 0, color: '#ef4444' }
    ];
  };

  const getRegistrationByTierData = () => {
    if (!data.registrations?.byTier) return [];
    const { byTier } = data.registrations;
    return [
      { name: 'Bronze', value: byTier.bronze || 0 },
      { name: 'Silver', value: byTier.silver || 0 },
      { name: 'Gold', value: byTier.gold || 0 },
      { name: 'Platinum', value: byTier.platinum || 0 }
    ];
  };

  const getLoginTrendData = () => {
    if (!data.logins?.trends) return [];
    return data.logins.trends.map(item => ({
      date: formatDateForChart(item.date),
      total: item.total,
      successful: item.successful,
      failed: item.failed
    }));
  };

  const getLoginByHourData = () => {
    if (!data.logins?.byHour) return [];
    // Create array for all 24 hours with data or 0
    const hourData = data.logins.byHour.map(item => ({
      hour: item.hour,
      count: item.count
    }));

    // Format hours as hour ranges (e.g., "12-1 AM", "6-7 PM") for clarity
    const formatHourRange = (hour) => {
      const startHour = hour === 0 ? 12 : hour <= 12 ? hour : hour - 12;
      const endHour = hour === 23 ? 12 : hour < 11 ? hour + 1 : hour < 23 ? (hour + 1) - 12 : 1;
      const period = hour < 12 ? 'AM' : 'PM';
      const endPeriod = hour < 11 ? 'AM' : hour < 23 ? 'PM' : 'AM';

      if (hour === 11) return '11 AM-12 PM';
      if (hour === 23) return '11 PM-12 AM';

      return `${startHour}-${endHour} ${period}`;
    };

    return Array.from({ length: 24 }, (_, i) => {
      const found = hourData.find(item => item.hour === i);
      return {
        hour: formatHourRange(i),
        logins: found ? found.count : 0
      };
    });
  };

  const getDeviceData = () => {
    if (!data.logins?.byDevice) return [];
    const { byDevice } = data.logins;
    return [
      { name: 'Desktop', value: byDevice.desktop || 0 },
      { name: 'Mobile', value: byDevice.mobile || 0 },
      { name: 'Tablet', value: byDevice.tablet || 0 }
    ];
  };

  const getPropertyTrendData = () => {
    if (!data.properties?.trends) return [];
    return data.properties.trends.map(item => ({
      date: item.date,
      properties: item.count
    }));
  };

  const getPropertyByTypeData = () => {
    if (!data.properties?.byType) return [];
    const { byType } = data.properties;
    return Object.entries(byType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  const getCommissionTrendData = () => {
    if (!data.commissions?.trends) return [];
    return data.commissions.trends.map(item => ({
      date: formatDateForChart(item.date),
      amount: item.amount || 0,
      count: item.count
    }));
  };

  const getCommissionByStatusData = () => {
    if (!data.commissions?.byStatus) return [];
    const { byStatus } = data.commissions;
    return [
      { name: 'Pending', value: byStatus.pending?.count || 0, amount: byStatus.pending?.amount || 0 },
      { name: 'Approved', value: byStatus.approved?.count || 0, amount: byStatus.approved?.amount || 0 },
      { name: 'Paid', value: byStatus.paid?.count || 0, amount: byStatus.paid?.amount || 0 },
      { name: 'Cancelled', value: byStatus.cancelled?.count || 0, amount: byStatus.cancelled?.amount || 0 }
    ];
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Total Partners"
          value={data.overview?.partners?.total || 0}
          change={data.overview?.partners?.change}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Partners"
          value={data.overview?.partners?.active || 0}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Approval Rate"
          value={`${data.overview?.approvalRate || 0}%`}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Approvals"
          value={data.overview?.partners?.pending || 0}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getRegistrationTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="registrations" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getRegistrationByStatusData()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {getRegistrationByStatusData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KYC Status Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">KYC Status Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {data.overview?.kycStats && Object.entries(data.overview.kycStats).map(([status, count]) => (
            <div key={status} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 capitalize">{status.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRegistrationsTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="New Registrations"
          value={data.overview?.partners?.newThisPeriod || 0}
          change={data.overview?.partners?.change}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
        <StatCard
          title="Active Partners"
          value={data.registrations?.byStatus?.active || 0}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Approval"
          value={data.registrations?.byStatus?.pending || 0}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Suspended"
          value={data.registrations?.byStatus?.suspended || 0}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getRegistrationTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="registrations" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getRegistrationByTierData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Registration Records</h3>
          <ExportButton
            data={data.registrations?.records || []}
            filename="registrations"
            columns={registrationColumns}
          />
        </div>
        <DataTable
          records={data.registrations?.records || []}
          columns={registrationColumns}
          loading={loading}
          page={registrationPage}
          onPageChange={setRegistrationPage}
          itemsPerPage={registrationRecordsPerPage}
          onItemsPerPageChange={setRegistrationRecordsPerPage}
        />
      </div>
    </div>
  );

  const renderApprovalsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Approval Rate"
          value={`${data.approvals?.summary?.approvalRate || 0}%`}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          title="Avg. Approval Time"
          value={`${data.approvals?.averageApprovalTime || 0} days`}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Applications"
          value={data.approvals?.summary?.pending || 0}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          title="Total Approved"
          value={data.approvals?.summary?.approved || 0}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Approval Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.approvals?.trends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Approval Records</h3>
          <ExportButton
            data={data.approvals?.records || []}
            filename="approvals"
            columns={approvalColumns}
          />
        </div>
        <DataTable
          records={data.approvals?.records || []}
          columns={approvalColumns}
          loading={loading}
          page={approvalPage}
          onPageChange={setApprovalPage}
          itemsPerPage={approvalRecordsPerPage}
          onItemsPerPageChange={setApprovalRecordsPerPage}
        />
      </div>
    </div>
  );

  const renderLoginsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Total Logins"
          value={data.logins?.summary?.total || 0}
          change={data.logins?.summary?.change}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
        />
        <StatCard
          title="Successful"
          value={data.logins?.summary?.successful || 0}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Failed Attempts"
          value={data.logins?.summary?.failed || 0}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          title="Unique Users"
          value={data.logins?.summary?.uniqueUsers || 0}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Login Activity Trend</h3>
            <p className="text-sm text-gray-500 mt-1">Daily login activity over the selected period</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getLoginTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="successful" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getDeviceData()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {getDeviceData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Activity Hours</h3>
        <p className="text-sm text-gray-500 -mt-2 mb-4">Total logins by hour ({getPeriodLabel()})</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={getLoginByHourData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="logins" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Login Records</h3>
          <ExportButton
            data={data.logins?.records || []}
            filename="login-activity"
            columns={loginColumns}
          />
        </div>
        <DataTable
          records={data.logins?.records || []}
          columns={loginColumns}
          loading={loading}
          page={loginPage}
          itemsPerPage={loginRecordsPerPage}
          onItemsPerPageChange={setLoginRecordsPerPage}
          onPageChange={setLoginPage}
          totalRecords={data.logins?.records?.length}
        />
      </div>
    </div>
  );

  const renderPropertiesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-6">
        <StatCard
          title="Total Properties"
          value={data.properties?.summary?.total || 0}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="Active Listings"
          value={data.properties?.summary?.active || 0}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Draft"
          value={data.properties?.summary?.draft || 0}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
        <StatCard
          title="Sold Out"
          value={data.properties?.summary?.sold || 0}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Off Market"
          value={data.properties?.summary?.offMarket || 0}
          color="gray"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getPropertyTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="properties" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Properties by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getPropertyByTypeData()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {getPropertyByTypeData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Property Records</h3>
          <ExportButton
            data={data.properties?.records || []}
            filename="properties"
            columns={propertyColumns}
          />
        </div>
        <DataTable
          records={data.properties?.records || []}
          columns={propertyColumns}
          loading={loading}
          page={propertyPage}
          onPageChange={setPropertyPage}
          itemsPerPage={propertyRecordsPerPage}
          onItemsPerPageChange={setPropertyRecordsPerPage}
        />
      </div>
    </div>
  );

  const renderCommissionsTab = () => {
    const activeCurrencies = data.commissions?.activeCurrencies || ['INR'];
    const summaryByCurrency = data.commissions?.summaryByCurrency || {};

    return (
      <div className="space-y-6">
        {/* Currency-wise Stats */}
        {activeCurrencies.map((currency) => {
          const currencySummary = summaryByCurrency[currency] || {};
          const statusByCurrency = data.commissions?.byStatusByCurrency?.[currency] || {};

          return (
            <div key={currency} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Commission Summary
                </h3>
                {activeCurrencies.length > 1 && (
                  <span className="text-sm px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{currency}</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Amount</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">
                    {formatCurrency(currencySummary.totalAmount || 0, currency)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Pending</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-600">
                    {formatCurrency(currencySummary.pendingAmount || 0, currency)}
                  </p>
                  <p className="text-xs text-gray-400">{statusByCurrency.pending?.count || 0} commissions</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Approved</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-600">
                    {formatCurrency(currencySummary.approvedAmount || 0, currency)}
                  </p>
                  <p className="text-xs text-gray-400">{statusByCurrency.approved?.count || 0} commissions</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Paid</p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-600">
                    {formatCurrency(currencySummary.paidAmount || 0, currency)}
                  </p>
                  <p className="text-xs text-gray-400">{statusByCurrency.paid?.count || 0} commissions</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Cancelled</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600">
                    {formatCurrency(currencySummary.cancelledAmount || 0, currency)}
                  </p>
                  <p className="text-xs text-gray-400">{statusByCurrency.cancelled?.count || 0} commissions</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Total Commissions Count */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <StatCard
            title="Total Commissions"
            value={data.commissions?.summary?.total || 0}
            change={data.commissions?.summary?.change}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getCommissionTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commissions by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getCommissionByStatusData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {getCommissionByStatusData().map((entry, index) => {
                    const colors = {
                      'Pending': '#f59e0b',
                      'Approved': '#3b82f6',
                      'Paid': '#22c55e',
                      'Cancelled': '#ef4444'
                    };
                    return (
                      <cell key={`cell-${index}`} fill={colors[entry.name] || '#6366f1'} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600">Cancelled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Partners */}
        {data.commissions?.topPartners && data.commissions.topPartners.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Earning Partners</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Sr. No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Partner</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Approved</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Paid</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.topPartners.map((partner, index) => (
                    <tr key={partner.partnerId || index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{partner.name}</p>
                        <p className="text-xs text-gray-500">{partner.totalCount || partner.approvedCount + partner.paidCount} deals</p>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-blue-600">
                        {formatCurrency(partner.approvedAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        {formatCurrency(partner.paidAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(partner.totalAmount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Commission Records</h3>
            <ExportButton
              data={data.commissions?.records || []}
              filename="commissions"
              columns={commissionColumns}
            />
          </div>
          <DataTable
            records={data.commissions?.records || []}
            columns={commissionColumns}
            loading={loading}
            page={commissionPage}
            onPageChange={setCommissionPage}
            itemsPerPage={commissionRecordsPerPage}
            onItemsPerPageChange={setCommissionRecordsPerPage}
          />
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Analytics Dashboard"
      subtitle="Comprehensive reports and insights"
      color={config.color}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600 mt-1">Track performance and growth metrics</p>
        </div>
        <PeriodSelector />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        <TabButton id="overview" label="Overview" active={activeTab === 'overview'} onClick={setActiveTab} />
        <TabButton id="registrations" label="Registrations" active={activeTab === 'registrations'} onClick={setActiveTab} />
        <TabButton id="approvals" label="Approvals" active={activeTab === 'approvals'} onClick={setActiveTab} />
        <TabButton id="logins" label="Login Activity" active={activeTab === 'logins'} onClick={setActiveTab} />
        <TabButton id="properties" label="Properties" active={activeTab === 'properties'} onClick={setActiveTab} />
        <TabButton id="commissions" label="Commissions" active={activeTab === 'commissions'} onClick={setActiveTab} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'registrations' && renderRegistrationsTab()}
          {activeTab === 'approvals' && renderApprovalsTab()}
          {activeTab === 'logins' && renderLoginsTab()}
          {activeTab === 'properties' && renderPropertiesTab()}
          {activeTab === 'commissions' && renderCommissionsTab()}
        </>
      )}
    </DashboardLayout>
  );
};

export default Analytics;