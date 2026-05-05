import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const CompanySettings = () => {
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    // Company Info
    name: '',
    phone: '',
    website: '',
    address: { street: '', city: '', state: '', country: '', zipCode: '' },
    // India Config
    indiaConfig: { gstNumber: '', panNumber: '', reraNumber: '', cinNumber: '' },
    // Dubai Config
    dubaiConfig: { tradeLicenseNumber: '', dldNumber: '', vatNumber: '', tasheelNumber: '' },
    // Commission Settings - Tier percentages (what % of property's base commission each tier gets)
    // Example: If property has 5% base, Gold tier (50%) gets 2.5% effective rate
    tierPercentages: { bronze: 25, silver: 35, gold: 50, platinum: 75 },
    features: { chatEnabled: true, suggestionsEnabled: true, analyticsEnabled: true },
    notifications: { email: true, sms: false },
    // Email Branding
    emailBranding: {
      primaryColor: '#4F46E5',
      secondaryColor: '#764BA2',
      buttonColor: '#4F46E5',
      headerBackgroundColor: '#4F46E5',
      showLogoInEmails: true,
      footerText: ''
    }
  });

  useEffect(() => {
    fetchCompany();
  }, []);

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
        website: companyData.website || '',
        address: companyData.address || { street: '', city: '', state: '', country: '', zipCode: '' },
        indiaConfig: companyData.indiaConfig || { gstNumber: '', panNumber: '', reraNumber: '', cinNumber: '' },
        dubaiConfig: companyData.dubaiConfig || { tradeLicenseNumber: '', dldNumber: '', vatNumber: '', tasheelNumber: '' },
        tierPercentages: companyData.settings?.tierPercentages || { bronze: 25, silver: 35, gold: 50, platinum: 75 },
        features: companyData.settings?.features || { chatEnabled: true, suggestionsEnabled: true, analyticsEnabled: true },
        notifications: companyData.settings?.notifications || { email: true, sms: false },
        emailBranding: companyData.emailBranding || {
          primaryColor: '#4F46E5',
          secondaryColor: '#764BA2',
          buttonColor: '#4F46E5',
          headerBackgroundColor: '#4F46E5',
          showLogoInEmails: true,
          footerText: ''
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
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

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
      setSuccess('Company information updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put(`/companies/${user.companyId}/settings`, {
        tierPercentages: formData.tierPercentages,
        features: formData.features,
        notifications: formData.notifications
      });
      setSuccess('Commission settings updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailBrandingUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put(`/companies/${user.companyId}/settings`, {
        emailBranding: formData.emailBranding
      });
      setSuccess('Email branding updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update email branding');
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

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

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
              onClick={() => setActiveTab('features')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'features'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Features & Notifications
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
          </nav>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <form onSubmit={handleCompanyUpdate} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <h4 className="text-md font-semibold text-gray-900 pt-4 border-t">Address</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                      <input
                        type="text"
                        name="indiaConfig.panNumber"
                        value={formData.indiaConfig.panNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">RERA Number</label>
                      <input
                        type="text"
                        name="indiaConfig.reraNumber"
                        value={formData.indiaConfig.reraNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CIN Number</label>
                      <input
                        type="text"
                        name="indiaConfig.cinNumber"
                        value={formData.indiaConfig.cinNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">DLD Number</label>
                      <input
                        type="text"
                        name="dubaiConfig.dldNumber"
                        value={formData.dubaiConfig.dldNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
                      <input
                        type="text"
                        name="dubaiConfig.vatNumber"
                        value={formData.dubaiConfig.vatNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tasheel Number</label>
                      <input
                        type="text"
                        name="dubaiConfig.tasheelNumber"
                        value={formData.dubaiConfig.tasheelNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
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

        {/* Features Tab */}
        {activeTab === 'features' && (
          <form onSubmit={handleSettingsUpdate} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Features & Notifications</h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Platform Features</h4>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Chat System</p>
                        <p className="text-sm text-gray-500">Enable communication between partners and admin</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="features.chatEnabled"
                      checked={formData.features.chatEnabled}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Property Suggestions</p>
                        <p className="text-sm text-gray-500">Allow partners to suggest new properties</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="features.suggestionsEnabled"
                      checked={formData.features.suggestionsEnabled}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Analytics Dashboard</p>
                        <p className="text-sm text-gray-500">Enable analytics and reporting features</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="features.analyticsEnabled"
                      checked={formData.features.analyticsEnabled}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Notifications</h4>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Send email notifications for important events</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="notifications.email"
                      checked={formData.notifications.email}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Send SMS notifications for urgent alerts</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="notifications.sms"
                      checked={formData.notifications.sms}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Feature Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Email Branding Tab */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailBrandingUpdate} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Branding</h3>
            <p className="text-gray-600 mb-6">
              Customize the appearance of emails sent to your partners. Your company logo and colors will be used in all email communications.
            </p>

            {/* Logo Settings */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Logo</h4>
              <div className="flex items-center gap-4 mb-4">
                {company?.logo?.url && (
                  <img
                    src={company.logo.url}
                    alt="Company Logo"
                    className="w-20 h-20 object-contain border rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Upload your company logo in Company Information settings above.
                  </p>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="emailBranding.showLogoInEmails"
                      checked={formData.emailBranding.showLogoInEmails}
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Show logo in email headers</span>
                  </label>
                </div>
              </div>
            </div>

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
                  {formData.emailBranding.showLogoInEmails && company?.logo?.url && (
                    <img src={company.logo.url} alt="Logo" className="max-w-32 h-auto mx-auto mb-2" />
                  )}
                  <h2 style={{ color: 'white', margin: 0 }}>Sample Email Header</h2>
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
      </div>
    </DashboardLayout>
  );
};

export default CompanySettings;