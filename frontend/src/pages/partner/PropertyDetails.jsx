import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getDocumentViewUrl } from '../../utils/api';
import BookVisitModal from '../../components/common/BookVisitModal';
import { formatCurrency } from '../../utils/currency';

const PropertyDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  // Booking modal state
  const [showBookModal, setShowBookModal] = useState(false);
  const [partnerships, setPartnerships] = useState([]);
  const [selectedPartnership, setSelectedPartnership] = useState('');

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
      const response = await api.get(`/properties/${id}`);
      setProperty(response.data?.data?.property || null);
    } catch (err) {
      console.error('Error fetching property:', err);
      toast.error(err.response?.data?.message || 'Failed to load property');
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

  const formatPrice = (prop) => {
    if (!prop) return '';
    if (prop.pricing?.priceOnRequest) return 'Price on Request';
    return formatCurrency(prop.pricing?.basePrice || 0, prop.pricing?.currency || 'INR');
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

  if (!property) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Property Not Found" subtitle="" color={config.color}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700 mb-6">
          Property not found
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
            {property.location?.address}, {property.location?.city}, {property.location?.state || property.location?.emirate} {property.location?.zipCode}
          </p>
          {property.location?.landmark && (
            <p className="text-gray-500 text-sm mt-1">
              <span className="font-medium">Landmark:</span> {property.location.landmark}
            </p>
          )}
          {property.location?.mapUrl && (
            <a
              href={property.location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm mt-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Map
            </a>
          )}

          {/* Price */}
          <div className="mt-4">
            <span className="text-3xl font-bold text-indigo-600">{formatPrice(property)}</span>
            {property.pricing?.priceOnRequest && (
              <span className="ml-2 text-sm text-gray-500">(Price on Request)</span>
            )}
          </div>

          {/* Commission Info */}
          {(property.commission?.basePercentage > 0 || property.commission?.fixedAmount > 0) && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Commission Available</p>
              <p className="text-lg font-semibold text-green-700">
                {property.commission?.isFixed
                  ? `${property.pricing?.currency === 'AED' ? 'AED ' : '₹'}${property.commission.fixedAmount} (Fixed)`
                  : `${property.commission.basePercentage}% of sale value`}
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

      {/* Pricing Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Base Price</p>
            <p className="font-semibold text-lg text-indigo-600">{formatPrice(property)}</p>
            {property.pricing?.priceOnRequest && (
              <span className="text-xs text-gray-500">(Price on Request)</span>
            )}
          </div>
          {property.pricing?.pricePerSqFt && (
            <div>
              <p className="text-sm text-gray-500">Price per {property.details?.areaUnit === 'sqm' ? 'sq m' : 'sq ft'}</p>
              <p className="font-semibold">{property.pricing.currency === 'AED' ? 'AED ' : '₹'}{property.pricing.pricePerSqFt.toLocaleString()}</p>
            </div>
          )}
          {property.pricing?.pricePerSqM && (
            <div>
              <p className="text-sm text-gray-500">Price per sq m</p>
              <p className="font-semibold">{property.pricing.currency === 'AED' ? 'AED ' : '₹'}{property.pricing.pricePerSqM.toLocaleString()}</p>
            </div>
          )}
          {property.pricing?.bookingAmount && (
            <div>
              <p className="text-sm text-gray-500">Booking Amount</p>
              <p className="font-semibold">{property.pricing.currency === 'AED' ? 'AED ' : '₹'}{property.pricing.bookingAmount.toLocaleString()}</p>
            </div>
          )}
          {property.pricing?.maintenanceCharges && (
            <div>
              <p className="text-sm text-gray-500">Maintenance Charges</p>
              <p className="font-semibold">{property.pricing.currency === 'AED' ? 'AED ' : '₹'}{property.pricing.maintenanceCharges.toLocaleString()}</p>
            </div>
          )}
          {property.pricing?.otherCharges && (
            <div>
              <p className="text-sm text-gray-500">Other Charges</p>
              <p className="font-semibold">{property.pricing.currency === 'AED' ? 'AED ' : '₹'}{property.pricing.otherCharges.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

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
          {property.details?.balconies && (
            <div>
              <p className="text-sm text-gray-500">Balconies</p>
              <p className="font-semibold">{property.details.balconies}</p>
            </div>
          )}
          {property.details?.superBuiltUpArea && (
            <div>
              <p className="text-sm text-gray-500">Super Built-up Area</p>
              <p className="font-semibold">{property.details.superBuiltUpArea} {property.details.areaUnit || 'sqft'}</p>
            </div>
          )}
          {property.details?.builtUpArea && (
            <div>
              <p className="text-sm text-gray-500">Built-up Area</p>
              <p className="font-semibold">{property.details.builtUpArea} {property.details.areaUnit || 'sqft'}</p>
            </div>
          )}
          {property.details?.carpetArea && (
            <div>
              <p className="text-sm text-gray-500">Carpet Area</p>
              <p className="font-semibold">{property.details.carpetArea} {property.details.areaUnit || 'sqft'}</p>
            </div>
          )}
          {property.details?.plotArea && (
            <div>
              <p className="text-sm text-gray-500">Plot Area</p>
              <p className="font-semibold">{property.details.plotArea} {property.details.areaUnit || 'sqft'}</p>
            </div>
          )}
          {property.details?.totalFloors && (
            <div>
              <p className="text-sm text-gray-500">Total Floors</p>
              <p className="font-semibold">{property.details.totalFloors}</p>
            </div>
          )}
          {property.details?.floorNumber && (
            <div>
              <p className="text-sm text-gray-500">Floor Number</p>
              <p className="font-semibold">{property.details.floorNumber}</p>
            </div>
          )}
          {property.details?.furnishing && (
            <div>
              <p className="text-sm text-gray-500">Furnishing</p>
              <p className="font-semibold capitalize">{property.details.furnishing.replace('furnished', ' Furnished')}</p>
            </div>
          )}
          {(property.details?.parking?.covered || property.details?.parking?.open) && (
            <div>
              <p className="text-sm text-gray-500">Parking</p>
              <p className="font-semibold">
                {property.details.parking.covered || 0} covered, {property.details.parking.open || 0} open
              </p>
            </div>
          )}
          {property.details?.facing && (
            <div>
              <p className="text-sm text-gray-500">Facing</p>
              <p className="font-semibold capitalize">{property.details.facing}</p>
            </div>
          )}
          {property.details?.ageOfProperty && (
            <div>
              <p className="text-sm text-gray-500">Age of Property</p>
              <p className="font-semibold">{property.details.ageOfProperty} years</p>
            </div>
          )}
        </div>
      </div>

      {/* Amenities */}
      {(() => {
        const amenityLabels = {
          powerBackup: 'Power Backup',
          lift: 'Lift',
          security: 'Security',
          swimmingPool: 'Swimming Pool',
          gym: 'Gym',
          clubHouse: 'Club House',
          garden: 'Garden',
          childrenPlayArea: 'Children Play Area',
          joggingTrack: 'Jogging Track',
          indoorGames: 'Indoor Games',
          fireSafety: 'Fire Safety',
          rainWaterHarvesting: 'Rain Water Harvesting',
          sewageTreatment: 'Sewage Treatment'
        };
        const amenities = Object.keys(amenityLabels).filter(key => property.details?.[key]);
        const customAmenities = property.details?.customAmenities || [];

        if (amenities.length > 0 || customAmenities.length > 0) {
          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <span key={amenity} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {amenityLabels[amenity]}
                  </span>
                ))}
                {customAmenities.map((amenity, idx) => (
                  <span key={`custom-${idx}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Description */}
      {property.description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
        </div>
      )}

      {/* Region-Specific Details - India */}
      {property.region === 'india' && property.indiaDetails && Object.keys(property.indiaDetails).some(key => property.indiaDetails[key]) && (
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
            {property.indiaDetails.reraWebsite && (
              <div>
                <p className="text-sm text-gray-500">RERA Website</p>
                <a href={property.indiaDetails.reraWebsite} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline break-all">
                  {property.indiaDetails.reraWebsite}
                </a>
              </div>
            )}
            {property.indiaDetails.gstNumber && (
              <div>
                <p className="text-sm text-gray-500">GST Number</p>
                <p className="font-medium">{property.indiaDetails.gstNumber}</p>
              </div>
            )}
            {property.indiaDetails.ownershipType && (
              <div>
                <p className="text-sm text-gray-500">Ownership Type</p>
                <p className="font-medium capitalize">{property.indiaDetails.ownershipType.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            )}
            {property.indiaDetails.transactionType && (
              <div>
                <p className="text-sm text-gray-500">Transaction Type</p>
                <p className="font-medium capitalize">{property.indiaDetails.transactionType.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            )}
            {property.indiaDetails.possessionStatus && (
              <div>
                <p className="text-sm text-gray-500">Possession Status</p>
                <p className="font-medium">
                  {property.indiaDetails.possessionStatus === 'readytomove' ? 'Ready to Move' :
                   property.indiaDetails.possessionStatus === 'underconstruction' ? 'Under Construction' :
                   property.indiaDetails.possessionStatus === 'ocreceived' ? 'OC Received' :
                   property.indiaDetails.possessionStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            )}
            {property.indiaDetails.possessionDate && (
              <div>
                <p className="text-sm text-gray-500">Possession Date</p>
                <p className="font-medium">{new Date(property.indiaDetails.possessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {property.indiaDetails.builderName && (
              <div>
                <p className="text-sm text-gray-500">Builder Name</p>
                <p className="font-medium">{property.indiaDetails.builderName}</p>
              </div>
            )}
            {property.indiaDetails.approvedBy && property.indiaDetails.approvedBy.length > 0 && (
              <div>
                <p className="text-sm text-gray-500">Approved By</p>
                <p className="font-medium">{property.indiaDetails.approvedBy.map(a => a.replace(/([A-Z])/g, ' $1').trim()).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Region-Specific Details - Dubai */}
      {property.region === 'dubai' && property.dubaiDetails && Object.keys(property.dubaiDetails).some(key => property.dubaiDetails[key]) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dubai Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {property.dubaiDetails.dldPermitNumber && (
              <div>
                <p className="text-sm text-gray-500">DLD Permit Number</p>
                <p className="font-medium">{property.dubaiDetails.dldPermitNumber}</p>
              </div>
            )}
            {property.dubaiDetails.dldPropertyId && (
              <div>
                <p className="text-sm text-gray-500">DLD Property ID</p>
                <p className="font-medium">{property.dubaiDetails.dldPropertyId}</p>
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
            {property.dubaiDetails.propertyStatus && (
              <div>
                <p className="text-sm text-gray-500">Property Status</p>
                <p className="font-medium capitalize">{property.dubaiDetails.propertyStatus}</p>
              </div>
            )}
            {property.dubaiDetails.completionDate && (
              <div>
                <p className="text-sm text-gray-500">Completion Date</p>
                <p className="font-medium">{new Date(property.dubaiDetails.completionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {property.dubaiDetails.titleDeedNumber && (
              <div>
                <p className="text-sm text-gray-500">Title Deed Number</p>
                <p className="font-medium">{property.dubaiDetails.titleDeedNumber}</p>
              </div>
            )}
            {property.dubaiDetails.serviceCharges && (
              <div>
                <p className="text-sm text-gray-500">Service Charges</p>
                <p className="font-medium">AED {property.dubaiDetails.serviceCharges.toLocaleString()}/{property.details?.areaUnit === 'sqm' ? 'sq m' : 'sq ft'}</p>
              </div>
            )}
            {property.dubaiDetails.ownershipType && (
              <div>
                <p className="text-sm text-gray-500">Ownership Type</p>
                <p className="font-medium capitalize">{property.dubaiDetails.ownershipType}</p>
              </div>
            )}
            {property.dubaiDetails.escrowAccountNumber && (
              <div>
                <p className="text-sm text-gray-500">Escrow Account Number</p>
                <p className="font-medium">{property.dubaiDetails.escrowAccountNumber}</p>
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
          <div className="space-y-2">
            {property.videos.map((video, idx) => (
              <a
                key={idx}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {video.title || `Video ${idx + 1}`}
              </a>
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
      <BookVisitModal
        show={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={() => {
          toast.success('Visit booked successfully.');
          setShowBookModal(false);
          window.scrollTo(0, 0);
        }}
        selectedProperty={property}
        selectedPartnership={selectedPartnership}
        partnerships={partnerships}
      />

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