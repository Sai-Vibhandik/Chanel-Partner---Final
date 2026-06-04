import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

const CommissionDetails = () => {
  const { id } = useParams();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();
  const toast = useToast();

  const [commission, setCommission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommission();
  }, [id]);

  const fetchCommission = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/commissions/${id}`);
      setCommission(response.data.data.commission);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load commission');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending Approval',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return texts[status] || status;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  return (
    <DashboardLayout sidebarLinks={config.links} title="Commission Details" subtitle={`ID: ${commission._id?.slice(-8).toUpperCase()}`} color={config.color}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/commissions')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Commissions
      </button>

      {/* Status Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(commission.status)}`}>
              {getStatusText(commission.status)}
            </span>
            <p className="mt-2 text-gray-600">
              {commission.status === 'paid'
                ? 'Your commission has been paid out successfully.'
                : commission.status === 'approved'
                ? 'Your commission has been approved and is awaiting payment.'
                : commission.status === 'cancelled'
                ? 'This commission has been cancelled.'
                : 'Your commission is pending approval from the Finance Manager.'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium text-gray-900">{formatDate(commission.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Commission Amount Card */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm p-6 mb-6 text-white">
        <p className="text-green-100 text-sm mb-1">Commission Amount</p>
        <p className="text-4xl font-bold mb-3">
          {formatCurrency(commission.commission?.calculatedAmount, commission.commission?.currency)}
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-green-100">Tier:</span>{' '}
            <span className="font-medium">{commission.commission?.partnerTier}</span>
          </div>
          <div>
            <span className="text-green-100">Rate:</span>{' '}
            <span className="font-medium">{commission.commission?.effectivePercentage}%</span>
          </div>
        </div>
      </div>

      {/* Override Info */}
      {commission.approval?.override?.isOverridden && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Commission Adjusted</h3>
              <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Original Amount:</span>
                  <span className="text-gray-500 line-through">
                    {formatCurrency(commission.approval.override.originalAmount, commission.commission?.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Adjusted Amount:</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(commission.approval.override.overriddenAmount, commission.commission?.currency)}
                  </span>
                </div>
                {commission.approval.override.overridePercentage && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">New Rate:</span>
                    <span className="font-medium">{commission.approval.override.overridePercentage}%</span>
                  </div>
                )}
                {commission.approval.override.reason && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Reason:</p>
                    <p className="text-gray-800">{commission.approval.override.reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sale Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sale Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Sale Price</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(commission.saleDetails?.salePrice, commission.commission?.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Sale Date</span>
              <span className="font-medium text-gray-900">{formatDate(commission.saleDetails?.saleDate)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Buyer Name</span>
              <span className="font-medium text-gray-900">{commission.saleDetails?.buyerName || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Contact Number</span>
              <span className="font-medium text-gray-900">{commission.saleDetails?.buyerPhone || 'N/A'}</span>
            </div>
            {commission.saleDetails?.buyerEmail && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Buyer Email</span>
                <span className="font-medium text-gray-900">{commission.saleDetails.buyerEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Property Name</span>
              <span className="font-medium text-gray-900">{commission.property?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900 capitalize">{commission.property?.type || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Location</span>
              <span className="font-medium text-gray-900">{commission.property?.location?.city || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Listed Price</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(commission.property?.pricing?.basePrice, commission.property?.pricing?.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Company & Payout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Company Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company</h3>
          <div className="flex items-center gap-4">
            {commission.partnershipId?.companyId?.logo ? (
              <img
                src={commission.partnershipId.companyId.logo}
                alt={commission.partnershipId.companyId.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-gray-400">
                  {commission.partnershipId?.companyId?.name?.charAt(0) || 'C'}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{commission.partnershipId?.companyId?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">
                Your Tier: <span className="font-medium capitalize">{commission.partnershipId?.tier || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Payout Details */}
        {commission.status === 'paid' && commission.payout?.paidAt && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Paid On</span>
                <span className="font-medium text-gray-900">{formatDate(commission.payout.paidAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium text-gray-900 capitalize">
                  {commission.payout.paymentMethod?.replace('_', ' ') || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Reference</span>
                <span className="font-medium text-gray-900">{commission.payout.paymentReference || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents Section */}
      {commission.documents && commission.documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commission.documents.map((doc, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize truncate">
                      {doc.type?.replace(/_/g, ' ') || 'Document'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {commission.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{commission.notes}</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CommissionDetails;