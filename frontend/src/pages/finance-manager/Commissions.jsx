import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import ExportButton from '../../components/common/ExportButton';
import { formatCurrencyExport, formatDateExport } from '../../utils/export';
import { formatCurrency } from '../../utils/currency';

const Commissions = () => {
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.finance_manager;

  // Get basePath based on role for consistent URLs
  const getBasePath = () => {
    switch (user?.role) {
      case 'company_superadmin':
        return '/company/commissions';
      case 'partner_manager':
        return '/partner-manager/commissions';
      default:
        return '/finance-manager/commissions';
    }
  };
  const basePath = getBasePath();

  const navigate = useNavigate();
  const toast = useToast();

  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeCurrencies, setActiveCurrencies] = useState(['INR']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [partners, setPartners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0
  });

  // Pay form state
  const [payForm, setPayForm] = useState({
    paymentReference: '',
    paymentMethod: 'bank_transfer',
    notes: ''
  });
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCommissions();
    fetchStats();
  }, [statusFilter, partnerFilter, propertyFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchPartners();
    fetchProperties();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await api.get(`/partner-company/company/${user.companyId}/partners?limit=100`);
      // Partnerships contain partnerId populated with partner details
      const partnershipData = response.data.data.partnerships || [];
      // Extract unique partners from partnerships
      const uniquePartners = [];
      const seenIds = new Set();
      partnershipData.forEach(partnership => {
        if (partnership.partnerId && !seenIds.has(partnership.partnerId._id)) {
          seenIds.add(partnership.partnerId._id);
          uniquePartners.push(partnership.partnerId);
        }
      });
      setPartners(uniquePartners);
    } catch (err) {
      console.error('Failed to load partners');
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties?limit=100');
      setProperties(response.data.data.properties || []);
    } catch (err) {
      console.error('Failed to load properties');
    }
  };

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (partnerFilter) params.append('partnerId', partnerFilter);
      if (propertyFilter) params.append('propertyId', propertyFilter);
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/commissions?${params.toString()}`);
      setCommissions(response.data.data.commissions || []);
      setPagination(response.data.data.pagination || { total: 0, page: 1, pages: 0 });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load commissions.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/commissions/stats');
      setStats(response.data.data);
      setActiveCurrencies(response.data.data.activeCurrencies || ['INR']);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const handleApprove = async (commissionId) => {
    if (!window.confirm('Are you sure you want to approve this commission?')) return;

    try {
      setSubmitting(true);
      await api.put(`/commissions/${commissionId}/approve`);
      toast.success('Commission approved successfully.');
      fetchCommissions();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve commission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();

    // Validate payment reference for non-cash payment methods
    const errors = {};
    if (payForm.paymentMethod !== 'cash' && !payForm.paymentReference.trim()) {
      errors.paymentReference = 'Payment reference is required for this payment method.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    try {
      await api.put(`/commissions/${selectedCommission._id}/pay`, payForm);
      toast.success('Commission marked as paid successfully.');
      setShowPayModal(false);
      setPayForm({ paymentReference: '', paymentMethod: 'bank_transfer', notes: '' });
      setSelectedCommission(null);
      fetchCommissions();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as paid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();

    // Validate cancellation reason
    const errors = {};
    if (!cancelReason.trim()) {
      errors.cancelReason = 'Cancellation reason is required.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    try {
      await api.put(`/commissions/${selectedCommission._id}/cancel`, { reason: cancelReason });
      toast.success('Commission cancelled successfully.');
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedCommission(null);
      fetchCommissions();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel commission.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending Approval',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return texts[status] || status;
  };

  // Export columns configuration
  const exportColumns = [
    { key: 'partner.firstName', header: 'Partner First Name' },
    { key: 'partner.lastName', header: 'Partner Last Name' },
    { key: 'partner.email', header: 'Partner Email ID' },
    { key: 'property.name', header: 'Property Name' },
    {
      key: 'saleDetails.salePrice',
      header: 'Sale Price',
      format: (item) => formatCurrencyExport(item.saleDetails?.salePrice, item.commission?.currency)
    },
    {
      key: 'commission.calculatedAmount',
      header: 'Commission Amount',
      format: (item) => formatCurrencyExport(item.commission?.calculatedAmount, item.commission?.currency)
    },
    { key: 'commission.effectivePercentage', header: 'Commission Rate (%)' },
    { key: 'status', header: 'Status' },
    {
      key: 'createdAt',
      header: 'Created Date',
      format: (item) => formatDateExport(item.createdAt)
    }
  ];

  const getCurrencyLabel = (currency) => {
    return currency === 'INR' ? '₹ (INR)' : 'AED';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && commissions.length === 0) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Commissions" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Commissions" subtitle="Manage partner commissions" color={config.color}>
      {/* Messages - only show when no modal is open */}
      {error && !showPayModal && !showCancelModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {success && !showPayModal && !showCancelModal && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats by Currency */}
      {activeCurrencies.map(currency => (
        <div key={currency} className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {getCurrencyLabel(currency)}
            <span className="text-sm font-normal text-gray-500">(Commissions in {currency === 'INR' ? 'Indian Rupees' : 'UAE Dirhams'})</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {commissions.filter(c => c.commission?.currency === currency).length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600 mt-1">
                {stats?.statusCountsByCurrency?.[currency]?.pending?.count || 0}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(stats?.statusCountsByCurrency?.[currency]?.pending?.amount || 0, currency)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {stats?.statusCountsByCurrency?.[currency]?.approved?.count || 0}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(stats?.statusCountsByCurrency?.[currency]?.approved?.amount || 0, currency)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-xl font-bold text-purple-600 mt-1">
                {stats?.statusCountsByCurrency?.[currency]?.paid?.count || 0}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(stats?.statusCountsByCurrency?.[currency]?.paid?.amount || 0, currency)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {formatCurrency(stats?.monthlyPaidByCurrency?.[currency]?.monthlyPaidAmount || 0, currency)}
              </p>
              <p className="text-sm text-gray-500">
                {stats?.monthlyPaidByCurrency?.[currency]?.monthlyPaidCount || 0} payouts
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={partnerFilter}
            onChange={(e) => { setPartnerFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Partners</option>
            {partners.map(partner => (
              <option key={partner._id} value={partner._id}>
                {partner.firstName} {partner.lastName}
              </option>
            ))}
          </select>
          <select
            value={propertyFilter}
            onChange={(e) => { setPropertyFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Properties</option>
            {properties.map(property => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
          {(statusFilter || partnerFilter || propertyFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setPartnerFilter(''); setPropertyFilter(''); setCurrentPage(1); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
          <ExportButton
            data={commissions}
            columns={exportColumns}
            filename="commissions"
            title="Commissions Report"
          />
        </div>
        <button
          onClick={() => navigate(`${basePath}/new`)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Create Commission
        </button>
      </div>

      {/* Commissions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {commissions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mb-4">No commissions found</p>
            <button
              onClick={() => navigate(`${basePath}/new`)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create First Commission
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.map((commission, index) => (
                  <tr key={commission._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">
                          {commission.partner?.firstName} {commission.partner?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{commission.partner?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{commission.property?.name}</p>
                        <p className="text-sm text-gray-500">
                          {commission.property?.location?.city}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium">
                        {formatCurrency(
                          commission.saleDetails?.salePrice,
                          commission.commission?.currency
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-green-600">
                          {formatCurrency(
                            commission.commission?.calculatedAmount,
                            commission.commission?.currency
                          )}
                        </span>
                        <p className="text-xs text-gray-500">
                          {commission.commission?.effectivePercentage}% · {commission.commission?.partnerTier}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(commission.status)}`}>
                        {getStatusText(commission.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(commission.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`${basePath}/${commission._id}`)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          View
                        </button>
                        {/* Approve/Cancel buttons only for finance_manager and company_superadmin */}
                        {commission.status === 'pending' && user?.role !== 'partner_manager' && (
                          <>
                            <button
                              onClick={() => handleApprove(commission._id)}
                              disabled={submitting}
                              className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setError('');
                                setFieldErrors({});
                                setSelectedCommission(commission);
                                setShowCancelModal(true);
                              }}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {/* Mark Paid button only for finance_manager and company_superadmin */}
                        {commission.status === 'approved' && user?.role !== 'partner_manager' && (
                          <button
                            onClick={() => {
                              setError('');
                              setFieldErrors({});
                              setSelectedCommission(commission);
                              setShowPayModal(true);
                            }}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            total={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      {/* Pay Modal */}
      {showPayModal && selectedCommission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Mark as Paid</h3>
              <button
                onClick={() => {
                  setError('');
                  setFieldErrors({});
                  setShowPayModal(false);
                  setSelectedCommission(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Commission Amount: <span className="font-bold text-green-600">
                    {formatCurrency(
                      selectedCommission.commission?.calculatedAmount,
                      selectedCommission.commission?.currency
                    )}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference {payForm.paymentMethod === 'cash' ? '(Optional)' : '*'}
                </label>
                <input
                  type="text"
                  value={payForm.paymentReference}
                  onChange={(e) => {
                    setPayForm({ ...payForm, paymentReference: e.target.value });
                    if (fieldErrors.paymentReference) {
                      setFieldErrors(prev => ({ ...prev, paymentReference: '' }));
                    }
                  }}
                  placeholder={payForm.paymentMethod === 'cash' ? 'Optional - e.g., Receipt Number' : 'Transaction ID / Cheque Number'}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    fieldErrors.paymentReference ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required={payForm.paymentMethod !== 'cash'}
                />
                {fieldErrors.paymentReference && (
                  <p className="text-sm text-red-600 mt-1">{fieldErrors.paymentReference}</p>
                )}
                {payForm.paymentMethod === 'cash' && (
                  <p className="text-xs text-gray-500 mt-1">Payment reference is optional for cash payments</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setFieldErrors({});
                    setShowPayModal(false);
                    setSelectedCommission(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedCommission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Commission</h3>
              <button
                onClick={() => {
                  setError('');
                  setFieldErrors({});
                  setShowCancelModal(false);
                  setSelectedCommission(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCancel} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Reason *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (fieldErrors.cancelReason) {
                      setFieldErrors(prev => ({ ...prev, cancelReason: '' }));
                    }
                  }}
                  rows={3}
                  placeholder="Please provide a reason for cancellation..."
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    fieldErrors.cancelReason ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
                {fieldErrors.cancelReason && (
                  <p className="text-sm text-red-600 mt-1">{fieldErrors.cancelReason}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setFieldErrors({});
                    setShowCancelModal(false);
                    setSelectedCommission(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Cancelling...' : 'Cancel Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Commissions;