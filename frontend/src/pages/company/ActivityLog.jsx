import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import ExportButton from '../../components/common/ExportButton';
import useDebounce from '../../hooks/useDebounce';

const ActivityLog = () => {
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search for real-time filtering
  const debouncedUserId = useDebounce(userIdFilter, 300);

  // Available filter options
  const [actionTypes, setActionTypes] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0
  });
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchActionTypes();
    fetchLogs();
  }, [actionFilter, resourceFilter, startDate, endDate, currentPage, debouncedUserId, itemsPerPage]);

  const fetchActionTypes = async () => {
    try {
      const response = await api.get('/activity-logs/types');
      setActionTypes(response.data.data.actionTypes || []);
      setResourceTypes(response.data.data.resourceTypes || []);
    } catch (err) {
      console.error('Failed to load action types:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (resourceFilter) params.append('resourceType', resourceFilter);
      if (debouncedUserId) params.append('userId', debouncedUserId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/activity-logs?${params.toString()}`);
      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { total: 0, page: 1, pages: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const actionStyles = {
      // Team actions
      team_member_added: 'bg-green-100 text-green-800',
      team_member_updated: 'bg-blue-100 text-blue-800',
      team_member_deleted: 'bg-red-100 text-red-800',
      team_member_activated: 'bg-green-100 text-green-800',
      team_member_deactivated: 'bg-yellow-100 text-yellow-800',
      team_invite_resent: 'bg-blue-100 text-blue-800',

      // Property actions
      property_created: 'bg-green-100 text-green-800',
      property_updated: 'bg-blue-100 text-blue-800',
      property_deleted: 'bg-red-100 text-red-800',
      property_status_changed: 'bg-purple-100 text-purple-800',
      property_published: 'bg-green-100 text-green-800',
      property_unpublished: 'bg-yellow-100 text-yellow-800',

      // Partner actions
      partner_status_approved: 'bg-green-100 text-green-800',
      partner_status_rejected: 'bg-red-100 text-red-800',
      partner_status_suspended: 'bg-yellow-100 text-yellow-800',
      partner_status_activated: 'bg-green-100 text-green-800',
      partner_tier_changed: 'bg-purple-100 text-purple-800',
      partner_kyc_approved: 'bg-green-100 text-green-800',
      partner_kyc_rejected: 'bg-red-100 text-red-800',

      // Commission actions
      commission_created: 'bg-blue-100 text-blue-800',
      commission_updated: 'bg-blue-100 text-blue-800',
      commission_approved: 'bg-green-100 text-green-800',
      commission_paid: 'bg-green-100 text-green-800',
      commission_cancelled: 'bg-red-100 text-red-800',

      // Agreement actions
      agreement_created: 'bg-blue-100 text-blue-800',
      agreement_signed: 'bg-green-100 text-green-800',
      agreement_expired: 'bg-yellow-100 text-yellow-800',

      // Visit actions
      visit_scheduled: 'bg-blue-100 text-blue-800',
      visit_rescheduled: 'bg-purple-100 text-purple-800',
      visit_confirmed: 'bg-green-100 text-green-800',
      visit_completed: 'bg-green-100 text-green-800',
      visit_cancelled: 'bg-red-100 text-red-800',

      // Settings actions
      settings_updated: 'bg-blue-100 text-blue-800',
      company_profile_updated: 'bg-blue-100 text-blue-800',

      // Auth actions
      login_success: 'bg-green-100 text-green-800',
      login_failed: 'bg-red-100 text-red-800',
      password_changed: 'bg-purple-100 text-purple-800',
      profile_updated: 'bg-blue-100 text-blue-800'
    };
    return actionStyles[action] || 'bg-gray-100 text-gray-800';
  };

  const formatAction = (action) => {
    if (!action) return 'Unknown';
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getResourceIcon = (resourceType) => {
    switch (resourceType) {
      case 'user':
      case 'team_member':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'property':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'partner':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'commission':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'agreement':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'visit':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 9h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'auth':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const formatResourceType = (type) => {
    if (!type) return 'Unknown';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleBadge = (role) => {
    const roleStyles = {
      company_superadmin: 'bg-purple-100 text-purple-800',
      partner_manager: 'bg-blue-100 text-blue-800',
      property_manager: 'bg-orange-100 text-orange-800',
      finance_manager: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
      partner: 'bg-indigo-100 text-indigo-800',
      platform_admin: 'bg-red-100 text-red-800'
    };
    return roleStyles[role] || 'bg-gray-100 text-gray-800';
  };

  const formatRole = (role) => {
    if (!role) return 'Unknown';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Export columns configuration
  const exportColumns = [
    {
      key: 'userId',
      header: 'User Name',
      format: (log) => log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User'
    },
    { key: 'userId.email', header: 'User Email' },
    {
      key: 'userId.role',
      header: 'Role',
      format: (log) => log.userId?.role ? log.userId.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'
    },
    {
      key: 'action',
      header: 'Action',
      format: (log) => log.action ? log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'
    },
    {
      key: 'resourceType',
      header: 'Resource Type',
      format: (log) => log.resourceType ? log.resourceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'
    },
    { key: 'resourceTitle', header: 'Resource' },
    {
      key: 'details',
      header: 'Details',
      format: (log) => log.details && Object.keys(log.details).length > 0
        ? JSON.stringify(log.details)
        : ''
    },
    { key: 'ipAddress', header: 'IP Address' },
    {
      key: 'timestamp',
      header: 'Timestamp',
      format: (log) => log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : ''
    }
  ];

  return (
    <DashboardLayout sidebarLinks={config.links} title="Activity Log" subtitle="Track all user activities and actions" color={config.color}>
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Activity
          </h3>
          <button
            type="button"
            onClick={() => {
              setActionFilter('');
              setResourceFilter('');
              setUserIdFilter('');
              setStartDate('');
              setEndDate('');
              setCurrentPage(1);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resource Type</label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">All Resources</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {formatResourceType(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User ID</label>
            <input
              type="text"
              placeholder="Enter user ID..."
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {(actionFilter || resourceFilter || userIdFilter || startDate || endDate) && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters applied
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              data={logs}
              columns={exportColumns}
              filename="activity-logs"
              title="Activity Logs"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-gray-500 mb-2">No activity logs found</p>
            <p className="text-sm text-gray-400">User activities will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-800">
                            {(log.userId?.firstName?.charAt(0) || log.userId?.email?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">{log.userId?.email}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(log.userId?.role)}`}>
                            {formatRole(log.userId?.role)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{getResourceIcon(log.resourceType)}</span>
                        <div>
                          <p className="text-sm text-gray-900">{log.resourceTitle || '-'}</p>
                          <p className="text-xs text-gray-500">{formatResourceType(log.resourceType)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-600 truncate" title={JSON.stringify(log.details)}>
                            {log.details.message || log.details.name || JSON.stringify(log.details).substring(0, 50) + '...'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-500 font-mono">{log.ipAddress || '-'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-500">{formatDate(log.timestamp)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            total={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityLog;