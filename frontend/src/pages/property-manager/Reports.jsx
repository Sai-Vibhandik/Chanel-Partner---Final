import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';

const Reports = () => {
  const config = sidebarConfig.property_manager;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('performance');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [period, setPeriod] = useState('month');
  const [sortBy, setSortBy] = useState('totalVisits');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceReport();
    } else {
      fetchAnalytics();
    }
  }, [activeTab, period, sortBy, sortOrder, page, itemsPerPage]);

  const fetchPerformanceReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page);
      params.append('limit', itemsPerPage);

      const response = await api.get(`/properties/reports/performance?${params.toString()}`);
      setPerformanceData(response.data?.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('period', period);

      const response = await api.get(`/properties/reports/visit-analytics?${params.toString()}`);
      setAnalyticsData(response.data?.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      params.append('period', period);

      const response = await api.get(`/properties/reports/export?${params.toString()}`);
      const { report } = response.data?.data;

      // Convert to CSV with proper formatting
      if (report && report.length > 0) {
        // Define column order and readable header names
        const columns = [
          { key: 'name', label: 'Property Name' },
          { key: 'type', label: 'Property Type' },
          { key: 'status', label: 'Status' },
          { key: 'city', label: 'City' },
          { key: 'totalViews', label: 'Total Views' },
          { key: 'totalVisits', label: 'Total Visits' },
          { key: 'completed', label: 'Completed Visits' }
        ];

        // Function to escape CSV value properly
        const escapeCSVValue = (value) => {
          if (value === null || value === undefined || value === '') {
            return '';
          }
          // Convert to string and clean up
          let stringValue = String(value).trim();
          // Remove any line breaks
          stringValue = stringValue.replace(/[\r\n]+/g, ' ');
          // Escape double quotes by doubling them
          stringValue = stringValue.replace(/"/g, '""');
          // Wrap in quotes if contains comma, quote, or newline
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue}"`;
          }
          return `"${stringValue}"`;
        };

        // Build CSV content with CRLF line endings (Windows compatible)
        const headerRow = columns.map(col => `"${col.label}"`).join(',');
        const dataRows = report.map(row =>
          columns.map(col => escapeCSVValue(row[col.key])).join(',')
        );

        // Use CRLF for Windows Excel compatibility
        const csvContent = [headerRow, ...dataRows].join('\r\n');

        // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8-sig;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `property-report-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setPeriod('month');
    setSortBy('totalVisits');
    setSortOrder('desc');
    setPage(1);
  };

  // Property Performance Report Component
  const PerformanceReport = () => {
    if (!performanceData) return null;

    const { summary, properties, pagination } = performanceData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Properties</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalProperties}</p>
            <p className="text-xs text-gray-400 mt-1">In portfolio</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Visits</p>
            <p className="text-2xl font-bold text-blue-600">{summary.totalVisits}</p>
            <p className="text-xs text-gray-400 mt-1">Scheduled visits</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Views</p>
            <p className="text-2xl font-bold text-green-600">{summary.totalViews}</p>
            <p className="text-xs text-gray-400 mt-1">Property views</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Avg Visits/Property</p>
            <p className="text-2xl font-bold text-purple-600">{summary.avgVisitsPerProperty}</p>
            <p className="text-xs text-gray-400 mt-1">Average visits</p>
          </div>
        </div>

        {/* Property Performance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Property Performance</h3>
              <p className="text-sm text-gray-500">Click on a property to view details</p>
            </div>
            <button
              onClick={exportReport}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {exportLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export CSV
            </button>
          </div>
          {properties.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No properties found for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Visits</th>
                    {/* <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved</th> */}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                    {/* <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancelled</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {properties.map((property, index) => (
                    <tr
                      key={property._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/property-manager/properties/${property._id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {(page - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{property.name}</p>
                          <p className="text-sm text-gray-500">{property.city}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {property.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          property.status === 'active' ? 'bg-green-100 text-green-700' :
                          property.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          property.status === 'sold_out' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {property.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">{property.totalViews}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{property.totalVisits}</td>
                      {/* <td className="px-4 py-3 text-right">
                        <span className="text-amber-600">{property.pending}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-blue-600">{property.approved}</span>
                      </td> */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-600">{property.completed}</span>
                      </td>
                      {/* <td className="px-4 py-3 text-right">
                        <span className="text-red-600">{property.cancelled}</span>
                      </td> */}
                    </tr>
                  ))}
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

  // Visit Analytics Component
  const VisitAnalytics = () => {
    if (!analyticsData) return null;

    const { visitTrends, visitsByStatus, visitsByPropertyType, topProperties } = analyticsData;

    // Calculate max for chart scaling
    const maxTrendValue = Math.max(...visitTrends.map(t => t.total), 1);
    const maxTypeValue = Math.max(...Object.values(visitsByPropertyType), 1);

    // Generate Y-axis labels based on max value
    const generateYAxisLabels = (maxValue) => {
      const labels = [];
      const step = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
      const numSteps = Math.ceil(maxValue / step);
      for (let i = numSteps; i >= 0; i--) {
        labels.push(i * step);
      }
      return labels;
    };

    const yAxisLabels = generateYAxisLabels(maxTrendValue);
    const chartMaxValue = yAxisLabels[0]; // The top value (max for scaling)

    // Format date label based on format (daily vs monthly)
    const formatDateLabel = (dateStr) => {
      if (dateStr.includes('-') && dateStr.length === 7) {
        // Monthly format (YYYY-MM)
        const [year, month] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      }
      // Daily format (YYYY-MM-DD)
      return dateStr;
    };

    // Property type colors
    const typeColors = {
      apartment: '#3B82F6',
      villa: '#10B981',
      plot: '#F59E0B',
      commercial: '#8B5CF6',
      office: '#EC4899',
      retail: '#06B6D4',
      warehouse: '#6366F1',
      land: '#84CC16'
    };

    return (
      <div className="space-y-6">
        {/* Visit Trends Over Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Trends Over Time</h3>
          {visitTrends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No visit data available for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="h-64 flex">
                  {/* Y-axis labels */}
                  <div className="w-10 flex flex-col justify-between py-0 text-xs text-gray-500 text-right pr-2">
                    {yAxisLabels.map((label, index) => (
                      <span key={index}>{label}</span>
                    ))}
                  </div>
                  {/* Chart area */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex items-end gap-2 border-l border-b border-gray-200 relative" style={{ minHeight: '200px' }}>
                      {/* Horizontal grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {yAxisLabels.map((_, index) => (
                          <div key={index} className="border-b border-gray-100 w-full"></div>
                        ))}
                      </div>
                      {/* Bars */}
                      {visitTrends.map((trend, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full relative min-w-[30px]">
                          <div
                            className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer relative group"
                            style={{ height: `${(trend.total / chartMaxValue) * 100}%`, minHeight: trend.total > 0 ? '4px' : '0', maxWidth: '50px' }}
                            title={`${formatDateLabel(trend._id)}: ${trend.total} visits`}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {formatDateLabel(trend._id)}: {trend.total} visits
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* X-axis labels - show all dates below respective bars */}
                    <div className="flex text-xs text-gray-500 mt-2">
                      {visitTrends.map((trend, index) => (
                        <div key={index} className="flex-1 text-center min-w-[30px]">
                          <span className="truncate">{formatDateLabel(trend._id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visits by Property Type - Horizontal Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visits by Property Type</h3>
          {Object.keys(visitsByPropertyType).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No visit data available
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(visitsByPropertyType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600 capitalize flex-shrink-0">{type}</div>
                    <div className="flex-1 relative">
                      <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-3"
                          style={{
                            width: `${maxTypeValue > 0 ? (count / maxTypeValue) * 100 : 0}%`,
                            backgroundColor: typeColors[type] || '#6B7280',
                            minWidth: count > 0 ? '60px' : '0'
                          }}
                        >
                          {count > 0 && (
                            <span className="text-white text-sm font-medium">{count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-medium text-gray-900 flex-shrink-0">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top Performing Properties */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Properties</h3>
            <p className="text-sm text-gray-500">Properties with most visits in the selected period</p>
          </div>
          {topProperties.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No property data available for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topProperties.map((property, index) => (
                    <tr key={property._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{property.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {property.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{property.totalVisits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Reports" subtitle="Property performance and visit analytics" color={config.color}>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Period</label>
            <select
              value={period}
              onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          {/* {activeTab === 'performance' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              >
                <option value="totalVisits">Total Visits</option>
                <option value="totalViews">Total Views</option>
                <option value="name">Property Name</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          )} */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'performance'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Property Performance
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'analytics'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Visit Analytics
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'performance' && <PerformanceReport />}
          {activeTab === 'analytics' && <VisitAnalytics />}
        </>
      )}
    </DashboardLayout>
  );
};

export default Reports;