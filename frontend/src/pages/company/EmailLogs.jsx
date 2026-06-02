import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';

const EmailLogs = () => {
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.company_superadmin;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ sent: 0, failed: 0, pending: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search for real-time filtering
  const debouncedSearch = useDebounce(search, 300);

  // Selected email for details
  const [selectedLog, setSelectedLog] = useState(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [statusFilter, typeFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, itemsPerPage, statusFilter, typeFilter, startDate, endDate, debouncedSearch]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/email-logs?${params.toString()}`);
      setLogs(response.data.data.logs);
      setStats(response.data.data.stats);
      setTotalItems(response.data.data.pagination.total);
      setTotalPages(response.data.data.pagination.pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (logId) => {
    try {
      setResending(true);
      const response = await api.post(`/email-logs/${logId}/resend`);
      if (response.data.success) {
        // Update the log in the list
        setLogs(logs.map(log =>
          log._id === logId ? response.data.data : log
        ));
        setSelectedLog(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      verifyEmail: 'Email Verification',
      resetPassword: 'Password Reset',
      newPropertyPartner: 'Property Notification',
      partnershipApproved: 'Partnership Approved',
      visitScheduled: 'Visit Scheduled',
      visitApproved: 'Visit Approved',
      visitRejected: 'Visit Rejected',
      visitCancelledPropertyStatus: 'Visit Cancelled',
      partnerVisitCancelled: 'Partner Cancelled Visit',
      teamInvite: 'Team Invite',
      commission_created: 'Commission Created',
      commission_approved: 'Commission Approved',
      commission_paid: 'Commission Paid',
      commission_cancelled: 'Commission Cancelled',
      custom: 'Custom Email',
      other: 'Other'
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats cards data
  const statsCards = [
    { label: 'Total', value: stats.sent + stats.failed + stats.pending, color: 'indigo', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
    { label: 'Sent', value: stats.sent, color: 'green', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { label: 'Failed', value: stats.failed, color: 'red', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { label: 'Pending', value: stats.pending, color: 'yellow', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
  ];

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Email Logs"
      subtitle="View all sent emails"
      color={config.color}
    >
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statsCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className={`text-2xl font-bold ${
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'red' ? 'text-red-600' :
                  stat.color === 'yellow' ? 'text-yellow-600' :
                  'text-indigo-600'
                }`}>
                  {stat.value}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === 'green' ? 'bg-green-100 text-green-600' :
                stat.color === 'red' ? 'bg-red-100 text-red-600' :
                stat.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                'bg-indigo-100 text-indigo-600'
              }`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Logs
          </h3>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setSearch('');
              setStartDate('');
              setEndDate('');
              setCurrentPage(1);
              setItemsPerPage(20);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="all">All Types</option>
              <optgroup label="Authentication">
                <option value="verifyEmail">Email Verification</option>
                <option value="resetPassword">Password Reset</option>
              </optgroup>
              <optgroup label="Partnership">
                <option value="newPropertyPartner">Property Notification</option>
                <option value="partnershipApproved">Partnership Approved</option>
              </optgroup>
              <optgroup label="Visits">
                <option value="visitScheduled">Visit Scheduled</option>
                <option value="visitApproved">Visit Approved</option>
                <option value="visitRejected">Visit Rejected</option>
                <option value="visitCancelledPropertyStatus">Visit Cancelled</option>
                <option value="partnerVisitCancelled">Partner Cancelled Visit</option>
              </optgroup>
              <optgroup label="Team">
                <option value="teamInvite">Team Invite</option>
              </optgroup>
              <optgroup label="Commission">
                <option value="commission_created">Commission Created</option>
                <option value="commission_approved">Commission Approved</option>
                <option value="commission_paid">Commission Paid</option>
                <option value="commission_cancelled">Commission Cancelled</option>
              </optgroup>
              <optgroup label="Other">
                <option value="custom">Custom Email</option>
                <option value="other">Other</option>
              </optgroup>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Start Date"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="End Date"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {(statusFilter !== 'all' || typeFilter !== 'all' || search || startDate || endDate) && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters applied
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Email Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Logs</h3>
          <p className="text-gray-500">No emails have been sent yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{log.recipient?.email}</p>
                        {log.recipient?.name && (
                          <p className="text-sm text-gray-500">{log.recipient.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 truncate max-w-xs">{log.subject}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{getTypeLabel(log.type)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(log.status)}`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(log.sentAt || log.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log._id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{log.recipient?.email}</p>
                    <p className="text-sm text-gray-500 truncate">{log.subject}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusBadge(log.status)}`}>
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{getTypeLabel(log.type)} • {formatDate(log.sentAt || log.createdAt)}</p>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-4">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Email Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Email Details</h3>
                <p className="text-sm text-gray-500">{selectedLog.subject}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Email Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Recipient</p>
                  <p className="font-medium">{selectedLog.recipient?.email}</p>
                  {selectedLog.recipient?.name && (
                    <p className="text-sm text-gray-500">{selectedLog.recipient.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{getTypeLabel(selectedLog.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(selectedLog.status)}`}>
                    {selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sent At</p>
                  <p className="font-medium">{formatDate(selectedLog.sentAt || selectedLog.createdAt)}</p>
                </div>
                {selectedLog.providerId && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Provider ID</p>
                    <p className="font-mono text-xs text-gray-600">{selectedLog.providerId}</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {selectedLog.status === 'failed' && selectedLog.errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{selectedLog.errorMessage}</p>
                </div>
              )}

              {/* Content Preview */}
              {(selectedLog.content?.html || selectedLog.content?.text) && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Email Content</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    {selectedLog.content?.html ? (
                      <div
                        className="p-4 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: selectedLog.content.html.length > 5000
                            ? selectedLog.content.html.substring(0, 5000) + '<p class="text-gray-400 text-sm mt-2">... (content truncated)</p>'
                            : selectedLog.content.html
                        }}
                      />
                    ) : selectedLog.content?.text ? (
                      <div className="p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
                          {selectedLog.content.text}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* No Content Message */}
              {(!selectedLog.content?.html && !selectedLog.content?.text) && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Email content not stored for this record</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              {selectedLog.status === 'failed' && (
                <button
                  onClick={() => handleResend(selectedLog._id)}
                  disabled={resending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resending ? 'Resending...' : 'Resend Email'}
                </button>
              )}
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmailLogs;