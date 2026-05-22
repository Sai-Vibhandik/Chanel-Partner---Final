import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const MyCompanies = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const [partnerships, setPartnerships] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingToCompany, setApplyingToCompany] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError('Failed to load your companies');
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

  const handleApplyToCompany = async (companyId) => {
    try {
      setApplyingToCompany(companyId);
      setError('');
      setSuccess('');

      await api.post('/partner-company/apply', { companyId });

      setSuccess('Application submitted successfully!');
      setShowApplyModal(false);
      fetchPartnerships();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplyingToCompany(null);
    }
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
      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

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
              <h3 className="text-lg font-semibold text-gray-900">Join a Company</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {availableCompanies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">You've already applied to all available companies</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableCompanies.map((company) => (
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
                              {company.regions?.map(r => r === 'india' ? '🇮🇳' : '🇦🇪').join(' ')}
                              {company.address?.city && ` • ${company.address.city}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApplyToCompany(company._id)}
                          disabled={applyingToCompany === company._id}
                          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm"
                        >
                          {applyingToCompany === company._id ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyCompanies;