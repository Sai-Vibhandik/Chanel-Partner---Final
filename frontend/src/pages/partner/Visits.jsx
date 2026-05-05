import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ExportButton from '../../components/common/ExportButton';

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

  // Booking form state
  const [partnerships, setPartnerships] = useState([]);
  const [properties, setProperties] = useState([]);
  const [offices, setOffices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedPartnership, setSelectedPartnership] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    visitType: 'site',
    scheduledDate: '',
    scheduledTime: '10:00',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientNotes: '',
    partnerNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (showBookModal) {
      fetchPartnerships();
    }
  }, [showBookModal]);

  useEffect(() => {
    if (selectedPartnership) {
      fetchPropertiesForPartnership();
      fetchOffices();
    }
  }, [selectedPartnership]);

  // Fetch available slots when date or office changes for office visits
  useEffect(() => {
    if (bookingForm.visitType === 'office' && bookingForm.scheduledDate && selectedOffice) {
      fetchAvailableSlots();
    }
  }, [bookingForm.visitType, bookingForm.scheduledDate, selectedOffice]);

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

  const fetchPartnerships = async () => {
    try {
      const response = await api.get('/partner-company/my-companies');
      const active = response.data.data.partnerships.filter(p => p.status === 'active');
      setPartnerships(active);
      if (active.length > 0 && !selectedPartnership) {
        setSelectedPartnership(active[0]._id);
      }
    } catch (err) {
      console.error('Failed to load partnerships');
    }
  };

  const fetchPropertiesForPartnership = async () => {
    try {
      const response = await api.get(`/properties/partnership/${selectedPartnership}`);
      setProperties(response.data.data.properties);
      if (response.data.data.properties.length > 0) {
        setSelectedProperty(response.data.data.properties[0]._id);
      }
    } catch (err) {
      console.error('Failed to load properties');
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await api.get('/offices/available');
      console.log('Offices response:', response.data);
      const officesData = response.data.data.offices || [];
      console.log('Offices data:', officesData);
      console.log('Offices with isActive:', officesData.map(o => ({ name: o.name, isActive: o.isActive })));
      setOffices(officesData);
    } catch (err) {
      console.error('Failed to load offices:', err.response?.data || err.message);
      setOffices([]);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!bookingForm.scheduledDate || !selectedOffice) {
      setAvailableSlots([]);
      return;
    }

    try {
      setLoadingSlots(true);
      const params = new URLSearchParams();
      // Backend expects startDate and endDate
      params.append('startDate', bookingForm.scheduledDate);
      params.append('endDate', bookingForm.scheduledDate);

      const response = await api.get(`/offices/${selectedOffice}/available-slots?${params.toString()}`);
      console.log('Available slots response:', response.data);
      setAvailableSlots(response.data.data.slotsByDate?.[0]?.slots || []);
    } catch (err) {
      console.error('Failed to load available slots:', err.response?.data || err.message);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookVisit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validate slot selection for office visits
    if (bookingForm.visitType === 'office' && !selectedSlot) {
      setError('Please select an available time slot');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/visits', {
        propertyId: selectedProperty,
        partnershipId: selectedPartnership,
        visitType: bookingForm.visitType,
        officeLocation: bookingForm.visitType === 'office' ? selectedOffice : undefined,
        scheduledDate: bookingForm.scheduledDate,
        scheduledTime: bookingForm.visitType === 'office' && selectedSlot
          ? selectedSlot.time
          : bookingForm.scheduledTime,
        clientDetails: {
          name: bookingForm.clientName,
          phone: bookingForm.clientPhone,
          email: bookingForm.clientEmail,
          notes: bookingForm.clientNotes
        },
        partnerNotes: bookingForm.partnerNotes
      });

      setSuccess('Visit booked successfully!');
      setShowBookModal(false);
      resetForm();
      fetchVisits();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book visit');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setBookingForm({
      visitType: 'site',
      scheduledDate: '',
      scheduledTime: '10:00',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientNotes: '',
      partnerNotes: ''
    });
    setSelectedOffice('');
    setSelectedSlot(null);
    setAvailableSlots([]);
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

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatTime = (timeStr) => {
    const [hours, mins] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${mins} ${ampm}`;
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
    <DashboardLayout sidebarLinks={config.links} title="Visits" subtitle="Manage your site visits" color={config.color}>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Deals Closed</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">
            {visits.filter(v => v.status === 'deal_closed').length}
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
            <option value="deal_closed">Deal Closed</option>
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
          onClick={() => {
            resetForm();
            setShowBookModal(true);
          }}
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
                          {visit.status === 'deal_closed' ? 'Deal Closed' : visit.status}
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
                      <p className="text-sm text-gray-600 mt-1">
                        Client: {visit.clientDetails?.name} ({visit.clientDetails?.phone})
                      </p>
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
      {showBookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Book a Visit</h3>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleBookVisit} className="p-6 space-y-6">
              {/* Company & Property Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Company</label>
                  <select
                    value={selectedPartnership}
                    onChange={(e) => setSelectedPartnership(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select company</option>
                    {partnerships.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.companyId?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Property</label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select property</option>
                    {properties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} - {p.location?.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'site', label: 'Site Visit', icon: '🏢' },
                    { value: 'office', label: 'Office Visit', icon: '🏛️' },
                    { value: 'virtual', label: 'Virtual Tour', icon: '💻' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setBookingForm({ ...bookingForm, visitType: type.value });
                        setSelectedSlot(null);
                        setSelectedOffice('');
                      }}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        bookingForm.visitType === type.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Office Selection - Only for Office Visit */}
              {bookingForm.visitType === 'office' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Office Location</label>
                  {offices.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                      <p className="text-sm">No office locations available from your partnered companies.</p>
                      <p className="text-xs mt-1">Please contact the company to set up office locations.</p>
                    </div>
                  ) : (
                    <select
                      value={selectedOffice}
                      onChange={(e) => {
                        setSelectedOffice(e.target.value);
                        setSelectedSlot(null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select an office</option>
                      {offices.filter(o => o.isActive).map((office) => (
                        <option key={office._id} value={office._id}>
                          {office.name} - {office.address?.city}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  value={bookingForm.scheduledDate}
                  onChange={(e) => {
                    setBookingForm({ ...bookingForm, scheduledDate: e.target.value });
                    setSelectedSlot(null);
                  }}
                  min={getMinDate()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Time Selection */}
              {bookingForm.visitType === 'office' && selectedOffice && bookingForm.scheduledDate ? (
                /* Office Visit - Show Available Slots */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Time Slot</label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500">No available slots for this date</p>
                      <p className="text-sm text-gray-400">Try selecting a different date or office</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          disabled={!slot.isAvailable}
                          className={`p-3 border rounded-lg text-center transition-colors ${
                            selectedSlot?.time === slot.time
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : slot.isAvailable
                              ? 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="font-medium text-sm">{slot.displayTime}</div>
                          <div className="text-xs mt-1">
                            {slot.isAvailable ? (
                              <span className="text-green-600">{slot.availableSpots} left</span>
                            ) : (
                              <span>Fully booked</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : bookingForm.visitType !== 'office' ? (
                /* Site/Virtual Visit - Time Selection */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>
                  <select
                    value={bookingForm.scheduledTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, scheduledTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                  </select>
                </div>
              ) : null}

              {/* Client Details */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-4">Client Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                    <input
                      type="text"
                      value={bookingForm.clientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Phone *</label>
                    <input
                      type="tel"
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
                    <input
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Notes</label>
                    <input
                      type="text"
                      value={bookingForm.clientNotes}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientNotes: e.target.value })}
                      placeholder="Any special requirements..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Partner Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes for Admin</label>
                <textarea
                  value={bookingForm.partnerNotes}
                  onChange={(e) => setBookingForm({ ...bookingForm, partnerNotes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (bookingForm.visitType === 'office' && !selectedSlot)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Booking...' : 'Book Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Visits;