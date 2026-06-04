import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import Modal, { ModalContent, ModalFooter, ModalButton } from '../../components/common/Modal';

const PartnerManagerVisitDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.partner_manager;
  const navigate = useNavigate();
  const toast = useToast();

  // Determine base path based on user role
  const basePath = user?.role === 'company_superadmin' ? '/company/visits' : '/partner-manager/visits';

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await api.put(`/visits/${id}/approve`);
      toast.success('Visit approved successfully.');
      fetchVisit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    try {
      setProcessing(true);
      await api.put(`/visits/${id}/reject`, { reason: rejectReason.trim() });
      toast.success('Visit rejected successfully.');
      setShowRejectModal(false);
      setRejectReason('');
      fetchVisit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    try {
      setProcessing(true);
      await api.put(`/visits/${id}/complete`);
      toast.success('Visit marked as completed successfully.');
      fetchVisit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete visit');
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
              {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
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
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {visit.status === 'approved' && (
              <button
                onClick={handleComplete}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Mark Completed
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Reject Visit"
        size="sm"
      >
        <ModalContent>
          <p className="text-gray-600 mb-4">
            Please provide a reason for rejecting this visit.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            rows={4}
            autoFocus
          />
        </ModalContent>
        <ModalFooter>
          <ModalButton
            onClick={() => {
              setShowRejectModal(false);
              setRejectReason('');
            }}
            variant="secondary"
          >
            Cancel
          </ModalButton>
          <ModalButton
            onClick={handleReject}
            variant="danger"
            disabled={processing || !rejectReason.trim()}
          >
            {processing ? 'Rejecting...' : 'Reject Visit'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  );
};

export default PartnerManagerVisitDetails;