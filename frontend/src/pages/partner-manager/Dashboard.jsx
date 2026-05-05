import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const PartnerManagerDashboard = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner_manager;
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    pendingPartners: 0,
    suspendedPartners: 0,
    tiers: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partners/stats');
      const data = response.data?.data || {};

      setStats({
        totalPartners: data.overview?.total || 0,
        activePartners: data.overview?.active || 0,
        pendingPartners: data.overview?.pending || 0,
        suspendedPartners: data.byStatus?.suspended || data.byStatus?.rejected || 0,
        tiers: {
          bronze: data.byTier?.bronze || 0,
          silver: data.byTier?.silver || 0,
          gold: data.byTier?.gold || 0,
          platinum: data.byTier?.platinum || 0
        }
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Partner Management" subtitle="Manage channel partners and onboarding" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">Manage your partner relationships effectively.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/partner-manager/partners')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Partners</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPartners}</p>
                <p className="text-sm text-teal-600 mt-1">In your network</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/partner-manager/partners?status=active')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Active Partners</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activePartners}</p>
                <p className="text-sm text-green-600 mt-1">Currently active</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/partner-manager/partners?status=pending')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Approval</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingPartners}</p>
                <p className="text-sm text-yellow-600 mt-1">Awaiting review</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/partner-manager/partners?status=suspended')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Suspended</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.suspendedPartners}</p>
                <p className="text-sm text-red-600 mt-1">Inactive partners</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partner Tiers Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner Tiers Overview</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🥉</span>
                <span className="font-semibold text-amber-800">Bronze</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{stats.tiers.bronze}</p>
              <p className="text-sm text-amber-600">New partners</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🥈</span>
                <span className="font-semibold text-gray-800">Silver</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.tiers.silver}</p>
              <p className="text-sm text-gray-600">Growing partners</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🥇</span>
                <span className="font-semibold text-yellow-800">Gold</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{stats.tiers.gold}</p>
              <p className="text-sm text-yellow-600">Experienced</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💎</span>
                <span className="font-semibold text-purple-800">Platinum</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.tiers.platinum}</p>
              <p className="text-sm text-purple-600">Top performers</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/partner-manager/partners')} className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            View Partners
          </button>
          <button onClick={() => navigate('/company/kyc-verification')} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            KYC Review
          </button>
          <button onClick={() => navigate('/partner-manager/visits')} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Manage Visits
          </button>
          <button onClick={() => navigate('/company/agreements')} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Agreements
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Partner Activity</h3>
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>No recent partner activity</p>
          <p className="text-sm mt-1">Partner activities will appear here</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PartnerManagerDashboard;