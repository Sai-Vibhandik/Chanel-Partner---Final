import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import ExportButton from '../../components/common/ExportButton';
import { formatCurrencyExport, formatDateExport } from '../../utils/export';

const Commissions = () => {
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.finance_manager;
  // All roles use the same path since routes are under /finance-manager
  const basePath = '/finance-manager/commissions';
  const navigate = useNavigate();

  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeCurrencies, setActiveCurrencies] = useState(['INR']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0
  });
  const itemsPerPage = 10;

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
  }, [statusFilter, currentPage]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/commissions?${params.toString()}`);
      setCommissions(response.data.data.commissions || []);
      setPagination(response.data.data.pagination || { total: 0, page: 1, pages: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
      setSuccess('Commission approved successfully');
      fetchCommissions();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve commission');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();

    // Payment reference is required for non-cash payment methods
    if (payForm.paymentMethod !== 'cash' && !payForm.paymentReference) {
      setError('Payment reference is required for this payment method');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/commissions/${selectedCommission._id}/pay`, payForm);
      setSuccess('Commission marked as paid successfully');
      setShowPayModal(false);
      setPayForm({ paymentReference: '', paymentMethod: 'bank_transfer', notes: '' });
      setSelectedCommission(null);
      fetchCommissions();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as paid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason) {
      setError('Cancellation reason is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/commissions/${selectedCommission._id}/cancel`, { reason: cancelReason });
      setSuccess('Commission cancelled');
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedCommission(null);
      fetchCommissions();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel commission');
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
    { key: 'partner.email', header: 'Partner Email' },
    { key: 'property.name', header: 'Property Name' },
    { key: 'saleDetails.salePrice', header: 'Sale Price' },
    { key: 'commission.calculatedAmount', header: 'Commission Amount' },
    { key: 'commission.effectivePercentage', header: 'Commission Rate (%)' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Created Date' }
  ];

  const formatCurrency = (amount, currency = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : 'AED ';
    if (amount >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(2)} Lac`;
    }
    return `${symbol}${amount?.toLocaleString() || '0'}`;
  };

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
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
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
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
                {commissions.map((commission) => (
                  <tr key={commission._id} className="hover:bg-gray-50">
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
        {pagination.pages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            total={pagination.total}
            onPageChange={handlePageChange}
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
                  onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })}
                  placeholder={payForm.paymentMethod === 'cash' ? 'Optional - e.g., Receipt Number' : 'Transaction ID / Cheque Number'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required={payForm.paymentMethod !== 'cash'}
                />
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
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Please provide a reason for cancellation..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
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