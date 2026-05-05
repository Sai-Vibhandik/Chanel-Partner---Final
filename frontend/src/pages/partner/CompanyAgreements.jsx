import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const CompanyAgreements = () => {
  const { partnershipId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig.partner;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [partnership, setPartnership] = useState(null);
  const [pendingAgreements, setPendingAgreements] = useState([]);
  const [resignAgreements, setResignAgreements] = useState([]);
  const [signedAgreements, setSignedAgreements] = useState([]);
  const [signatureHistory, setSignatureHistory] = useState([]);

  // Modal state
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [typedName, setTypedName] = useState('');
  const [viewingSignature, setViewingSignature] = useState(null);

  useEffect(() => {
    fetchPartnership();
  }, [partnershipId]);

  const fetchPartnership = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch partnership details and agreements
      const [partnershipRes, agreementsRes] = await Promise.all([
        api.get(`/partner-company/${partnershipId}`),
        api.get(`/agreements/partner/agreements?partnershipId=${partnershipId}`)
      ]);

      setPartnership(partnershipRes.data.data.partnership);

      // Separate agreements into pending, resign, and signed
      const pending = [];
      const resign = [];
      const signed = [];

      agreementsRes.data.data.agreements.forEach(agreement => {
        if (agreement.isSigned) {
          signed.push(agreement);
        } else if (agreement.needsResign) {
          resign.push(agreement);
        } else {
          pending.push(agreement);
        }
      });

      setPendingAgreements(pending);
      setResignAgreements(resign);
      setSignedAgreements(signed);
      setSignatureHistory(agreementsRes.data.data.signatureHistory || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async () => {
    if (!typedName.trim()) {
      setError('Please type your name to sign');
      return;
    }

    if (!selectedAgreement) return;

    try {
      setSubmitting(true);
      setError('');

      await api.post(`/agreements/partner/agreements/${selectedAgreement._id}/sign`, {
        partnershipId,
        typedName: typedName.trim()
      });

      setSuccess(`"${selectedAgreement.name}" signed successfully!`);
      setSelectedAgreement(null);
      setTypedName('');

      // Refresh agreements
      await fetchPartnership();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const replacePlaceholders = (content) => {
    if (!content) return '';
    return content
      .replace(/{{partnerName}}/g, user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '_________________')
      .replace(/{{companyName}}/g, partnership?.companyId?.name || '_________________')
      .replace(/{{date}}/g, new Date().toLocaleDateString())
      .replace(/{{partnerPhone}}/g, user?.phone || '_________________')
      .replace(/{{partnerEmail}}/g, user?.email || '_________________');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeLabel = (type) => {
    const types = {
      nda: 'NDA',
      nca: 'Non-Compete',
      cpa: 'Channel Partner Agreement',
      code_of_conduct: 'Code of Conduct',
      gdpr_consent: 'GDPR Consent',
      other: 'Other'
    };
    return types[type] || type;
  };

  const openAgreementModal = (agreement) => {
    setSelectedAgreement(agreement);
    setTypedName('');
    setError('');
  };

  const closeAgreementModal = () => {
    setSelectedAgreement(null);
    setTypedName('');
    setError('');
  };

  const openSignatureModal = async (signature) => {
    try {
      // If templateContent is already provided (from signed agreements), use it directly
      if (signature.templateContent) {
        setViewingSignature(signature);
        return;
      }

      // Otherwise fetch the template content
      const templateId = signature.agreementTemplateId?._id || signature.agreementTemplateId;
      const response = await api.get(`/agreements/${templateId}`);
      const template = response.data.data.template;

      // Create a combined object with signature and template info
      setViewingSignature({
        ...signature,
        templateContent: template.content,
        templateName: template.name || signature.agreementTemplateId?.name,
        templateType: template.type || signature.agreementTemplateId?.type
      });
    } catch (err) {
      console.error('Failed to load signature details:', err);
    }
  };

  const closeSignatureModal = () => {
    setViewingSignature(null);
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout
        sidebarLinks={config.links}
        title="Company Agreements"
        subtitle="Loading..."
        color={config.color}
      >
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agreements...</p>
        </div>
      </DashboardLayout>
    );
  }

  const company = partnership?.companyId;
  const totalPending = pendingAgreements.length + resignAgreements.length;

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title={company?.name || 'Company Agreements'}
      subtitle="View and sign your agreements"
      color={config.color}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/agreements')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Companies
      </button>

      {/* Error Message */}
      {error && !selectedAgreement && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Company Header */}
      {company && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-400">{company.name?.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{company.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  partnership?.status === 'active' ? 'bg-green-100 text-green-800' :
                  partnership?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {partnership?.status?.charAt(0).toUpperCase() + partnership?.status?.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  Tier: {partnership?.tier?.charAt(0).toUpperCase() + partnership?.tier?.slice(1)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Partner since</p>
              <p className="font-medium">{formatDate(partnership?.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Signatures</p>
              <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${totalPending > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              {totalPending > 0 ? (
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Signed Agreements</p>
              <p className="text-2xl font-bold text-gray-900">{signedAgreements.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Agreements</p>
              <p className="text-2xl font-bold text-gray-900">{pendingAgreements.length + resignAgreements.length + signedAgreements.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sign All Button */}
      {totalPending > 0 && (
        <div className="mb-6">
          <button
            onClick={() => navigate(`/partner/agreements/sign?partnershipId=${partnershipId}`)}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Sign All Pending Agreements ({totalPending})
          </button>
          <p className="mt-2 text-sm text-gray-500">
            Sign all {totalPending} pending agreement{totalPending !== 1 ? 's' : ''} in sequence
          </p>
        </div>
      )}

      {/* Agreements Sections */}
      <div className="space-y-6">
        {/* Pending Agreements (First Time Sign) */}
        {pendingAgreements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-semibold text-yellow-800">Pending Signatures</h3>
                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-sm">
                  {pendingAgreements.length} agreement{pendingAgreements.length !== 1 ? 's' : ''} need{pendingAgreements.length === 1 ? 's' : ''} your signature
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingAgreements.map((agreement) => (
                <div key={agreement._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{agreement.name}</h4>
                      <p className="text-sm text-gray-500">{getTypeLabel(agreement.type)} • v{agreement.version}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openAgreementModal(agreement)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    Review & Sign
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resign Required Agreements (Updated Versions) */}
        {resignAgreements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m5.842 0H15" />
                </svg>
                <h3 className="font-semibold text-orange-800">Updated Agreements</h3>
                <span className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full text-sm">
                  {resignAgreements.length} agreement{resignAgreements.length !== 1 ? 's' : ''} updated - please re-sign
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {resignAgreements.map((agreement) => (
                <div key={agreement._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m5.842 0H15" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{agreement.name}</h4>
                      <p className="text-sm text-gray-500">
                        {getTypeLabel(agreement.type)} • v{agreement.version}
                        {agreement.previousVersion && <span className="text-orange-600"> (previously signed v{agreement.previousVersion})</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openAgreementModal(agreement)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                  >
                    Review & Sign
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already Signed Agreements */}
        {signedAgreements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-green-800">Signed Agreements</h3>
                <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-sm">
                  {signedAgreements.length} completed
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {signedAgreements.map((agreement) => (
                <div key={agreement._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{agreement.name}</h4>
                      <p className="text-sm text-gray-500">
                        {getTypeLabel(agreement.type)} • v{agreement.version} • Signed on {formatDate(agreement.signature?.signedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Signed
                    </span>
                    <button
                      onClick={() => openSignatureModal({
                        _id: agreement.signature?._id,
                        agreementTemplateId: agreement,
                        version: agreement.version,
                        typedName: agreement.signature?.typedName,
                        signedAt: agreement.signature?.signedAt,
                        ipAddress: agreement.signature?.ipAddress,
                        status: 'signed',
                        templateContent: agreement.content,
                        templateName: agreement.name,
                        templateType: agreement.type
                      })}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Agreements */}
        {pendingAgreements.length === 0 && resignAgreements.length === 0 && signedAgreements.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Agreements</h3>
            <p className="text-gray-500">
              There are no agreements assigned to you for this company yet.
            </p>
          </div>
        )}

        {/* Signature History */}
        {signatureHistory && signatureHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Signature History</h3>
              <p className="text-sm text-gray-500">All your signed agreement versions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed On</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {signatureHistory.map((sig) => {
                    // Check if this is the current signed version
                    const isCurrent = signedAgreements.some(
                      a => a._id === sig.agreementTemplateId?._id && a.signature?.signedAt === sig.signedAt
                    );

                    return (
                      <tr key={sig._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {sig.agreementTemplateId?.name || 'Unknown Agreement'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getTypeLabel(sig.agreementTemplateId?.type)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                            v{sig.version}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(sig.signedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sig.typedName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            sig.status === 'signed' && isCurrent
                              ? 'bg-green-100 text-green-800'
                              : sig.status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sig.status === 'signed' && isCurrent
                              ? 'Current'
                              : sig.status === 'expired'
                              ? 'Outdated'
                              : sig.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openSignatureModal(sig)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Agreement View/Sign Modal */}
      {selectedAgreement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedAgreement.name}</h3>
                <p className="text-sm text-gray-500">
                  {getTypeLabel(selectedAgreement.type)} • Version {selectedAgreement.version}
                  {selectedAgreement.needsResign && selectedAgreement.previousVersion && (
                    <span className="text-orange-600 ml-2">(previously signed v{selectedAgreement.previousVersion})</span>
                  )}
                </p>
              </div>
              <button
                onClick={closeAgreementModal}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {selectedAgreement.needsResign && !selectedAgreement.isSigned && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">This agreement has been updated!</span>
                    <span className="text-orange-700">Please review and sign the new version.</span>
                  </div>
                </div>
              )}

              {selectedAgreement.isSigned ? (
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-800 mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Agreement Signed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-green-700">Signed By</p>
                        <p className="font-medium text-green-900">{selectedAgreement.signature?.typedName}</p>
                      </div>
                      <div>
                        <p className="text-green-700">Signed On</p>
                        <p className="font-medium text-green-900">{formatDate(selectedAgreement.signature?.signedAt)}</p>
                      </div>
                      {selectedAgreement.signature?.ipAddress && (
                        <div>
                          <p className="text-green-700">IP Address</p>
                          <p className="font-medium text-green-900">{selectedAgreement.signature?.ipAddress}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-green-700">Status</p>
                        <span className="px-2 py-1 rounded text-xs bg-green-200 text-green-800">Valid</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {replacePlaceholders(selectedAgreement.content)}
              </div>
            </div>

            {/* Signature Section - Only for unsigned agreements */}
            {!selectedAgreement.isSigned && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type your full name as signature *
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Enter your full legal name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      By typing your name, you agree that this electronic signature is as legally binding as a physical signature.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeAgreementModal}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSignAgreement}
                      disabled={submitting || !typedName.trim()}
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Signing...' : 'Sign Agreement'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button for Signed Agreements */}
            {selectedAgreement.isSigned && (
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={closeAgreementModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature History View Modal */}
      {viewingSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewingSignature.templateName || viewingSignature.agreementTemplateId?.name || 'Signed Agreement'}
                </h3>
                <p className="text-sm text-gray-500">
                  {getTypeLabel(viewingSignature.templateType || viewingSignature.agreementTemplateId?.type)} • Version {viewingSignature.version}
                </p>
              </div>
              <button
                onClick={closeSignatureModal}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Signature Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Signed By</p>
                  <p className="font-medium">{viewingSignature.typedName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Signed On</p>
                  <p className="font-medium">{formatDate(viewingSignature.signedAt)}</p>
                </div>
                {viewingSignature.ipAddress && (
                  <div>
                    <p className="text-sm text-gray-500">IP Address</p>
                    <p className="font-medium">{viewingSignature.ipAddress}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded text-xs ${
                    viewingSignature.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSignature.status === 'signed' ? 'Valid' : 'Expired'}
                  </span>
                </div>
              </div>

              {/* Agreement Content */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Agreement Content</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                    {replacePlaceholders(viewingSignature.templateContent)}
                  </pre>
                </div>
              </div>

              {/* Electronic Signature */}
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-indigo-800 mb-1">Electronic Signature</p>
                  <p className="text-sm text-indigo-700">
                    <strong>Signed by:</strong> {viewingSignature.typedName}
                  </p>
                  <p className="text-sm text-indigo-700">
                    <strong>Date:</strong> {formatDate(viewingSignature.signedAt)}
                  </p>
                  {viewingSignature.ipAddress && (
                    <p className="text-sm text-indigo-700">
                      <strong>IP Address:</strong> {viewingSignature.ipAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeSignatureModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CompanyAgreements;