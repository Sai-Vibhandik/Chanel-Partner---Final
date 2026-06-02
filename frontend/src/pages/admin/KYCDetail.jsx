import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getDocumentViewUrl } from '../../utils/api';

const KYCDetail = () => {
  const { partnershipId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig[user?.role] || sidebarConfig.company_superadmin;
  const toast = useToast();

  const [partner, setPartner] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);

  useEffect(() => {
    fetchKYCDetails();
  }, [partnershipId]);

  const fetchKYCDetails = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/partner-company/${partnershipId}/kyc`);
      const { kycSummary, partnership } = response.data.data;

      // Partner info from partnership
      setPartner(partnership.partnerId);

      // Documents from kycSummary - use requiredDocuments which includes all required docs
      // and their upload status
      setDocuments(kycSummary.requiredDocuments.map(doc => ({
        ...doc,
        documentId: doc.document?._id,
        url: doc.document?.url,
        status: doc.uploaded ? doc.document?.status : 'not_uploaded',
        uploadedAt: doc.document?.uploadedAt,
        verifiedBy: doc.document?.verifiedBy,
        rejectionReason: doc.document?.rejectionReason
      })));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load KYC details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId) => {
    try {
      setProcessing(true);

      await api.put(`/partner-company/${partnershipId}/kyc/${documentId}/verify`, {
        status: 'verified'
      });

      toast.success('Document verified successfully.');
      fetchKYCDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify document');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDocument = async () => {
    // Validate rejection reason
    const errors = {};
    if (!rejectReason.trim()) {
      errors.rejectReason = 'Please provide a rejection reason.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setProcessing(true);
      setFieldErrors({});

      await api.put(`/partner-company/${partnershipId}/kyc/${selectedDocId}/verify`, {
        status: 'rejected',
        reason: rejectReason.trim()
      });

      toast.success('Document rejected successfully.');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedDocId(null);
      fetchKYCDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject document');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyAll = async () => {
    try {
      setProcessing(true);

      const pendingDocs = documents.filter(doc => doc.status === 'pending');
      await Promise.all(
        pendingDocs.map(doc =>
          api.put(`/partner-company/${partnershipId}/kyc/${doc.documentId}/verify`, {
            status: 'verified'
          })
        )
      );

      toast.success(`${pendingDocs.length} document(s) verified successfully.`);
      fetchKYCDetails();
    } catch (err) {
      toast.error('Failed to verify all documents.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      verified: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      not_uploaded: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const labels = {
      verified: 'Verified',
      pending: 'Pending Review',
      rejected: 'Rejected',
      not_uploaded: 'Not Uploaded'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
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

  const calculateStats = () => {
    const verified = documents.filter(d => d.status === 'verified').length;
    const pending = documents.filter(d => d.status === 'pending').length;
    const rejected = documents.filter(d => d.status === 'rejected').length;
    const notUploaded = documents.filter(d => d.status === 'not_uploaded').length;
    const total = documents.length;
    const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;

    return { verified, pending, rejected, notUploaded, total, percentage };
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="KYC Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = calculateStats();

  return (
    <DashboardLayout sidebarLinks={config.links} title="KYC Verification" subtitle="Review partner documents" color={config.color}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/company/kyc-verification')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to KYC List</span>
      </button>

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
            {partner?.partnerProfile?.companyName && (
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{partner.partnerProfile.companyName}</p>
              </div>
            )}
          </div>
        </div>

        {/* KYC Progress */}
        <div className="p-4 sm:p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">KYC Progress</h3>
              <p className="text-sm text-gray-500">
                {stats.verified} of {stats.total} documents verified
              </p>
            </div>
            {stats.pending > 0 && (
              <button
                onClick={handleVerifyAll}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                Verify All Pending ({stats.pending})
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all ${stats.percentage === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>

          {/* Status Counts */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-gray-700">{stats.verified} Verified</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-sm font-medium text-gray-700">{stats.pending} Pending</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium text-gray-700">{stats.rejected} Rejected</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full bg-gray-300"></span>
              <span className="text-sm font-medium text-gray-700">{stats.notUploaded} Not Uploaded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.type} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{doc.name}{doc.required && <span className="text-red-500 text-sm">*</span>}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.region === 'india' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {doc.region === 'india' ? 'India' : 'Dubai'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(doc.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.uploadedAt ? formatDate(doc.uploadedAt) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.status === 'verified' && doc.verifiedBy ? (
                      <span>{doc.verifiedBy.firstName} {doc.verifiedBy.lastName}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {doc.status === 'not_uploaded' ? (
                      <span className="text-gray-400 text-sm">Not uploaded</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          View
                        </button>
                        {doc.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyDocument(doc.documentId)}
                              disabled={processing}
                              className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocId(doc.documentId);
                                setShowRejectModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {doc.status === 'rejected' && doc.rejectionReason && (
                          <span className="text-red-600 text-xs" title={doc.rejectionReason}>
                            {doc.rejectionReason.substring(0, 20)}...
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {documents.map((doc) => (
            <div key={doc.type} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {doc.name}{doc.required && <span className="text-red-500">*</span>}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      doc.region === 'india' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {doc.region === 'india' ? 'India' : 'Dubai'}
                    </span>
                  </div>
                </div>
                {getStatusBadge(doc.status)}
              </div>

              {doc.uploadedAt && (
                <p className="text-xs text-gray-500 mb-2">
                  Uploaded: {formatDate(doc.uploadedAt)}
                </p>
              )}

              {doc.status === 'rejected' && doc.rejectionReason && (
                <p className="text-xs text-red-600 mb-2">
                  Reason: {doc.rejectionReason}
                </p>
              )}

              {doc.status !== 'not_uploaded' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setSelectedDocument(doc)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
                  >
                    View
                  </button>
                  {doc.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleVerifyDocument(doc.documentId)}
                        disabled={processing}
                        className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg disabled:opacity-50"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDocId(doc.documentId);
                          setShowRejectModal(true);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              )}

              {doc.status === 'not_uploaded' && (
                <p className="text-sm text-gray-400 italic">Document not uploaded</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Document View Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.name}</h3>
                <p className="text-sm text-gray-500">Document Preview</p>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {selectedDocument.url?.endsWith('.pdf') ? (
                <iframe
                  src={getDocumentViewUrl(selectedDocument.url)}
                  className="w-full h-96"
                  title="Document"
                />
              ) : (
                <img
                  src={getDocumentViewUrl(selectedDocument.url)}
                  alt={selectedDocument.name}
                  className="max-w-full max-h-96 mx-auto"
                />
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm text-gray-600">
                {selectedDocument.status === 'rejected' && selectedDocument.rejectionReason && (
                  <span className="text-red-600">Rejection Reason: {selectedDocument.rejectionReason}</span>
                )}
              </div>
              <div className="flex gap-2">
                {selectedDocument.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleVerifyDocument(selectedDocument.documentId);
                        setSelectedDocument(null);
                      }}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocId(selectedDocument.documentId);
                        setSelectedDocument(null);
                        setShowRejectModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Document</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejection. The partner will need to re-upload the document.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (fieldErrors.rejectReason) {
                    setFieldErrors(prev => ({ ...prev, rejectReason: '' }));
                  }
                }}
                placeholder="e.g., Image is not clear, Document is expired, Wrong document type..."
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                  fieldErrors.rejectReason ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-red-500'
                }`}
                rows={3}
              />
              {fieldErrors.rejectReason && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.rejectReason}</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setFieldErrors({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDocument}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default KYCDetail;