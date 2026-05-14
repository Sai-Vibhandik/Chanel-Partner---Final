import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const PartnerVisitDetails = () => {
  const { id } = useParams();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchVisit();
  }, [id]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/visits/${id}`);
      setVisit(response.data.data.visit);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this visit?')) return;

    try {
      await api.put(`/visits/${id}/cancel`, { reason: 'Cancelled by partner' });
      setSuccess('Visit cancelled successfully');
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel visit');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
        <button
          onClick={() => navigate('/partner/visits')}
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
          Visit not found
        </div>
        <button
          onClick={() => navigate('/partner/visits')}
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
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/visits')}
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
              {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getVisitTypeBadge(visit.visitType)}`}>
              {visit.visitType} Visit
            </span>
          </div>
          <div className="flex gap-2">
            {['pending', 'approved'].includes(visit.status) && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Cancel Visit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <span className="font-medium">{formatCurrency(visit.property.pricing.basePrice, visit.property.pricing.currency)}</span>
              </div>
            )}
          </div>
          {visit.property?._id && (
            <button
              onClick={() => navigate(`/partner/properties/${visit.property._id}`)}
              className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              View Property
            </button>
          )}
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

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.companyId?.name || 'N/A'}</span>
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
              <span className="text-gray-500 text-sm">Your Notes:</span>
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
    </DashboardLayout>
  );
};

export default PartnerVisitDetails;