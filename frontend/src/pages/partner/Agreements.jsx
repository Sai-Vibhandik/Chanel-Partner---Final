import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const Agreements = () => {
  const navigate = useNavigate();
  const config = sidebarConfig.partner;
  const toast = useToast();

  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerships();
  }, []);

  const fetchPartnerships = async () => {
    try {
      setLoading(true);

      const response = await api.get('/partner-company/my-companies');
      setPartnerships(response.data.data.partnerships);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load partnerships');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAgreementStatus = (partnership) => {
    if (partnership.hasUnsignedAgreements) {
      return { text: 'Agreements Pending', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '⚠️' };
    }
    return { text: 'All Signed', color: 'text-green-600', bg: 'bg-green-50', icon: '✓' };
  };

  const handleCompanyClick = (partnershipId) => {
    navigate(`/partner/agreements/${partnershipId}`);
  };

  if (loading) {
    return (
      <DashboardLayout
        sidebarLinks={config.links}
        title="Agreements"
        subtitle="View and sign your agreements"
        color={config.color}
      >
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your partnerships...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Agreements"
      subtitle="View and sign your agreements"
      color={config.color}
    >
      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-indigo-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-indigo-900">About Agreements</h3>
            <p className="text-sm text-indigo-700 mt-1">
              You need to sign agreements for each company you're partnered with. Click on a company to view your signed agreements and history.
            </p>
          </div>
        </div>
      </div>

      {/* Partnerships List */}
      {partnerships.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Partnerships Found</h3>
          <p className="text-gray-500 mb-4">
            You're not partnered with any company yet. Apply to a company to get started.
          </p>
          <button
            onClick={() => navigate('/partner/my-companies')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            View Companies
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partnerships.map((partnership) => {
            const agreementStatus = getAgreementStatus(partnership);

            return (
              <div
                key={partnership._id}
                onClick={() => handleCompanyClick(partnership._id)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                {/* Company Logo & Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden group-hover:bg-indigo-50 transition-colors">
                    {partnership.companyId?.logo ? (
                      <img
                        src={partnership.companyId.logo}
                        alt={partnership.companyId.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-400 group-hover:text-indigo-500 transition-colors">
                        {partnership.companyId?.name?.charAt(0) || 'C'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {partnership.companyId?.name || 'Unknown Company'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(partnership.status)}
                      <span className="text-xs text-gray-500">
                        {partnership.tier?.charAt(0).toUpperCase() + partnership.tier?.slice(1)} Tier
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agreement Status */}
                <div className={`p-3 rounded-lg ${agreementStatus.bg} flex items-center gap-2`}>
                  <span className="text-lg">{agreementStatus.icon}</span>
                  <div>
                    <p className={`font-medium ${agreementStatus.color}`}>
                      {agreementStatus.text}
                    </p>
                    <p className="text-xs text-gray-600">
                      Partner since {formatDate(partnership.createdAt)}
                    </p>
                  </div>
                </div>

                {/* View Details Hint */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Click to view agreements</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Agreements;