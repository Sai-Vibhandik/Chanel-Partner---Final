import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api, { getDocumentViewUrl } from '../../utils/api';

const PartnershipDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const [partnership, setPartnership] = useState(null);
  const [kycSummary, setKycSummary] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Agreement signing state
  const [currentAgreementIndex, setCurrentAgreementIndex] = useState(0);
  const [typedName, setTypedName] = useState('');
  const [signing, setSigning] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPartnership();
  }, [id]);

  const fetchPartnership = async () => {
    try {
      setLoading(true);
      const [partnershipRes, kycRes, agreementsRes] = await Promise.all([
        api.get(`/partner-company/${id}`),
        api.get(`/partner-company/${id}/kyc`),
        api.get(`/agreements/partner/agreements?partnershipId=${id}`).catch(() => ({ data: { data: { agreements: [] } } }))
      ]);
      setPartnership(partnershipRes.data.data.partnership);
      setKycSummary(kycRes.data.data.kycSummary);
      setAgreements(agreementsRes.data.data.agreements || []);

      // Find first unsigned required agreement
      const unsignedIndex = (agreementsRes.data.data.agreements || []).findIndex(a => !a.isSigned);
      if (unsignedIndex !== -1) {
        setCurrentAgreementIndex(unsignedIndex);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load partnership');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, docType, region) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(`${docType}-${region}`);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `kyc/${id}`);

      const uploadResponse = await api.post('/upload/document', formData);
      const { url, publicId } = uploadResponse.data.data;

      await api.post(`/partner-company/${id}/kyc`, {
        type: docType,
        url,
        publicId,
        region
      });

      setSuccess('Document uploaded successfully');

      const kycRes = await api.get(`/partner-company/${id}/kyc`);
      setKycSummary(kycRes.data.data.kycSummary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleSignAgreement = async () => {
    if (!typedName.trim()) {
      setError('Please type your name to sign');
      return;
    }

    const currentAgreement = agreements[currentAgreementIndex];
    if (!currentAgreement) return;

    try {
      setSigning(true);
      setError('');

      await api.post(`/agreements/partner/agreements/${currentAgreement._id}/sign`, {
        partnershipId: id,
        typedName: typedName.trim()
      });

      // Refresh agreements
      const agreementsRes = await api.get(`/agreements/partner/agreements?partnershipId=${id}`);
      setAgreements(agreementsRes.data.data.agreements || []);

      // Move to next agreement or close modal
      const nextUnsignedIndex = (agreementsRes.data.data.agreements || []).findIndex(a => !a.isSigned);
      if (nextUnsignedIndex !== -1) {
        setCurrentAgreementIndex(nextUnsignedIndex);
        setTypedName('');
      } else {
        setShowAgreementModal(false);
        setSuccess('All agreements signed successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign agreement');
    } finally {
      setSigning(false);
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

  // Calculate completion progress
  const totalAgreements = agreements.length;
  const signedAgreements = agreements.filter(a => a.isSigned).length;
  const totalKyc = kycSummary?.totalRequired || 0;
  const verifiedKyc = kycSummary?.verified || 0;
  const totalSteps = totalAgreements + totalKyc;
  const completedSteps = signedAgreements + verifiedKyc;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partnership Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !partnership) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Partnership Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/partner/my-companies')}
            className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            Back to My Companies
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const company = partnership?.companyId;
  const hasUnsignedAgreements = agreements.some(a => !a.isSigned);

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title={company?.name || 'Partnership Details'}
      subtitle="Manage your partnership"
      color={config.color}
    >
      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/my-companies')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to My Companies
      </button>

      {/* Progress Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900"></h3>
          <span className="text-sm text-gray-500">{completedSteps}/{totalSteps} steps completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all ${progressPercent === 100 ? 'bg-green-500' : 'bg-cyan-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border ${signedAgreements === totalAgreements && totalAgreements > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              {signedAgreements === totalAgreements && totalAgreements > 0 ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-xs flex items-center justify-center">1</span>
              )}
              <span className="font-medium text-gray-900">Agreements</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{signedAgreements}/{totalAgreements} signed</p>
          </div>
          <div className={`p-4 rounded-lg border ${verifiedKyc === totalKyc && totalKyc > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              {verifiedKyc === totalKyc && totalKyc > 0 ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-xs flex items-center justify-center">2</span>
              )}
              <span className="font-medium text-gray-900">KYC Documents</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{verifiedKyc}/{totalKyc} verified</p>
          </div>
          <div className={`p-4 rounded-lg border ${partnership?.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2">
              {partnership?.status === 'active' ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-xs flex items-center justify-center">3</span>
              )}
              <span className="font-medium text-gray-900">Admin Approval</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 capitalize">{partnership?.status}</p>
          </div>
        </div>
      </div>

      {/* Company & Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {company?.name?.charAt(0) || 'C'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{company?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(partnership?.status)}`}>
                  {partnership?.status?.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTierBadge(partnership?.tier)}`}>
                  {partnership?.tier} Tier
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Commission Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {partnership?.commissionPercentage || company?.settings?.tierPercentages?.[partnership?.tier] || 30}%
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">Operating Regions</p>
            <p className="text-gray-900">
              {company?.regions?.map(r => r === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai').join(', ')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Joined</p>
            <p className="text-gray-900">
              {partnership?.joinedAt ? new Date(partnership.joinedAt).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">KYC Status</p>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              partnership?.kycStatus === 'verified' ? 'bg-green-100 text-green-800' :
              partnership?.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' :
              partnership?.kycStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {partnership?.kycStatus?.replace('_', ' ') || 'pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Agreements Section */}
      {agreements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Legal Agreements</h3>
              <p className="text-sm text-gray-500">
                Please sign all required agreements to proceed
              </p>
            </div>
            {/* {hasUnsignedAgreements && (
              <button
                onClick={() => {
                  const firstUnsigned = agreements.findIndex(a => !a.isSigned);
                  setCurrentAgreementIndex(firstUnsigned !== -1 ? firstUnsigned : 0);
                  setShowAgreementModal(true);
                }}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                {signedAgreements > 0 ? 'Continue Signing' : 'Sign Agreements'}
              </button>
            )} */}
          </div>

          <div className="space-y-3">
            {agreements.map((agreement, index) => (
              <div
                key={agreement._id}
                className={`p-4 rounded-lg border-2 ${
                  agreement.isSigned ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      agreement.isSigned ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      {agreement.isSigned ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{agreement.name}</h4>
                      <p className="text-sm text-gray-500">
                        {agreement.type.toUpperCase().replace('_', ' ')}
                        {agreement.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </p>
                    </div>
                  </div>
                  <div>
                    {agreement.isSigned ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Signed v{agreement.version}
                      </span>
                    ) : agreement.needsResign ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Update Required
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {signedAgreements === totalAgreements && totalAgreements > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-green-800">All agreements signed!</p>
                  <p className="text-sm text-green-700">You have signed all required legal documents.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KYC Documents Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">KYC Documents</h3>
            <p className="text-sm text-gray-500">
              Upload documents required by {company?.name}
            </p>
          </div>
          {kycSummary && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {kycSummary.verified}/{kycSummary.totalRequired} verified
              </span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    kycSummary.verified === kycSummary.totalRequired
                      ? 'bg-green-500'
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        ) : kycSummary.requiredDocuments?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents required for this region</p>
          </div>
        ) : (
          <div className="space-y-4">
            {kycSummary.requiredDocuments.map((reqDoc) => {
              const doc = reqDoc.document;
              const isUploading = uploading === `${reqDoc.type}-${reqDoc.region}`;

              const getStatusStyle = () => {
                if (!doc) return 'border-gray-200 bg-gray-50';
                if (doc.status === 'verified') return 'border-green-300 bg-green-50';
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        !doc ? 'bg-gray-200' :
                        doc.status === 'verified' ? 'bg-green-100' :
                        doc.status === 'rejected' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {!doc ? (
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : doc.status === 'verified' ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              doc.status === 'verified' ? 'bg-green-100 text-green-800' :
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

                    <div className="flex items-center gap-2">
                      {!doc ? (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, reqDoc.type, reqDoc.region)}
                            disabled={uploading !== null}
                          />
                          <span className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isUploading
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-cyan-600 text-white hover:bg-cyan-700'
                          }`}>
                            {isUploading ? 'Uploading...' : 'Upload'}
                          </span>
                        </label>
                      ) : (
                        <>
                          <a
                            href={getDocumentViewUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                          >
                            View
                          </a>
                          {doc.status !== 'verified' && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, reqDoc.type, reqDoc.region)}
                                disabled={uploading !== null}
                              />
                              <span className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isUploading
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                              }`}>
                                {isUploading ? 'Uploading...' : 'Replace'}
                              </span>
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className={`mt-6 p-4 rounded-lg ${
              kycSummary.verified === kycSummary.totalRequired
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {kycSummary.verified === kycSummary.totalRequired ? (
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800">All documents verified!</p>
                    <p className="text-sm text-green-700">Your KYC is complete for this company.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-yellow-800">KYC incomplete</p>
                    <p className="text-sm text-yellow-700">
                      Upload {kycSummary.totalRequired - kycSummary.verified} more document(s) to complete your KYC.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rejection Reason */}
      {partnership?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-red-800 mb-2">Application Rejected</h3>
          <p className="text-red-700">{partnership.rejectionReason}</p>
        </div>
      )}

      {/* Admin Notes */}
      {partnership?.adminNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">Notes from {company?.name}</h3>
          <p className="text-blue-700">{partnership.adminNotes}</p>
        </div>
      )}

      {/* Agreement Signing Modal */}
      {showAgreementModal && agreements[currentAgreementIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {agreements[currentAgreementIndex].name}
                </h3>
                <p className="text-sm text-gray-500">
                  Agreement {currentAgreementIndex + 1} of {agreements.length}
                </p>
              </div>
              <button
                onClick={() => setShowAgreementModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {replacePlaceholders(agreements[currentAgreementIndex].content)}
              </div>
            </div>

            {/* Signature */}
            <div className="p-6 border-t border-gray-200">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    By typing your name, you agree that this electronic signature is as legally binding as a physical signature.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreeCheckbox"
                    checked={typedName.length > 0}
                    onChange={() => {}}
                    className="w-4 h-4 mt-1 text-cyan-600 border-gray-300 rounded"
                    disabled
                  />
                  <label htmlFor="agreeCheckbox" className="text-sm text-gray-700">
                    I have read and agree to the terms and conditions outlined in this agreement.
                    I understand that this is a legally binding document.
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Save for Later
                  </button>
                  <button
                    onClick={handleSignAgreement}
                    disabled={signing || !typedName.trim()}
                    className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signing ? 'Signing...' : 'Sign & Continue'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PartnershipDetails;