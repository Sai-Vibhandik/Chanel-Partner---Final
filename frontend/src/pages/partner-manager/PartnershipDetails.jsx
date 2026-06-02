import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getDocumentViewUrl } from '../../utils/api';

const PartnershipDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const config = sidebarConfig.partner_manager;
  const toast = useToast();
  const [partnership, setPartnership] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [kycSummary, setKycSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [statusModal, setStatusModal] = useState(false);
  const [tierModal, setTierModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newTier, setNewTier] = useState('');
  const [reason, setReason] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchPartnership();
  }, [id]);

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

  const fetchPartnership = async () => {
    try {
      setLoading(true);
      setError(null);
      const [partnershipRes, kycRes] = await Promise.all([
        api.get(`/partner-company/${id}`),
        api.get(`/partner-company/${id}/kyc`)
      ]);
      setPartnership(partnershipRes.data.data.partnership);
      setKycSummary(kycRes.data.data.kycSummary);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load partnership';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId, status, rejectionReason = '') => {
    try {
      setUpdating(documentId);

      await api.put(`/partner-company/${id}/kyc/${documentId}/verify`, {
        status,
        reason: rejectionReason
      });

      toast.success(`Document ${status === 'verified' ? 'verified' : 'rejected'} successfully`);

      // Refresh KYC summary
      const kycRes = await api.get(`/partner-company/${id}/kyc`);
      setKycSummary(kycRes.data.data.kycSummary);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify document');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating('status');
      await api.put(`/partner-company/${id}/status`, {
        status: newStatus,
        reason
      });
      setStatusModal(false);
      setReason('');

      // Set success message based on status change
      const statusMessages = {
        pending: 'Partnership status changed to Pending. The partner will need to be approved again.',
        active: 'Partnership has been approved successfully.',
        suspended: 'Partnership has been suspended.'
      };
      toast.success(statusMessages[newStatus] || 'Status updated successfully.');

      fetchPartnership();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const handleTierUpdate = async () => {
    if (!newTier) return;

    try {
      setUpdating('tier');
      await api.put(`/partner-company/${id}/tier`, {
        tier: newTier
      });
      setTierModal(false);

      // Set success message based on tier change
      const tierNames = {
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold',
        platinum: 'Platinum'
      };
      toast.success(`Partner tier updated to ${tierNames[newTier] || newTier}.`);

      fetchPartnership();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier');
    } finally {
      setUpdating(null);
    }
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

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partnership Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !partnership) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partnership Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/partner-manager/partners')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Partners
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const partner = partnership?.partnerId;

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title={`${partner?.firstName} ${partner?.lastName}`}
      subtitle="Partnership Details"
      color={config.color}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/partner-manager/partners')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Partners
      </button>

      {/* Partner Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-2xl">
              {partner?.firstName?.charAt(0)}{partner?.lastName?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{partner?.firstName} {partner?.lastName}</h2>
              <p className="text-gray-500">{partner?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(partnership?.status)}`}>
                  {partnership?.status?.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTierBadge(partnership?.tier)}`}>
                  {partnership?.tier} Tier
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getKYCStatusBadge(partnership?.kycStatus)}`}>
                  KYC: {partnership?.kycStatus || 'pending'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setNewStatus(''); setReason(''); setStatusModal(true); }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Update Status
            </button>
            <button
              onClick={() => { setNewTier(''); setTierModal(true); }}
              className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
            >
              Change Tier
            </button>
          </div>
        </div>

        {/* Partner Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-gray-900">{partner?.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Commission Rate</p>
            <p className="text-gray-900 font-medium">{partnership?.commissionPercentage || 30}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Joined</p>
            <p className="text-gray-900">
              {partnership?.createdAt ? new Date(partnership.createdAt).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Company</p>
            <p className="text-gray-900">{partnership?.companyId?.name}</p>
          </div>
        </div>
      </div>

      {/* KYC Documents Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">KYC Documents</h3>
            <p className="text-sm text-gray-500">
              Verify documents uploaded by the partner
            </p>
          </div>
          {kycSummary && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {kycSummary.verified}/{kycSummary.totalRequired} verified
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    kycSummary.verified === kycSummary.totalRequired
                      ? 'bg-green-500'
                      : kycSummary.verified > 0
                      ? 'bg-yellow-500'
                      : 'bg-gray-300'
                  }`}
                  style={{ width: `${(kycSummary.verified / kycSummary.totalRequired) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!kycSummary ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : kycSummary.requiredDocuments?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents required for this region</p>
          </div>
        ) : (
          <div className="space-y-4">
            {kycSummary.requiredDocuments.map((reqDoc) => {
              const doc = reqDoc.document;
              const isUpdating = updating === doc?._id;

              const getStatusStyle = () => {
                if (!doc) return 'border-gray-200 bg-gray-50';
                if (doc.status === 'verified') return 'border-green-300 bg-green-50';
                if (doc.status === 'rejected') return 'border-red-300 bg-red-50';
                return 'border-yellow-300 bg-yellow-50';
              };

              return (
                <div
                  key={`${reqDoc.type}-${reqDoc.region}`}
                  className={`p-4 rounded-lg border-2 ${getStatusStyle()}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        !doc ? 'bg-gray-200' :
                        doc.status === 'verified' ? 'bg-green-100' :
                        doc.status === 'rejected' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {!doc ? (
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : doc.status === 'verified' ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : doc.status === 'rejected' ? (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>

                      {/* Document Info */}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {reqDoc.name}
                          {reqDoc.required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            reqDoc.region === 'india'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {reqDoc.region === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai'}
                          </span>
                          {doc && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                              doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          )}
                        </div>
                        {doc?.uploadedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        )}
                        {doc?.status === 'rejected' && doc.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2">
                            Reason: {doc.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!doc ? (
                        <span className="text-sm text-gray-500 italic">Not uploaded</span>
                      ) : (
                        <>
                          <a
                            href={getDocumentViewUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                          >
                            View
                          </a>
                          {doc.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVerifyDocument(doc._id, 'verified')}
                                disabled={isUpdating}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {isUpdating ? 'Verifying...' : 'Verify'}
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason) handleVerifyDocument(doc._id, 'rejected', reason);
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {doc.status === 'rejected' && (
                            <button
                              onClick={() => handleVerifyDocument(doc._id, 'verified')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              Re-verify
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className={`mt-6 p-4 rounded-lg ${
              kycSummary.verified === kycSummary.totalRequired
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {kycSummary.verified === kycSummary.totalRequired ? (
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800">All documents verified!</p>
                    <p className="text-sm text-green-700">This partner's KYC is complete for your company.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-yellow-800">KYC incomplete</p>
                    <p className="text-sm text-yellow-700">
                      {!kycSummary.uploaded ?
                        'Waiting for partner to upload documents.' :
                        `${kycSummary.totalRequired - kycSummary.verified} document(s) need verification.`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Partnership Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active (Approve)</option>
                  <option value="suspended">Suspend</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason/Notes (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Enter reason or notes..."
                />
                <p className="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Tier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select tier</option>
                  <option value="bronze">Bronze ({companySettings?.settings?.tierPercentages?.bronze || 25}% commission)</option>
                  <option value="silver">Silver ({companySettings?.settings?.tierPercentages?.silver || 35}% commission)</option>
                  <option value="gold">Gold ({companySettings?.settings?.tierPercentages?.gold || 50}% commission)</option>
                  <option value="platinum">Platinum ({companySettings?.settings?.tierPercentages?.platinum || 75}% commission)</option>
                </select>
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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

export default PartnershipDetails;