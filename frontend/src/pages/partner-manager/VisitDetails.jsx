import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const PartnerManagerVisitDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.partner_manager;
  const navigate = useNavigate();

  // Determine base path based on user role
  const basePath = user?.role === 'company_superadmin' ? '/company/visits' : '/partner-manager/visits';

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  // Deal close modal
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealData, setDealData] = useState({
    salePrice: '',
    saleDate: '',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    notes: ''
  });

  useEffect(() => {
    fetchVisit();
  }, [id]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/visits/${id}`);
      setVisit(response.data.data.visit);
      // Pre-fill buyer details from client details
      if (response.data.data.visit.clientDetails) {
        setDealData(prev => ({
          ...prev,
          buyerName: response.data.data.visit.clientDetails.name || '',
          buyerPhone: response.data.data.visit.clientDetails.phone || '',
          buyerEmail: response.data.data.visit.clientDetails.email || ''
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this visit?')) return;
    try {
      setProcessing(true);
      await api.put(`/visits/${id}/approve`);
      setSuccess('Visit approved successfully');
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      setProcessing(true);
      await api.put(`/visits/${id}/reject`, { reason });
      setSuccess('Visit rejected');
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Are you sure you want to mark this visit as completed?')) return;
    try {
      setProcessing(true);
      await api.put(`/visits/${id}/complete`);
      setSuccess('Visit marked as completed');
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkDealClosed = async () => {
    if (!dealData.salePrice || !dealData.buyerName || !dealData.buyerPhone) {
      setError('Sale price, buyer name, and buyer phone are required');
      return;
    }

    try {
      setProcessing(true);
      await api.put(`/visits/${id}/deal-closed`, {
        salePrice: parseFloat(dealData.salePrice),
        saleDate: dealData.saleDate || new Date(),
        buyerName: dealData.buyerName,
        buyerPhone: dealData.buyerPhone,
        buyerEmail: dealData.buyerEmail,
        notes: dealData.notes
      });
      setSuccess('Deal marked as closed and commission entry created');
      setShowDealModal(false);
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark deal as closed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      deal_closed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getVisitTypeBadge = (type) => {
    const styles = {
      site: 'bg-purple-100 text-purple-800',
      office: 'bg-blue-100 text-blue-800',
      virtual: 'bg-teal-100 text-teal-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !visit) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        <button
          onClick={() => navigate(basePath)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Visits
        </button>
      </DashboardLayout>
    );
  }

  if (!visit) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Not Found" color={config.color}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">Visit not found</div>
        <button
          onClick={() => navigate(basePath)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Visits
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle={`Visit #${visit._id.slice(-6).toUpperCase()}`} color={config.color}>
      {/* Messages */}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

      {/* Back Button */}
      <button
        onClick={() => navigate(basePath)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Visits
      </button>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(visit.status)}`}>
              {visit.status === 'deal_closed' ? 'Deal Closed' : visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getVisitTypeBadge(visit.visitType)}`}>
              {visit.visitType} Visit
            </span>
          </div>
          <div className="flex gap-2">
            {visit.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {visit.status === 'approved' && (
              <>
                <button
                  onClick={handleComplete}
                  disabled={processing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => setShowDealModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Close Deal
                </button>
              </>
            )}
            {visit.status === 'completed' && (
              <button
                onClick={() => setShowDealModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Close Deal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deal Details (if deal_closed) */}
      {visit.status === 'deal_closed' && visit.dealDetails && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Deal Closed Successfully
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-purple-600">Sale Price</span>
              <p className="text-xl font-bold text-purple-900">
                {formatCurrency(visit.dealDetails.salePrice, visit.property?.pricing?.currency)}
              </p>
            </div>
            <div>
              <span className="text-sm text-purple-600">Sale Date</span>
              <p className="text-lg font-medium text-purple-900">
                {new Date(visit.dealDetails.saleDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-sm text-purple-600">Buyer</span>
              <p className="text-lg font-medium text-purple-900">{visit.dealDetails.buyerName}</p>
            </div>
            <div>
              <span className="text-sm text-purple-600">Commission</span>
              <p className="text-lg font-medium text-purple-900">
                {visit.dealDetails.commissionId ? 'Created' : 'Processing...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.partner?.firstName} {visit.partner?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{visit.partner?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{visit.partner?.phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">
                {new Date(visit.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-medium">{visit.scheduledTime}</span>
            </div>
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.property?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium capitalize">{visit.property?.type || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="font-medium">
                {visit.property?.location?.city}, {visit.property?.location?.state || visit.property?.location?.emirate}
              </span>
            </div>
            {visit.property?.pricing && (
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span className="font-medium">{formatCurrency(visit.property.pricing.minPrice, visit.property.pricing.currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.clientDetails?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{visit.clientDetails?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{visit.clientDetails?.email || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(visit.partnerNotes || visit.adminNotes || visit.rejectionReason || visit.cancellationReason) && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          {visit.partnerNotes && (
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Partner Notes:</span>
              <p className="mt-1 text-gray-900">{visit.partnerNotes}</p>
            </div>
          )}
          {visit.adminNotes && (
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Admin Notes:</span>
              <p className="mt-1 text-gray-900">{visit.adminNotes}</p>
            </div>
          )}
          {visit.rejectionReason && (
            <div className="mb-3">
              <span className="text-red-500 text-sm">Rejection Reason:</span>
              <p className="mt-1 text-red-700">{visit.rejectionReason}</p>
            </div>
          )}
          {visit.cancellationReason && (
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Cancellation Reason:</span>
              <p className="mt-1 text-gray-900">{visit.cancellationReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Deal Close Modal */}
      {showDealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mark Deal as Closed</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the sale details. A commission entry will be created automatically.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={dealData.salePrice}
                    onChange={(e) => setDealData({ ...dealData, salePrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter sale price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                  <input
                    type="date"
                    value={dealData.saleDate}
                    onChange={(e) => setDealData({ ...dealData, saleDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dealData.buyerName}
                    onChange={(e) => setDealData({ ...dealData, buyerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter buyer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={dealData.buyerPhone}
                    onChange={(e) => setDealData({ ...dealData, buyerPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter buyer phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Email</label>
                <input
                  type="email"
                  value={dealData.buyerEmail}
                  onChange={(e) => setDealData({ ...dealData, buyerEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter buyer email (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={dealData.notes}
                  onChange={(e) => setDealData({ ...dealData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDealModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDealClosed}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Close Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PartnerManagerVisitDetails;