import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const PlatformDashboard = () => {
  const { user } = useAuth();
  const config = sidebarConfig.platform_admin;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    pendingVerificationCompanies: 0,
    suspendedCompanies: 0,
    totalPartners: 0,
    activePartners: 0,
    companiesByRegion: { india: 0, dubai: 0 },
    companiesByStatus: {},
    recentCompanies: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch company stats
      const companyRes = await api.get('/companies/stats');
      const companyData = companyRes.data.data || {};

      // Fetch partner stats
      const partnerRes = await api.get('/partners/stats');
      const partnerData = partnerRes.data.data || {};

      setStats({
        totalCompanies: companyData.overview?.total || 0,
        activeCompanies: companyData.overview?.active || 0,
        pendingCompanies: companyData.overview?.pending || 0,
        pendingVerificationCompanies: companyData.overview?.pendingVerification || 0,
        suspendedCompanies: companyData.overview?.suspended || 0,
        totalPartners: partnerData.overview?.total || 0,
        activePartners: partnerData.overview?.active || 0,
        companiesByRegion: companyData.byRegion || { india: 0, dubai: 0 },
        companiesByStatus: companyData.byStatus || {},
        recentCompanies: companyData.recent || []
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      pending_verification: 'bg-orange-100 text-orange-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Platform Dashboard" subtitle="Manage all companies and platform operations" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">Here's what's happening across the platform today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.totalCompanies}</p>
              <p className="text-sm text-indigo-600 mt-1">On platform</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Companies</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{loading ? '...' : stats.activeCompanies}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.totalCompanies > 0 ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100) : 0}% active</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Partners</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{loading ? '...' : stats.totalPartners}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.activePartners} active</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Companies by Region */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Companies by Region</h3>
          <div className="space-y-4">
            {/* India Only */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🇮🇳</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">India Only</p>
                  <p className="text-sm text-gray-500">{stats.companiesByRegion.indiaOnly || 0} companies</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {stats.totalCompanies > 0 ? Math.round(((stats.companiesByRegion.indiaOnly || 0) / stats.totalCompanies) * 100) : 0}%
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${stats.totalCompanies > 0 ? Math.round(((stats.companiesByRegion.indiaOnly || 0) / stats.totalCompanies) * 100) : 0}%` }}
              ></div>
            </div>

            {/* Dubai Only */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🇦🇪</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dubai Only</p>
                  <p className="text-sm text-gray-500">{stats.companiesByRegion.dubaiOnly || 0} companies</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {stats.totalCompanies > 0 ? Math.round(((stats.companiesByRegion.dubaiOnly || 0) / stats.totalCompanies) * 100) : 0}%
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full"
                style={{ width: `${stats.totalCompanies > 0 ? Math.round(((stats.companiesByRegion.dubaiOnly || 0) / stats.totalCompanies) * 100) : 0}%` }}
              ></div>
            </div>

            {/* Both Regions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Both Regions</p>
                  <p className="text-sm text-gray-500">{stats.companiesByRegion.both || 0} companies</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {stats.totalCompanies > 0 ? Math.round(((stats.companiesByRegion.both || 0) / stats.totalCompanies) * 100) : 0}%
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full"
                style={{ width: `${stats.totalCompanies > 0 ? Math.round(((stats.companiesByRegion.both || 0) / stats.totalCompanies) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Companies by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Companies by Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <span className="font-medium text-gray-900">Active</span>
                  <p className="text-xs text-gray-500">Fully operational</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor('active')}`}>
                {stats.activeCompanies}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <span className="font-medium text-gray-900">Pending Verification</span>
                  <p className="text-xs text-gray-500">Documents under review</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                {stats.pendingVerificationCompanies}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <span className="font-medium text-gray-900">Suspended</span>
                  <p className="text-xs text-gray-500">Account suspended</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor('suspended')}`}>
                {stats.suspendedCompanies}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Companies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Companies</h3>
          <Link to="/platform/companies" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : stats.recentCompanies && stats.recentCompanies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentCompanies.slice(0, 5).map((company) => (
                  <tr key={company._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-sm">
                          {company.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{company.name}</p>
                          <p className="text-sm text-gray-500">{company.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {company.regions?.includes('india') && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">India</span>
                        )}
                        {company.regions?.includes('dubai') && (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs">Dubai</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                        {company.status?.charAt(0)?.toUpperCase() + company.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p>No companies registered yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlatformDashboard;