import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import ExportButton from '../../components/common/ExportButton';

const PartnerManagerVisits = () => {
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.partner_manager;
  const basePath = user?.role === 'company_superadmin' ? '/company/visits' : '/partner-manager/visits';
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  // Week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(today.setDate(diff));
  });

  // Filters
  const [filters, setFilters] = useState({
    visitType: '', // office, site, virtual
    officeId: ''
  });

  const [offices, setOffices] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);

  // Time slots from 9 AM to 6 PM
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  // Export columns configuration
  const exportColumns = [
    { key: 'partner.firstName', header: 'Partner First Name' },
    { key: 'partner.lastName', header: 'Partner Last Name' },
    { key: 'partner.email', header: 'Partner Email' },
    { key: 'property.name', header: 'Property Name' },
    { key: 'visitType', header: 'Visit Type' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    { key: 'scheduledTime', header: 'Scheduled Time' },
    { key: 'status', header: 'Status' },
    { key: 'clientInfo.name', header: 'Client Name' },
    { key: 'clientInfo.email', header: 'Client Email' },
    { key: 'clientInfo.phone', header: 'Client Phone' }
  ];

  useEffect(() => {
    fetchVisits();
    fetchStats();
    fetchOffices();
    fetchPartners();
  }, [currentWeekStart, filters]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Get date range for the week
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      params.append('startDate', currentWeekStart.toISOString().split('T')[0]);
      params.append('endDate', weekEnd.toISOString().split('T')[0]);

      if (filters.visitType) params.append('visitType', filters.visitType);
      if (filters.officeId) params.append('officeId', filters.officeId);

      const response = await api.get(`/visits/company?${params.toString()}`);
      setVisits(response.data.data.visits || []);
    } catch (err) {
      console.error('Failed to load visits:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/visits/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to load stats:', err.response?.data || err.message);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await api.get('/offices');
      setOffices(response.data.data.offices || []);
    } catch (err) {
      console.error('Failed to load offices');
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await api.get('/partners');
      setPartners(response.data.data.partners || []);
    } catch (err) {
      console.error('Failed to load partners');
    }
  };

  const handleApproveVisit = async (visitId) => {
    try {
      setProcessing(true);
      await api.put(`/visits/${visitId}/approve`);
      setSuccess('Visit approved successfully');
      fetchVisits();
      fetchStats();
      setSelectedVisit(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectVisit = async (visitId, reason) => {
    try {
      setProcessing(true);
      await api.put(`/visits/${visitId}/reject`, { reason });
      setSuccess('Visit rejected');
      fetchVisits();
      fetchStats();
      setSelectedVisit(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteVisit = async (visitId) => {
    try {
      setProcessing(true);
      await api.put(`/visits/${visitId}/complete`);
      setSuccess('Visit marked as completed');
      fetchVisits();
      fetchStats();
      setSelectedVisit(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete visit');
    } finally {
      setProcessing(false);
    }
  };

  // Get days for the current week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) { // Monday to Friday
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  // Format date for display
  const formatDayHeader = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const formatFullDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Get visits for a specific day and time slot
  const getVisitsForSlot = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    return visits.filter(visit => {
      const visitDate = new Date(visit.scheduledDate).toISOString().split('T')[0];
      const visitTime = visit.scheduledTime?.substring(0, 5);
      return visitDate === dateStr && visitTime === time;
    });
  };

  // Navigate weeks
  const previousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-400',
      approved: 'bg-blue-400',
      rejected: 'bg-red-400',
      completed: 'bg-green-400',
      cancelled: 'bg-gray-400',
      deal_closed: 'bg-purple-400'
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      deal_closed: 'bg-purple-100 text-purple-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed',
      cancelled: 'Cancelled',
      deal_closed: 'Deal Closed'
    };
    return texts[status] || status;
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

  const formatTimeDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Week range display
  const getWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Visit Management" subtitle="Manage partner visits" color={config.color}>
      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center text-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between items-center text-sm">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-600 mt-1">{stats.statusCounts?.pending || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Approved</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{stats.statusCounts?.approved || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Today</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{stats.todayVisits || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Completed</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1">{stats.statusCounts?.completed || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Deals</p>
            <p className="text-lg sm:text-2xl font-bold text-indigo-600 mt-1">{stats.statusCounts?.deal_closed || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <select
              value={filters.visitType}
              onChange={(e) => setFilters({ ...filters, visitType: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="office">Office Visit</option>
              <option value="site">Site Visit</option>
              <option value="virtual">Virtual Visit</option>
            </select>
            <select
              value={filters.officeId}
              onChange={(e) => setFilters({ ...filters, officeId: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Offices</option>
              {offices.map(office => (
                <option key={office._id} value={office._id}>{office.name}</option>
              ))}
            </select>
            <ExportButton
              data={visits}
              columns={exportColumns}
              filename="visits"
              title="Visits Report"
            />
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 whitespace-nowrap"
            >
              Today
            </button>
            <span className="text-xs sm:text-sm font-medium text-gray-700 px-1 sm:px-3">{getWeekRange()}</span>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Slot-based Week View - Scrollable on mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[800px] sm:min-w-full">
            {/* Header Row with Days */}
            <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-50">
          <div className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200">
            Time
          </div>
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                isToday(day) ? 'bg-indigo-50' : ''
              }`}
            >
              <div className={`text-sm font-medium ${isToday(day) ? 'text-indigo-600' : 'text-gray-900'}`}>
                {formatDayHeader(day)}
              </div>
              <div className={`text-xs ${isToday(day) ? 'text-indigo-500' : 'text-gray-500'}`}>
                {isToday(day) ? 'Today' : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Time Slots Grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.map((time, timeIdx) => (
            <div key={time} className="grid grid-cols-6 border-b border-gray-100 last:border-b-0">
              {/* Time Label */}
              <div className="p-2 text-center text-xs text-gray-500 border-r border-gray-100 bg-gray-50">
                {formatTimeDisplay(time)}
              </div>

              {/* Slots for each day */}
              {weekDays.map((day, dayIdx) => {
                const slotVisits = getVisitsForSlot(day, time);

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[60px] p-1 border-r border-gray-100 last:border-r-0 ${
                      isToday(day) ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    {slotVisits.length > 0 ? (
                      slotVisits.map((visit) => (
                        <div
                          key={visit._id}
                          onClick={() => setSelectedVisit(visit)}
                          className="p-2 rounded-lg cursor-pointer hover:shadow-md transition-shadow mb-1 last:mb-0"
                          style={{ backgroundColor: visit.status === 'pending' ? '#fef3c7' : visit.status === 'approved' ? '#dbeafe' : visit.status === 'completed' ? '#dcfce7' : visit.status === 'deal_closed' ? '#f3e8ff' : '#f3f4f6' }}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(visit.status)}`}></div>
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {visit.partner?.firstName} {visit.partner?.lastName?.charAt(0)}.
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-0.5">
                            {visit.property?.name?.substring(0, 20)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-full border-t border-dashed border-gray-200"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 sm:gap-6 p-3 sm:p-4 border-t border-gray-200 bg-gray-50 overflow-x-auto">
          <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-xs text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-xs text-gray-600">Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-xs text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
            <span className="text-xs text-gray-600">Deal Closed</span>
          </div>
          <div className="flex items-center gap-1 ml-2 sm:ml-4">
            <div className="w-8 border-t border-dashed border-gray-300"></div>
            <span className="text-xs text-gray-600">Available</span>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Visit Details</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedVisit.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {selectedVisit.scheduledTime}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedVisit.status)}`}>
                  {getStatusText(selectedVisit.status)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {/* Partner */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Partner</p>
                  <p className="font-medium text-gray-900">{selectedVisit.partner?.firstName} {selectedVisit.partner?.lastName}</p>
                  <p className="text-sm text-gray-600">{selectedVisit.partner?.email}</p>
                  <p className="text-sm text-gray-600">{selectedVisit.partner?.phone}</p>
                </div>

                {/* Property */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Property</p>
                  <p className="font-medium text-gray-900">{selectedVisit.property?.name}</p>
                  <p className="text-sm text-gray-600">{selectedVisit.property?.location?.address}</p>
                  <p className="text-sm font-medium text-indigo-600 mt-1">
                    {formatCurrency(selectedVisit.property?.pricing?.basePrice, selectedVisit.property?.pricing?.currency)}
                  </p>
                </div>

                {/* Visit Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Visit Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedVisit.visitType || 'Office'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Office</p>
                    <p className="font-medium text-gray-900">{selectedVisit.office?.name || 'N/A'}</p>
                  </div>
                </div>

                {/* Client Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Client Details</p>
                  <p className="font-medium text-gray-900">{selectedVisit.clientDetails?.name}</p>
                  <p className="text-sm text-gray-600">{selectedVisit.clientDetails?.phone}</p>
                  <p className="text-sm text-gray-600">{selectedVisit.clientDetails?.email}</p>
                </div>

                {/* Notes */}
                {selectedVisit.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{selectedVisit.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                {selectedVisit.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApproveVisit(selectedVisit._id)}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {processing ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) handleRejectVisit(selectedVisit._id, reason);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedVisit.status === 'approved' && (
                  <button
                    onClick={() => handleCompleteVisit(selectedVisit._id)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {processing ? 'Processing...' : 'Mark Complete'}
                  </button>
                )}
                <button
                  onClick={() => navigate(`${basePath}/${selectedVisit._id}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="text-gray-700">Loading visits...</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PartnerManagerVisits;