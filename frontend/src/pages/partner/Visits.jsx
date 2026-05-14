import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ExportButton from '../../components/common/ExportButton';
import BookVisitModal from '../../components/common/BookVisitModal';

const Visits = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);

  // Export columns configuration
  const exportColumns = [
    { key: 'property.name', header: 'Property Name' },
    { key: 'visitType', header: 'Visit Type' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    { key: 'scheduledTime', header: 'Scheduled Time' },
    { key: 'status', header: 'Status' },
    { key: 'clientInfo.name', header: 'Client Name' },
    { key: 'clientInfo.email', header: 'Client Email' },
    { key: 'clientInfo.phone', header: 'Client Phone' },
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
      setError(err.response?.data?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelVisit = async (visitId) => {
    if (!window.confirm('Are you sure you want to cancel this visit?')) return;

    try {
      await api.put(`/visits/${visitId}/cancel`, { reason: 'Cancelled by partner' });
      setSuccess('Visit cancelled successfully');
      fetchVisits();
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
      office: 'bg-blue-100 text-blue-800',
      virtual: 'bg-teal-100 text-teal-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const handleBookSuccess = () => {
    setSuccess('Visit booked successfully!');
    fetchVisits();
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
      {/* Messages */}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Visits</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{visits.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {visits.filter(v => v.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {visits.filter(v => v.status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {visits.filter(v => v.status === 'completed').length}
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
                      <p className="text-xs text-indigo-600">{visit.scheduledTime}</p>
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
                        onClick={() => handleCancelVisit(visit._id)}
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
    </DashboardLayout>
  );
};

export default Visits;