import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getDocumentViewUrl } from '../../utils/api';

const PartnerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = sidebarConfig.partner_manager;
  const toast = useToast();
  const [partnership, setPartnership] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusModal, setStatusModal] = useState(false);
  const [tierModal, setTierModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newTier, setNewTier] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [kycSummary, setKycSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

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

      // Fetch KYC summary
      const kycResponse = await api.get(`/partners/${id}/kyc`);
      setKycSummary(kycResponse.data.data.kycSummary);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating(true);
      await api.put(`/partners/${id}/status`, {
        status: newStatus,
        reason: reason
      });
      setStatusModal(false);
      setReason('');
      fetchPartner();
      toast.success('Partner status updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleTierUpdate = async () => {
    if (!newTier) return;

    // Check if tier is the same as current tier
    if (newTier === partner?.partnerProfile?.tier) {
      toast.info('No changes detected. Tier is already ' + newTier + '.');
      setTierModal(false);
      return;
    }

    try {
      setUpdating(true);
      await api.put(`/partners/${id}/tier`, {
        tier: newTier,
        reason: reason
      });
      setTierModal(false);
      setReason('');
      fetchPartner();
      toast.success('Partner tier updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier');
    } finally {
      setUpdating(false);
    }
  };

  // KYC Document Verification
  const handleVerifyDocument = async (documentId, status, rejectionReason = '') => {
    try {
      setUpdating(true);
      await api.put(`/partners/${id}/kyc/${documentId}/verify`, {
        status,
        reason: rejectionReason
      });
      fetchPartner(); // Refresh to get updated KYC summary
      toast.success('Document verified successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify document');
    } finally {
      setUpdating(false);
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

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partner Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !partner) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partner Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/partner-manager/partners')}
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
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-2xl">
            {partner?.firstName?.charAt(0)}{partner?.lastName?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{partner?.firstName} {partner?.lastName}</h2>
            </div>
            <p className="text-gray-500 mt-1">{partner?.email}</p>
            <div className="flex gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(partner?.partnerProfile?.status)}`}>
                {partner?.partnerProfile?.status?.replace('_', ' ') || 'pending'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTierBadge(partner?.partnerProfile?.tier)}`}>
                {partner?.partnerProfile?.tier || 'bronze'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setNewStatus(''); setReason(''); setStatusModal(true); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Update Status
          </button>
          <button
            onClick={() => { setNewTier(partner?.partnerProfile?.tier || 'bronze'); setReason(''); setTierModal(true); }}
            className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
          >
            Change Tier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'info'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Partner Information
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'kyc'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          KYC Documents
          {kycSummary && kycSummary.verified < kycSummary.totalRequired && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              {kycSummary.totalRequired - kycSummary.verified} pending
            </span>
          )}
        </button>
      </div>

      {/* KYC Tab Content */}
      {activeTab === 'kyc' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          {!kycSummary ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* KYC Progress */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">KYC Verification</h3>
                  <p className="text-sm text-gray-500">
                    {kycSummary.verified} of {kycSummary.totalRequired} documents verified
                  </p>
                </div>
                <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
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

              {/* Document List */}
              <div className="space-y-4">
                {kycSummary.requiredDocuments?.map((reqDoc) => {
                  const doc = reqDoc.document;
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
                              {reqDoc.name}{reqDoc.required && <span className="text-red-500">*</span>}
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                View
                              </a>
                              {doc.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleVerifyDocument(doc._id, 'verified')}
                                    disabled={updating}
                                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Enter rejection reason:');
                                      if (reason) handleVerifyDocument(doc._id, 'rejected', reason);
                                    }}
                                    disabled={updating}
                                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {doc.status === 'rejected' && (
                                <button
                                  onClick={() => handleVerifyDocument(doc._id, 'verified')}
                                  disabled={updating}
                                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
              </div>

              {/* Summary */}
              <div className={`mt-6 p-4 rounded-lg ${
                kycSummary.verified === kycSummary.totalRequired
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {kycSummary.verified === kycSummary.totalRequired ? (
                  <p className="text-green-700 text-sm">
                    ✅ All KYC documents verified. Partner is ready for approval.
                  </p>
                ) : (
                  <p className="text-yellow-700 text-sm">
                    ⚠️ {kycSummary.totalRequired - kycSummary.verified} document(s) need verification.
                    {!kycSummary.uploaded && ' Waiting for partner to upload documents.'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Partner Information Tab Content */}
      {activeTab === 'info' && (
      <>
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
              <p className="text-gray-900">{new Date(partner?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Your Company/Business Name</p>
              <p className="text-gray-900">{partner?.partnerProfile?.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Business Type</p>
              <p className="text-gray-900">{(() => {
                const types = { 'individual': 'Individual', 'proprietorship': 'Proprietorship', 'partnership': 'Partnership', 'llp': 'LLP', 'pvtltd': 'Pvt Ltd', 'freelancer': 'Freelancer' };
                return types[partner?.partnerProfile?.companyType] || partner?.partnerProfile?.companyType?.replace('_', ' ') || '-';
              })()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Operating Region</p>
              <p className="text-gray-900 capitalize">{partner?.partnerProfile?.operatingRegion || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Website</p>
              <p className="text-gray-900">
                {partner?.partnerProfile?.website ? (
                  <a href={partner.partnerProfile.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                    {partner.partnerProfile.website}
                  </a>
                ) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Assigned Company</p>
              <p className="text-gray-900">{partner?.companyId?.name || '-'}</p>
            </div>
          </div>
        </div>

        {/* India Documents */}
        {partner?.partnerProfile?.operatingRegion === 'india' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">India Documents</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">GST Number</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.gstNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.panNumber || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">RERA Number</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.reraNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trade License</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.tradeLicenseNumber || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dubai Documents */}
        {partner?.partnerProfile?.operatingRegion === 'dubai' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dubai Documents</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trade License</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.tradeLicenseNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dubai RERA Number</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.dubaiReraNumber || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Emirates ID</p>
                  <p className="text-gray-900 font-mono">{partner?.partnerProfile?.emiratesId || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
          <div className="space-y-4">
            {partner?.partnerProfile?.address?.street && (
              <div>
                <p className="text-sm text-gray-500">Street</p>
                <p className="text-gray-900">{partner.partnerProfile.address.street}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="text-gray-900">{partner?.partnerProfile?.address?.city || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="text-gray-900">{partner?.partnerProfile?.address?.state || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Country</p>
                <p className="text-gray-900">{partner?.partnerProfile?.address?.country || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zip Code</p>
                <p className="text-gray-900">{partner?.partnerProfile?.address?.zipCode || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        {partner?.partnerProfile?.bankDetails && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="text-gray-900">{partner.partnerProfile.bankDetails.bankName || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="text-gray-900 font-mono">{partner.partnerProfile.bankDetails.accountNumber ? `****${partner.partnerProfile.bankDetails.accountNumber.slice(-4)}` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IFSC/Swift Code</p>
                  <p className="text-gray-900 font-mono">{partner.partnerProfile.bankDetails.ifscCode || partner.partnerProfile.bankDetails.swiftCode || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {(partner?.partnerProfile?.adminNotes || partner?.partnerProfile?.rejectionReason) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Notes</h3>
            {partner?.partnerProfile?.rejectionReason && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Rejection Reason:</p>
                <p className="text-gray-900 mt-1">{partner.partnerProfile.rejectionReason}</p>
              </div>
            )}
            {partner?.partnerProfile?.adminNotes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">Notes:</p>
                <p className="text-gray-900 mt-1">{partner.partnerProfile.adminNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select tier</option>
                  <option value="bronze">Bronze ({companySettings?.settings?.tierPercentages?.bronze || 25}% commission)</option>
                  <option value="silver">Silver ({companySettings?.settings?.tierPercentages?.silver || 35}% commission)</option>
                  <option value="gold">Gold ({companySettings?.settings?.tierPercentages?.gold || 50}% commission)</option>
                  <option value="platinum">Platinum ({companySettings?.settings?.tierPercentages?.platinum || 75}% commission)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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