import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const PartnerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;
  const [partnership, setPartnership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusModal, setStatusModal] = useState(false);
  const [tierModal, setTierModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newTier, setNewTier] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPartnership();
  }, [id]);

  const fetchPartnership = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/partner-company/${id}`);
      setPartnership(response.data.data.partnership);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load partner details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating(true);
      await api.put(`/partner-company/${id}/status`, {
        status: newStatus,
        adminNotes: reason
      });
      setStatusModal(false);
      fetchPartnership();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleTierUpdate = async () => {
    if (!newTier) return;

    try {
      setUpdating(true);
      await api.put(`/partner-company/${id}/tier`, {
        tier: newTier,
        reason
      });
      setTierModal(false);
      fetchPartnership();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tier');
    } finally {
      setUpdating(false);
    }
  };

  // Get partner user from partnership
  const partner = partnership?.partnerId;

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

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partner Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !partnership) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partner Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/company/partners')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Partners
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Partner Details" subtitle={`${partner?.firstName} ${partner?.lastName}`} color={config.color}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
            {partner?.firstName?.charAt(0)}{partner?.lastName?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{partner?.firstName} {partner?.lastName}</h2>
            </div>
            <p className="text-gray-500 mt-1">{partner?.email}</p>
            <div className="flex gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(partnership?.status)}`}>
                {partnership?.status?.replace('_', ' ') || 'pending'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTierBadge(partnership?.tier)}`}>
                {partnership?.tier || 'bronze'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setNewStatus(''); setReason(''); setStatusModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Update Status
          </button>
          <button
            onClick={() => { setNewTier(''); setReason(''); setTierModal(true); }}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Change Tier
          </button>
        </div>
      </div>

      {/* Partner Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">First Name</p>
                <p className="text-gray-900">{partner?.firstName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Name</p>
                <p className="text-gray-900">{partner?.lastName || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{partner?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900">{partner?.phone || partner?.partnerProfile?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Joined</p>
              <p className="text-gray-900">{new Date(partnership?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Company Name</p>
              <p className="text-gray-900">{partner?.partnerProfile?.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company Type</p>
              <p className="text-gray-900 capitalize">{partner?.partnerProfile?.companyType?.replace('_', ' ') || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Operating Region</p>
              <p className="text-gray-900 capitalize">{partner?.partnerProfile?.operatingRegion || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Website</p>
              <p className="text-gray-900">
                {partner?.partnerProfile?.website ? (
                  <a href={partner.partnerProfile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {partner.partnerProfile.website}
                  </a>
                ) : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        {(partnership?.adminNotes || partnership?.rejectionReason) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Notes</h3>
            {partnership?.rejectionReason && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Rejection Reason:</p>
                <p className="text-gray-900 mt-1">{partnership.rejectionReason}</p>
              </div>
            )}
            {partnership?.adminNotes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">Notes:</p>
                <p className="text-gray-900 mt-1">{partnership.adminNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Partner Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason/Notes (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason or notes..."
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {tierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Partner Tier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select tier</option>
                  <option value="bronze">Bronze (30% commission)</option>
                  <option value="silver">Silver (40% commission)</option>
                  <option value="gold">Gold (50% commission)</option>
                  <option value="platinum">Platinum (60% commission)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for tier change..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setTierModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTierUpdate}
                disabled={!newTier || updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PartnerDetails;