import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api, { getDocumentViewUrl } from '../../utils/api';

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const config = sidebarConfig.partner;
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [kycSummary, setKycSummary] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null); // Track which doc is uploading
  const [selectedDocType, setSelectedDocType] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    partnerProfile: {
      companyName: '',
      companyType: '',
      operatingRegion: '',
      phone: '',
      alternatePhone: '',
      website: '',
      gstNumber: '',
      panNumber: '',
      reraNumber: '',
      tradeLicenseNumber: '',
      dubaiReraNumber: '',
      emiratesId: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        swiftCode: ''
      }
    }
  });

  useEffect(() => {
    if (user?._id) {
      fetchProfile();
    }
  }, [user?._id]);

  const fetchProfile = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const response = await api.get(`/partners/${user._id}`);
      setPartner(response.data.data.partner);

      // Fetch KYC summary
      const kycResponse = await api.get(`/partners/${user._id}/kyc`);
      setKycSummary(kycResponse.data.data.kycSummary);
      setFormData({
        firstName: response.data.data.partner.firstName || '',
        lastName: response.data.data.partner.lastName || '',
        phone: response.data.data.partner.phone || '',
        partnerProfile: {
          companyName: response.data.data.partner.partnerProfile?.companyName || '',
          companyType: response.data.data.partner.partnerProfile?.companyType || '',
          operatingRegion: response.data.data.partner.partnerProfile?.operatingRegion || '',
          phone: response.data.data.partner.partnerProfile?.phone || '',
          alternatePhone: response.data.data.partner.partnerProfile?.alternatePhone || '',
          website: response.data.data.partner.partnerProfile?.website || '',
          gstNumber: response.data.data.partner.partnerProfile?.gstNumber || '',
          panNumber: response.data.data.partner.partnerProfile?.panNumber || '',
          reraNumber: response.data.data.partner.partnerProfile?.reraNumber || '',
          tradeLicenseNumber: response.data.data.partner.partnerProfile?.tradeLicenseNumber || '',
          dubaiReraNumber: response.data.data.partner.partnerProfile?.dubaiReraNumber || '',
          emiratesId: response.data.data.partner.partnerProfile?.emiratesId || '',
          address: {
            street: response.data.data.partner.partnerProfile?.address?.street || '',
            city: response.data.data.partner.partnerProfile?.address?.city || '',
            state: response.data.data.partner.partnerProfile?.address?.state || '',
            country: response.data.data.partner.partnerProfile?.address?.country || '',
            zipCode: response.data.data.partner.partnerProfile?.address?.zipCode || ''
          },
          bankDetails: {
            bankName: response.data.data.partner.partnerProfile?.bankDetails?.bankName || '',
            accountNumber: response.data.data.partner.partnerProfile?.bankDetails?.accountNumber || '',
            ifscCode: response.data.data.partner.partnerProfile?.bankDetails?.ifscCode || '',
            swiftCode: response.data.data.partner.partnerProfile?.bankDetails?.swiftCode || ''
          }
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('partnerProfile.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        partnerProfile: {
          ...prev.partnerProfile,
          [field]: value
        }
      }));
    } else if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        partnerProfile: {
          ...prev.partnerProfile,
          address: {
            ...prev.partnerProfile.address,
            [field]: value
          }
        }
      }));
    } else if (name.startsWith('bank.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        partnerProfile: {
          ...prev.partnerProfile,
          bankDetails: {
            ...prev.partnerProfile.bankDetails,
            [field]: value
          }
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?._id) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.put(`/partners/${user._id}/profile`, formData);

      setSuccess('Profile updated successfully');
      setEditMode(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // KYC Document Upload
  const handleFileUpload = async (e, docType, region) => {
    const file = e.target.files[0];
    if (!file || !user?._id) return;

    try {
      setUploadingDocType(`${docType}-${region}`); // Set uploading for this specific doc
      setError('');
      setSuccess('');

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `kyc/${user._id}`);

      // Upload to Cloudinary
      const uploadResponse = await api.post('/upload/document', formData);

      const { url, publicId } = uploadResponse.data.data;

      // Save document reference
      await api.post(`/partners/${user._id}/kyc`, {
        type: docType,
        url,
        publicId,
        region
      });

      setSuccess('Document uploaded successfully');

      // Only refresh KYC summary, not the whole profile
      const kycResponse = await api.get(`/partners/${user._id}/kyc`);
      setKycSummary(kycResponse.data.data.kycSummary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDocType(null);
      e.target.value = ''; // Reset file input
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      setError('');
      setSuccess('');

      await api.delete(`/partners/${user._id}/kyc/${documentId}`);
      setSuccess('Document deleted successfully');
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-cyan-100 text-green-800',
      active: 'bg-cyan-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getTierBadge = (tier) => {
    const styles = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-200 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800'
    };
    return styles[tier] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="My Profile" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="My Profile" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">User not found. Please log in again.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="My Profile" subtitle="Manage your information" color={config.color}>
      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-700">
          {success}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 font-bold text-2xl">
              {partner?.firstName?.charAt(0)}{partner?.lastName?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{partner?.firstName} {partner?.lastName}</h2>
              <p className="text-gray-500">{partner?.email}</p>
              <div className="flex gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(partner?.partnerProfile?.status)}`}>
                  {partner?.partnerProfile?.status?.replace('_', ' ') || 'pending'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTierBadge(partner?.partnerProfile?.tier)}`}>
                  {partner?.partnerProfile?.tier || 'bronze'} tier
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            {editMode ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={partner?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                name="partnerProfile.companyName"
                value={formData.partnerProfile.companyName}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Type</label>
              <select
                name="partnerProfile.companyType"
                value={formData.partnerProfile.companyType}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select type</option>
                <option value="individual">Individual</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited</option>
                <option value="llp">LLP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operating Region</label>
              <select
                name="partnerProfile.operatingRegion"
                value={formData.partnerProfile.operatingRegion}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select region</option>
                <option value="india">India</option>
                <option value="dubai">Dubai</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input
                type="url"
                name="partnerProfile.website"
                value={formData.partnerProfile.website}
                onChange={handleInputChange}
                disabled={!editMode}
                placeholder="https://"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Phone</label>
              <input
                type="text"
                name="partnerProfile.phone"
                value={formData.partnerProfile.phone}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Phone</label>
              <input
                type="text"
                name="partnerProfile.alternatePhone"
                value={formData.partnerProfile.alternatePhone}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* India Documents */}
        {formData.partnerProfile.operatingRegion === 'india' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">India Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                <input
                  type="text"
                  name="partnerProfile.gstNumber"
                  value={formData.partnerProfile.gstNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                <input
                  type="text"
                  name="partnerProfile.panNumber"
                  value={formData.partnerProfile.panNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RERA Number</label>
                <input
                  type="text"
                  name="partnerProfile.reraNumber"
                  value={formData.partnerProfile.reraNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trade License Number</label>
                <input
                  type="text"
                  name="partnerProfile.tradeLicenseNumber"
                  value={formData.partnerProfile.tradeLicenseNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dubai Documents */}
        {formData.partnerProfile.operatingRegion === 'dubai' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dubai Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trade License Number</label>
                <input
                  type="text"
                  name="partnerProfile.tradeLicenseNumber"
                  value={formData.partnerProfile.tradeLicenseNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dubai RERA Number</label>
                <input
                  type="text"
                  name="partnerProfile.dubaiReraNumber"
                  value={formData.partnerProfile.dubaiReraNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID</label>
                <input
                  type="text"
                  name="partnerProfile.emiratesId"
                  value={formData.partnerProfile.emiratesId}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
              <input
                type="text"
                name="address.street"
                value={formData.partnerProfile.address.street}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                name="address.city"
                value={formData.partnerProfile.address.city}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                name="address.state"
                value={formData.partnerProfile.address.state}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                name="address.country"
                value={formData.partnerProfile.address.country}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
              <input
                type="text"
                name="address.zipCode"
                value={formData.partnerProfile.address.zipCode}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
              <input
                type="text"
                name="bank.bankName"
                value={formData.partnerProfile.bankDetails.bankName}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
              <input
                type="text"
                name="bank.accountNumber"
                value={formData.partnerProfile.bankDetails.accountNumber}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code (India)</label>
              <input
                type="text"
                name="bank.ifscCode"
                value={formData.partnerProfile.bankDetails.ifscCode}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SWIFT Code (International)</label>
              <input
                type="text"
                name="bank.swiftCode"
                value={formData.partnerProfile.bankDetails.swiftCode}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* KYC Documents Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">KYC Documents</h3>
            {kycSummary && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {kycSummary.verified}/{kycSummary.totalRequired} verified
                </span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      kycSummary.verified === kycSummary.totalRequired
                        ? 'bg-cyan-500'
                        : kycSummary.verified > 0
                        ? 'bg-yellow-500'
                        : 'bg-gray-300'
                    }`}
                    style={{ width: `${(kycSummary.verified / kycSummary.totalRequired) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {!kycSummary ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Required Documents */}
              {kycSummary.requiredDocuments?.map((reqDoc) => {
                const doc = reqDoc.document;
                const getStatusStyle = () => {
                  if (!doc) return 'border-gray-200 bg-gray-50';
                  if (doc.status === 'verified') return 'border-green-300 bg-cyan-50';
                  if (doc.status === 'rejected') return 'border-red-300 bg-red-50';
                  return 'border-yellow-300 bg-yellow-50';
                };

                return (
                  <div
                    key={`${reqDoc.type}-${reqDoc.region}`}
                    className={`p-4 rounded-lg border-2 ${getStatusStyle()}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          !doc ? 'bg-gray-200' :
                          doc.status === 'verified' ? 'bg-cyan-100' :
                          doc.status === 'rejected' ? 'bg-red-100' :
                          'bg-yellow-100'
                        }`}>
                          {!doc ? (
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : doc.status === 'verified' ? (
                            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : doc.status === 'rejected' ? (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>

                        {/* Document Info */}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {reqDoc.name}
                            {reqDoc.required && <span className="text-red-500 ml-1">*</span>}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              reqDoc.region === 'india'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {reqDoc.region === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai'}
                            </span>
                            {doc && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                doc.status === 'verified' ? 'bg-cyan-100 text-green-800' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                              </span>
                            )}
                          </div>
                          {doc?.uploadedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                          {doc?.status === 'rejected' && doc.rejectionReason && (
                            <p className="text-sm text-red-600 mt-2">
                              Reason: {doc.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!doc ? (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, reqDoc.type, reqDoc.region)}
                              disabled={uploadingDocType !== null}
                            />
                            <span className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-colors inline-block">
                              {uploadingDocType === `${reqDoc.type}-${reqDoc.region}` ? 'Uploading...' : 'Upload'}
                            </span>
                          </label>
                        ) : (
                          <>
                            <a
                              href={getDocumentViewUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              View
                            </a>
                            {doc.status !== 'verified' && (
                              <button
                                onClick={() => handleDeleteDocument(doc._id)}
                                className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Progress Message */}
              <div className={`mt-4 p-4 rounded-lg ${
                kycSummary.verified === kycSummary.totalRequired
                  ? 'bg-cyan-50 border border-cyan-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {kycSummary.verified === kycSummary.totalRequired ? (
                  <p className="text-cyan-700 text-sm">
                    ✅ All required documents verified. Your profile is complete.
                  </p>
                ) : (
                  <p className="text-yellow-700 text-sm">
                    ⚠️ Please upload all required documents. {kycSummary.totalRequired - kycSummary.verified} document(s) remaining.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        {editMode && (
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Rejection Reason */}
      {partner?.partnerProfile?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Application Rejected</h3>
          <p className="text-red-700">{partner.partnerProfile.rejectionReason}</p>
        </div>
      )}

      {/* Admin Notes */}
      {partner?.partnerProfile?.adminNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Admin Notes</h3>
          <p className="text-blue-700">{partner.partnerProfile.adminNotes}</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Profile;