import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const CompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = sidebarConfig.platform_admin;
  const [company, setCompany] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/companies/${id}`);
      setCompany(response.data.data.company);
      setStats(response.data.data.stats);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating(true);
      await api.put(`/companies/${id}/status`, {
        status: newStatus,
        reason: statusReason
      });
      setStatusModal(false);
      fetchCompany();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getSubscriptionBadge = (plan) => {
    const styles = {
      trial: 'bg-purple-100 text-purple-800',
      basic: 'bg-blue-100 text-blue-800',
      professional: 'bg-indigo-100 text-indigo-800',
      enterprise: 'bg-green-100 text-green-800'
    };
    return styles[plan] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Company Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !company) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Company Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/platform/companies')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Companies
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Company Details" subtitle={company?.name} color={config.color}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">
            {company?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{company?.name}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(company?.status)}`}>
                {company?.status?.charAt(0).toUpperCase() + company?.status?.slice(1)}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{company?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { setNewStatus(''); setStatusReason(''); setStatusModal(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Change Status
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Partners</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalPartners || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Staff Members</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalStaff || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Subscription</p>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getSubscriptionBadge(company?.subscription?.plan)}`}>
            {company?.subscription?.plan?.charAt(0).toUpperCase() + company?.subscription?.plan?.slice(1) || 'Trial'}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Currency</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{company?.defaultCurrency}</p>
        </div>
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900">{company?.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Website</p>
              <p className="text-gray-900">
                {company?.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    {company.website}
                  </a>
                ) : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Operating Regions</p>
              <div className="flex gap-2 mt-1">
                {company?.regions?.includes('india') && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">India</span>
                )}
                {company?.regions?.includes('dubai') && (
                  <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-sm">Dubai</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-gray-900">{new Date(company?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
          <div className="space-y-4">
            {company?.address?.street && (
              <div>
                <p className="text-sm text-gray-500">Street</p>
                <p className="text-gray-900">{company.address.street}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="text-gray-900">{company?.address?.city || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="text-gray-900">{company?.address?.state || 'Not provided'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Country</p>
                <p className="text-gray-900">{company?.address?.country || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zip Code</p>
                <p className="text-gray-900">{company?.address?.zipCode || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* India Config */}
        {company?.regions?.includes('india') && company?.indiaConfig && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">India Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">GST Number</p>
                  <p className="text-gray-900">{company.indiaConfig.gstNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="text-gray-900">{company.indiaConfig.panNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">RERA Number</p>
                  <p className="text-gray-900">{company.indiaConfig.reraNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CIN Number</p>
                  <p className="text-gray-900">{company.indiaConfig.cinNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dubai Config */}
        {company?.regions?.includes('dubai') && company?.dubaiConfig && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dubai Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trade License</p>
                  <p className="text-gray-900">{company.dubaiConfig.tradeLicenseNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">DLD Number</p>
                  <p className="text-gray-900">{company.dubaiConfig.dldNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">VAT Number</p>
                  <p className="text-gray-900">{company.dubaiConfig.vatNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tasheel Number</p>
                  <p className="text-gray-900">{company.dubaiConfig.tasheelNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Master Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Bronze Commission</p>
              <p className="text-xl font-bold text-gray-900">{company?.settings?.tierPercentages?.bronze || 30}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Silver Commission</p>
              <p className="text-xl font-bold text-gray-900">{company?.settings?.tierPercentages?.silver || 40}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gold Commission</p>
              <p className="text-xl font-bold text-gray-900">{company?.settings?.tierPercentages?.gold || 50}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Platinum Commission</p>
              <p className="text-xl font-bold text-gray-900">{company?.settings?.tierPercentages?.platinum || 60}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Default Commission</p>
              <p className="text-xl font-bold text-gray-900">{company?.settings?.defaultCommissionPercentage || 5}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Chat Enabled</p>
              <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${company?.settings?.features?.chatEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {company?.settings?.features?.chatEnabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Analytics Enabled</p>
              <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${company?.settings?.features?.analyticsEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {company?.settings?.features?.analyticsEnabled ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Company Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter reason for status change..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={!newStatus || updating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CompanyDetails;