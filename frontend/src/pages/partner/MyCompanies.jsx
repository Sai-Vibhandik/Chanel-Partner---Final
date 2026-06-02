import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const MyCompanies = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const toast = useToast();
  const [partnerships, setPartnerships] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingToCompany, setApplyingToCompany] = useState(null);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawingPartnership, setWithdrawingPartnership] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPartnerships();
    fetchCompanies();
  }, []);

  const fetchPartnerships = async () => {
    try {
      const response = await api.get('/partner-company/my-companies');
      setPartnerships(response.data.data.partnerships);
    } catch (err) {
      toast.error('Failed to load your companies.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/public/list');
      setCompanies(response.data.data.companies);
    } catch (err) {
      console.error('Failed to load companies');
    }
  };

  const handleApplyToCompany = async (companyId, companyRegions) => {
    // Validate region selection
    if (!selectedRegions || selectedRegions.length === 0) {
      toast.error('Please select at least one operating region.');
      return;
    }

    try {
      setApplyingToCompany(companyId);

      await api.post('/partner-company/apply', {
        companyId,
        regions: selectedRegions
      });

      toast.success('Application submitted successfully.');
      setShowApplyModal(false);
      setSelectedRegions([]);
      fetchPartnerships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setApplyingToCompany(null);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!withdrawingPartnership) return;

    try {
      setWithdrawing(true);
      await api.delete(`/partner-company/${withdrawingPartnership._id}/withdraw`);
      toast.success('Partnership request withdrawn successfully.');
      setShowWithdrawModal(false);
      setWithdrawingPartnership(null);
      fetchPartnerships();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw request.');
    } finally {
      setWithdrawing(false);
    }
  };

  const openWithdrawModal = (partnership) => {
    setWithdrawingPartnership(partnership);
    setShowWithdrawModal(true);
  };

  const handleRegionToggle = (region) => {
    setSelectedRegions(prev => {
      if (prev.includes(region)) {
        return prev.filter(r => r !== region);
      } else {
        return [...prev, region];
      }
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
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

  // Filter out companies already applied to
  const availableCompanies = companies.filter(
    company => !partnerships.some(p => p.companyId._id === company._id)
  );

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="My Companies" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="My Companies" subtitle="Manage your company partnerships" color={config.color}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Companies</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{partnerships.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {partnerships.filter(p => p.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {partnerships.filter(p => p.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Verified KYC</p>
          <p className="text-3xl font-bold text-cyan-600 mt-1">
            {partnerships.filter(p => p.kycStatus === 'verified').length}
          </p>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Your Company Partnerships</h2>
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
          >
            + Join New Company
          </button>
        </div>

        {partnerships.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 mb-4">You haven't joined any companies yet</p>
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Apply to a Company
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {partnerships.map((partnership) => (
              <div key={partnership._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {partnership.companyId?.name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{partnership.companyId?.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(partnership.status)}`}>
                          {partnership.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getTierBadge(partnership.tier)}`}>
                          {partnership.tier}
                        </span>
                        {/* Show operating regions */}
                        {partnership.regions && partnership.regions.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {partnership.regions.map(r => r === 'india' ? '🇮🇳' : '🇦🇪').join(' ')}
                          </span>
                        )}
                        {partnership.kycStatus === 'verified' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            KYC Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Show alert if agreements need signing */}
                    {partnership.hasUnsignedAgreements && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Agreements to sign
                      </span>
                    )}
                    {/* Show alert if KYC incomplete */}
                    {partnership.kycStatus !== 'verified' && partnership.status !== 'pending' && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        KYC incomplete
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/partner/company/${partnership._id}`)}
                      className="px-4 py-2 text-cyan-600 hover:text-cyan-700 font-medium text-sm"
                    >
                      View Details
                    </button>
                    {/* Withdraw button for pending requests */}
                    {partnership.status === 'pending' && (
                      <button
                        onClick={() => openWithdrawModal(partnership)}
                        className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium text-sm"
                      >
                        Withdraw Request
                      </button>
                    )}
                    {partnership.status === 'active' && partnership.companySubscriptionActive !== false && (
                      <button
                        onClick={() => navigate(`/partner/properties?partnership=${partnership._id}`)}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
                      >
                        View Properties
                      </button>
                    )}
                    {partnership.status === 'active' && partnership.companySubscriptionActive === false && (
                      <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed" title="Properties temporarily unavailable">
                        Properties Unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply to Company Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {viewingCompany ? 'Company Details' : 'Join a Company'}
              </h3>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setViewingCompany(null);
                  setApplyingToCompany(null);
                  setSelectedRegions([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {/* Company Details View */}
              {viewingCompany ? (
                <div className="space-y-6">
                  {/* Back Button */}
                  <button
                    onClick={() => setViewingCompany(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to companies
                  </button>

                  {/* Company Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                      {viewingCompany.logo?.url ? (
                        <img src={viewingCompany.logo.url} alt={viewingCompany.name} className="w-14 h-14 rounded-lg object-cover" />
                      ) : (
                        <span className="text-white font-bold text-2xl">{viewingCompany.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{viewingCompany.name}</h2>
                      <p className="text-gray-500">{viewingCompany.email}</p>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Operating Regions</p>
                      <div className="flex flex-wrap gap-2">
                        {(viewingCompany.regions || ['india']).map(region => (
                          <span key={region} className={`px-3 py-1 rounded-full text-sm font-medium ${
                            region === 'india' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {region === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Commission Structure</p>
                      <p className="font-semibold text-gray-900">
                        {viewingCompany.settings?.tierPercentages?.bronze || 30}% - {viewingCompany.settings?.tierPercentages?.platinum || 60}%
                      </p>
                      <p className="text-xs text-gray-500">Based on partner tier</p>
                    </div>
                    {viewingCompany.address?.city && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Location</p>
                        <p className="font-semibold text-gray-900">
                          {viewingCompany.address.city}
                          {viewingCompany.address.state && `, ${viewingCompany.address.state}`}
                          {viewingCompany.address.country && `, ${viewingCompany.address.country}`}
                        </p>
                      </div>
                    )}
                    {viewingCompany.phone && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Contact</p>
                        <p className="font-semibold text-gray-900">{viewingCompany.phone}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {viewingCompany.description && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">About</p>
                      <p className="text-gray-700">{viewingCompany.description}</p>
                    </div>
                  )}

                  {/* Stats */}
                  {viewingCompany.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {viewingCompany.stats.totalProperties > 0 && (
                        <div className="bg-cyan-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-cyan-700">{viewingCompany.stats.totalProperties}</p>
                          <p className="text-xs text-gray-600">Properties</p>
                        </div>
                      )}
                      {viewingCompany.stats.totalPartners > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-700">{viewingCompany.stats.totalPartners}</p>
                          <p className="text-xs text-gray-600">Partners</p>
                        </div>
                      )}
                      {viewingCompany.stats.activeListings > 0 && (
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-700">{viewingCompany.stats.activeListings}</p>
                          <p className="text-xs text-gray-600">Active Listings</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        const companyRegions = viewingCompany.regions || ['india'];
                        setApplyingToCompany(viewingCompany._id);
                        setSelectedRegions([companyRegions[0]]);
                        setViewingCompany(null);
                      }}
                      className="w-full px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
                    >
                      Apply to Join
                    </button>
                  </div>
                </div>
              ) : availableCompanies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">You've already applied to all available companies</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableCompanies.map((company) => {
                    const companyRegions = company.regions || ['india'];

                    return (
                      <div
                        key={company._id}
                        className="p-4 rounded-lg border border-gray-200 hover:border-cyan-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                              <span className="text-white font-bold">{company.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{company.name}</h4>
                              <p className="text-sm text-gray-500">
                                {companyRegions.map(r => r === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai').join(' • ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingCompany(company)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                setApplyingToCompany(company._id);
                                setSelectedRegions([companyRegions[0]]);
                              }}
                              disabled={applyingToCompany && applyingToCompany !== company._id}
                              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {/* Region Selection */}
                        {applyingToCompany === company._id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Select your operating region(s): <span className="text-red-500">*</span>
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Choose the region(s) where you will be working with this company. This determines which KYC documents you'll need to submit.
                            </p>
                            <div className="flex flex-wrap gap-3 mb-4">
                              {companyRegions.map((region) => (
                                <label
                                  key={region}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                                    selectedRegions.includes(region)
                                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                                      : 'border-gray-300 hover:border-cyan-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedRegions.includes(region)}
                                    onChange={() => handleRegionToggle(region)}
                                    className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                                  />
                                  <span className="text-sm font-medium">
                                    {region === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai'}
                                  </span>
                                </label>
                              ))}
                            </div>

                            {/* KYC Info */}
                            {selectedRegions.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <p className="text-xs text-gray-600">
                                  <strong>Required KYC documents:</strong>
                                </p>
                                <ul className="text-xs text-gray-500 mt-1 space-y-1">
                                  {selectedRegions.includes('india') && (
                                    <li>India: PAN Card, GST Certificate, Address Proof, Cancelled Cheque</li>
                                  )}
                                  {selectedRegions.includes('dubai') && (
                                    <li>Dubai: Trade License, RERA Card, Emirates ID, Passport Copy</li>
                                  )}
                                </ul>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setApplyingToCompany(null);
                                  setSelectedRegions([]);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleApplyToCompany(company._id, companyRegions)}
                                disabled={selectedRegions.length === 0}
                                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                              >
                                Submit Application
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawModal && withdrawingPartnership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              {/* Icon */}
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Withdraw Partnership Request?
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to withdraw your application to join <strong>{withdrawingPartnership.companyId?.name}</strong>? This action cannot be undone.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawingPartnership(null);
                  }}
                  disabled={withdrawing}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawRequest}
                  disabled={withdrawing}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyCompanies;