import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import ExportButton from '../../components/common/ExportButton';
import BookVisitModal from '../../components/common/BookVisitModal';
import { formatTimeStringExport, formatDateExport } from '../../utils/export';

const Visits = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();
  const toast = useToast();

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingVisit, setCancellingVisit] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Export columns configuration
  const exportColumns = [
    { key: 'property.name', header: 'Property Name' },
    { key: 'visitType', header: 'Visit Type' },
    { key: 'scheduledDate', header: 'Scheduled Date', format: (v) => formatDateExport(v.scheduledDate) },
    { key: 'scheduledTime', header: 'Scheduled Time', format: (v) => formatTimeStringExport(v.scheduledTime) },
    { key: 'status', header: 'Status' },
    { key: 'clientDetails', header: 'Client Name', format: (v) => v.clientDetails?.name || '' },
    { key: 'clientDetails', header: 'Client Email ID', format: (v) => v.clientDetails?.email || '' },
    { key: 'clientDetails', header: 'Client Phone', format: (v) => v.clientDetails?.phone || '' },
    { key: 'partnerNotes', header: 'Notes' }
  ];

  useEffect(() => {
    fetchVisits();
  }, [statusFilter]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/visits/my?${params.toString()}`);
      setVisits(response.data.data.visits);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (visit) => {
    setCancellingVisit(visit);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancellingVisit(null);
    setCancelReason('');
  };

  const handleCancelVisit = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      await api.put(`/visits/${cancellingVisit._id}/cancel`, { reason: cancelReason.trim() });
      toast.success('Visit cancelled successfully.');
      closeCancelModal();
      fetchVisits();
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
      office: 'bg-blue-100 text-blue-800',
      virtual: 'bg-teal-100 text-teal-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const formatTimeDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleBookSuccess = () => {
    toast.success('Visit booked successfully.');
    fetchVisits();
    window.scrollTo(0, 0);
  };

  if (loading && visits.length === 0) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visits" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Visits" subtitle="Manage your visits" color={config.color}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{visits.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {visits.filter(v => v.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {visits.filter(v => v.status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {visits.filter(v => v.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {visits.filter(v => v.status === 'rejected').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">
            {visits.filter(v => v.status === 'cancelled').length}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
          <ExportButton
            data={visits}
            columns={exportColumns}
            filename="visits"
            title="My Visits"
          />
        </div>
        <button
          onClick={() => setShowBookModal(true)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Book New Visit
        </button>
      </div>

      {/* Visits List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {visits.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 mb-4">No visits booked yet</p>
            <button
              onClick={() => setShowBookModal(true)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Book Your First Visit
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visits.map((visit) => (
              <div key={visit._id} className="p-6 hover:bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-50 rounded-lg p-3 text-center min-w-[80px]">
                      <p className="text-xs text-indigo-600 font-medium">
                        {new Date(visit.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {new Date(visit.scheduledDate).getDate()}
                      </p>
                      <p className="text-xs text-indigo-600">{formatTimeDisplay(visit.scheduledTime)}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">{visit.property?.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(visit.status)}`}>
                          {visit.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getVisitTypeBadge(visit.visitType)}`}>
                          {visit.visitType}
                        </span>
                        {visit.officeLocation && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {visit.officeLocation.name}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {visit.property?.location?.city}
                        </span>
                      </div>
                      {visit.clientDetails?.name && (
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {visit.clientDetails.name} ({visit.clientDetails.phone})
                        </p>
                      )}
                      {visit.purpose && (
                        <p className="text-sm text-gray-600 mt-1">
                          Purpose: {visit.purpose}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/partner/visits/${visit._id}`)}
                      className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      View Details
                    </button>
                    {['pending', 'approved'].includes(visit.status) && (
                      <button
                        onClick={() => openCancelModal(visit)}
                        className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Visit Modal */}
      <BookVisitModal
        show={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={handleBookSuccess}
      />

      {/* Cancel Visit Modal */}
      {showCancelModal && cancellingVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Visit</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your visit to <strong>{cancellingVisit.property?.name}</strong>?
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
                onClick={handleCancelVisit}
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

export default Visits;