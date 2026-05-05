import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const PartnerVisitDetails = () => {
  const { id } = useParams();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Deal closed modal state
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealData, setDealData] = useState({
    salePrice: '',
    saleDate: '',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    notes: ''
  });
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchVisit();
  }, [id]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/visits/${id}`);
      setVisit(response.data.data.visit);
      // Pre-fill buyer details from client details
      if (response.data.data.visit.clientDetails) {
        setDealData(prev => ({
          ...prev,
          buyerName: response.data.data.visit.clientDetails.name || '',
          buyerPhone: response.data.data.visit.clientDetails.phone || '',
          buyerEmail: response.data.data.visit.clientDetails.email || ''
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this visit?')) return;

    try {
      await api.put(`/visits/${id}/cancel`, { reason: 'Cancelled by partner' });
      setSuccess('Visit cancelled successfully');
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel visit');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'commission-documents');

        const response = await api.post('/upload/document', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        uploadedDocs.push({
          type: 'other', // Default type, can be changed by user
          name: file.name,
          url: response.data.data.url,
          publicId: response.data.data.publicId
        });
      }
      setDocuments(prev => [...prev, ...uploadedDocs]);
      setSuccess(`${files.length} file(s) uploaded successfully`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentTypeChange = (index, type) => {
    const updatedDocs = [...documents];
    updatedDocs[index].type = type;
    setDocuments(updatedDocs);
  };

  const handleRemoveDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarkDealClosed = async () => {
    if (!dealData.salePrice || !dealData.buyerName || !dealData.buyerPhone) {
      setError('Sale price, buyer name, and buyer phone are required');
      return;
    }

    try {
      setProcessing(true);
      const response = await api.put(`/visits/${id}/deal-closed/partner`, {
        salePrice: parseFloat(dealData.salePrice),
        saleDate: dealData.saleDate || new Date(),
        buyerName: dealData.buyerName,
        buyerPhone: dealData.buyerPhone,
        buyerEmail: dealData.buyerEmail,
        notes: dealData.notes,
        documents: documents
      });

      setSuccess('Deal marked as closed! Commission entry created and sent for Legal review.');
      setShowDealModal(false);
      fetchVisit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark deal as closed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      deal_closed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getVisitTypeBadge = (type) => {
    const styles = {
      site: 'bg-purple-100 text-purple-800',
      office: 'bg-blue-100 text-blue-800',
      virtual: 'bg-teal-100 text-teal-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount, currency = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : 'AED ';
    if (amount >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(2)} Lac`;
    }
    return `${symbol}${amount?.toLocaleString() || '0'}`;
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !visit) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Error" color={config.color}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
        <button
          onClick={() => navigate('/partner/visits')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Visits
        </button>
      </DashboardLayout>
    );
  }

  if (!visit) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle="Not Found" color={config.color}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
          Visit not found
        </div>
        <button
          onClick={() => navigate('/partner/visits')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Visits
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Visit Details" subtitle={`Visit #${visit._id.slice(-6).toUpperCase()}`} color={config.color}>
      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/partner/visits')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Visits
      </button>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(visit.status)}`}>
              {visit.status === 'deal_closed' ? 'Deal Closed' : visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getVisitTypeBadge(visit.visitType)}`}>
              {visit.visitType} Visit
            </span>
          </div>
          <div className="flex gap-2">
            {['pending', 'approved'].includes(visit.status) && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Cancel Visit
              </button>
            )}
            {['completed', 'approved'].includes(visit.status) && (
              <button
                onClick={() => setShowDealModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark Deal Closed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deal Details (if deal_closed) */}
      {visit.status === 'deal_closed' && visit.dealDetails && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Deal Closed Successfully
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-purple-600">Sale Price</span>
              <p className="text-xl font-bold text-purple-900">
                {formatCurrency(visit.dealDetails.salePrice, visit.property?.pricing?.currency)}
              </p>
            </div>
            <div>
              <span className="text-sm text-purple-600">Sale Date</span>
              <p className="text-lg font-medium text-purple-900">
                {new Date(visit.dealDetails.saleDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-sm text-purple-600">Buyer</span>
              <p className="text-lg font-medium text-purple-900">{visit.dealDetails.buyerName}</p>
            </div>
            <div>
              <span className="text-sm text-purple-600">Commission Status</span>
              <p className="text-lg font-medium text-purple-900">
                {visit.dealDetails.commissionId ? 'Pending Legal Review' : 'Processing...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">
                {new Date(visit.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-medium">{visit.scheduledTime}</span>
            </div>
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.property?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium capitalize">{visit.property?.type || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="font-medium">
                {visit.property?.location?.city}, {visit.property?.location?.state || visit.property?.location?.emirate}
              </span>
            </div>
            {visit.property?.pricing && (
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span className="font-medium">{formatCurrency(visit.property.pricing.minPrice, visit.property.pricing.currency)}</span>
              </div>
            )}
          </div>
          {visit.property?._id && (
            <button
              onClick={() => navigate(`/partner/properties/${visit.property._id}`)}
              className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              View Property
            </button>
          )}
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.clientDetails?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{visit.clientDetails?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{visit.clientDetails?.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{visit.companyId?.name || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(visit.partnerNotes || visit.adminNotes || visit.rejectionReason || visit.cancellationReason) && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          {visit.partnerNotes && (
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Your Notes:</span>
              <p className="mt-1 text-gray-900">{visit.partnerNotes}</p>
            </div>
          )}
          {visit.adminNotes && (
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Admin Notes:</span>
              <p className="mt-1 text-gray-900">{visit.adminNotes}</p>
            </div>
          )}
          {visit.rejectionReason && (
            <div className="mb-3">
              <span className="text-red-500 text-sm">Rejection Reason:</span>
              <p className="mt-1 text-red-700">{visit.rejectionReason}</p>
            </div>
          )}
          {visit.cancellationReason && (
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Cancellation Reason:</span>
              <p className="mt-1 text-gray-900">{visit.cancellationReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Deal Closed Modal */}
      {showDealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mark Deal as Closed</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the sale details and upload supporting documents. This will create a commission entry that will be reviewed by Legal Manager.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={dealData.salePrice}
                    onChange={(e) => setDealData({ ...dealData, salePrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter sale price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                  <input
                    type="date"
                    value={dealData.saleDate}
                    onChange={(e) => setDealData({ ...dealData, saleDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dealData.buyerName}
                    onChange={(e) => setDealData({ ...dealData, buyerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter buyer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={dealData.buyerPhone}
                    onChange={(e) => setDealData({ ...dealData, buyerPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter buyer phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Email</label>
                <input
                  type="email"
                  value={dealData.buyerEmail}
                  onChange={(e) => setDealData({ ...dealData, buyerEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter buyer email (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={dealData.notes}
                  onChange={(e) => setDealData({ ...dealData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Document Upload Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Supporting Documents</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Upload sale agreement, property documents, buyer ID proof, etc. These will be reviewed by the Legal Manager.
                </p>

                {/* Upload Button */}
                <div className="mb-4">
                  <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    <div className="text-center">
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-500">Click to upload documents</p>
                          <p className="text-xs text-gray-400">PDF, JPG, PNG up to 5MB</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Uploaded Documents List */}
                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-indigo-100 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <select
                              value={doc.type}
                              onChange={(e) => handleDocumentTypeChange(index, e.target.value)}
                              className="text-xs border-gray-300 rounded px-2 py-1 mt-1"
                            >
                              <option value="sale_agreement">Sale Agreement</option>
                              <option value="property_document">Property Document</option>
                              <option value="buyer_id_proof">Buyer ID Proof</option>
                              <option value="buyer_address_proof">Buyer Address Proof</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDocument(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowDealModal(false); setDocuments([]); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDealClosed}
                disabled={processing || uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Mark Deal Closed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PartnerVisitDetails;