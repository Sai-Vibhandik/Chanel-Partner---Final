import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const CommissionDetails = () => {
  const { id } = useParams();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();

  const [commission, setCommission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCommission();
  }, [id]);

  const fetchCommission = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/commissions/${id}`);
      setCommission(response.data.data.commission);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load commission');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_legal_review: 'bg-yellow-100 text-yellow-800',
      pending_approval: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending_legal_review: 'Pending Legal Review',
      pending_approval: 'Pending Finance Approval',
      approved: 'Approved',
      paid: 'Paid',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    };
    return texts[status] || status;
  };

  const getStatusInfo = (status) => {
    const info = {
      pending_legal_review: { color: 'yellow', icon: '⏳', message: 'Your commission is being reviewed by the Legal Manager. Please ensure all documents are uploaded.' },
      pending_approval: { color: 'blue', icon: '📋', message: 'Legal review passed. Your commission is pending approval from the Finance Manager.' },
      approved: { color: 'green', icon: '✓', message: 'Your commission has been approved and is awaiting payout.' },
      paid: { color: 'purple', icon: '✓✓', message: 'Your commission has been paid out successfully.' },
      rejected: { color: 'red', icon: '✗', message: 'Your commission was rejected. Please check the rejection reason below.' },
      cancelled: { color: 'gray', icon: '-', message: 'This commission has been cancelled.' }
    };
    return info[status] || info.pending_legal_review;
  };

  const formatCurrency = (amount, currency = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : 'AED ';
    if (amount >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(2)} Lac`;
    }
    return `${symbol}${amount?.toLocaleString() || '0'}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Commission Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!commission) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Commission Details" subtitle="Not Found" color={config.color}>
        <div className="text-center py-12">
          <p className="text-gray-500">Commission not found</p>
          <button
            onClick={() => navigate('/partner/commissions')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Back to Commissions
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = getStatusInfo(commission.status);

  return (
    <DashboardLayout sidebarLinks={config.links} title="Commission Details" subtitle={`ID: ${commission._id?.slice(-8).toUpperCase()}`} color={config.color}>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/commissions')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Commissions
      </button>

      {/* Status Banner */}
      <div className={`rounded-xl p-6 mb-6 ${
        statusInfo.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
        statusInfo.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
        statusInfo.color === 'green' ? 'bg-green-50 border border-green-200' :
        statusInfo.color === 'red' ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            statusInfo.color === 'yellow' ? 'bg-yellow-200' :
            statusInfo.color === 'blue' ? 'bg-blue-200' :
            statusInfo.color === 'green' ? 'bg-green-200' :
            statusInfo.color === 'red' ? 'bg-red-200' :
            'bg-gray-200'
          }`}>
            <span className="text-2xl">{statusInfo.icon}</span>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(commission.status)}`}>
              {getStatusText(commission.status)}
            </span>
            <p className="mt-2 text-gray-700">{statusInfo.message}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission Amount Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Commission Amount</h3>
            <p className="text-4xl font-bold text-green-600 mb-4">
              {formatCurrency(
                commission.commission?.calculatedAmount,
                commission.commission?.currency
              )}
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Tier: <span className="font-medium capitalize">{commission.commission?.partnerTier}</span></p>
              <p>Rate: <span className="font-medium text-green-600">{commission.commission?.effectivePercentage}%</span></p>
            </div>
          </div>
        </div>

        {/* Details Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sale Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Sale Price</span>
                <span className="font-medium">
                  {formatCurrency(
                    commission.saleDetails?.salePrice,
                    commission.commission?.currency
                  )}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Sale Date</span>
                <span className="font-medium">{formatDate(commission.saleDetails?.saleDate)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Buyer Name</span>
                <span className="font-medium">{commission.saleDetails?.buyerName}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Buyer Phone</span>
                <span className="font-medium">{commission.saleDetails?.buyerPhone}</span>
              </div>
              {commission.saleDetails?.buyerEmail && (
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Buyer Email</span>
                  <span className="font-medium">{commission.saleDetails.buyerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Property Name</span>
                <span className="font-medium">{commission.property?.name}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Type</span>
                <span className="font-medium capitalize">{commission.property?.type}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Location</span>
                <span className="font-medium">{commission.property?.location?.city}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Listed Price</span>
                <span className="font-medium">
                  {formatCurrency(
                    commission.property?.pricing?.basePrice,
                    commission.property?.pricing?.currency
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company</h3>

            <div className="flex items-center gap-4">
              {commission.partnershipId?.companyId?.logo && (
                <img
                  src={commission.partnershipId.companyId.logo}
                  alt={commission.partnershipId.companyId.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{commission.partnershipId?.companyId?.name}</p>
                <p className="text-sm text-gray-500">Your tier: <span className="font-medium capitalize">{commission.partnershipId?.tier}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Details (if paid) */}
      {commission.status === 'paid' && commission.payoutDetails?.paidAt && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Paid On</span>
              <span className="font-medium">{formatDate(commission.payoutDetails.paidAt)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium capitalize">{commission.payoutDetails.paymentMethod?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Reference</span>
              <span className="font-medium">{commission.payoutDetails.paymentReference}</span>
            </div>
          </div>
        </div>
      )}

      {/* Documents Section */}
      {commission.documents && commission.documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commission.documents.map((doc, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {doc.type?.replace(/_/g, ' ') || 'Document'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Document
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {(commission.notes || commission.rejectionReason) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>

          {commission.notes && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Notes:</p>
              <p className="text-gray-900">{commission.notes}</p>
            </div>
          )}

          {commission.rejectionReason && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 mb-1">Rejection Reason:</p>
              <p className="text-red-800">{commission.rejectionReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Commission Created</p>
              <p className="text-sm text-gray-500">{formatDate(commission.createdAt)}</p>
            </div>
          </div>

          {/* Legal Review Status */}
          {(commission.status === 'pending_legal_review' || commission.status === 'pending_approval' || commission.status === 'approved' || commission.status === 'paid') && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Legal Review Passed</p>
                <p className="text-sm text-gray-500">Documents verified by Legal Manager</p>
              </div>
            </div>
          )}

          {/* Rejected at Legal */}
          {commission.status === 'rejected' && commission.rejectionReason?.startsWith('[Legal]') && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Rejected by Legal</p>
                <p className="text-sm text-gray-500">{formatDate(commission.updatedAt)}</p>
              </div>
            </div>
          )}

          {/* Finance Approval */}
          {(commission.status === 'approved' || commission.status === 'paid') && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Approved by Finance</p>
                <p className="text-sm text-gray-500">{formatDate(commission.updatedAt)}</p>
              </div>
            </div>
          )}

          {/* Rejected at Finance */}
          {commission.status === 'rejected' && !commission.rejectionReason?.startsWith('[Legal]') && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Rejected by Finance</p>
                <p className="text-sm text-gray-500">{formatDate(commission.updatedAt)}</p>
              </div>
            </div>
          )}

          {commission.status === 'paid' && commission.payoutDetails?.paidAt && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Paid Out</p>
                <p className="text-sm text-gray-500">{formatDate(commission.payoutDetails.paidAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CommissionDetails;