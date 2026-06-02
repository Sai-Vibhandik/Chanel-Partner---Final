import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import Pagination from '../../components/common/Pagination';

const Partners = () => {
  const navigate = useNavigate();
  const config = sidebarConfig.platform_admin;
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
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
    fetchStats();
  }, [debouncedSearch, page, statusFilter, kycFilter, tierFilter, itemsPerPage]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (kycFilter) params.append('kycStatus', kycFilter);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('page', page);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/partners?${params.toString()}`);
      setPartners(response.data.data.partners);
      setPagination(response.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  // Calculate KYC status from kycDocuments array
  const calculateKycStatus = (kycDocuments) => {
    if (!kycDocuments || kycDocuments.length === 0) {
      return 'pending';
    }

    const totalDocs = kycDocuments.length;
    const verifiedDocs = kycDocuments.filter(doc => doc.status === 'verified').length;
    const rejectedDocs = kycDocuments.filter(doc => doc.status === 'rejected').length;
    const pendingDocs = kycDocuments.filter(doc => doc.status === 'pending').length;

    if (verifiedDocs === totalDocs) {
      return 'verified';
    }
    if (rejectedDocs > 0 && pendingDocs === 0) {
      return 'rejected';
    }
    if (pendingDocs > 0) {
      return 'pending';
    }
    return 'submitted';
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (kycFilter) params.append('kycStatus', kycFilter);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('limit', 1000); // Export all

      const response = await api.get(`/partners?${params.toString()}`);
      const exportPartners = response.data.data.partners;

      // Create CSV content
      const headers = ['Name', 'Email', 'Phone', 'Status', 'KYC Status', 'Tier', 'Company Name', 'Business Type', 'Operating Region', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...exportPartners.map(partner => [
          `${partner.firstName} ${partner.lastName}`,
          partner.email,
          partner.phone || '',
          partner.partnerProfile?.status || 'pending',
          calculateKycStatus(partner.partnerProfile?.kycDocuments),
          partner.partnerProfile?.tier || 'bronze',
          partner.partnerProfile?.companyName || partner.companyId?.name || '',
          (() => { const types = { 'individual': 'Individual', 'proprietorship': 'Proprietorship', 'partnership': 'Partnership', 'llp': 'LLP', 'pvtltd': 'Pvt Ltd', 'freelancer': 'Freelancer' }; return types[partner.partnerProfile?.companyType] || partner.partnerProfile?.companyType || ''; })(),
          partner.partnerProfile?.operatingRegion || '',
          new Date(partner.createdAt).toLocaleDateString()
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

  const fetchStats = async () => {
    try {
      const response = await api.get('/partners/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
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

  return (
    <DashboardLayout sidebarLinks={config.links} title="All Partners" subtitle="View partners across all companies" color={config.color}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500">Total Partners</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.overview.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500">Active Partners</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.overview.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.overview.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.recent?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
          </select>
          <select
            value={kycFilter}
            onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All KYC</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
          </select>
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
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

      {/* View Toggle & Partners Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-500">
            {pagination.total} partner{pagination.total !== 1 ? 's' : ''} found
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

        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : partners.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No partners found</div>
        ) : viewMode === 'card' ? (
          /* Card View */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <div
                  key={partner._id}
                  onClick={() => navigate(`/platform/partners/${partner._id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {partner.firstName?.charAt(0)}{partner.lastName?.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {partner.firstName} {partner.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{partner.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(partner.partnerProfile?.status)}`}>
                      {partner.partnerProfile?.status?.replace('_', ' ') || 'pending'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Company</span>
                      <span className="text-sm font-medium text-gray-900">{partner.partnerProfile?.companyName || partner.companyId?.name || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tier</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partner.partnerProfile?.tier)}`}>
                        {partner.partnerProfile?.tier || 'bronze'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Joined</span>
                      <span className="text-sm text-gray-900">{new Date(partner.createdAt).toLocaleDateString()}</span>
                    </div>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {partners.map((partner, index) => (
                  <tr key={partner._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(page - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          {partner.firstName?.charAt(0)}{partner.lastName?.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{partner.firstName} {partner.lastName}</p>
                          <p className="text-sm text-gray-500">{partner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{partner.partnerProfile?.companyName || '-'}</p>
                      <p className="text-sm text-gray-500">{partner.companyId?.name || '-'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(partner.partnerProfile?.status)}`}>
                        {partner.partnerProfile?.status?.replace('_', ' ') || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partner.partnerProfile?.tier)}`}>
                        {partner.partnerProfile?.tier || 'bronze'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(partner.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => navigate(`/platform/partners/${partner._id}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View
                      </button>
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
            currentPage={page}
            totalPages={pagination.pages}
            total={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
            onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setPage(1); }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Partners;