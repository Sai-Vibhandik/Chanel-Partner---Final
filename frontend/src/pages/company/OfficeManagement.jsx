import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const OfficeManagement = ({ role = 'company_superadmin' }) => {
  const config = role === 'partner_manager' ? sidebarConfig.partner_manager : sidebarConfig.company_superadmin;

  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [selectedOffice, setSelectedOffice] = useState(null);

  // Availability form
  const [availabilityForm, setAvailabilityForm] = useState({
    workingHours: {
      monday: { start: '09:00', end: '18:00', isActive: true },
      tuesday: { start: '09:00', end: '18:00', isActive: true },
      wednesday: { start: '09:00', end: '18:00', isActive: true },
      thursday: { start: '09:00', end: '18:00', isActive: true },
      friday: { start: '09:00', end: '18:00', isActive: true },
      saturday: { start: '09:00', end: '14:00', isActive: false },
      sunday: { start: '09:00', end: '14:00', isActive: false }
    },
    slotDuration: 30,
    bufferTime: 0,
    maxVisitsPerSlot: 3,
    blockedDates: []
  });

  // Office form
  const [officeForm, setOfficeForm] = useState({
    name: '',
    address: { street: '', city: '', state: '', country: '', zipCode: '' },
    phone: '',
    email: '',
    googleMapsUrl: '',
    operatingHours: { start: '09:00', end: '18:00' }
  });

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/offices');
      setOffices(res?.data?.data?.offices || []);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load offices');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (officeId) => {
    try {
      const res = await api.get(`/offices/${officeId}/availability`);
      if (res.data?.data?.availability) {
        const avail = res.data.data.availability;
        setAvailabilityForm({
          workingHours: avail.workingHours || availabilityForm.workingHours,
          slotDuration: avail.slotDuration || 30,
          bufferTime: avail.bufferTime || 0,
          maxVisitsPerSlot: avail.maxVisitsPerSlot || 3,
          blockedDates: avail.blockedDates || []
        });
      }
    } catch (err) {
      console.error('Failed to load availability');
    }
  };

  const handleCreateOffice = async () => {
    try {
      setError('');
      const res = await api.post('/offices', officeForm);
      setOffices([...offices, res.data.data.office]);
      setShowOfficeModal(false);
      resetOfficeForm();
      setSuccess('Office location created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create office');
    }
  };

  const handleUpdateOffice = async () => {
    try {
      setError('');
      const res = await api.put(`/offices/${editingOffice._id}`, officeForm);
      setOffices(offices.map(o => o._id === editingOffice._id ? res.data.data.office : o));
      setShowOfficeModal(false);
      setEditingOffice(null);
      resetOfficeForm();
      setSuccess('Office location updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update office');
    }
  };

  const handleDeleteOffice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this office location?')) return;
    try {
      await api.delete(`/offices/${id}`);
      setOffices(offices.filter(o => o._id !== id));
      setSuccess('Office location deleted successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete office');
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setError('');
      await api.put(`/offices/${selectedOffice._id}/availability`, availabilityForm);
      setShowAvailabilityModal(false);
      setSuccess('Availability settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save availability');
    }
  };

  const resetOfficeForm = () => {
    setOfficeForm({
      name: '',
      address: { street: '', city: '', state: '', country: '', zipCode: '' },
      phone: '',
      email: '',
      googleMapsUrl: '',
      operatingHours: { start: '09:00', end: '18:00' }
    });
  };

  const openEditOffice = (office) => {
    setEditingOffice(office);
    setOfficeForm({
      name: office.name,
      address: office.address || { street: '', city: '', state: '', country: '', zipCode: '' },
      phone: office.phone || '',
      email: office.email || '',
      googleMapsUrl: office.googleMapsUrl || '',
      operatingHours: office.operatingHours || { start: '09:00', end: '18:00' }
    });
    setShowOfficeModal(true);
  };

  const openAvailabilityModal = (office) => {
    setSelectedOffice(office);
    fetchAvailability(office._id);
    setShowAvailabilityModal(true);
  };

  const toggleOfficeStatus = async (office) => {
    try {
      const res = await api.put(`/offices/${office._id}`, {
        isActive: !office.isActive
      });
      setOffices(offices.map(o => o._id === office._id ? res.data.data.office : o));
      setSuccess(`Office ${!office.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update office status');
    }
  };

  const toggleDayActive = (day) => {
    setAvailabilityForm(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          isActive: !prev.workingHours[day].isActive
        }
      }
    }));
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Office Management" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Office Management" subtitle="Manage office locations and scheduling" color={config.color}>
      {/* Messages */}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

      {/* Office Locations */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Office Locations</h2>
        <button
          onClick={() => {
            resetOfficeForm();
            setEditingOffice(null);
            setShowOfficeModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Office
        </button>
      </div>

      {offices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Office Locations</h3>
          <p className="text-gray-500 mb-4">Add office locations for partners to schedule visits.</p>
          <button
            onClick={() => setShowOfficeModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add First Office
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offices.map((office) => (
            <div
              key={office._id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                office.isActive ? 'border-gray-100' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{office.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    office.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {office.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{office.address?.street}, {office.address?.city}</span>
                  </div>
                  {office.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{office.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{office.operatingHours?.start} - {office.operatingHours?.end}</span>
                  </div>
                </div>

                {office.googleMapsUrl && (
                  <a
                    href={office.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    View on Maps
                  </a>
                )}
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
                <button
                  onClick={() => openEditOffice(office)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => openAvailabilityModal(office)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Availability
                </button>
                <button
                  onClick={() => toggleOfficeStatus(office)}
                  className={`text-sm font-medium ${
                    office.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                  }`}
                >
                  {office.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Office Modal */}
      {showOfficeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingOffice ? 'Edit Office Location' : 'Add Office Location'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Name *</label>
                <input
                  type="text"
                  value={officeForm.name}
                  onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Main Office, Branch Office"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={officeForm.address.street}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      address: { ...officeForm.address, street: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={officeForm.address.city}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      address: { ...officeForm.address, city: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={officeForm.address.state}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      address: { ...officeForm.address, state: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <input
                    type="text"
                    value={officeForm.address.country}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      address: { ...officeForm.address, country: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={officeForm.address.zipCode}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      address: { ...officeForm.address, zipCode: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={officeForm.phone}
                    onChange={(e) => setOfficeForm({ ...officeForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={officeForm.email}
                    onChange={(e) => setOfficeForm({ ...officeForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL</label>
                <input
                  type="url"
                  value={officeForm.googleMapsUrl}
                  onChange={(e) => setOfficeForm({ ...officeForm, googleMapsUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={officeForm.operatingHours.start}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      operatingHours: { ...officeForm.operatingHours, start: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={officeForm.operatingHours.end}
                    onChange={(e) => setOfficeForm({
                      ...officeForm,
                      operatingHours: { ...officeForm.operatingHours, end: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOfficeModal(false);
                  setEditingOffice(null);
                  resetOfficeForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingOffice ? handleUpdateOffice : handleCreateOffice}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingOffice ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && selectedOffice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Availability Settings - {selectedOffice.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure when partners can book visits at this office
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Working Hours */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Working Hours</h4>
                <div className="space-y-3">
                  {days.map((day, index) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-32">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={availabilityForm.workingHours[day].isActive}
                            onChange={() => toggleDayActive(day)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{dayLabels[index]}</span>
                        </label>
                      </div>
                      {availabilityForm.workingHours[day].isActive && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={availabilityForm.workingHours[day].start}
                            onChange={(e) => setAvailabilityForm(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day]: { ...prev.workingHours[day], start: e.target.value }
                              }
                            }))}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={availabilityForm.workingHours[day].end}
                            onChange={(e) => setAvailabilityForm(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day]: { ...prev.workingHours[day], end: e.target.value }
                              }
                            }))}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      {!availabilityForm.workingHours[day].isActive && (
                        <span className="text-sm text-gray-400">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Slot Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration</label>
                  <select
                    value={availabilityForm.slotDuration}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      slotDuration: parseInt(e.target.value)
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Time</label>
                  <select
                    value={availabilityForm.bufferTime}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      bufferTime: parseInt(e.target.value)
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>No buffer</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Per Slot</label>
                  <input
                    type="number"
                    value={availabilityForm.maxVisitsPerSlot}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      maxVisitsPerSlot: parseInt(e.target.value) || 1
                    }))}
                    min="1"
                    max="20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max visits per time slot</p>
                </div>
              </div>

              {/* Blocked Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blocked Dates (Holidays)</label>
                <p className="text-xs text-gray-500 mb-2">Add dates when the office will be closed</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    id="blockedDateInput"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('blockedDateInput');
                      if (input.value) {
                        setAvailabilityForm(prev => ({
                          ...prev,
                          blockedDates: [
                            ...prev.blockedDates,
                            { date: new Date(input.value), reason: 'Holiday' }
                          ]
                        }));
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                {availabilityForm.blockedDates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availabilityForm.blockedDates.map((bd, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                      >
                        {new Date(bd.date).toLocaleDateString()}
                        {bd.reason && ` (${bd.reason})`}
                        <button
                          onClick={() => setAvailabilityForm(prev => ({
                            ...prev,
                            blockedDates: prev.blockedDates.filter((_, i) => i !== index)
                          }))}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAvailabilityModal(false);
                  setSelectedOffice(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAvailability}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Availability
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default OfficeManagement;