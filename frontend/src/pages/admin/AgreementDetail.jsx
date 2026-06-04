import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';

const AgreementDetail = () => {
  const { partnershipId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig[user?.role] || sidebarConfig.company_superadmin;

  const [partner, setPartner] = useState(null);
  const [partnership, setPartnership] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [currentSignatures, setCurrentSignatures] = useState([]); // Current valid signatures
  const [signatures, setSignatures] = useState([]); // History (expired/old signatures only)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination states
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);

  // Modal states
  const [viewingSignature, setViewingSignature] = useState(null);
  const [signatureContent, setSignatureContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    fetchAgreementDetails();
  }, [partnershipId]);

  const fetchAgreementDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/agreements/signatures/partnership/${partnershipId}`);
      setPartner(response.data.data.partner);
      setPartnership(response.data.data.partnership);
      setTemplates(response.data.data.templates);
      setCurrentSignatures(response.data.data.currentSignatures || []);
      setSignatures(response.data.data.signatures || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load agreement details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSignatureContent = async (signature) => {
    try {
      setLoadingContent(true);
      setViewingSignature(signature);

      // Use contentSnapshot if available (preserves original content at time of signing)
      // For current signatures without contentSnapshot, fetch from template
      let content = signature.contentSnapshot;

      if (!content && signature.agreementTemplateId?._id) {
        // Fallback: fetch from template API (for signatures created before contentSnapshot was added)
        try {
          const response = await api.get(`/agreements/${signature.agreementTemplateId._id}`);
          const template = response.data.data.template;
          content = template.content || '';
        } catch (err) {
          // Template may have been deleted, content unavailable
          content = 'Agreement content is no longer available (template has been deleted).';
        }
      }

      if (!content) {
        content = 'Agreement content is no longer available.';
      }

      // Replace placeholders with actual values
      content = content
        .replace(/{{partnerName}}/g, signature.typedName || '_________________')
        .replace(/{{companyName}}/g, partnership?.company?.name || '_________________')
        .replace(/{{date}}/g, new Date(signature.signedAt).toLocaleDateString())
        .replace(/{{partnerPhone}}/g, partner?.phone || '_________________')
        .replace(/{{partnerEmail}}/g, partner?.email || '_________________');

      setSignatureContent(content);
    } catch (err) {
      setError('Failed to load agreement content.');
    } finally {
      setLoadingContent(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  // Calculate stats
  const calculateStats = () => {
    const requiredTemplates = templates.filter(t => t.isRequired);
    const signedCount = requiredTemplates.filter(template => {
      return currentSignatures.some(
        s => s.agreementTemplateId?._id?.toString() === template._id.toString() &&
             s.version === template.version && s.status === 'signed'
      );
    }).length;

    const expiredCount = signatures.filter(s => s.status === 'expired').length;

    const pendingCount = requiredTemplates.length - signedCount;

    return {
      total: requiredTemplates.length,
      signed: signedCount,
      pending: pendingCount,
      expired: expiredCount,
      percentage: requiredTemplates.length > 0 ? Math.round((signedCount / requiredTemplates.length) * 100) : 0
    };
  };

  // Get status for each template
  const getTemplateStatus = (template) => {
    const currentSig = currentSignatures.find(
      s => s.agreementTemplateId?._id?.toString() === template._id.toString() &&
           s.version === template.version && s.status === 'signed'
    );

    if (currentSig) {
      return { status: 'signed', signature: currentSig, label: 'Signed', color: 'green' };
    }
    return { status: 'pending', signature: null, label: 'Pending', color: 'gray' };
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Agreement Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = calculateStats();

  return (
    <DashboardLayout sidebarLinks={config.links} title="Signed Agreements" subtitle="Review partner agreements" color={config.color}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/company/signed-agreements')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Agreements List</span>
      </button>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Partner Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {partner?.firstName?.charAt(0) || 'P'}
              {partner?.lastName?.charAt(0) || ''}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">
                {partner?.firstName} {partner?.lastName}
              </h2>
              <p className="text-gray-600">{partner?.email}</p>
              {partner?.phone && <p className="text-sm text-gray-500">{partner?.phone}</p>}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-500">Partnership Status</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                partnership?.status === 'active' ? 'bg-green-100 text-green-800' :
                partnership?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {partnership?.status?.charAt(0).toUpperCase() + partnership?.status?.slice(1) || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Agreement Progress */}
        <div className="p-4 sm:p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Agreement Progress</h3>
              <p className="text-sm text-gray-500">
                {stats.signed} of {stats.total} required agreements signed
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all ${stats.percentage === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>

          {/* Status Counts */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-gray-700">{stats.signed} Signed</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium text-gray-700">{stats.expired} Expired</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-gray-300"></span>
              <span className="text-sm font-medium text-gray-700">{stats.pending} Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Required Agreements Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Required Agreements</h3>
          <p className="text-sm text-gray-500">Agreements that must be signed for this partnership</p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates.filter(t => t.isRequired).map((template) => {
                const status = getTemplateStatus(template);
                return (
                  <tr key={template._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{template.name}{template.isRequired && <span className="text-red-500 text-sm">*</span>}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getTypeLabel(template.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                        v{template.version}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                        status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {status.signature ? formatDate(status.signature.signedAt) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {status.signature ? (
                        <button
                          onClick={() => fetchSignatureContent(status.signature)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">Not signed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {templates.filter(t => t.isRequired).map((template) => {
            const status = getTemplateStatus(template);
            return (
              <div key={template._id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {template.name}{template.isRequired && <span className="text-red-500">*</span>}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getTypeLabel(template.type)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                        v{template.version}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.color === 'green' ? 'bg-green-100 text-green-800' :
                    status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {status.label}
                  </span>
                </div>

                {status.signature && (
                  <p className="text-xs text-gray-500 mb-2">
                    Signed: {formatDate(status.signature.signedAt)}
                  </p>
                )}

                {status.signature ? (
                  <button
                    onClick={() => fetchSignatureContent(status.signature)}
                    className="w-full px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
                  >
                    View Agreement
                  </button>
                ) : (
                  <p className="text-sm text-gray-400 italic">Not signed yet</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agreement History Section */}
      {signatures.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Agreement History</h3>
            <p className="text-sm text-gray-500">All signed agreements including previous versions</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {signatures.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage).map((sig) => {
                  const template = templates.find(t => t._id.toString() === sig.agreementTemplateId?._id?.toString());
                  const isLatest = template && sig.version === template.version && sig.status === 'signed';

                  return (
                    <tr key={sig._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {sig.agreementTemplateId?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{getTypeLabel(sig.agreementTemplateId?.type)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          v{sig.version}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(sig.signedAt)}</td>
                      <td className="px-6 py-4 text-gray-600">{sig.typedName || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          sig.templateDeleted ? 'bg-red-100 text-red-800' :
                          sig.status === 'signed' && isLatest ? 'bg-green-100 text-green-800' :
                          sig.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sig.templateDeleted ? 'Deleted' :
                           sig.status === 'signed' && isLatest ? 'Current' :
                           sig.status === 'expired' ? 'Expired' : 'Previous Version'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => fetchSignatureContent(sig)}
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

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {signatures.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage).map((sig) => {
              const template = templates.find(t => t._id.toString() === sig.agreementTemplateId?._id?.toString());
              const isLatest = template && sig.version === template.version && sig.status === 'signed';

              return (
                <div key={sig._id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{sig.agreementTemplateId?.name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-500">{getTypeLabel(sig.agreementTemplateId?.type)} • v{sig.version}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      sig.templateDeleted ? 'bg-red-100 text-red-800' :
                      sig.status === 'signed' && isLatest ? 'bg-green-100 text-green-800' :
                      sig.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sig.templateDeleted ? 'Deleted' :
                       sig.status === 'signed' && isLatest ? 'Current' :
                       sig.status === 'expired' ? 'Expired' : 'Previous Version'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Signed: {formatDate(sig.signedAt)}</p>
                    <button
                      onClick={() => fetchSignatureContent(sig)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {signatures.length > historyItemsPerPage && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100">
              <Pagination
                currentPage={historyPage}
                totalPages={Math.ceil(signatures.length / historyItemsPerPage)}
                total={signatures.length}
                itemsPerPage={historyItemsPerPage}
                onPageChange={setHistoryPage}
                onItemsPerPageChange={(newLimit) => { setHistoryItemsPerPage(newLimit); setHistoryPage(1); }}
              />
            </div>
          )}
        </div>
      )}

      {/* View Agreement Modal */}
      {viewingSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Signed Agreement</h3>
                <p className="text-sm text-gray-500">
                  {viewingSignature.agreementTemplateId?.name} - Version {viewingSignature.version}
                </p>
              </div>
              <button
                onClick={() => setViewingSignature(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Signature Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Signed By</p>
                  <p className="font-medium">{viewingSignature.typedName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Signed At</p>
                  <p className="font-medium">{formatDate(viewingSignature.signedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IP Address</p>
                  <p className="font-medium">{viewingSignature.ipAddress || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    viewingSignature.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSignature.status === 'signed' ? 'Signed' : 'Expired'}
                  </span>
                </div>
              </div>

              {/* Agreement Content */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Agreement Content</h4>
                {loadingContent ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                      {signatureContent}
                    </pre>
                  </div>
                )}
              </div>

              {/* Signature Block */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Electronic Signature</h4>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-sm text-indigo-800 mb-2">
                    <strong>Signed electronically by:</strong> {viewingSignature.typedName}
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
                onClick={() => setViewingSignature(null)}
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

export default AgreementDetail;