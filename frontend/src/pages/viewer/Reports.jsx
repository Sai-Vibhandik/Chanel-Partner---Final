import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import Pagination from '../../components/common/Pagination';

const Reports = () => {
  const config = sidebarConfig.viewer;
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [partnerData, setPartnerData] = useState(null);
  const [visitData, setVisitData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Set active tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'partners', 'visits'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchAllData();
  }, [page, itemsPerPage]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [overviewRes, partnersRes, visitsRes, commissionsRes] = await Promise.all([
        api.get('/properties/stats').catch(() => ({ data: { data: {} } })),
        api.get(`/partner-company/reports/performance?page=${page}&limit=${itemsPerPage}`).catch(() => ({ data: { data: { partners: [], summary: {}, pagination: null } } })),
        api.get('/visits/stats').catch(() => ({ data: { data: {} } })),
        api.get('/commissions/stats').catch(() => ({ data: { data: {} } }))
      ]);

      setOverviewData(overviewRes.data?.data || {});
      setPartnerData(partnersRes.data?.data || { partners: [], summary: {}, pagination: null });
      setVisitData(visitsRes.data?.data || {});
      setCommissionData(commissionsRes.data?.data || {});
    } catch (error) {
      console.error('Error fetching viewer reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Property type labels mapping
  const propertyTypeLabels = {
    apartment: 'Apartment',
    villa: 'Villa',
    plot: 'Plot/Land',
    commercial: 'Commercial',
    office: 'Office Space',
    retail: 'Retail',
    warehouse: 'Warehouse',
    land: 'Land'
  };

  // Format tier to title case
  const formatTier = (tier) => {
    if (!tier) return 'Bronze';
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  };

  // Get tier styles
  const getTierStyles = (tier) => {
    const styles = {
      platinum: 'bg-purple-100 text-purple-700',
      gold: 'bg-amber-100 text-amber-700',
      silver: 'bg-gray-200 text-gray-700',
      bronze: 'bg-orange-100 text-orange-700'
    };
    return styles[tier] || styles.bronze;
  };

  // Overview Tab Component
  const OverviewTab = () => {
    const propertyStats = overviewData || {};
    const visitStats = visitData || {};
    const commissionStats = commissionData || {};

    // Get all active currencies
    const activeCurrencies = commissionStats.activeCurrencies || ['INR'];
    const statusCountsByCurrency = commissionStats.statusCountsByCurrency || {};

    // Get currency stats for all currencies
    const getCurrencyStats = (currency) => {
      return statusCountsByCurrency[currency] || {
        pending: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 }
      };
    };

    // Calculate total commission count
    const totalCommissionCount = commissionStats.overview?.total || 0;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{propertyStats.overview?.total || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">{propertyStats.overview?.active || 0} active</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{visitStats.total || 0}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">{visitStats.statusCounts?.completed || visitStats.completed || 0} completed</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Commission Volume</p>
                <div className="mt-1">
                  {activeCurrencies.map(currency => {
                    const stats = getCurrencyStats(currency);
                    const total = (stats.pending?.amount || 0) + (stats.approved?.amount || 0) + (stats.paid?.amount || 0);
                    return (
                      <p key={currency} className="text-lg font-bold text-gray-900">{formatCurrency(total, currency)}</p>
                    );
                  })}
                </div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{totalCommissionCount} transactions</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Partners</p>
                <p className="text-2xl font-bold text-gray-900">{partnerData.summary?.totalPartners || partnerData.partners?.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Across all tiers</p>
          </div>
        </div>

        {/* Property Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{propertyStats.overview?.active || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-500">Draft</p>
              <p className="text-2xl font-bold text-gray-600">{propertyStats.overview?.draft || 0}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="text-sm text-gray-500">Sold Out</p>
              <p className="text-2xl font-bold text-red-600">{propertyStats.overview?.soldOut || 0}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <p className="text-sm text-gray-500">Off Market</p>
              <p className="text-2xl font-bold text-yellow-600">{propertyStats.overview?.offMarket || 0}</p>
            </div>
          </div>
        </div>

        {/* Property Types */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Properties by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(propertyTypeLabels)
              .filter(([type]) => (propertyStats.byType?.[type] || 0) > 0 || Object.keys(propertyStats.byType || {}).includes(type))
              .map(([type, label]) => (
                <div key={type} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{propertyStats.byType?.[type] || 0}</p>
                </div>
              ))}
            {Object.keys(propertyStats.byType || {}).filter(type => !propertyTypeLabels[type]).length > 0 && (
              Object.entries(propertyStats.byType || {})
                .filter(([type]) => !propertyTypeLabels[type])
                .map(([type, count]) => (
                  <div key={type} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 capitalize">{type.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                ))
            )}
          </div>
          {Object.keys(propertyStats.byType || {}).length === 0 && (
            <p className="text-center text-gray-500 py-4">No properties found</p>
          )}
        </div>

        {/* Commission Status by Currency */}
        {activeCurrencies.map(currency => {
          const currencyStats = getCurrencyStats(currency);
          return (
            <div key={currency} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Status ({currency})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(currencyStats.pending?.amount || 0, currency)}</p>
                  <p className="text-xs text-gray-400">{currencyStats.pending?.count || 0} records</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(currencyStats.approved?.amount || 0, currency)}</p>
                  <p className="text-xs text-gray-400">{currencyStats.approved?.count || 0} records</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-gray-500">Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(currencyStats.paid?.amount || 0, currency)}</p>
                  <p className="text-xs text-gray-400">{currencyStats.paid?.count || 0} records</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm text-gray-500">Cancelled</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(currencyStats.cancelled?.amount || 0, currency)}</p>
                  <p className="text-xs text-gray-400">{currencyStats.cancelled?.count || 0} records</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Partners Tab Component
  const PartnersTab = () => {
    const partners = partnerData?.partners || [];
    const pagination = partnerData?.pagination;

    // Get all active currencies from partnerData
    const activeCurrencies = partnerData?.activeCurrencies || ['INR'];
    const summaryByCurrency = partnerData?.summaryByCurrency || {};

    return (
      <div className="space-y-6">
        {/* Partner Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Partners</p>
            <p className="text-2xl font-bold text-gray-900">{partnerData?.summary?.totalPartners || partners.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Commissions</p>
            <div className="mt-1">
              {activeCurrencies.map(currency => {
                const currencyData = summaryByCurrency[currency] || { totalAmount: 0 };
                return (
                  <p key={currency} className="text-lg font-bold text-gray-900">
                    {formatCurrency(currencyData.totalAmount || 0, currency)}
                  </p>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Avg Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{partnerData?.summary?.avgConversionRate?.toFixed(1) || 0}%</p>
          </div>
        </div>

        {/* Tier Distribution */}
        {partnerData?.tierBreakdown && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Partners by Tier</h3>
            <div className="grid grid-cols-4 gap-4">
              {['bronze', 'silver', 'gold', 'platinum'].map((tier) => (
                <div key={tier} className="text-center p-4 rounded-lg bg-gray-50">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierStyles(tier)}`}>
                    {formatTier(tier)}
                  </span>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{partnerData.tierBreakdown[tier] || 0}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Partners Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Partner Performance</h3>
            <p className="text-sm text-gray-500">Top partners by activity (View only)</p>
          </div>
          {partners.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No partner data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Visits</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((partner, index) => {
                    // Get all currencies from partner's commissionsByCurrency or use default
                    const partnerCurrencies = partner.commissionsByCurrency
                      ? Object.keys(partner.commissionsByCurrency)
                      : activeCurrencies;

                    return (
                      <tr key={partner.partnershipId || partner.partnerId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{partner.partnerName || partner.name}</p>
                            <p className="text-sm text-gray-500">{partner.partnerEmail || partner.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierStyles(partner.tier)}`}>
                            {formatTier(partner.tier)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">{partner.totalVisits || 0}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{partner.completedVisits || 0}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {partnerCurrencies.map(currency => {
                            const amount = partner.commissionsByCurrency?.[currency]?.total || 0;
                            return (
                              <div key={currency} className="text-sm">
                                {formatCurrency(amount, currency)}
                              </div>
                            );
                          })}
                          {partnerCurrencies.length === 0 && formatCurrency(partner.totalCommissions || 0, activeCurrencies[0] || 'INR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              total={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setPage(1); }}
            />
          )}
        </div>
      </div>
    );
  };

  // Visits Tab Component
  const VisitsTab = () => {
    const statusCounts = visitData?.statusCounts || {};
    const byType = visitData?.byType || {};

    return (
      <div className="space-y-6">
        {/* Visit Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Visits</p>
            <p className="text-2xl font-bold text-gray-900">{visitData?.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{statusCounts.completed || visitData?.completed || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{statusCounts.pending || visitData?.pendingApprovals || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-blue-600">{statusCounts.approved || visitData?.approved || 0}</p>
          </div>
        </div>

        {/* Visits by Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visits by Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { status: 'pending', label: 'Pending', color: 'amber' },
              { status: 'approved', label: 'Approved', color: 'blue' },
              { status: 'completed', label: 'Completed', color: 'green' },
              { status: 'cancelled', label: 'Cancelled', color: 'red' },
              { status: 'rejected', label: 'Rejected', color: 'purple' }
            ].map((item) => (
              <div key={item.status} className={`p-4 rounded-lg bg-${item.color}-50 border border-${item.color}-100`}>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className={`text-2xl font-bold text-${item.color}-600`}>{statusCounts[item.status] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Visits by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visits by Type</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-sm text-gray-500">Office Visits</p>
              <p className="text-2xl font-bold text-blue-600">{byType?.office || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-sm text-gray-500">Virtual Visits</p>
              <p className="text-2xl font-bold text-purple-600">{(byType?.virtual || 0) + (byType?.virtual_meet || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Reports" subtitle="View-only analytics and reports" color={config.color}>
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleTabChange('overview')}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'overview'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => { handleTabChange('partners'); setPage(1); }}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'partners'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Partners
          </button>
          <button
            onClick={() => handleTabChange('visits')}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'visits'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Visits
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'partners' && <PartnersTab />}
          {activeTab === 'visits' && <VisitsTab />}
        </>
      )}
    </DashboardLayout>
  );
};

export default Reports;