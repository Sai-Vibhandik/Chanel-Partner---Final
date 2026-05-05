import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api, { getDocumentViewUrl } from '../../utils/api';

const PropertyDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Booking modal state
  const [showBookModal, setShowBookModal] = useState(false);
  const [partnerships, setPartnerships] = useState([]);
  const [selectedPartnership, setSelectedPartnership] = useState('');
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

  // Chat modal state
  const [showChatModal, setShowChatModal] = useState(false);

  const config = sidebarConfig.partner;

  useEffect(() => {
    fetchProperty();
  }, [id]);

  useEffect(() => {
    if (showBookModal || showChatModal) {
      fetchPartnerships();
    }
  }, [showBookModal, showChatModal]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/properties/${id}`);
      setProperty(response.data?.data?.property || null);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError(err.response?.data?.message || 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerships = async () => {
    try {
      const response = await api.get('/partner-company/my-companies');
      // Filter partnerships for this property's company
      const propertyCompanyPartnerships = response.data.data.partnerships.filter(
        p => p.status === 'active' && p.companyId?._id === property?.companyId?._id
      );
      setPartnerships(propertyCompanyPartnerships);
      if (propertyCompanyPartnerships.length > 0) {
        setSelectedPartnership(propertyCompanyPartnerships[0]._id);
      }
    } catch (err) {
      console.error('Failed to load partnerships');
    }
  };

  const handleBookVisit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/visits', {
        propertyId: id,
        partnershipId: selectedPartnership,
        visitType: bookingForm.visitType,
        scheduledDate: bookingForm.scheduledDate,
        scheduledTime: bookingForm.scheduledTime,
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book visit');
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatPrice = (prop) => {
    if (!prop) return '';
    if (prop.pricing?.priceOnRequest) return 'Price on Request';

    const price = prop.pricing?.basePrice || 0;
    const currency = prop.pricing?.currency === 'AED' ? 'AED ' : '₹';

    if (prop.region === 'dubai') {
      if (price >= 1000000) return `${currency}${(price / 1000000).toFixed(2)}M`;
      if (price >= 1000) return `${currency}${(price / 1000).toFixed(0)}K`;
      return `${currency}${price.toLocaleString()}`;
    } else {
      if (price >= 10000000) return `${currency}${(price / 10000000).toFixed(2)} Cr`;
      if (price >= 100000) return `${currency}${(price / 100000).toFixed(2)} Lac`;
      return `${currency}${price.toLocaleString()}`;
    }
  };

  const propertyTypes = {
    apartment: 'Apartment',
    villa: 'Villa',
    plot: 'Plot/Land',
    commercial: 'Commercial',
    office: 'Office Space',
    retail: 'Retail',
    warehouse: 'Warehouse',
    land: 'Land'
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Loading..." subtitle="" color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Property Not Found" subtitle="" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error || 'Property not found'}
        </div>
        <button
          onClick={() => navigate('/partner/properties')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Properties
        </button>
      </DashboardLayout>
    );
  }

  const primaryImage = property.images?.find(img => img.isPrimary) || property.images?.[0];

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title={property.name || 'Property Details'}
      subtitle="View property details"
      color={config.color}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/properties')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Properties
      </button>

      {/* Main Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Image Gallery */}
        <div className="h-80 bg-gradient-to-br from-indigo-400 to-purple-500 relative">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm font-medium">
                {property.region === 'india' ? 'India' : 'Dubai'}
              </span>
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                {propertyTypes[property.type] || property.type}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{property.name}</h1>
          <p className="text-gray-500 flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {property.location?.address}, {property.location?.city}, {property.location?.state || property.location?.emirate} {property.location?.pincode}
          </p>

          {/* Price */}
          <div className="mt-4">
            <span className="text-3xl font-bold text-indigo-600">{formatPrice(property)}</span>
            {property.pricing?.priceOnRequest && (
              <span className="ml-2 text-sm text-gray-500">(Price on Request)</span>
            )}
          </div>

          {/* Commission Info */}
          {property.commission?.basePercentage > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Commission Available</p>
              <p className="text-lg font-semibold text-green-700">
                {property.commission.basePercentage}% of sale value
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => setShowBookModal(true)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-lg"
            >
              📅 Book a Site Visit
            </button>
            <button
              onClick={() => setShowChatModal(true)}
              className="w-full px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat with Company
            </button>
          </div>
        </div>
      </div>

      {/* Property Images */}
      {property.images && property.images.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.images.map((img, idx) => (
              <div key={idx} className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={img.url}
                  alt={`Property ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => window.open(img.url, '_blank')}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {property.details?.bedrooms && (
            <div>
              <p className="text-sm text-gray-500">Bedrooms</p>
              <p className="font-semibold">{property.details.bedrooms}</p>
            </div>
          )}
          {property.details?.bathrooms && (
            <div>
              <p className="text-sm text-gray-500">Bathrooms</p>
              <p className="font-semibold">{property.details.bathrooms}</p>
            </div>
          )}
          {property.details?.builtUpArea && (
            <div>
              <p className="text-sm text-gray-500">Built-up Area</p>
              <p className="font-semibold">{property.details.builtUpArea} {property.details.areaUnit || 'sqft'}</p>
            </div>
          )}
          {property.details?.plotArea && (
            <div>
              <p className="text-sm text-gray-500">Plot Area</p>
              <p className="font-semibold">{property.details.plotArea} {property.details.plotUnit || 'sqft'}</p>
            </div>
          )}
          {property.details?.floors && (
            <div>
              <p className="text-sm text-gray-500">Floors</p>
              <p className="font-semibold">{property.details.floors}</p>
            </div>
          )}
          {(property.details?.parking?.covered || property.details?.parking?.open) ? (
            <div>
              <p className="text-sm text-gray-500">Parking</p>
              <p className="font-semibold">
                {property.details.parking.covered || 0} covered, {property.details.parking.open || 0} open
              </p>
            </div>
          ) : null}
          {property.details?.facing && (
            <div>
              <p className="text-sm text-gray-500">Facing</p>
              <p className="font-semibold capitalize">{property.details.facing}</p>
            </div>
          )}
          {property.details?.possession && (
            <div>
              <p className="text-sm text-gray-500">Possession</p>
              <p className="font-semibold">{property.details.possession}</p>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {property.description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
        </div>
      )}

      {/* Amenities */}
      {property.details?.amenities && property.details.amenities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {property.details.amenities.map((amenity, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Region-Specific Details */}
      {property.region === 'india' && property.indiaDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">India Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {property.indiaDetails.reraNumber && (
              <div>
                <p className="text-sm text-gray-500">RERA Number</p>
                <p className="font-medium">{property.indiaDetails.reraNumber}</p>
              </div>
            )}
            {property.indiaDetails.reraProjectName && (
              <div>
                <p className="text-sm text-gray-500">RERA Project Name</p>
                <p className="font-medium">{property.indiaDetails.reraProjectName}</p>
              </div>
            )}
            {property.indiaDetails.gstNumber && (
              <div>
                <p className="text-sm text-gray-500">GST Number</p>
                <p className="font-medium">{property.indiaDetails.gstNumber}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {property.region === 'dubai' && property.dubaiDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dubai Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {property.dubaiDetails.dldPermitNumber && (
              <div>
                <p className="text-sm text-gray-500">DLD Permit Number</p>
                <p className="font-medium">{property.dubaiDetails.dldPermitNumber}</p>
              </div>
            )}
            {property.dubaiDetails.developerName && (
              <div>
                <p className="text-sm text-gray-500">Developer</p>
                <p className="font-medium">{property.dubaiDetails.developerName}</p>
              </div>
            )}
            {property.dubaiDetails.projectName && (
              <div>
                <p className="text-sm text-gray-500">Project Name</p>
                <p className="font-medium">{property.dubaiDetails.projectName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floor Plans */}
      {property.floorPlans && property.floorPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Floor Plans</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {property.floorPlans.map((plan, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <img
                  src={plan.url}
                  alt={`Floor Plan ${idx + 1}`}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => window.open(plan.url, '_blank')}
                />
                {plan.name && (
                  <p className="p-2 text-sm text-center text-gray-600">{plan.name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {property.videos && property.videos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Videos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {property.videos.map((video, idx) => (
              <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                <video
                  src={video.url}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brochure */}
      {property.brochure?.url && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brochure</h3>
          <a
            href={getDocumentViewUrl(property.brochure.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View {property.brochure.name || 'Brochure'}
          </a>
        </div>
      )}

      {/* Book Visit Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleBookVisit} className="p-6 space-y-4">
              {/* Property Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-900">{property.name}</p>
                <p className="text-sm text-gray-500">{property.location?.city}, {property.location?.state || property.location?.emirate}</p>
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type</label>
                <div className="flex gap-4">
                  {[
                    { value: 'site', label: 'Site Visit' },
                    { value: 'office', label: 'Office Visit' },
                    { value: 'virtual', label: 'Virtual Tour' }
                  ].map((type) => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="radio"
                        name="visitType"
                        value={type.value}
                        checked={bookingForm.visitType === type.value}
                        onChange={(e) => setBookingForm({ ...bookingForm, visitType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={bookingForm.scheduledDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, scheduledDate: e.target.value })}
                    min={getMinDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                  <select
                    value={bookingForm.scheduledTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              </div>

              {/* Client Details */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Client Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                    <input
                      type="text"
                      value={bookingForm.clientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Phone *</label>
                    <input
                      type="tel"
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={bookingForm.clientNotes}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientNotes: e.target.value })}
                      rows={2}
                      placeholder="Any special requirements..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || partnerships.length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Booking...' : 'Book Visit'}
                </button>
              </div>

              {partnerships.length === 0 && (
                <p className="text-sm text-red-600 text-center">
                  You don't have an active partnership with this company. Please apply first.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Chat with Company</h3>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Company Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{property.companyId?.name || 'Unknown Company'}</p>
              </div>

              {partnerships.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">You don't have an active partnership with this company.</p>
                  <button
                    onClick={() => {
                      setShowChatModal(false);
                      navigate('/partner/companies');
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Apply for Partnership
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">Choose who you want to chat with:</p>

                  {/* Chat with SuperAdmin */}
                  <button
                    onClick={() => {
                      navigate(`/partner/chat?partnershipId=${partnerships[0]._id}&adminType=company_superadmin`);
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        SA
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Company SuperAdmin</p>
                        <p className="text-sm text-gray-500">Chat with company administrator</p>
                      </div>
                    </div>
                  </button>

                  {/* Chat with Partner Manager */}
                  <button
                    onClick={() => {
                      navigate(`/partner/chat?partnershipId=${partnerships[0]._id}&adminType=partner_manager`);
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                        PM
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Partner Manager</p>
                        <p className="text-sm text-gray-500">Chat with partner relationship manager</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PropertyDetails;