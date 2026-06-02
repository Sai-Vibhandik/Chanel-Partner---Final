import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { validatePhoneWithCountry } from '../../utils/validation';
import PhoneInput from '../../components/common/PhoneInput';
import { CreditCard, ExternalLink } from 'lucide-react';

const CompanySettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig.company_superadmin;
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    // Company Info
    name: '',
    phone: '',
    phoneCountryCode: 'IN',
    website: '',
    address: { street: '', city: '', state: '', country: '', zipCode: '' },
    // India Config
    indiaConfig: { gstNumber: '', panNumber: '', reraNumber: '', cinNumber: '' },
    // Dubai Config
    dubaiConfig: { tradeLicenseNumber: '', dldNumber: '', vatNumber: '', tasheelNumber: '' },
    // Commission Settings - Tier percentages (what % of property's base commission each tier gets)
    // Example: If property has 5% base, Gold tier (50%) gets 2.5% effective rate
    tierPercentages: { bronze: 25, silver: 35, gold: 50, platinum: 75 },
    notifications: { email: true, sms: false },
    // Email Branding
    emailBranding: {
      primaryColor: '#4F46E5',
      secondaryColor: '#764BA2',
      buttonColor: '#4F46E5',
      headerBackgroundColor: '#4F46E5',
      footerText: ''
    }
  });

  useEffect(() => {
    if (user?.companyId) {
      fetchCompany();
    }
  }, [user?.companyId]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/companies/${user.companyId}`);
      const companyData = response.data.data.company;
      setCompany(companyData);
      setSettings(companyData.settings);
      setFormData({
        name: companyData.name || '',
        phone: companyData.phone || '',
        phoneCountryCode: 'IN',
        website: companyData.website || '',
        address: companyData.address || { street: '', city: '', state: '', country: '', zipCode: '' },
        indiaConfig: companyData.indiaConfig || { gstNumber: '', panNumber: '', reraNumber: '', cinNumber: '' },
        dubaiConfig: companyData.dubaiConfig || { tradeLicenseNumber: '', dldNumber: '', vatNumber: '', tasheelNumber: '' },
        tierPercentages: companyData.settings?.tierPercentages || { bronze: 25, silver: 35, gold: 50, platinum: 75 },
        notifications: companyData.settings?.notifications || { email: true, sms: false },
        emailBranding: companyData.emailBranding || {
          primaryColor: '#4F46E5',
          secondaryColor: '#764BA2',
          buttonColor: '#4F46E5',
          headerBackgroundColor: '#4F46E5',
          footerText: ''
        }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, phone: value }));
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handlePhoneCountryChange = (countryCode) => {
    setFormData(prev => ({ ...prev, phoneCountryCode: countryCode }));
  };

  const handlePhoneError = (error) => {
    if (error) {
      setFieldErrors(prev => ({ ...prev, phone: error }));
    } else if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};

    // Required field validation
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Company name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Company name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Company name cannot exceed 100 characters';
    } else if (!/^[a-zA-Z0-9\s\-.,&'()]+$/.test(formData.name)) {
      errors.name = 'Company name can only contain letters, numbers, spaces, and -.,&\'()';
    }

    // Validate phone if provided
    if (formData.phone) {
      const phoneError = validatePhoneWithCountry(formData.phone, formData.phoneCountryCode);
      if (phoneError) {
        errors.phone = phoneError;
      }
    }

    // Validate website if provided
    if (formData.website) {
      const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!websiteRegex.test(formData.website)) {
        errors.website = 'Please enter a valid website URL';
      } else if (formData.website.length > 200) {
        errors.website = 'Website URL cannot exceed 200 characters';
      }
    }

    // Required address fields
    if (!formData.address.country || formData.address.country.trim() === '') {
      errors['address.country'] = 'Country is required';
    } else if (formData.address.country.length > 100) {
      errors['address.country'] = 'Country cannot exceed 100 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.address.country)) {
      errors['address.country'] = 'Country can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Validate optional address fields
    if (formData.address.street && formData.address.street.length > 200) {
      errors['address.street'] = 'Street address cannot exceed 200 characters';
    }
    if (formData.address.city) {
      if (formData.address.city.length > 100) {
        errors['address.city'] = 'City cannot exceed 100 characters';
      } else if (!/^[a-zA-Z\s\-']+$/.test(formData.address.city)) {
        errors['address.city'] = 'City can only contain letters, spaces, hyphens, and apostrophes';
      }
    }
    if (formData.address.state) {
      if (formData.address.state.length > 100) {
        errors['address.state'] = 'State cannot exceed 100 characters';
      } else if (!/^[a-zA-Z\s\-']+$/.test(formData.address.state)) {
        errors['address.state'] = 'State can only contain letters, spaces, hyphens, and apostrophes';
      }
    }
    if (formData.address.zipCode) {
      if (formData.address.zipCode.length > 20) {
        errors['address.zipCode'] = 'Zip code cannot exceed 20 characters';
      } else if (!/^[a-zA-Z0-9\s\-]+$/.test(formData.address.zipCode)) {
        errors['address.zipCode'] = 'Zip code can only contain letters, numbers, spaces, and hyphens';
      }
    }

    // Validate India config if applicable
    if (company?.regions?.includes('india')) {
      // GST validation (format: 22AAAAA0000A1Z5)
      if (formData.indiaConfig.gstNumber) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(formData.indiaConfig.gstNumber.toUpperCase())) {
          errors['indiaConfig.gstNumber'] = 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
        }
      }
      // PAN validation (format: AAAAA0000A)
      if (formData.indiaConfig.panNumber) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.indiaConfig.panNumber.toUpperCase())) {
          errors['indiaConfig.panNumber'] = 'Invalid PAN format (e.g., AAAAA0000A)';
        }
      }
      // RERA validation
      if (formData.indiaConfig.reraNumber) {
        if (formData.indiaConfig.reraNumber.length > 50) {
          errors['indiaConfig.reraNumber'] = 'RERA number cannot exceed 50 characters';
        } else if (!/^[a-zA-Z0-9\-\/]+$/.test(formData.indiaConfig.reraNumber)) {
          errors['indiaConfig.reraNumber'] = 'RERA number can only contain letters, numbers, hyphens, and slashes';
        }
      }
      // CIN validation (format: U00000MH2000PTC123456)
      if (formData.indiaConfig.cinNumber) {
        const cinRegex = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
        if (!cinRegex.test(formData.indiaConfig.cinNumber.toUpperCase())) {
          errors['indiaConfig.cinNumber'] = 'Invalid CIN format (e.g., U00000MH2000PTC123456)';
        }
      }
    }

    // Validate Dubai config if applicable
    if (company?.regions?.includes('dubai')) {
      // Trade License validation
      if (formData.dubaiConfig.tradeLicenseNumber) {
        if (formData.dubaiConfig.tradeLicenseNumber.length > 50) {
          errors['dubaiConfig.tradeLicenseNumber'] = 'Trade license cannot exceed 50 characters';
        } else if (!/^[a-zA-Z0-9\-\/]+$/.test(formData.dubaiConfig.tradeLicenseNumber)) {
          errors['dubaiConfig.tradeLicenseNumber'] = 'Trade license can only contain letters, numbers, hyphens, and slashes';
        }
      }
      // DLD Number validation
      if (formData.dubaiConfig.dldNumber) {
        if (formData.dubaiConfig.dldNumber.length > 50) {
          errors['dubaiConfig.dldNumber'] = 'DLD number cannot exceed 50 characters';
        }
      }
      // VAT Number validation (UAE VAT format: 100012345600003 - 15 digits)
      if (formData.dubaiConfig.vatNumber) {
        if (!/^[0-9]{15}$/.test(formData.dubaiConfig.vatNumber)) {
          errors['dubaiConfig.vatNumber'] = 'UAE VAT number must be 15 digits';
        }
      }
      // Tasheel Number validation
      if (formData.dubaiConfig.tasheelNumber) {
        if (formData.dubaiConfig.tasheelNumber.length > 50) {
          errors['dubaiConfig.tasheelNumber'] = 'Tasheel number cannot exceed 50 characters';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the validation errors before saving');
      return;
    }

    setSaving(true);

    try {
      await api.put(`/companies/${user.companyId}`, {
        name: formData.name,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        indiaConfig: formData.indiaConfig,
        dubaiConfig: formData.dubaiConfig
      });
      toast.success('Company information updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update company.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/companies/${user.companyId}/settings`, {
        tierPercentages: formData.tierPercentages,
        notifications: formData.notifications
      });
      toast.success('Commission settings updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailBrandingUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/companies/${user.companyId}/settings`, {
        emailBranding: formData.emailBranding
      });
      toast.success('Email branding updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update email branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Company Settings" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Company Settings" subtitle="Manage your company configuration" color={config.color}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Company Settings</h2>
        <p className="text-gray-500 mt-1">Configure your company information and master settings</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              General Information
            </button>
            <button
              onClick={() => setActiveTab('commission')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'commission'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Commission Tiers
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'email'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Email Branding
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'subscription'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Subscription
            </button>
          </nav>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <form onSubmit={handleCompanyUpdate} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={100}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter company name"
                  />
                  {fieldErrors.name && <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>}
                </div>
                <PhoneInput
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  countryCode={formData.phoneCountryCode}
                  onCountryChange={handlePhoneCountryChange}
                  error={fieldErrors.phone}
                  onError={handlePhoneError}
                  required={false}
                  label="Phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  maxLength={200}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors.website ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="https://www.example.com"
                />
                {fieldErrors.website && <p className="text-red-500 text-sm mt-1">{fieldErrors.website}</p>}
              </div>

              <h4 className="text-md font-semibold text-gray-900 pt-4 border-t">Address</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  maxLength={200}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['address.street'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter street address"
                />
                {fieldErrors['address.street'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['address.street']}</p>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    maxLength={100}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['address.city'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="City"
                  />
                  {fieldErrors['address.city'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['address.city']}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    maxLength={100}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['address.state'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="State"
                  />
                  {fieldErrors['address.state'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['address.state']}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    maxLength={100}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['address.country'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Country"
                  />
                  {fieldErrors['address.country'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['address.country']}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    maxLength={20}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['address.zipCode'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Zip Code"
                  />
                  {fieldErrors['address.zipCode'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['address.zipCode']}</p>}
                </div>
              </div>

              {/* India Config */}
              {company?.regions?.includes('india') && (
                <>
                  <h4 className="text-md font-semibold text-gray-900 pt-4 border-t">India Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                      <input
                        type="text"
                        name="indiaConfig.gstNumber"
                        value={formData.indiaConfig.gstNumber}
                        onChange={handleChange}
                        maxLength={15}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase ${fieldErrors['indiaConfig.gstNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="22AAAAA0000A1Z5"
                      />
                      {fieldErrors['indiaConfig.gstNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['indiaConfig.gstNumber']}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                      <input
                        type="text"
                        name="indiaConfig.panNumber"
                        value={formData.indiaConfig.panNumber}
                        onChange={handleChange}
                        maxLength={10}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase ${fieldErrors['indiaConfig.panNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="AAAAA0000A"
                      />
                      {fieldErrors['indiaConfig.panNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['indiaConfig.panNumber']}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">RERA Number</label>
                      <input
                        type="text"
                        name="indiaConfig.reraNumber"
                        value={formData.indiaConfig.reraNumber}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase ${fieldErrors['indiaConfig.reraNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="RERA number"
                      />
                      {fieldErrors['indiaConfig.reraNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['indiaConfig.reraNumber']}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CIN Number</label>
                      <input
                        type="text"
                        name="indiaConfig.cinNumber"
                        value={formData.indiaConfig.cinNumber}
                        onChange={handleChange}
                        maxLength={21}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase ${fieldErrors['indiaConfig.cinNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="U00000MH2000PTC123456"
                      />
                      {fieldErrors['indiaConfig.cinNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['indiaConfig.cinNumber']}</p>}
                    </div>
                  </div>
                </>
              )}

              {/* Dubai Config */}
              {company?.regions?.includes('dubai') && (
                <>
                  <h4 className="text-md font-semibold text-gray-900 pt-4 border-t">Dubai Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trade License</label>
                      <input
                        type="text"
                        name="dubaiConfig.tradeLicenseNumber"
                        value={formData.dubaiConfig.tradeLicenseNumber}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['dubaiConfig.tradeLicenseNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Trade license number"
                      />
                      {fieldErrors['dubaiConfig.tradeLicenseNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['dubaiConfig.tradeLicenseNumber']}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">DLD Number</label>
                      <input
                        type="text"
                        name="dubaiConfig.dldNumber"
                        value={formData.dubaiConfig.dldNumber}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['dubaiConfig.dldNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="DLD number"
                      />
                      {fieldErrors['dubaiConfig.dldNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['dubaiConfig.dldNumber']}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
                      <input
                        type="text"
                        name="dubaiConfig.vatNumber"
                        value={formData.dubaiConfig.vatNumber}
                        onChange={handleChange}
                        maxLength={15}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['dubaiConfig.vatNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="100012345600003"
                      />
                      {fieldErrors['dubaiConfig.vatNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['dubaiConfig.vatNumber']}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tasheel Number</label>
                      <input
                        type="text"
                        name="dubaiConfig.tasheelNumber"
                        value={formData.dubaiConfig.tasheelNumber}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${fieldErrors['dubaiConfig.tasheelNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Tasheel number"
                      />
                      {fieldErrors['dubaiConfig.tasheelNumber'] && <p className="text-red-500 text-sm mt-1">{fieldErrors['dubaiConfig.tasheelNumber']}</p>}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Commission Tab */}
        {activeTab === 'commission' && (
          <form onSubmit={handleSettingsUpdate} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Partner Tier Commission Shares</h3>
            <p className="text-gray-600 mb-6">
              Set the percentage of the property's base commission that each partner tier receives.
              The final commission is calculated as: Property Base % × Tier Share %.
            </p>

            {/* Example Calculation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium mb-2">How Commission Works:</p>
              <p className="text-sm text-blue-800">
                <strong>Example:</strong> A property has <strong>5% base commission</strong>.
                A Gold tier partner (50% share) sells it for ₹1,00,00,000.
              </p>
              <p className="text-sm text-blue-800 mt-1">
                Partner earns: <span className="font-bold">5% × 50% = 2.5%</span> → <span className="font-bold">₹2,50,000</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🥉</span>
                  <span className="text-lg font-semibold text-amber-900">Bronze</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="tierPercentages.bronze"
                    value={formData.tierPercentages.bronze}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-center font-bold"
                  />
                  <span className="text-amber-900 font-medium">% share</span>
                </div>
                <p className="text-sm text-amber-700 mt-2">New partners</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🥈</span>
                  <span className="text-lg font-semibold text-gray-900">Silver</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="tierPercentages.silver"
                    value={formData.tierPercentages.silver}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 text-center font-bold"
                  />
                  <span className="text-gray-900 font-medium">% share</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Growing partners</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🥇</span>
                  <span className="text-lg font-semibold text-yellow-900">Gold</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="tierPercentages.gold"
                    value={formData.tierPercentages.gold}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-center font-bold"
                  />
                  <span className="text-yellow-900 font-medium">% share</span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">Experienced partners</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">💎</span>
                  <span className="text-lg font-semibold text-purple-900">Platinum</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="tierPercentages.platinum"
                    value={formData.tierPercentages.platinum}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-center font-bold"
                  />
                  <span className="text-purple-900 font-medium">% share</span>
                </div>
                <p className="text-sm text-purple-700 mt-2">Top partners</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Commission Rates'}
              </button>
            </div>
          </form>
        )}

        {/* Email Branding Tab */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailBrandingUpdate} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Branding</h3>
            <p className="text-gray-600 mb-6">
              Customize the appearance of emails sent to your partners.
            </p>

            {/* Color Settings */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Colors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="emailBranding.primaryColor"
                      value={formData.emailBranding.primaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      name="emailBranding.primaryColor"
                      value={formData.emailBranding.primaryColor}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="#4F46E5"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for headers and accent elements</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="emailBranding.secondaryColor"
                      value={formData.emailBranding.secondaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      name="emailBranding.secondaryColor"
                      value={formData.emailBranding.secondaryColor}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="#764BA2"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for gradients and accents</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Button Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="emailBranding.buttonColor"
                      value={formData.emailBranding.buttonColor}
                      onChange={handleChange}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      name="emailBranding.buttonColor"
                      value={formData.emailBranding.buttonColor}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="#4F46E5"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for call-to-action buttons</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Header Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="emailBranding.headerBackgroundColor"
                      value={formData.emailBranding.headerBackgroundColor}
                      onChange={handleChange}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      name="emailBranding.headerBackgroundColor"
                      value={formData.emailBranding.headerBackgroundColor}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="#4F46E5"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email header background color</p>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Footer Text</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Footer Text (Optional)</label>
                <textarea
                  name="emailBranding.footerText"
                  value={formData.emailBranding.footerText}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter custom footer text to display in emails..."
                />
                <p className="text-xs text-gray-500 mt-1">This text will appear in the footer of all emails sent from your company.</p>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Preview</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className="p-6 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${formData.emailBranding.primaryColor} 0%, ${formData.emailBranding.secondaryColor} 100%)`
                  }}
                >
                  <h2 style={{ color: 'white', margin: 0 }}>{company?.name || 'Your Company'}</h2>
                </div>
                <div className="p-6 bg-gray-50">
                  <p>Hello Partner,</p>
                  <p className="mt-2">This is how your email content will appear.</p>
                  <div className="text-center mt-6">
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="inline-block px-6 py-3 rounded-lg font-medium text-white"
                      style={{ backgroundColor: formData.emailBranding.buttonColor }}
                    >
                      Sample Button
                    </a>
                  </div>
                </div>
                <div className="p-4 bg-gray-100 text-center text-sm text-gray-600">
                  {formData.emailBranding.footerText || '© 2024 Your Company. All rights reserved.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Email Branding'}
              </button>
            </div>
          </form>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Subscription & Billing</h3>
            <p className="text-gray-600 mb-6">
              Manage your subscription plan, view billing history, and update payment details.
            </p>

            {/* Current Plan */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500">Current Plan</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {company?.subscription?.planId?.name || company?.subscription?.plan || 'Trial'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  company?.subscription?.status === 'active' ? 'bg-green-100 text-green-800' :
                  company?.subscription?.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {company?.subscription?.status || 'trial'}
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <button
                onClick={() => navigate('/company/subscription')}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Manage Subscription</p>
                    <p className="text-sm text-gray-500">View plan details, upgrade, or cancel</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/company/payment')}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Change Plan</p>
                    <p className="text-sm text-gray-500">Upgrade or downgrade your subscription</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanySettings;