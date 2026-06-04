import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';

const CommissionDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.finance_manager;

  // Get basePath based on role for consistent URLs
  const getBasePath = () => {
    switch (user?.role) {
      case 'company_superadmin':
        return '/company/commissions';
      case 'partner_manager':
        return '/partner-manager/commissions';
      default:
        return '/finance-manager/commissions';
    }
  };
  const basePath = getBasePath();

  const navigate = useNavigate();
  const toast = useToast();

  const [commission, setCommission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [payForm, setPayForm] = useState({
    paymentReference: '',
    paymentMethod: 'bank_transfer',
    notes: ''
  });
  const [cancelReason, setCancelReason] = useState('');

  // Approve form with override options
  const [approveForm, setApproveForm] = useState({
    enableOverride: false,
    overrideType: 'amount', // 'amount' or 'percentage'
    overrideValue: '',
    overrideReason: ''
  });

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

  const handleApprove = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = {};
    if (approveForm.enableOverride) {
      if (!approveForm.overrideValue || approveForm.overrideValue <= 0) {
        errors.overrideValue = approveForm.overrideType === 'amount'
          ? 'Commission Amount must be greater than 0.'
          : 'Percentage must be between 0 and 100.';
      }
      if (!approveForm.overrideReason?.trim()) {
        errors.overrideReason = 'Override Reason is required.';
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    const payload = {};

    // Add override data if enabled
    if (approveForm.enableOverride && approveForm.overrideValue) {
      if (approveForm.overrideType === 'amount') {
        payload.overrideAmount = parseFloat(approveForm.overrideValue);
      } else {
        payload.overridePercentage = parseFloat(approveForm.overrideValue);
      }
      payload.overrideReason = approveForm.overrideReason;
    }

    setSubmitting(true);
    try {
      await api.put(`/commissions/${id}/approve`, payload);
      setShowApproveModal(false);
      setApproveForm({
        enableOverride: false,
        overrideType: 'amount',
        overrideValue: '',
        overrideReason: ''
      });
      fetchCommission();
      toast.success('Commission approved successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve commission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();

    // Validate payment reference for non-cash payment methods
    const errors = {};
    if (payForm.paymentMethod !== 'cash' && !payForm.paymentReference?.trim()) {
      errors.paymentReference = 'Payment Reference is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/commissions/${id}/pay`, payForm);
      setShowPayModal(false);
      setPayForm({ paymentReference: '', paymentMethod: 'bank_transfer', notes: '' });
      setFieldErrors({});
      fetchCommission();
      toast.success('Commission marked as paid successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as paid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();

    // Validate cancellation reason
    const errors = {};
    if (!cancelReason?.trim()) {
      errors.cancelReason = 'Cancellation Reason is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/commissions/${id}/cancel`, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
      setFieldErrors({});
      fetchCommission();
      toast.success('Commission cancelled successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel commission.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
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
            onClick={() => navigate(basePath)}
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
        onClick={() => navigate(basePath)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Commissions
      </button>

      {/* Status & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(commission.status)}`}>
              {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
            </span>
            <p className="text-sm text-gray-500 mt-2">
              Created: {formatDate(commission.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {commission.status === 'pending' && (
              <>
                {/* Approve/Cancel buttons only for finance_manager and company_superadmin */}
                {user?.role !== 'partner_manager' && (
                  <>
                    <button
                      onClick={() => { setFieldErrors({}); setShowApproveModal(true); }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setShowCancelModal(true); }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
            {commission.status === 'approved' && user?.role !== 'partner_manager' && (
              <button
                onClick={() => { setShowPayModal(true); }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Details</h3>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Commission Amount</span>
              <span className="font-bold text-green-600 text-lg">
                {formatCurrency(
                  commission.commission?.calculatedAmount,
                  commission.commission?.currency
                )}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Partner Tier</span>
              <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                commission.commission?.partnerTier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                commission.commission?.partnerTier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                commission.commission?.partnerTier === 'silver' ? 'bg-gray-100 text-gray-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {commission.commission?.partnerTier}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Commission Rate</span>
              <span className="font-medium text-green-600">{commission.commission?.effectivePercentage}%</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Base Rate</span>
              <span className="font-medium">{commission.commission?.propertyBasePercentage}%</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Tier Share</span>
              <span className="font-medium">{commission.commission?.partnerTierPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Sale Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sale Details</h3>

          <div className="space-y-4">
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
              <span className="text-gray-600">Contact Number</span>
              <span className="font-medium">{commission.saleDetails?.buyerPhone}</span>
            </div>
            {commission.saleDetails?.buyerEmail && (
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Buyer Email ID</span>
                <span className="font-medium">{commission.saleDetails.buyerEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Partner Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner Details</h3>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Name</span>
              <span className="font-medium">
                {commission.partner?.firstName} {commission.partner?.lastName}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Email</span>
              <span className="font-medium">{commission.partner?.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Tier</span>
              <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                commission.partnershipId?.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                commission.partnershipId?.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                commission.partnershipId?.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {commission.partnershipId?.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>

          <div className="space-y-4">
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
      </div>

      {/* Payout Details (if paid) */}
      {commission.status === 'paid' && commission.payout?.paidAt && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Paid On</span>
              <span className="font-medium">{formatDate(commission.payout.paidAt)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium capitalize">{commission.payout.paymentMethod?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Reference</span>
              <span className="font-medium">{commission.payout.paymentReference}</span>
            </div>
            {commission.payout.paidBy && (
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Processed By</span>
                <span className="font-medium">
                  {commission.payout.paidBy?.firstName} {commission.payout.paidBy?.lastName}
                </span>
              </div>
            )}
            {commission.payout.notes && (
              <div className="flex justify-between py-3 border-b border-gray-100 md:col-span-2">
                <span className="text-gray-600">Notes</span>
                <span className="font-medium">{commission.payout.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {(commission.notes || commission.cancellationReason) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>

          {commission.notes && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Notes:</p>
              <p className="text-gray-900">{commission.notes}</p>
            </div>
          )}

          {commission.cancellationReason && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 mb-1">Cancellation Reason:</p>
              <p className="text-red-800">{commission.cancellationReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Commission Override Info */}
      {commission.approval?.override?.isOverridden && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Commission Override Applied</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Original Amount:</span>
                  <span className="font-medium text-gray-600 line-through">
                    {formatCurrency(commission.approval.override.originalAmount, commission.commission?.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">New Amount:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(commission.approval.override.overriddenAmount, commission.commission?.currency)}
                  </span>
                </div>
                {commission.approval.override.overridePercentage && (
                  <div className="flex justify-between">
                    <span className="text-amber-700">Override Rate:</span>
                    <span className="font-medium">{commission.approval.override.overridePercentage}%</span>
                  </div>
                )}
                {commission.approval.override.reason && (
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Reason:</p>
                    <p className="text-gray-700">{commission.approval.override.reason}</p>
                  </div>
                )}
                {commission.approval.override.overriddenBy && (
                  <p className="text-xs text-gray-500 mt-2">
                    Overridden by: {commission.approval.override.overriddenBy.firstName} {commission.approval.override.overriddenBy.lastName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Mark as Paid</h3>
              <button
                onClick={() => { setShowPayModal(false); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePay} className="p-6 space-y-4" noValidate>
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Commission Amount: <span className="font-bold">
                    {formatCurrency(
                      commission.commission?.calculatedAmount,
                      commission.commission?.currency
                    )}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {payForm.paymentMethod === 'cash' ? (
                    'Payment Reference (Optional)'
                  ) : (
                    <>Payment Reference<span className="text-red-500">*</span></>
                  )}
                </label>
                <input
                  type="text"
                  value={payForm.paymentReference}
                  onChange={(e) => { setPayForm({ ...payForm, paymentReference: e.target.value }); setFieldErrors({}); }}
                  placeholder={payForm.paymentMethod === 'cash' ? 'e.g., Receipt Number' : 'Transaction ID / Cheque Number'}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${fieldErrors.paymentReference ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
                {fieldErrors.paymentReference && <p className="text-sm text-red-600 mt-1">{fieldErrors.paymentReference}</p>}
                {payForm.paymentMethod === 'cash' && !fieldErrors.paymentReference && (
                  <p className="text-xs text-gray-500 mt-1">Payment reference is optional for cash payments.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  rows={2}
                  maxLength={500}
                  placeholder="Add any additional notes about this payment..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  style={{ maxHeight: '150px' }}
                />
                <p className="text-xs text-gray-400 mt-1">{payForm.notes?.length || 0}/500 characters</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowPayModal(false); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Commission</h3>
              <button
                onClick={() => { setShowCancelModal(false); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCancel} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason<span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => { setCancelReason(e.target.value); setFieldErrors({}); }}
                  rows={3}
                  maxLength={500}
                  placeholder="Please provide a reason for cancellation."
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none ${fieldErrors.cancelReason ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  style={{ maxHeight: '150px' }}
                />
                <p className="text-xs text-gray-400 mt-1">{cancelReason?.length || 0}/500 characters</p>
                {fieldErrors.cancelReason && <p className="text-sm text-red-600 mt-1">{fieldErrors.cancelReason}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowCancelModal(false); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Cancelling...' : 'Cancel Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal with Override Option */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Approve Commission</h3>
              <button
                onClick={() => { setFieldErrors({}); setShowApproveModal(false); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleApprove} className="p-6 space-y-4" noValidate>
              {/* Current Commission Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Current Commission Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    commission.commission?.calculatedAmount,
                    commission.commission?.currency
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Rate: {commission.commission?.effectivePercentage}%
                  ({commission.commission?.propertyBasePercentage}% base × {commission.commission?.partnerTierPercentage}% tier)
                </p>
              </div>

              {/* Override Toggle */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={approveForm.enableOverride}
                    onChange={(e) => setApproveForm({ ...approveForm, enableOverride: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Override Commission Amount</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Enable to set a custom commission amount</p>
              </div>

              {/* Override Options */}
              {approveForm.enableOverride && (
                <div className="space-y-4 bg-indigo-50 rounded-lg p-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overrideType"
                        value="amount"
                        checked={approveForm.overrideType === 'amount'}
                        onChange={(e) => setApproveForm({ ...approveForm, overrideType: e.target.value, overrideValue: '' })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Fixed Amount</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overrideType"
                        value="percentage"
                        checked={approveForm.overrideType === 'percentage'}
                        onChange={(e) => setApproveForm({ ...approveForm, overrideType: e.target.value, overrideValue: '' })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Percentage</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {approveForm.overrideType === 'amount' ? 'New Commission Amount' : 'New Commission Percentage'}
                    </label>
                    <div className="relative">
                      {approveForm.overrideType === 'percentage' && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      )}
                      {approveForm.overrideType === 'amount' && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{getCurrencySymbol(commission.commission?.currency)}</span>
                      )}
                      <input
                        type="number"
                        value={approveForm.overrideValue}
                        onChange={(e) => {
                          setApproveForm({ ...approveForm, overrideValue: e.target.value });
                          if (fieldErrors.overrideValue) {
                            setFieldErrors(prev => ({ ...prev, overrideValue: '' }));
                          }
                        }}
                        placeholder={approveForm.overrideType === 'amount' ? 'Enter amount' : 'Enter percentage (0-100)'}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                          fieldErrors.overrideValue ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        } ${approveForm.overrideType === 'percentage' ? 'pl-8' : commission.commission?.currency === 'AED' ? 'pl-14' : 'pl-8'}`}
                        min="0"
                        max={approveForm.overrideType === 'percentage' ? 100 : undefined}
                        step={approveForm.overrideType === 'percentage' ? '0.1' : '1'}
                      />
                    </div>
                    {fieldErrors.overrideValue && (
                      <p className="text-sm text-red-600 mt-1">{fieldErrors.overrideValue}</p>
                    )}
                    {approveForm.overrideType === 'percentage' && approveForm.overrideValue && !fieldErrors.overrideValue && (
                      <p className="text-xs text-gray-600 mt-1">
                        = {formatCurrency(
                          Math.round(commission.saleDetails?.salePrice * (parseFloat(approveForm.overrideValue) / 100)),
                          commission.commission?.currency
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Override Reason<span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={approveForm.overrideReason}
                      onChange={(e) => {
                        setApproveForm({ ...approveForm, overrideReason: e.target.value });
                        if (fieldErrors.overrideReason) {
                          setFieldErrors(prev => ({ ...prev, overrideReason: '' }));
                        }
                      }}
                      placeholder="Please provide a reason for the override."
                      rows={2}
                      maxLength={500}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none ${
                        fieldErrors.overrideReason ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      style={{ maxHeight: '150px' }}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">{approveForm.overrideReason?.length || 0}/500 characters</p>
                    {fieldErrors.overrideReason && (
                      <p className="text-sm text-red-600 mt-1">{fieldErrors.overrideReason}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowApproveModal(false); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Approving...' : 'Approve Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CommissionDetails;