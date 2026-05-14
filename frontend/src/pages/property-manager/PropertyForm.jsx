import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { sidebarConfig } from '../../config/sidebar';

const DRAFT_KEY = 'property_draft';
const DRAFT_IMAGES_KEY = 'property_draft_images';
const DRAFT_BROCHURE_KEY = 'property_draft_brochure';
const DRAFT_FLOORPLANS_KEY = 'property_draft_floorplans';

const PropertyForm = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!id;

  const config = sidebarConfig[user?.role] || sidebarConfig.property_manager;
  const basePath = user?.role === 'company_superadmin' ? '/company/properties' : '/property-manager/properties';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check for fresh=true and clear draft once
  const shouldClearDraft = searchParams.get('fresh') === 'true';

  const getInitialFormData = () => ({
    name: '',
    description: '',
    type: 'apartment',
    region: 'india',
    location: {
      address: '',
      city: '',
      state: '',
      emirate: '',
      country: 'India',
      zipCode: '',
      landmark: '',
      mapUrl: ''
    },
    pricing: {
      basePrice: '',
      pricePerSqFt: '',
      currency: 'INR',
      bookingAmount: '',
      maintenanceCharges: '',
      otherCharges: ''
    },
    details: {
      bedrooms: '',
      bathrooms: '',
      balconies: '',
      superBuiltUpArea: '',
      builtUpArea: '',
      carpetArea: '',
      plotArea: '',
      areaUnit: 'sqft',
      totalFloors: '',
      floorNumber: '',
      furnishing: 'unfurnished',
      parking: { covered: 0, open: 0 },
      facing: '',
      ageOfProperty: '',
      // Amenities
      powerBackup: false,
      lift: false,
      security: false,
      swimmingPool: false,
      gym: false,
      clubHouse: false,
      garden: false,
      childrenPlayArea: false,
      joggingTrack: false,
      indoorGames: false,
      fireSafety: false,
      rainWaterHarvesting: false,
      sewageTreatment: false,
      customAmenities: []
    },
    indiaDetails: {
      reraNumber: '',
      reraProjectName: '',
      reraWebsite: '',
      gstNumber: '',
      ownershipType: '',
      transactionType: 'newbooking',
      possessionStatus: 'underconstruction',
      possessionDate: '',
      builderName: '',
      approvedBy: []
    },
    dubaiDetails: {
      dldPermitNumber: '',
      dldPropertyId: '',
      developerName: '',
      projectName: '',
      propertyStatus: 'ready',
      completionDate: '',
      titleDeedNumber: '',
      serviceCharges: '',
      ownershipType: 'freehold',
      escrowAccountNumber: ''
    },
    visibility: {
      type: 'all', // 'all', 'selected', 'hidden'
      showPrice: true,
      showContact: true,
      partnerIds: []
    },
    commission: {
      basePercentage: '',
      fixedAmount: '',
      isFixed: false
    }
  });

  // Initialize state from localStorage for new properties
  const loadDraft = () => {
    if (isEdit) return { form: getInitialFormData(), images: [], brochure: null, floorPlans: [], videos: [] };

    // Clear draft if fresh=true, then remove the param from URL
    if (shouldClearDraft) {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_IMAGES_KEY);
      localStorage.removeItem(DRAFT_BROCHURE_KEY);
      localStorage.removeItem(DRAFT_FLOORPLANS_KEY);
      return { form: getInitialFormData(), images: [], brochure: null, floorPlans: [], videos: [] };
    }

    // Load from localStorage
    try {
      const savedForm = localStorage.getItem(DRAFT_KEY);
      const savedImages = localStorage.getItem(DRAFT_IMAGES_KEY);
      const savedBrochure = localStorage.getItem(DRAFT_BROCHURE_KEY);
      const savedFloorPlans = localStorage.getItem(DRAFT_FLOORPLANS_KEY);
      return {
        form: savedForm ? { ...getInitialFormData(), ...JSON.parse(savedForm) } : getInitialFormData(),
        images: savedImages ? JSON.parse(savedImages) : [],
        brochure: savedBrochure ? JSON.parse(savedBrochure) : null,
        floorPlans: savedFloorPlans ? JSON.parse(savedFloorPlans) : []
      };
    } catch (err) {
      console.error('Failed to restore draft:', err);
      return { form: getInitialFormData(), images: [], brochure: null, floorPlans: [], videos: [] };
    }
  };

  const draft = loadDraft();
  const [formData, setFormData] = useState(draft.form);
  const [images, setImages] = useState(draft.images);
  const [videos, setVideos] = useState([]);
  const [brochure, setBrochure] = useState(draft.brochure);
  const [floorPlans, setFloorPlans] = useState(draft.floorPlans);
  const [partners, setPartners] = useState([]);

  // Remove fresh param from URL after first render
  useEffect(() => {
    if (shouldClearDraft) {
      searchParams.delete('fresh');
      setSearchParams(searchParams);
    }
  }, [shouldClearDraft]);

  // Fetch partners for visibility selection
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        // Get company ID from user's profile
        console.log('User object:', user);
        const companyId = user?.companyId || user?.company?._id || user?.company;
        console.log('Company ID:', companyId);
        if (!companyId) {
          console.log('No company ID found for user');
          return;
        }
        const res = await api.get(`/partner-company/company/${companyId}/partners?limit=100`);
        console.log('Partners response:', res.data);
        // The response returns partnerships, extract partner info
        const partnerships = res.data.data.partnerships || [];
        console.log('Partnerships:', partnerships);
        const partnersList = partnerships
          .filter(p => p.status === 'active')
          .map(p => ({
            _id: p.partnerId?._id,
            firstName: p.partnerId?.firstName,
            lastName: p.partnerId?.lastName,
            email: p.partnerId?.email,
            tier: p.tier
          }))
          .filter(p => p._id);
        console.log('Partners list:', partnersList);
        setPartners(partnersList);
      } catch (err) {
        console.error('Failed to fetch partners:', err);
      }
    };
    if (user) {
      fetchPartners();
    }
  }, [user]);

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot/Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'office', label: 'Office Space' },
    { value: 'retail', label: 'Retail' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'land', label: 'Land' }
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep'
  ];

  const dubaiEmirates = [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'
  ];

  useEffect(() => {
    if (isEdit) {
      fetchProperty();
    }
  }, [id]);

  // Save draft to localStorage for new properties
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }
  }, [formData, isEdit]);

  // Save images to localStorage for new properties
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_IMAGES_KEY, JSON.stringify(images));
    }
  }, [images, isEdit]);

  // Save brochure to localStorage for new properties
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_BROCHURE_KEY, JSON.stringify(brochure));
    }
  }, [brochure, isEdit]);

  // Save floorPlans to localStorage for new properties
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_FLOORPLANS_KEY, JSON.stringify(floorPlans));
    }
  }, [floorPlans, isEdit]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/properties/${id}`);
      const property = response.data.data.property;

      setFormData({
        name: property.name || '',
        description: property.description || '',
        type: property.type || 'apartment',
        region: property.region || 'india',
        location: property.location || {},
        pricing: property.pricing || {},
        details: property.details || {},
        indiaDetails: property.indiaDetails || {},
        dubaiDetails: property.dubaiDetails || {},
        visibility: {
          type: property.visibility?.type || 'all',
          showPrice: property.visibility?.showPrice ?? true,
          showContact: property.visibility?.showContact ?? true,
          partnerIds: property.visibility?.partnerIds || []
        },
        commission: {
          basePercentage: property.commission?.basePercentage || '',
          fixedAmount: property.commission?.fixedAmount || '',
          isFixed: property.commission?.isFixed || false
        }
      });
      setImages(property.images || []);
      setVideos(property.videos || []);
      setBrochure(property.brochure || null);
      setFloorPlans(property.floorPlans || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    // Handle region change - auto-suggest currency
    if (name === 'region') {
      setFormData(prev => ({
        ...prev,
        region: val,
        // Auto-suggest currency based on region
        pricing: {
          ...prev.pricing,
          currency: val === 'dubai' ? 'AED' : 'INR'
        },
        // Auto-update country
        location: {
          ...prev.location,
          country: val === 'dubai' ? 'United Arab Emirates' : 'India',
          state: val === 'dubai' ? '' : prev.location.state,
          emirate: val === 'india' ? '' : prev.location.emirate
        },
        // Auto-update area unit
        details: {
          ...prev.details,
          areaUnit: val === 'dubai' ? 'sqm' : 'sqft'
        }
      }));
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: val
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploadingImage(true);
      setError('');

      for (const file of files) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setError(`${file.name} is not a valid image file. Only JPEG, PNG, and WebP are allowed.`);
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }

        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        formDataToSend.append('folder', `properties/${id || 'new'}`);

        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

        const response = await api.post('/upload/image', formDataToSend);
        const { url, publicId } = response.data.data;

        console.log('Upload successful:', { url, publicId });

        setImages(prev => [...prev, {
          url,
          publicId,
          caption: '',
          isPrimary: prev.length === 0
        }]);
      }

      // Clear the file input
      e.target.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSetPrimaryImage = (index) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      isPrimary: i === index
    })));
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_IMAGES_KEY);
    localStorage.removeItem(DRAFT_BROCHURE_KEY);
    localStorage.removeItem(DRAFT_FLOORPLANS_KEY);
    setFormData(getInitialFormData());
    setImages([]);
    setVideos([]);
    setBrochure(null);
    setFloorPlans([]);
  };

  const handleSubmit = async (e, publishStatus = 'draft') => {
    e.preventDefault();

    // Clear previous errors
    setError('');
    setFieldErrors({});

    // Basic validation - only check required fields when publishing
    if (publishStatus === 'active') {
      const errors = {};
      if (!formData.name.trim()) {
        errors.name = 'Property name is required';
      }
      if (!formData.pricing.basePrice || formData.pricing.basePrice <= 0) {
        errors.basePrice = 'Base price is required';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        images,
        videos: videos.filter(v => v.url),
        brochure,
        floorPlans,
        status: publishStatus
      };

      console.log('Submitting property data:', {
        imagesCount: images.length,
        images: images,
        videosCount: videos.length,
        hasBrochure: !!brochure,
        floorPlansCount: floorPlans.length
      });

      // Ensure commission is properly formatted
      if (submitData.commission) {
        const fixedAmount = parseFloat(submitData.commission.fixedAmount);
        submitData.commission = {
          basePercentage: parseFloat(submitData.commission.basePercentage) || 0,
          fixedAmount: isNaN(fixedAmount) ? null : fixedAmount,
          isFixed: Boolean(submitData.commission.isFixed)
        };
        console.log('Commission data being sent:', submitData.commission);
      }

      if (isEdit) {
        await api.put(`/properties/${id}`, submitData);
        navigate(basePath);
      } else {
        await api.post('/properties', submitData);
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_IMAGES_KEY);
        localStorage.removeItem(DRAFT_BROCHURE_KEY);
        localStorage.removeItem(DRAFT_FLOORPLANS_KEY);
        navigate(basePath);
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        // Map backend errors to field names and show below fields
        const fieldErrs = {};
        errorData.errors.forEach(e => {
          // Extract last part of field path (e.g., "location.mapUrl" -> "mapUrl")
          const fieldName = e.field.split('.').pop();
          fieldErrs[fieldName] = e.message;
        });
        setFieldErrors(fieldErrs);
      } else {
        setError(errorData?.message || 'Failed to save property');
      }
    } finally {
      setSaving(false);
    }
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

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title={isEdit ? 'Edit Property' : 'Add Property'}
      subtitle={isEdit ? 'Update property details' : 'Create a new property listing'}
      color={config.color}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* {!isEdit && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your progress is automatically saved. You can refresh the page without losing data.
        </div>
      )}

      {!isEdit && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800">Publishing Options</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li><strong>Save as Draft:</strong> Save the property without notifying partners. You can publish it later.</li>
                <li><strong>Save & Publish:</strong> Make the property active immediately and send email notifications to your partners.</li>
              </ul>
            </div>
          </div>
        </div>
      )} */}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e, 'draft'); }} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="e.g., Sunrise Apartments"
              />
              {fieldErrors.name && <p className="text-sm text-red-600 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.type ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {fieldErrors.type && <p className="text-sm text-red-600 mt-1">{fieldErrors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.region ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
              >
                <option value="india">🇮🇳 India</option>
                <option value="dubai">🇦🇪 Dubai</option>
              </select>
              {fieldErrors.region && <p className="text-sm text-red-600 mt-1">{fieldErrors.region}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Describe your property..."
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="location.address"
                value={formData.location.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="location.city"
                value={formData.location.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="City"
              />
            </div>

            {formData.region === 'india' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  name="location.state"
                  value={formData.location.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select State</option>
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emirate</label>
                <select
                  name="location.emirate"
                  value={formData.location.emirate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Emirate</option>
                  {dubaiEmirates.map(emirate => (
                    <option key={emirate} value={emirate}>{emirate}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                name="location.zipCode"
                value={formData.location.zipCode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ZIP Code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
              <input
                type="text"
                name="location.landmark"
                value={formData.location.landmark}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nearby landmark"
              />
            </div>

            {/* Google Maps Link */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="location.mapUrl"
                  value={formData.location.mapUrl || ''}
                  onChange={handleChange}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    fieldErrors.mapUrl ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                  }`}
                  placeholder="Paste Google Maps link for exact location"
                />
                {formData.location.mapUrl && (
                  <a
                    href={formData.location.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Test
                  </a>
                )}
              </div>
              {fieldErrors.mapUrl && <p className="text-sm text-red-600 mt-1">{fieldErrors.mapUrl}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Open Google Maps → Find location → Share → Copy link
              </p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Currency Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
              <select
                name="pricing.currency"
                value={formData.pricing.currency}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="AED">د.إ AED (UAE Dirham)</option>
              </select>
              {formData.region === 'dubai' && formData.pricing.currency === 'INR' && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ Dubai properties typically use AED
                </p>
              )}
              {formData.region === 'india' && formData.pricing.currency === 'AED' && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ India properties typically use INR
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price {formData.pricing.currency === 'INR' ? '(₹)' : '(د.إ)'} *
              </label>
              <input
                type="number"
                name="pricing.basePrice"
                value={formData.pricing.basePrice}
                onChange={handleChange}
                required
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.basePrice ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Enter price"
              />
              {fieldErrors.basePrice && <p className="text-sm text-red-600 mt-1">{fieldErrors.basePrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per {formData.details.areaUnit === 'sqm' ? 'sq m' : 'sq ft'}
              </label>
              <input
                type="number"
                name="pricing.pricePerSqFt"
                value={formData.pricing.pricePerSqFt}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.pricePerSqFt ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Per sq ft/m price"
              />
              {fieldErrors.pricePerSqFt && <p className="text-sm text-red-600 mt-1">{fieldErrors.pricePerSqFt}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Amount {formData.pricing.currency === 'INR' ? '(₹)' : '(د.إ)'}
              </label>
              <input
                type="number"
                name="pricing.bookingAmount"
                value={formData.pricing.bookingAmount}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.bookingAmount ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Booking amount"
              />
              {fieldErrors.bookingAmount && <p className="text-sm text-red-600 mt-1">{fieldErrors.bookingAmount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Charges {formData.pricing.currency === 'INR' ? '(₹)' : '(د.إ)'}
              </label>
              <input
                type="number"
                name="pricing.maintenanceCharges"
                value={formData.pricing.maintenanceCharges}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.maintenanceCharges ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Monthly maintenance"
              />
              {fieldErrors.maintenanceCharges && <p className="text-sm text-red-600 mt-1">{fieldErrors.maintenanceCharges}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Charges {formData.pricing.currency === 'INR' ? '(₹)' : '(د.إ)'}
              </label>
              <input
                type="number"
                name="pricing.otherCharges"
                value={formData.pricing.otherCharges}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.otherCharges ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Other charges"
              />
              {fieldErrors.otherCharges && <p className="text-sm text-red-600 mt-1">{fieldErrors.otherCharges}</p>}
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <input
                type="number"
                name="details.bedrooms"
                value={formData.details.bedrooms}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.bedrooms ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="0"
                min="0"
              />
              {fieldErrors.bedrooms && <p className="text-sm text-red-600 mt-1">{fieldErrors.bedrooms}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <input
                type="number"
                name="details.bathrooms"
                value={formData.details.bathrooms}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.bathrooms ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="0"
                min="0"
              />
              {fieldErrors.bathrooms && <p className="text-sm text-red-600 mt-1">{fieldErrors.bathrooms}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balconies</label>
              <input
                type="number"
                name="details.balconies"
                value={formData.details.balconies}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.balconies ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="0"
                min="0"
              />
              {fieldErrors.balconies && <p className="text-sm text-red-600 mt-1">{fieldErrors.balconies}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Floors</label>
              <input
                type="number"
                name="details.totalFloors"
                value={formData.details.totalFloors}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.totalFloors ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="0"
                min="0"
              />
              {fieldErrors.totalFloors && <p className="text-sm text-red-600 mt-1">{fieldErrors.totalFloors}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor Number</label>
              <input
                type="number"
                name="details.floorNumber"
                value={formData.details.floorNumber}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.floorNumber ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="0"
                min="0"
              />
              {fieldErrors.floorNumber && <p className="text-sm text-red-600 mt-1">{fieldErrors.floorNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Built-up Area (sq ft/m)</label>
              <input
                type="number"
                name="details.builtUpArea"
                value={formData.details.builtUpArea}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.builtUpArea ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Area"
              />
              {fieldErrors.builtUpArea && <p className="text-sm text-red-600 mt-1">{fieldErrors.builtUpArea}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Area (sq ft/m)</label>
              <input
                type="number"
                name="details.carpetArea"
                value={formData.details.carpetArea}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  fieldErrors.carpetArea ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="Area"
              />
              {fieldErrors.carpetArea && <p className="text-sm text-red-600 mt-1">{fieldErrors.carpetArea}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Furnishing</label>
              <select
                name="details.furnishing"
                value={formData.details.furnishing}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="unfurnished">Unfurnished</option>
                <option value="semifurnished">Semi-Furnished</option>
                <option value="fullyfurnished">Fully Furnished</option>
              </select>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>

          {/* Standard Amenities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { name: 'powerBackup', label: 'Power Backup' },
              { name: 'lift', label: 'Lift' },
              { name: 'security', label: '24/7 Security' },
              { name: 'swimmingPool', label: 'Swimming Pool' },
              { name: 'gym', label: 'Gym' },
              { name: 'clubHouse', label: 'Club House' },
              { name: 'garden', label: 'Garden' },
              { name: 'childrenPlayArea', label: 'Children Play Area' },
              { name: 'joggingTrack', label: 'Jogging Track' },
              { name: 'indoorGames', label: 'Indoor Games' },
              { name: 'fireSafety', label: 'Fire Safety' },
              { name: 'rainWaterHarvesting', label: 'Rain Water Harvesting' },
              { name: 'sewageTreatment', label: 'Sewage Treatment' }
            ].map(amenity => (
              <label key={amenity.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name={`details.${amenity.name}`}
                  checked={formData.details[amenity.name] || false}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">{amenity.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Amenities */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Amenities</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                id="customAmenityInput"
                placeholder="Add custom amenity"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('customAmenityInput');
                  const value = input.value.trim();
                  if (value) {
                    setFormData(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        customAmenities: [...(prev.details.customAmenities || []), value]
                      }
                    }));
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add
              </button>
            </div>
            {formData.details.customAmenities && formData.details.customAmenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.details.customAmenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          details: {
                            ...prev.details,
                            customAmenities: prev.details.customAmenities.filter((_, i) => i !== index)
                          }
                        }));
                      }}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Region-Specific Details */}
        {formData.region === 'india' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🇮🇳 India Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RERA Number</label>
                <input
                  type="text"
                  name="indiaDetails.reraNumber"
                  value={formData.indiaDetails.reraNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="RERA Registration Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RERA Project Name</label>
                <input
                  type="text"
                  name="indiaDetails.reraProjectName"
                  value={formData.indiaDetails.reraProjectName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="RERA Project Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  name="indiaDetails.gstNumber"
                  value={formData.indiaDetails.gstNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="GST Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Type</label>
                <select
                  name="indiaDetails.ownershipType"
                  value={formData.indiaDetails.ownershipType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="freehold">Freehold</option>
                  <option value="leasehold">Leasehold</option>
                  <option value="cooperative">Cooperative</option>
                  <option value="powerofattorney">Power of Attorney</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <select
                  name="indiaDetails.transactionType"
                  value={formData.indiaDetails.transactionType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="newbooking">New Booking</option>
                  <option value="resale">Resale</option>
                  <option value="rent">Rent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Possession Status</label>
                <select
                  name="indiaDetails.possessionStatus"
                  value={formData.indiaDetails.possessionStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="underconstruction">Under Construction</option>
                  <option value="readytomove">Ready to Move</option>
                  <option value="ocreceived">OC Received</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Possession Date</label>
                <input
                  type="date"
                  name="indiaDetails.possessionDate"
                  value={formData.indiaDetails.possessionDate || ''}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RERA Website</label>
                <input
                  type="url"
                  name="indiaDetails.reraWebsite"
                  value={formData.indiaDetails.reraWebsite || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://rera.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Builder Name</label>
                <input
                  type="text"
                  name="indiaDetails.builderName"
                  value={formData.indiaDetails.builderName || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Builder/Developer Name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Approved By</label>
                <div className="flex flex-wrap gap-4">
                  {['bank', 'rera', 'developmentauthority', 'township'].map(approval => (
                    <label key={approval} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.indiaDetails.approvedBy || []).includes(approval)}
                        onChange={(e) => {
                          const current = formData.indiaDetails.approvedBy || [];
                          const updated = e.target.checked
                            ? [...current, approval]
                            : current.filter(a => a !== approval);
                          setFormData(prev => ({
                            ...prev,
                            indiaDetails: { ...prev.indiaDetails, approvedBy: updated }
                          }));
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{approval.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🇦🇪 Dubai Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DLD Permit Number</label>
                <input
                  type="text"
                  name="dubaiDetails.dldPermitNumber"
                  value={formData.dubaiDetails.dldPermitNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="DLD Permit Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DLD Property ID</label>
                <input
                  type="text"
                  name="dubaiDetails.dldPropertyId"
                  value={formData.dubaiDetails.dldPropertyId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="DLD Property ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Developer Name</label>
                <input
                  type="text"
                  name="dubaiDetails.developerName"
                  value={formData.dubaiDetails.developerName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Developer Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  name="dubaiDetails.projectName"
                  value={formData.dubaiDetails.projectName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Project Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Status</label>
                <select
                  name="dubaiDetails.propertyStatus"
                  value={formData.dubaiDetails.propertyStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="offplan">Off-Plan</option>
                  <option value="ready">Ready</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title Deed Number</label>
                <input
                  type="text"
                  name="dubaiDetails.titleDeedNumber"
                  value={formData.dubaiDetails.titleDeedNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Title Deed Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Charges (AED/sqft)</label>
                <input
                  type="number"
                  name="dubaiDetails.serviceCharges"
                  value={formData.dubaiDetails.serviceCharges || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Service charges per sqft"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Escrow Account Number</label>
                <input
                  type="text"
                  name="dubaiDetails.escrowAccountNumber"
                  value={formData.dubaiDetails.escrowAccountNumber || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Escrow Account Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Type</label>
                <select
                  name="dubaiDetails.ownershipType"
                  value={formData.dubaiDetails.ownershipType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="freehold">Freehold</option>
                  <option value="leasehold">Leasehold</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Images */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Property Images</h3>
            {images.length > 0 && (
              <span className="text-sm text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {uploadingImage && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={`Property ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {image.isPrimary && (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white text-xs rounded">
                      Primary
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {!image.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(index)}
                        className="px-2 py-1 bg-white text-gray-800 text-xs rounded hover:bg-gray-100"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Videos</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Video URLs (YouTube, Vimeo, etc.)</label>
            <div className="space-y-2">
              {(videos || []).map((video, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={video.url || ''}
                    onChange={(e) => {
                      const newVideos = [...(videos || [])];
                      newVideos[index] = { ...newVideos[index], url: e.target.value };
                      setVideos(newVideos);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <input
                    type="text"
                    value={video.title || ''}
                    onChange={(e) => {
                      const newVideos = [...(videos || [])];
                      newVideos[index] = { ...newVideos[index], title: e.target.value };
                      setVideos(newVideos);
                    }}
                    className="w-40 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Title"
                  />
                  <button
                    type="button"
                    onClick={() => setVideos((videos || []).filter((_, i) => i !== index))}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVideos([...(videos || []), { url: '', title: '' }])}
                className="text-green-600 hover:text-green-700 text-sm"
              >
                + Add Video
              </button>
            </div>
          </div>
        </div>

        {/* Brochure */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brochure</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Brochure (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  setUploadingImage(true);
                  const formDataToSend = new FormData();
                  formDataToSend.append('file', file);
                  formDataToSend.append('folder', `properties/brochures`);
                  const response = await api.post('/upload/document', formDataToSend);
                  setBrochure({
                    url: response.data.data.url,
                    publicId: response.data.data.publicId,
                    name: file.name
                  });
                } catch (err) {
                  setError('Failed to upload brochure');
                } finally {
                  setUploadingImage(false);
                }
              }}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {brochure && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700">{brochure.name}</span>
                <button
                  type="button"
                  onClick={() => setBrochure(null)}
                  className="ml-auto text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floor Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Floor Plans</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Floor Plan Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;
                try {
                  setUploadingImage(true);
                  for (const file of files) {
                    const formDataToSend = new FormData();
                    formDataToSend.append('file', file);
                    formDataToSend.append('folder', `properties/floorplans/${id || 'new'}`);
                    const response = await api.post('/upload/image', formDataToSend);
                    const { url, publicId } = response.data.data;
                    setFloorPlans(prev => [...prev, { url, publicId, name: file.name }]);
                  }
                } catch (err) {
                  setError('Failed to upload floor plan');
                } finally {
                  setUploadingImage(false);
                }
              }}
              disabled={uploadingImage}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {uploadingImage && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
          </div>
          {floorPlans && floorPlans.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {floorPlans.map((plan, index) => (
                <div key={index} className="relative group">
                  <img
                    src={plan.url}
                    alt={plan.name || `Floor Plan ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setFloorPlans(floorPlans.filter((_, i) => i !== index))}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visibility Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Visibility</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Who can see this property?</label>
              <select
                name="visibility.type"
                value={formData.visibility?.type || 'all'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Show to All Partners</option>
                <option value="selected">Show to Selected Partners</option>
                <option value="hidden">Hide from Selected Partners</option>
              </select>
            </div>

            {(formData.visibility?.type === 'selected' || formData.visibility?.type === 'hidden') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.visibility?.type === 'selected' ? 'Select Partners to Show' : 'Select Partners to Hide From'}
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                  {partners.length === 0 ? (
                    <p className="text-sm text-gray-500">No partners available</p>
                  ) : (
                    <div className="space-y-2">
                      {partners.map((partner) => {
                        const partnerId = partner._id;
                        const isSelected = (formData.visibility?.partnerIds || []).includes(partnerId);
                        return (
                          <label
                            key={partnerId}
                            className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentIds = formData.visibility?.partnerIds || [];
                                let newIds;
                                if (e.target.checked) {
                                  newIds = [...currentIds, partnerId];
                                } else {
                                  newIds = currentIds.filter(id => id !== partnerId);
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  visibility: {
                                    ...prev.visibility,
                                    partnerIds: newIds
                                  }
                                }));
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {partner.firstName} {partner.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{partner.email}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                {(formData.visibility?.partnerIds?.length || 0) > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.visibility.partnerIds.length} partner(s) selected
                  </p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="visibility.showPrice"
                checked={formData.visibility.showPrice}
                onChange={handleChange}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Show price on listing</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="visibility.showContact"
                checked={formData.visibility.showContact}
                onChange={handleChange}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Show contact details</span>
            </label>
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Commission</h3>
          <p className="text-sm text-gray-500 mb-4">
            {formData.commission.isFixed
              ? 'Set a fixed commission amount for this property. This amount will be paid directly to the partner.'
              : 'Set the base commission percentage for this property. Partner\'s actual commission = Base % × Tier %. Example: 5% base × 50% (Gold tier) = 2.5% for the partner.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Commission (%)
                {!formData.commission.isFixed && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="number"
                name="commission.basePercentage"
                value={formData.commission.basePercentage}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  formData.commission.isFixed
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : fieldErrors.basePercentage
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-green-500'
                }`}
                placeholder="e.g., 5"
                min="0"
                max="100"
                step="0.5"
                disabled={formData.commission.isFixed}
              />
              {fieldErrors.basePercentage && <p className="text-sm text-red-600 mt-1">{fieldErrors.basePercentage}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Partner gets this % × their tier share
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fixed Amount ({formData.pricing.currency})
                {formData.commission.isFixed && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="number"
                name="commission.fixedAmount"
                value={formData.commission.fixedAmount}
                onChange={handleChange}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  formData.commission.isFixed
                    ? fieldErrors.fixedAmount
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-green-500'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                placeholder="Fixed commission amount"
                disabled={!formData.commission.isFixed}
              />
              {fieldErrors.fixedAmount && <p className="text-sm text-red-600 mt-1">{fieldErrors.fixedAmount}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount paid to partner
              </p>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="commission.isFixed"
                  checked={formData.commission.isFixed}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Use fixed amount instead of percentage</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-between items-center">
          {!isEdit && (
            <button
              type="button"
              onClick={clearDraft}
              className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              Clear Form
            </button>
          )}
          <div className="flex gap-4 ml-auto">
            <button
              type="button"
              onClick={() => navigate(basePath)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {!isEdit ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'draft')}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'active')}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {saving ? 'Publishing...' : 'Save & Publish'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, formData.status || 'draft')}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Property'}
              </button>
            )}
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default PropertyForm;