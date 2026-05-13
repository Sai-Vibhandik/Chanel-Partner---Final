import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Pagination from './Pagination';
import ExportButton from './ExportButton';

const PartnersList = ({
  sidebarConfig,
  basePath,
  themeColor = 'indigo',
  title = 'Partners',
  subtitle = 'Manage partners'
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'
  const itemsPerPage = 10;

  // Theme color classes
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-600',
      ring: 'focus:ring-indigo-500',
      border: 'focus:border-indigo-500',
      button: 'bg-indigo-600 hover:bg-indigo-700'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      ring: 'focus:ring-purple-500',
      border: 'focus:border-purple-500',
      button: 'bg-purple-600 hover:bg-purple-700'
    }
  };
  const colors = colorClasses[themeColor] || colorClasses.indigo;

  useEffect(() => {
    fetchPartners();
  }, [statusFilter, kycFilter, currentPage]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (kycFilter) params.append('kycStatus', kycFilter);
      if (search) params.append('search', search);
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/partner-company/company/${user.companyId}/partners?${params.toString()}`);
      setPartners(response.data.data.partnerships || []);
      setPagination(response.data.data.pagination || { total: 0, page: 1, pages: 0 });
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
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

  const getKYCStatusBadge = (kycStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[kycStatus] || 'bg-gray-100 text-gray-800';
  };

  // Stats calculation
  const stats = {
    total: pagination.total || partners.length,
    active: partners.filter(p => p.status === 'active').length,
    pending: partners.filter(p => p.status === 'pending').length,
    kycPending: partners.filter(p => p.kycStatus !== 'verified').length
  };

  // Export columns configuration
  const exportColumns = [
    { key: 'partnerId.firstName', header: 'First Name' },
    { key: 'partnerId.lastName', header: 'Last Name' },
    { key: 'partnerId.email', header: 'Email' },
    { key: 'partnerId.phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'tier', header: 'Tier' },
    { key: 'kycStatus', header: 'KYC Status' },
    { key: 'commissionPercentage', header: 'Commission' },
    { key: 'createdAt', header: 'Joined Date' }
  ];

  return (
    <>
      {/* Error */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Partners</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">KYC Pending</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{stats.kycPending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring} ${colors.border}`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring} ${colors.border}`}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
          </select>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring} ${colors.border}`}
          >
            <option value="">All KYC Status</option>
            <option value="pending">KYC Pending</option>
            <option value="submitted">KYC Submitted</option>
            <option value="verified">KYC Verified</option>
          </select>
          <button
            type="submit"
            className={`px-6 py-2 text-white rounded-lg transition-colors ${colors.button}`}
          >
            Search
          </button>
          <ExportButton
            data={partners}
            columns={exportColumns}
            filename="partners"
            title="Partners List"
          />
        </form>
      </div>

      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? `${colors.button} text-white`
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'card'
                ? `${colors.button} text-white`
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Cards
          </button>
        </div>
      </div>

      {/* Partners Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${colors.bg.replace('bg-', 'border-')}`}></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : partners.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 mb-2">No partners found</p>
            <p className="text-sm text-gray-400">Partners will appear here when they join your company</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {partners.map((partnership) => (
                  <tr key={partnership._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} font-semibold`}>
                          {partnership.partnerId?.firstName?.charAt(0)}{partnership.partnerId?.lastName?.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {partnership.partnerId?.firstName} {partnership.partnerId?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{partnership.partnerId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(partnership.status)}`}>
                        {partnership.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                        {partnership.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKYCStatusBadge(partnership.kycStatus)}`}>
                        {partnership.kycStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {partnership.commissionPercentage || 30}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(partnership.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`${basePath}${partnership._id}`)}
                        className={`px-4 py-2 text-white rounded-lg text-sm ${colors.button}`}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {partners.map((partnership) => (
                <div
                  key={partnership._id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
                  onClick={() => navigate(`${basePath}${partnership._id}`)}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} font-semibold text-lg`}>
                        {partnership.partnerId?.firstName?.charAt(0)}{partnership.partnerId?.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{partnership.partnerId?.firstName} {partnership.partnerId?.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{partnership.partnerId?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.539 3.52A3.985 3.985 0 004 9c0 2.21 3.582 4 8 4s8-1.79 8-4a3.983 3.983 0 00-1.382-3.016z" />
                      </svg>
                      <span className="text-sm text-gray-600 capitalize">{partnership.tier || 'Bronze'} Tier</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-sm text-gray-600">{partnership.commissionPercentage || 30}% Commission</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600">{new Date(partnership.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(partnership.status)}`}>
                        {partnership.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKYCStatusBadge(partnership.kycStatus)}`}>
                        {partnership.kycStatus || 'pending'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${basePath}${partnership._id}`);
                      }}
                      className={`${colors.text} hover:opacity-80 font-medium text-sm`}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            total={pagination.total}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </>
  );
};

export default PartnersList;