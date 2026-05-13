import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { validateRequired, validatePhone, validateEmail, validateFutureDate, validateMinLength, handlePhoneInput } from '../../utils/validation';

const BookVisitModal = ({
  show,
  onClose,
  onSuccess,
  selectedProperty: preSelectedProperty,
  selectedPartnership: preSelectedPartnership,
  partnerships: externalPartnerships,
  properties: externalProperties,
  offices: externalOffices
}) => {
  const [partnerships, setPartnerships] = useState(externalPartnerships || []);
  const [properties, setProperties] = useState(externalProperties || []);
  const [offices, setOffices] = useState(externalOffices || []);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [selectedPartnership, setSelectedPartnership] = useState(preSelectedPartnership || '');
  const [selectedProperty, setSelectedProperty] = useState(preSelectedProperty?._id || preSelectedProperty || '');
  const modalContentRef = useRef(null);

  const [bookingForm, setBookingForm] = useState({
    visitType: 'office',
    purpose: '',
    hasClient: true,
    scheduledDate: '',
    scheduledTime: '10:00',
    officeLocation: '',
    timeSlot: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientNotes: '',
    partnerNotes: ''
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validate a single field
  const validateField = (name, value) => {
    switch (name) {
      case 'purpose':
        if (!value || value.trim() === '') return 'Purpose is required';
        if (value.length < 3) return 'Purpose must be at least 3 characters';
        return '';
      case 'clientName':
        if (bookingForm.hasClient) {
          if (!value || value.trim() === '') return 'Client name is required';
        }
        return '';
      case 'clientPhone':
        if (bookingForm.hasClient) {
          if (!value || value.trim() === '') return 'Phone number is required';
          return validatePhone(value);
        }
        return '';
      case 'clientEmail':
        if (value && value.trim() !== '') {
          return validateEmail(value);
        }
        return '';
      case 'scheduledDate':
        if (!value) return 'Please select a date';
        return validateFutureDate(value, 'Visit date') || '';
      default:
        return '';
    }
  };

  // Handle field blur for validation
  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, bookingForm[name]);
    setFormErrors(prev => ({ ...prev, [name]: error }));
  };

  // Handle input change with validation
  const handleChange = (name, value) => {
    setBookingForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      const error = validateField(name, value);
      setFormErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Validate all fields before submission
  const validateForm = () => {
    const errors = {};

    if (!selectedPartnership) errors.partnership = 'Please select a company';
    if (!selectedProperty) errors.property = 'Please select a property';
    if (!bookingForm.officeLocation) errors.officeLocation = 'Please select an office';
    if (!bookingForm.timeSlot) errors.timeSlot = 'Please select a time slot';

    const purposeError = validateField('purpose', bookingForm.purpose);
    if (purposeError) errors.purpose = purposeError;

    const dateError = validateField('scheduledDate', bookingForm.scheduledDate);
    if (dateError) errors.scheduledDate = dateError;

    if (bookingForm.hasClient) {
      const clientNameError = validateField('clientName', bookingForm.clientName);
      if (clientNameError) errors.clientName = clientNameError;

      const clientPhoneError = validateField('clientPhone', bookingForm.clientPhone);
      if (clientPhoneError) errors.clientPhone = clientPhoneError;

      if (bookingForm.clientEmail) {
        const clientEmailError = validateField('clientEmail', bookingForm.clientEmail);
        if (clientEmailError) errors.clientEmail = clientEmailError;
      }
    }

    setFormErrors(errors);
    setTouched({
      partnership: true,
      property: true,
      purpose: true,
      officeLocation: true,
      scheduledDate: true,
      timeSlot: true,
      clientName: bookingForm.hasClient,
      clientPhone: bookingForm.hasClient,
      clientEmail: bookingForm.hasClient && !!bookingForm.clientEmail
    });

    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (show) {
      setBookingError('');
      setFormErrors({});
      setTouched({});
      // Only fetch if external data is not provided or empty
      if (!externalPartnerships || externalPartnerships.length === 0) fetchPartnerships();
      if (preSelectedPartnership && (!externalProperties || externalProperties.length === 0)) fetchPropertiesForPartnership(preSelectedPartnership);
      if (!externalOffices || externalOffices.length === 0) fetchOffices();
    }
  }, [show, preSelectedPartnership, externalPartnerships, externalProperties, externalOffices]);

  useEffect(() => { if (externalOffices) setOffices(externalOffices); }, [externalOffices]);
  useEffect(() => { if (externalProperties) setProperties(externalProperties); }, [externalProperties]);
  useEffect(() => { if (externalPartnerships) setPartnerships(externalPartnerships); }, [externalPartnerships]);
  useEffect(() => { if (preSelectedProperty) setSelectedProperty(preSelectedProperty._id || preSelectedProperty); }, [preSelectedProperty]);
  useEffect(() => { if (bookingForm.scheduledDate && bookingForm.officeLocation) fetchAvailableSlots(); else setAvailableSlots([]); }, [bookingForm.scheduledDate, bookingForm.officeLocation]);
  useEffect(() => { if (selectedPartnership && !externalProperties) fetchPropertiesForPartnership(selectedPartnership); }, [selectedPartnership, externalProperties]);

  const fetchPartnerships = async () => {
    try {
      const response = await api.get('/partner-company/my-companies');
      const activePartnerships = response.data.data.partnerships?.filter(p => p.status === 'active') || [];
      setPartnerships(activePartnerships);
      if (activePartnerships.length > 0 && !selectedPartnership) setSelectedPartnership(activePartnerships[0]._id);
    } catch (err) { console.error('Failed to load partnerships'); }
  };

  const fetchPropertiesForPartnership = async (partnershipId) => {
    try {
      const response = await api.get(`/properties/partnership/${partnershipId}`);
      setProperties(response.data.data.properties || []);
    } catch (err) { console.error('Failed to load properties'); setProperties([]); }
  };

  const fetchOffices = async () => {
    try {
      const response = await api.get('/offices/available');
      setOffices(response.data.data.offices || []);
    } catch (err) { console.error('Failed to load offices'); setOffices([]); }
  };

  const fetchAvailableSlots = async () => {
    if (!bookingForm.scheduledDate || !bookingForm.officeLocation) { setAvailableSlots([]); return; }
    try {
      setLoadingSlots(true);
      const params = new URLSearchParams();
      params.append('startDate', bookingForm.scheduledDate);
      params.append('endDate', bookingForm.scheduledDate);
      const response = await api.get(`/offices/${bookingForm.officeLocation}/available-slots?${params.toString()}`);
      const dateInfo = response.data.data.slotsByDate?.[0];
      if (dateInfo && !dateInfo.isAvailable) { setAvailableSlots([]); }
      else { setAvailableSlots(dateInfo?.slots || []); }
    } catch (err) { console.error('Failed to load available slots:', err); setAvailableSlots([]); }
    finally { setLoadingSlots(false); }
  };

  const handleBookVisit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBookingError('');

    // Validate all fields
    const isValid = validateForm();
    if (!isValid) {
      setSubmitting(false);
      // Scroll to the first error
      if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0;
      }
      return;
    }

    try {
      await api.post('/visits', {
        propertyId: selectedProperty, partnershipId: selectedPartnership, visitType: bookingForm.visitType,
        purpose: bookingForm.purpose, hasClient: bookingForm.hasClient, scheduledDate: bookingForm.scheduledDate,
        scheduledTime: bookingForm.scheduledTime, officeLocation: bookingForm.officeLocation,
        clientDetails: { name: bookingForm.clientName, phone: bookingForm.clientPhone, email: bookingForm.clientEmail, notes: bookingForm.clientNotes },
        partnerNotes: bookingForm.partnerNotes
      });
      // Reset form
      setBookingForm({ visitType: 'office', purpose: '', hasClient: true, scheduledDate: '', scheduledTime: '10:00', officeLocation: '', timeSlot: '', clientName: '', clientPhone: '', clientEmail: '', clientNotes: '', partnerNotes: '' });
      setFormErrors({});
      setTouched({});
      setSelectedProperty('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book visit');
      if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
    } finally { setSubmitting(false); }
  };

  const getMinDate = () => { const today = new Date(); return today.toISOString().split('T')[0]; };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalContentRef} className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Book a Visit</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleBookVisit} className="p-6 space-y-4">
          {bookingError && (
            <div className="sticky top-0 z-10 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>{bookingError}</span>
              </div>
            </div>
          )}

          {!preSelectedPartnership && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Company *</label>
              <select
                value={selectedPartnership}
                onChange={(e) => {
                  setSelectedPartnership(e.target.value);
                  setSelectedProperty('');
                  setBookingForm({ ...bookingForm, officeLocation: '', scheduledDate: '', timeSlot: '' });
                  if (formErrors.partnership) setFormErrors(prev => ({ ...prev, partnership: '' }));
                }}
                onBlur={() => { setTouched(prev => ({ ...prev, partnership: true })); if (!selectedPartnership) setFormErrors(prev => ({ ...prev, partnership: 'Please select a company' })); }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.partnership && formErrors.partnership ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                required
              >
                <option value="">Choose a company</option>
                {partnerships.map((p) => (<option key={p._id} value={p._id}>{p.companyId?.name || 'Unknown Company'}</option>))}
              </select>
              {touched.partnership && formErrors.partnership && <p className="text-sm text-red-600 mt-1">{formErrors.partnership}</p>}
              {partnerships.length === 0 && <p className="text-sm text-amber-600 mt-1">No active partnerships found</p>}
            </div>
          )}

          {!preSelectedProperty && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Property *</label>
              <select
                value={selectedProperty}
                onChange={(e) => { setSelectedProperty(e.target.value); if (formErrors.property) setFormErrors(prev => ({ ...prev, property: '' })); }}
                onBlur={() => { setTouched(prev => ({ ...prev, property: true })); if (!selectedProperty) setFormErrors(prev => ({ ...prev, property: 'Please select a property' })); }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.property && formErrors.property ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                required
                disabled={!selectedPartnership}
              >
                <option value="">Choose a property</option>
                {properties.map((property) => (<option key={property._id} value={property._id}>{property.name} - {property.location?.city}</option>))}
              </select>
              {touched.property && formErrors.property && <p className="text-sm text-red-600 mt-1">{formErrors.property}</p>}
            </div>
          )}

          {preSelectedProperty && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{preSelectedProperty.name}</p>
              <p className="text-sm text-gray-500">{preSelectedProperty.location?.city}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'office', label: 'Office Visit', icon: '🏢' }, { value: 'virtual_meet', label: 'Virtual Meet', icon: '💻' }].map((type) => (
                <label key={type.value} className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${bookingForm.visitType === type.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="visitType" value={type.value} checked={bookingForm.visitType === type.value} onChange={(e) => setBookingForm({ ...bookingForm, visitType: e.target.value, officeLocation: '', timeSlot: '' })} className="sr-only" />
                  <span className="text-2xl mb-2">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose of Visit *</label>
            <input
              type="text"
              value={bookingForm.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              onBlur={() => handleBlur('purpose')}
              placeholder="e.g., Client viewing, Property discussion..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.purpose && formErrors.purpose ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              required
            />
            {touched.purpose && formErrors.purpose && <p className="text-sm text-red-600 mt-1">{formErrors.purpose}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="hasClient" checked={bookingForm.hasClient} onChange={(e) => setBookingForm({ ...bookingForm, hasClient: e.target.checked })} className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer" />
            <label htmlFor="hasClient" className="text-sm text-gray-700 cursor-pointer select-none">I'm bringing a client with me</label>
          </div>

          {bookingForm.hasClient && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={bookingForm.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  onBlur={() => handleBlur('clientName')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.clientName && formErrors.clientName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  required
                />
                {touched.clientName && formErrors.clientName && <p className="text-sm text-red-600 mt-1">{formErrors.clientName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Phone *</label>
                <input
                  type="tel"
                  value={bookingForm.clientPhone}
                  onChange={(e) => {
                    const phoneValue = e.target.value.replace(/[^0-9+\-\s]/g, '').substring(0, 15);
                    handleChange('clientPhone', phoneValue);
                  }}
                  onBlur={() => handleBlur('clientPhone')}
                  placeholder="10-digit mobile number"
                  maxLength={15}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.clientPhone && formErrors.clientPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  required
                />
                {touched.clientPhone && formErrors.clientPhone && <p className="text-sm text-red-600 mt-1">{formErrors.clientPhone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Email (Optional)</label>
                <input
                  type="email"
                  value={bookingForm.clientEmail}
                  onChange={(e) => handleChange('clientEmail', e.target.value)}
                  onBlur={() => handleBlur('clientEmail')}
                  placeholder="client@example.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.clientEmail && formErrors.clientEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
                {touched.clientEmail && formErrors.clientEmail && <p className="text-sm text-red-600 mt-1">{formErrors.clientEmail}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Office *</label>
            <select
              value={bookingForm.officeLocation}
              onChange={(e) => { handleChange('officeLocation', e.target.value); setBookingForm(prev => ({ ...prev, officeLocation: e.target.value, scheduledDate: '', timeSlot: '' })); }}
              onBlur={() => { setTouched(prev => ({ ...prev, officeLocation: true })); if (!bookingForm.officeLocation) setFormErrors(prev => ({ ...prev, officeLocation: 'Please select an office' })); }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.officeLocation && formErrors.officeLocation ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              required
            >
              <option value="">Choose an office location</option>
              {offices.map((office) => (<option key={office._id} value={office._id}>{office.name} - {office.address?.city}</option>))}
            </select>
            {touched.officeLocation && formErrors.officeLocation && <p className="text-sm text-red-600 mt-1">{formErrors.officeLocation}</p>}
            {offices.length === 0 && <p className="text-sm text-amber-600 mt-1">No offices available for booking</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date *</label>
            <input
              type="date"
              value={bookingForm.scheduledDate}
              onChange={(e) => { handleChange('scheduledDate', e.target.value); setBookingForm(prev => ({ ...prev, scheduledDate: e.target.value, timeSlot: '' })); }}
              onBlur={() => handleBlur('scheduledDate')}
              min={getMinDate()}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${touched.scheduledDate && formErrors.scheduledDate ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              required
            />
            {touched.scheduledDate && formErrors.scheduledDate && <p className="text-sm text-red-600 mt-1">{formErrors.scheduledDate}</p>}
          </div>

          {bookingForm.officeLocation && bookingForm.scheduledDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available Time Slots *</label>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div><span className="ml-2 text-sm text-gray-500">Loading slots...</span></div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-amber-600 py-2">No available slots for this date. Please select another date.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = bookingForm.timeSlot === slot.time;
                      const isUnavailable = !slot.isAvailable || slot.availableSpots <= 0;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => {
                            if (isUnavailable) return;
                            setBookingForm({ ...bookingForm, timeSlot: slot.time, scheduledTime: slot.time });
                            setTouched(prev => ({ ...prev, timeSlot: true }));
                            if (formErrors.timeSlot) setFormErrors(prev => ({ ...prev, timeSlot: '' }));
                          }}
                          className={`flex flex-col items-center p-2 rounded-lg border-2 transition-colors ${
                            isUnavailable
                              ? 'border-red-200 bg-red-50 cursor-not-allowed'
                              : isSelected
                                ? 'border-indigo-500 bg-indigo-50 cursor-pointer'
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-25 cursor-pointer'
                          }`}
                        >
                          <span className={`text-sm font-medium ${isUnavailable ? 'text-red-400 line-through' : isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {slot.displayTime || slot.time}
                          </span>
                          <span className={`text-xs ${isUnavailable ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {isUnavailable ? '✕ Full' : `${slot.availableSpots || 1} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {touched.timeSlot && formErrors.timeSlot && <p className="text-sm text-red-600 mt-2">{formErrors.timeSlot}</p>}
                </>
              )}
            </div>
          )}

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label><textarea value={bookingForm.partnerNotes} onChange={(e) => setBookingForm({ ...bookingForm, partnerNotes: e.target.value })} rows={2} placeholder="Any notes for the company..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Booking...' : 'Book Visit'}</button>
          </div>

          {partnerships.length === 0 && <p className="text-sm text-red-600 text-center">You don't have an active partnership. Please apply first.</p>}
        </form>
      </div>
    </div>
  );
};

export default BookVisitModal;