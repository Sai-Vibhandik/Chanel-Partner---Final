import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

const PartnerVisitDetails = () => {
  const { id } = useParams();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();
  const toast = useToast();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const formatTimeDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    fetchVisit();
  }, [id]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/visits/${id}`);
      setVisit(response.data.data.visit);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = () => {
    setCancelReason('');
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelReason('');
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      await api.put(`/visits/${id}/cancel`, { reason: cancelReason.trim() });
      toast.success('Visit cancelled successfully.');
      closeCancelModal();
      fetchVisit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel visit');
    } finally {
      setCancelling(false);
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

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
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
                onClick={openCancelModal}
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
              <span className="font-medium">{formatTimeDisplay(visit.scheduledTime)}</span>
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
            {visit.companyId?.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{visit.companyId.phone}</span>
              </div>
            )}
            {visit.companyId?.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{visit.companyId.email}</span>
              </div>
            )}
            {visit.companyId?.website && (
              <div className="flex justify-between">
                <span className="text-gray-500">Website</span>
                <span className="font-medium">
                  <a href={visit.companyId.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    {visit.companyId.website}
                  </a>
                </span>
              </div>
            )}
            {visit.companyId?.address && (
              <>
                {visit.companyId.address.street && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Street</span>
                    <span className="font-medium text-right max-w-[200px]">{visit.companyId.address.street}</span>
                  </div>
                )}
                {(visit.companyId.address.city || visit.companyId.address.state) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">City/State</span>
                    <span className="font-medium">
                      {[visit.companyId.address.city, visit.companyId.address.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {visit.companyId.address.zipCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pincode</span>
                    <span className="font-medium">{visit.companyId.address.zipCode}</span>
                  </div>
                )}
                {visit.companyId.address.country && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Country</span>
                    <span className="font-medium">{visit.companyId.address.country}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Office Location Info */}
        {visit.officeLocation && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Office Location</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Office Name</span>
                <span className="font-medium">{visit.officeLocation.name || 'N/A'}</span>
              </div>
              {visit.officeLocation.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium">{visit.officeLocation.phone}</span>
                </div>
              )}
              {visit.officeLocation.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{visit.officeLocation.email}</span>
                </div>
              )}
              {visit.officeLocation.address && (
                <>
                  {visit.officeLocation.address.street && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Street</span>
                      <span className="font-medium text-right max-w-[200px]">{visit.officeLocation.address.street}</span>
                    </div>
                  )}
                  {(visit.officeLocation.address.city || visit.officeLocation.address.state) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">City/State</span>
                      <span className="font-medium">
                        {[visit.officeLocation.address.city, visit.officeLocation.address.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {visit.officeLocation.address.zipCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pincode</span>
                      <span className="font-medium">{visit.officeLocation.address.zipCode}</span>
                    </div>
                  )}
                </>
              )}
              {visit.officeLocation.googleMapsUrl && (
                <div className="pt-2">
                  <a
                    href={visit.officeLocation.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Cancel Visit Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Visit</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your visit to <strong>{visit?.property?.name}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a reason for cancelling this visit..."
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={cancelling}
              >
                Keep Visit
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PartnerVisitDetails;