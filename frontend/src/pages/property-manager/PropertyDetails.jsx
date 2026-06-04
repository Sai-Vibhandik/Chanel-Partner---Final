import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api, { getDocumentViewUrl } from '../../utils/api';
import { sidebarConfig } from '../../config/sidebar';
import { formatCurrency } from '../../utils/currency';

const PropertyDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [originalStatus, setOriginalStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const config = sidebarConfig[user?.role] || sidebarConfig.property_manager;
  const basePath = user?.role === 'company_superadmin' ? '/company/properties' : '/property-manager/properties';

  // Check if status has been changed
  const hasStatusChanged = selectedStatus !== originalStatus && selectedStatus !== '' && originalStatus !== '';

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/properties/${id}`);
      const propertyData = response.data?.data?.property || null;
      setProperty(propertyData);
      if (propertyData) {
        setSelectedStatus(propertyData.status);
        setOriginalStatus(propertyData.status);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load property';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSelect = (newStatus) => {
    setSelectedStatus(newStatus);
  };

  const handleSaveStatus = async () => {
    if (!hasStatusChanged) return;

    try {
      setSavingStatus(true);
      await api.put(`/properties/${id}/status`, { status: selectedStatus });
      setProperty(prev => prev ? { ...prev, status: selectedStatus } : prev);
      setOriginalStatus(selectedStatus);
      toast.success('Status updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCancelStatusChange = () => {
    setSelectedStatus(originalStatus);
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

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'sold_out', label: 'Sold Out', color: 'bg-red-100 text-red-800' },
    { value: 'off_market', label: 'Off Market', color: 'bg-yellow-100 text-yellow-800' }
  ];

  const getStatusBadge = (status) => {
    const option = statusOptions.find(o => o.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Loading..." subtitle="" color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
          onClick={() => navigate(basePath)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Back to Properties
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title={property.name || 'Property Details'}
      subtitle="View property details"
      color={config.color}
    >
      {/* Header */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => navigate(basePath)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          ← Back to Properties
        </button>
        {property.status === 'sold_out' ? (
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            title="Sold out properties cannot be edited"
          >
            Edit Property
          </button>
        ) : (
          <button
            onClick={() => navigate(`${basePath}/${id}/edit`)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Edit Property
          </button>
        )}
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500 mt-1">
              {property.location?.address}, {property.location?.city}
              {property.location?.state && `, ${property.location.state}`}
              {property.location?.emirate && `, ${property.location.emirate}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(property.status)}`}>
              {statusOptions.find(s => s.value === property.status)?.label || property.status}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {property.region === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai'}
            </span>
          </div>
        </div>

        {/* Status Selector */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Change Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusSelect(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                hasStatusChanged ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
              }`}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {hasStatusChanged && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveStatus}
                  disabled={savingStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {savingStatus ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelStatusChange}
                  disabled={savingStatus}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {hasStatusChanged && (
            <p className="text-sm text-orange-600 mt-2">
              Status change pending. Click Save to confirm or Cancel to revert.
            </p>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Price */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Price</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatPrice(property)}</p>
        </div>

        {/* Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Type</p>
          <p className="text-lg font-semibold mt-1">{propertyTypes[property.type] || property.type}</p>
        </div>

        {/* Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Area</p>
          <p className="text-lg font-semibold mt-1">
            {property.details?.builtUpArea ? `${property.details.builtUpArea} ${property.details.areaUnit || 'sqft'}` : 'N/A'}
          </p>
        </div>

        {/* Bedrooms/Bathrooms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Bedrooms / Bathrooms</p>
          <p className="text-lg font-semibold mt-1">
            {property.details?.bedrooms || 0} / {property.details?.bathrooms || 0}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{property.description || 'No description provided.'}</p>
      </div>

      {/* Location Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium">{property.location?.address || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">City</p>
            <p className="font-medium">{property.location?.city || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{property.region === 'dubai' ? 'Emirate' : 'State'}</p>
            <p className="font-medium">{property.location?.state || property.location?.emirate || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Postal Code</p>
            <p className="font-medium">{property.location?.zipCode || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Landmark</p>
            <p className="font-medium">{property.location?.landmark || 'N/A'}</p>
          </div>
          {property.location?.coordinates?.lat && property.location?.coordinates?.lng && (
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {property.location.coordinates.lat.toFixed(6)}, {property.location.coordinates.lng.toFixed(6)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${property.location.coordinates.lat},${property.location.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View on Map
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      {property.images && property.images.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Images ({property.images.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.images.map((img, idx) => (
              <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img src={img.url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                {img.isPrimary && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Region Specific Details */}
      {property.region === 'india' && property.indiaDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">India Details</h3>
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
                <a href={property.indiaDetails.reraWebsite} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline break-all">{property.indiaDetails.reraWebsite}</a>
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
                <p className="font-medium capitalize">{property.indiaDetails.ownershipType.replace('_', ' ')}</p>
              </div>
            )}
            {property.indiaDetails.transactionType && (
              <div>
                <p className="text-sm text-gray-500">Transaction Type</p>
                <p className="font-medium capitalize">{property.indiaDetails.transactionType.replace('_', ' ')}</p>
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
                <p className="font-medium">{new Date(property.indiaDetails.possessionDate).toLocaleDateString()}</p>
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
                <p className="font-medium">
                  {property.indiaDetails.approvedBy.map(a => {
                    const labels = {
                      bank: 'Bank',
                      rera: 'RERA',
                      developmentauthority: 'Development Authority',
                      township: 'Township'
                    };
                    return labels[a] || a;
                  }).join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {property.region === 'dubai' && property.dubaiDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Dubai Details</h3>
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
            {property.dubaiDetails.titleDeedNumber && (
              <div>
                <p className="text-sm text-gray-500">Title Deed</p>
                <p className="font-medium">{property.dubaiDetails.titleDeedNumber}</p>
              </div>
            )}
            {property.dubaiDetails.serviceCharges && (
              <div>
                <p className="text-sm text-gray-500">Service Charges</p>
                <p className="font-medium">AED {property.dubaiDetails.serviceCharges.toLocaleString()}/sqft</p>
              </div>
            )}
            {property.dubaiDetails.escrowAccountNumber && (
              <div>
                <p className="text-sm text-gray-500">Escrow Account</p>
                <p className="font-medium">{property.dubaiDetails.escrowAccountNumber}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amenities */}
      {property.details && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'powerBackup', label: 'Power Backup' },
              { key: 'lift', label: 'Lift' },
              { key: 'security', label: '24/7 Security' },
              { key: 'swimmingPool', label: 'Swimming Pool' },
              { key: 'gym', label: 'Gym' },
              { key: 'clubHouse', label: 'Club House' },
              { key: 'garden', label: 'Garden' },
              { key: 'childrenPlayArea', label: 'Children Play Area' },
              { key: 'joggingTrack', label: 'Jogging Track' },
              { key: 'indoorGames', label: 'Indoor Games' },
              { key: 'fireSafety', label: 'Fire Safety' },
              { key: 'rainWaterHarvesting', label: 'Rain Water Harvesting' },
              { key: 'sewageTreatment', label: 'Sewage Treatment' }
            ].map(amenity => (
              <div key={amenity.key} className={`flex items-center gap-2 ${property.details[amenity.key] ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${property.details[amenity.key] ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span className="text-sm">{amenity.label}</span>
              </div>
            ))}
          </div>
          {/* Custom Amenities */}
          {property.details.customAmenities && property.details.customAmenities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Additional Amenities</p>
              <div className="flex flex-wrap gap-2">
                {property.details.customAmenities.map((amenity, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Link */}
      {property.location?.mapUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location on Map</h3>
          <a
            href={property.location.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Open in Google Maps
          </a>
        </div>
      )}

      {/* Videos */}
      {property.videos && property.videos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Videos</h3>
          <div className="space-y-3">
            {property.videos.map((video, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {video.title || `Video ${idx + 1}`}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brochure */}
      {property.brochure?.url && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brochure</h3>
          <a
            href={getDocumentViewUrl(property.brochure.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View {property.brochure.name || 'Brochure'}
          </a>
        </div>
      )}

      {/* Floor Plans */}
      {property.floorPlans && property.floorPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Floor Plans</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.floorPlans.map((plan, idx) => (
              <div key={idx} className="relative group">
                <a href={plan.url} target="_blank" rel="noopener noreferrer">
                  <img src={plan.url} alt={plan.name || `Floor Plan ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">View Floor Plan</span>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visibility Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Visibility Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Visibility</p>
            <p className="font-medium">
              {property.visibility?.type === 'all' && 'Show to All Partners'}
              {property.visibility?.type === 'selected' && 'Show to Selected Partners'}
              {property.visibility?.type === 'hidden' && 'Hide from Selected Partners'}
              {!property.visibility?.type && 'Show to All Partners'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${property.visibility?.showPrice ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-sm">Show Price</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${property.visibility?.showContact ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-sm">Show Contact</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Commission</p>
            <p className="font-medium">
              {property.commission?.isFixed
                ? (property.commission.fixedAmount ? `${property.pricing?.currency === 'AED' ? 'AED ' : '₹'}${property.commission.fixedAmount}` : 'Not set')
                : (property.commission?.basePercentage ? `${property.commission.basePercentage}%` : 'Not set')}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PropertyDetails;