import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import useDebounce from '../../hooks/useDebounce';
import { formatDateExport } from '../../utils/export';

const Partners = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [exporting, setExporting] = useState(false);

  // Debounce search for real-time filtering
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetchPartners();
  }, [debouncedSearch, statusFilter, kycFilter, tierFilter, page, itemsPerPage]);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await api.get(`/companies/${user.companyId}/settings`);
      setCompanySettings(response.data.data);
    } catch (err) {
      console.error('Failed to fetch company settings:', err);
    }
  };

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (kycFilter) params.append('kycStatus', kycFilter);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('page', page);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/partner-company/company/${user.companyId}/partners?${params.toString()}`);
      setPartners(response.data.data.partnerships);
      setPagination(response.data.data.pagination);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load partners';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (kycFilter) params.append('kycStatus', kycFilter);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('limit', 1000);

      const response = await api.get(`/partner-company/company/${user.companyId}/partners?${params.toString()}`);
      const exportPartners = response.data.data.partnerships;

      // Helper function to get commission percentage
      const getCommission = (p) => {
        if (p.commissionOverride?.percentage) {
          return `${p.commissionOverride.percentage}%`;
        }
        const tierPercentages = {
          bronze: companySettings?.settings?.tierPercentages?.bronze || 25,
          silver: companySettings?.settings?.tierPercentages?.silver || 35,
          gold: companySettings?.settings?.tierPercentages?.gold || 50,
          platinum: companySettings?.settings?.tierPercentages?.platinum || 75
        };
        return `${tierPercentages[p.tier] || tierPercentages.bronze}%`;
      };

      // Create CSV content
      const headers = ['Partner Name', 'Email', 'Status', 'KYC Status', 'Tier', 'Commission', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...exportPartners.map(p => [
          `${p.partnerId?.firstName || ''} ${p.partnerId?.lastName || ''}`,
          p.partnerId?.email || '',
          p.status || 'pending',
          p.kycStatus || 'pending',
          p.tier || 'bronze',
          getCommission(p),
          formatDateExport(p.createdAt)
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `partners-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export partners');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getTierBadge = (tier) => {
    const styles = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-200 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800'
    };
    return styles[tier] || 'bg-gray-100 text-gray-800';
  };

  const getKycBadge = (kycStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-purple-100 text-purple-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[kycStatus] || 'bg-gray-100 text-gray-800';
  };

  const getCommissionPercentage = (tier) => {
    const percentages = {
      bronze: companySettings?.settings?.tierPercentages?.bronze || 25,
      silver: companySettings?.settings?.tierPercentages?.silver || 35,
      gold: companySettings?.settings?.tierPercentages?.gold || 50,
      platinum: companySettings?.settings?.tierPercentages?.platinum || 75
    };
    return `${percentages[tier] || percentages.bronze}%`;
  };

  // Count partners by status
  const activeCount = partners.filter(p => p.status === 'active').length;
  const pendingCount = partners.filter(p => p.status === 'pending').length;
  const suspendedCount = partners.filter(p => p.status === 'suspended').length;
  const rejectedCount = partners.filter(p => p.status === 'rejected').length;

  return (
    <DashboardLayout title="Partners" subtitle="Manage your company's channel partners">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Total Partners</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Active</p>
          <p className="text-xl sm:text-3xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Pending</p>
          <p className="text-xl sm:text-3xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Suspended</p>
          <p className="text-xl sm:text-3xl font-bold text-red-600 mt-1">{suspendedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Rejected</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-600 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <div className="flex-1 relative w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full py-2 pl-10 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={kycFilter}
              onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            >
              <option value="">All KYC</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            >
              <option value="">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
            {(statusFilter || kycFilter || tierFilter || search) && (
              <button
                onClick={() => { setStatusFilter(''); setKycFilter(''); setTierFilter(''); setSearch(''); setPage(1); }}
                className="px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap text-sm"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Partners Table/Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* View Toggle Header */}
        {!loading && !error && partners.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              Total Partners: <span className="font-semibold text-gray-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Card View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-48 sm:min-h-64">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : partners.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 mb-4">No partners found</p>
          </div>
        ) : viewMode === 'card' ? (
          /* Card View */
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {partners.map((partnership) => (
                <div
                  key={partnership._id}
                  onClick={() => navigate(`/company/partners/${partnership._id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {partnership.partnerId?.firstName?.charAt(0)}{partnership.partnerId?.lastName?.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {partnership.partnerId?.firstName} {partnership.partnerId?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-[180px]">{partnership.partnerId?.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(partnership.status)}`}>
                      {partnership.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">KYC Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getKycBadge(partnership.kycStatus)}`}>
                        {(partnership.kycStatus || 'pending').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tier</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                        {partnership.tier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Commission</span>
                      <span className="text-sm font-medium text-gray-900">
                        {partnership.commissionOverride?.percentage ? `${partnership.commissionOverride.percentage}%` : getCommissionPercentage(partnership.tier)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Applied</span>
                      <span className="text-sm text-gray-900">{new Date(partnership.createdAt).toLocaleDateString()}</span>
                    </div>
                    {partnership.approvedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Approved</span>
                        <span className="text-sm text-gray-900">{new Date(partnership.approvedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button className="w-full py-2 text-center text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View (Table) */
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr. No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {partners.map((partnership, index) => (
                    <tr key={partnership._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {(page - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                            {partnership.partnerId?.firstName?.charAt(0)}{partnership.partnerId?.lastName?.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">{partnership.partnerId?.firstName} {partnership.partnerId?.lastName}</p>
                            <p className="text-sm text-gray-500">{partnership.partnerId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(partnership.status)}`}>
                          {partnership.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getKycBadge(partnership.kycStatus)}`}>
                          {(partnership.kycStatus || 'pending').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                          {partnership.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {partnership.commissionOverride?.percentage ? `${partnership.commissionOverride.percentage}%` : getCommissionPercentage(partnership.tier)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(partnership.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {partnership.approvedAt ? new Date(partnership.approvedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/company/partners/${partnership._id}`)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (keeps original mobile view) */}
            <div className="md:hidden divide-y divide-gray-100">
              {partners.map((partnership) => (
                <div
                  key={partnership._id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/company/partners/${partnership._id}`)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                      {partnership.partnerId?.firstName?.charAt(0)}{partnership.partnerId?.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{partnership.partnerId?.firstName} {partnership.partnerId?.lastName}</p>
                      <p className="text-sm text-gray-500 truncate">{partnership.partnerId?.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(partnership.status)}`}>
                      {partnership.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getKycBadge(partnership.kycStatus)}`}>
                      {(partnership.kycStatus || 'pending').replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                      {partnership.tier}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-500">Commission:</span>
                    <span className="font-medium text-gray-900">
                      {partnership.commissionOverride?.percentage ? `${partnership.commissionOverride.percentage}%` : getCommissionPercentage(partnership.tier)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                      Applied: {new Date(partnership.createdAt).toLocaleDateString()}
                    </span>
                    {partnership.approvedAt && (
                      <span className="text-gray-400">
                        Approved: {new Date(partnership.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              total={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setPage(1); }}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Partners;