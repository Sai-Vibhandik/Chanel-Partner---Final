import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';

const Partners = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'

  useEffect(() => {
    fetchPartners();
  }, [statusFilter, tierFilter, page]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('page', page);
      params.append('limit', 10);

      const response = await api.get(`/partner-company/company/${user.companyId}/partners?${params.toString()}`);
      setPartners(response.data.data.partnerships);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPartners();
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
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

  // Count partners by status
  const activeCount = partners.filter(p => p.status === 'active').length;
  const pendingCount = partners.filter(p => p.status === 'pending').length;
  const suspendedCount = partners.filter(p => p.status === 'suspended').length;

  return (
    <DashboardLayout sidebarLinks={config.links} title="Partners" subtitle="Manage your company's channel partners" color={config.color}>
      {/* Error */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm flex-1 sm:flex-none"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm flex-1 sm:flex-none"
            >
              <option value="">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
          >
            Search
          </button>
        </form>
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
                      <span className="text-sm text-gray-500">Company</span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                        {partnership.partnerId?.partnerProfile?.companyName || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tier</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                        {partnership.tier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Joined</span>
                      <span className="text-sm text-gray-900">{new Date(partnership.createdAt).toLocaleDateString()}</span>
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
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {partners.map((partnership) => (
                    <tr key={partnership._id} className="hover:bg-gray-50">
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
                        <p className="text-sm text-gray-900">{partnership.partnerId?.partnerProfile?.companyName || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(partnership.status)}`}>
                          {partnership.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                          {partnership.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(partnership.createdAt).toLocaleDateString()}
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                      {partnership.tier}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      {partnership.partnerId?.partnerProfile?.companyName || 'No company'}
                    </span>
                    <span className="text-gray-400">
                      {new Date(partnership.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Partners;