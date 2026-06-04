import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const CompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = sidebarConfig.platform_admin;
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [stats, setStats] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/companies/${id}`);
      setCompany(response.data.data.company);
      setStats(response.data.data.stats);
      setSubscriptionHistory(response.data.data.subscriptionHistory || []);
      setCurrentSubscription(response.data.data.currentSubscription);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load company';
      setError(errorMessage);
      toast.error(errorMessage);
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
      toast.success('Status updated successfully.');
      setStatusModal(false);
      fetchCompany();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
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

  const getSubscriptionBadge = (subscription) => {
    if (!subscription) return 'bg-gray-100 text-gray-800';

    const status = subscription.status;
    const planName = subscription.planId?.name?.toLowerCase();

    // If subscription is not active/trial, show status-based styling
    if (status === 'expired' || status === 'cancelled') {
      return 'bg-red-100 text-red-800';
    }
    if (status === 'suspended' || status === 'inactive') {
      return 'bg-orange-100 text-orange-800';
    }

    // Style based on plan tier
    const planStyles = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      basic: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    };
    return planStyles[planName] || 'bg-gray-100 text-gray-800';
  };

  const getSubscriptionDisplay = (subscription) => {
    if (!subscription) return 'No Plan';

    // If on trial
    if (subscription.status === 'trial') {
      return 'Trial';
    }

    // Show plan name
    if (subscription.planId?.displayName) {
      return subscription.planId.displayName;
    }
    if (subscription.planId?.name) {
      return subscription.planId.name.charAt(0).toUpperCase() + subscription.planId.name.slice(1);
    }

    // Fallback based on status
    if (subscription.status === 'expired') return 'Expired';
    if (subscription.status === 'cancelled') return 'Cancelled';
    if (subscription.status === 'suspended') return 'Suspended';

    return 'No Plan';
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
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getSubscriptionBadge(company?.subscription)}`}>
            {getSubscriptionDisplay(company?.subscription)}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Currency</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{company?.defaultCurrency}</p>
        </div>
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
          </div>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {company?.subscription?.planId?.displayName || company?.subscription?.planId?.name || 'No Plan'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Subscription Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium mt-1 ${
              company?.subscription?.status === 'active' ? 'bg-green-100 text-green-800' :
              company?.subscription?.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
              company?.subscription?.status === 'suspended' ? 'bg-orange-100 text-orange-800' :
              company?.subscription?.status === 'expired' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {company?.subscription?.status?.charAt(0).toUpperCase() + company?.subscription?.status?.slice(1) || 'Unknown'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Period End</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {company?.subscription?.currentPeriodEnd
                ? new Date(company.subscription.currentPeriodEnd).toLocaleDateString()
                : company?.subscription?.trialEndsAt
                  ? new Date(company.subscription.trialEndsAt).toLocaleDateString() + ' (Trial)'
                  : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Days Remaining</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {company?.subscription?.currentPeriodEnd
                ? Math.max(0, Math.ceil((new Date(company.subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))) + ' days'
                : company?.subscription?.trialEndsAt
                  ? Math.max(0, Math.ceil((new Date(company.subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))) + ' days (Trial)'
                  : 'N/A'}
            </p>
          </div>
        </div>
        {currentSubscription && currentSubscription.payments && currentSubscription.payments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {currentSubscription.currency === 'INR' ? '₹' : currentSubscription.currency === 'AED' ? 'د.إ' : '$'}
                  {currentSubscription.amount?.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500">/{currentSubscription.billingPeriod || 'month'}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Billing Period</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {currentSubscription.billingPeriod?.charAt(0).toUpperCase() + currentSubscription.billingPeriod?.slice(1) || 'Monthly'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Period Start</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {currentSubscription.currentPeriodStart
                    ? new Date(currentSubscription.currentPeriodStart).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Billing History */}
      {subscriptionHistory && subscriptionHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptionHistory.map((sub) => (
                  <tr key={sub._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {sub.planId?.displayName || sub.planId?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {sub.currency === 'INR' ? '₹' : sub.currency === 'AED' ? 'د.إ' : '$'}
                      {sub.amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800' :
                        sub.status === 'completed' ? 'bg-green-100 text-green-800' :
                        sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        sub.status === 'failed' ? 'bg-red-100 text-red-800' :
                        sub.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sub.status?.charAt(0).toUpperCase() + sub.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sub.billingPeriod?.charAt(0).toUpperCase() + sub.billingPeriod?.slice(1) || 'Monthly'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      {currentSubscription && currentSubscription.payments && currentSubscription.payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentSubscription.payments.map((payment, index) => (
                  <tr key={payment._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.currency === 'INR' ? '₹' : payment.currency === 'AED' ? 'د.إ' : '$'}
                      {payment.amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        payment.status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setPaymentModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Payment Details Modal */}
      {paymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
              <button
                onClick={() => {
                  setPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
                  <p className="text-sm text-gray-900">
                    {selectedPayment.currency === 'INR' ? '₹' : selectedPayment.currency === 'AED' ? 'د.إ' : '$'}
                    {selectedPayment.amount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedPayment.status === 'failed' ? 'bg-red-100 text-red-800' :
                    selectedPayment.status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedPayment.status?.charAt(0).toUpperCase() + selectedPayment.status?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Payment Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleDateString() : new Date(selectedPayment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Currency</label>
                  <p className="text-sm text-gray-900">{selectedPayment.currency || 'INR'}</p>
                </div>
              </div>
              {selectedPayment.invoiceNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Invoice Number</label>
                  <p className="text-sm text-gray-900">{selectedPayment.invoiceNumber}</p>
                </div>
              )}
              {selectedPayment.razorpayPaymentId && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Payment ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedPayment.razorpayPaymentId}</p>
                </div>
              )}
              {selectedPayment.invoiceUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Invoice</label>
                  <a
                    href={selectedPayment.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Invoice
                  </a>
                </div>
              )}
              {selectedPayment.failureReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Failure Reason</label>
                  <p className="text-sm text-red-600">{selectedPayment.failureReason}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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

export default CompanyDetails;