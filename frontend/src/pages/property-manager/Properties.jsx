import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { sidebarConfig } from '../../config/sidebar';
import ExportButton from '../../components/common/ExportButton';
import useDebounce from '../../hooks/useDebounce';
import { formatCurrency } from '../../utils/currency';
import { formatCurrencyExport } from '../../utils/export';

const Properties = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Debounce search for real-time filtering
  const debouncedSearch = useDebounce(search, 300);

  const config = sidebarConfig[user?.role] || sidebarConfig.property_manager;
  const basePath = user?.role === 'company_superadmin' ? '/company/properties' : '/property-manager/properties';

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot/Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'office', label: 'Office Space' },
    { value: 'retail', label: 'Retail' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'land', label: 'Land' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'sold_out', label: 'Sold Out', color: 'bg-red-100 text-red-800' },
    { value: 'off_market', label: 'Off Market', color: 'bg-yellow-100 text-yellow-800' }
  ];

  // Export columns configuration
  const exportColumns = [
    { key: 'name', header: 'Property Name' },
    { key: 'type', header: 'Type' },
    { key: 'location.city', header: 'City' },
    { key: 'location.state', header: 'State/Region' },
    {
      key: 'pricing.basePrice',
      header: 'Price',
      format: (item) => item.pricing?.priceOnRequest ? 'Price on Request' : formatCurrencyExport(item.pricing?.basePrice, item.pricing?.currency)
    },
    { key: 'details.bedrooms', header: 'Bedrooms' },
    { key: 'details.bathrooms', header: 'Bathrooms' },
    { key: 'details.builtUpArea', header: 'Area' },
    { key: 'region', header: 'Region' },
    { key: 'status', header: 'Status' }
  ];

  useEffect(() => {
    fetchProperties();
    fetchStats();
    fetchLimits();
  }, [debouncedSearch, statusFilter, typeFilter, regionFilter]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (regionFilter) params.append('region', regionFilter);

      const response = await api.get(`/properties?${params.toString()}`);
      setProperties(response.data.data.properties);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/properties/stats');
      setStats(response.data.data);
    } catch (err) {
      // Failed to load stats
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await api.get('/companies/my-limits');
      setLimits(response.data.data);
    } catch (err) {
      // Failed to load limits
    }
  };

  // Check if user can add more properties
  const canAddProperty = () => {
    if (!limits) return true; // Allow if limits not loaded yet
    if (!limits.subscription?.isActive) return false;
    if (limits.limits?.properties?.limit === 'unlimited' || limits.limits?.properties?.limit === -1) return true;
    const used = limits.limits?.properties?.used || 0;
    const limit = limits.limits?.properties?.limit || 0;
    return used < limit;
  };

  const getLimitMessage = () => {
    if (!limits) return null;
    if (!limits.subscription?.isActive) {
      return {
        type: 'error',
        title: 'Subscription Inactive',
        message: 'Your subscription is not active. Please renew to add more properties.',
        action: { label: 'View Plans', path: '/company/subscription' }
      };
    }
    if (!canAddProperty()) {
      return {
        type: 'warning',
        title: 'Property Limit Reached',
        message: `You've reached your plan limit of ${limits.limits?.properties?.limit} properties. Upgrade your plan to add more.`,
        action: { label: 'Upgrade Plan', path: '/company/subscription' }
      };
    }
    return null;
  };

  const handleAddProperty = () => {
    if (!canAddProperty()) {
      return; // Should not happen if button is disabled
    }
    navigate(`${basePath}/new?fresh=true`);
  };

  const formatPrice = (property) => {
    if (property.pricing?.priceOnRequest) {
      return 'Price on Request';
    }
    return formatCurrency(property.pricing?.basePrice || 0, property.pricing?.currency || 'INR');
  };

  const getStatusBadge = (status) => {
    const option = statusOptions.find(o => o.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const filteredProperties = properties.filter(p => {
    if (!search) return true;
    return (
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.address?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const limitMessage = getLimitMessage();

  return (
    <DashboardLayout sidebarLinks={config.links} title="Properties" subtitle="Manage your properties" color={config.color}>
      {/* Limit Warning */}
      {limitMessage && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg ${
          limitMessage.type === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h4 className={`font-medium ${
                limitMessage.type === 'error' ? 'text-red-800' : 'text-amber-800'
              }`}>
                {limitMessage.title}
              </h4>
              <p className={`text-sm ${
                limitMessage.type === 'error' ? 'text-red-700' : 'text-amber-700'
              }`}>
                {limitMessage.message}
              </p>
            </div>
            {limitMessage.action && (
              <button
                onClick={() => navigate(limitMessage.action.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  limitMessage.type === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {limitMessage.action.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-500">Total Properties</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.overview.total}</p>
            {limits?.limits?.properties && limits.limits.properties.limit !== 'unlimited' && limits.limits.properties.limit !== -1 && (
              <p className="text-xs text-gray-500 mt-1">
                of {limits.limits.properties.limit} allowed
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-500">Active</p>
            <p className="text-xl sm:text-3xl font-bold text-green-600 mt-1">{stats.overview.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-500">Draft</p>
            <p className="text-xl sm:text-3xl font-bold text-yellow-600 mt-1">{stats.overview.draft}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-500">Sold Out</p>
            <p className="text-xl sm:text-3xl font-bold text-red-600 mt-1">{stats.overview.soldOut}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search properties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 pl-10 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={handleAddProperty}
              disabled={!canAddProperty()}
              className={`px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm whitespace-nowrap ${
                canAddProperty()
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!canAddProperty() ? 'Property limit reached or subscription inactive' : ''}
            >
              + Add Property
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
            >
              <option value="">All Status</option>
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
            >
              <option value="">All Types</option>
              {propertyTypes.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
            >
              <option value="">All Regions</option>
              <option value="india">India</option>
              <option value="dubai">Dubai</option>
            </select>
            {(statusFilter || typeFilter || regionFilter || search) && (
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter(''); setRegionFilter(''); setSearch(''); }}
                className="px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
            <ExportButton
              data={filteredProperties}
              columns={exportColumns}
              filename="properties"
              title="Properties List"
            />
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-48 sm:min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 mb-2">No properties found</p>
          <p className="text-sm text-gray-400 mb-4">Add your first property to get started</p>
          <button
            onClick={handleAddProperty}
            disabled={!canAddProperty()}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm ${
              canAddProperty()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Add Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProperties.map((property) => (
            <div
              key={property._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Property Image */}
              <div className="h-40 sm:h-48 bg-gradient-to-br from-green-400 to-teal-500 relative">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images.find(img => img.isPrimary)?.url || property.images[0].url}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
                {/* Status Badge */}
                <span className={`absolute top-2 sm:top-3 left-2 sm:left-3 px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(property.status)}`}>
                  {statusOptions.find(s => s.value === property.status)?.label || property.status}
                </span>
                {/* Region Badge */}
                <span className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-90">
                  {property.region === 'india' ? 'IN' : 'AE'}
                </span>
              </div>

              {/* Property Info */}
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{property.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{property.location?.city}, {property.location?.state || property.location?.emirate}</span>
                </p>

                {/* Details */}
                <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                  {property.details?.bedrooms && (
                    <span>{property.details.bedrooms} Bed</span>
                  )}
                  {property.details?.bathrooms && (
                    <span>{property.details.bathrooms} Bath</span>
                  )}
                  {property.details?.builtUpArea && (
                    <span className="truncate">{property.details.builtUpArea} {property.details.areaUnit || 'sqft'}</span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-2 sm:mt-3 flex items-center justify-between">
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {formatPrice(property)}
                  </span>
                  <span className="text-xs text-gray-500 capitalize hidden sm:inline">
                    {propertyTypes.find(t => t.value === property.type)?.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-3 sm:mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`${basePath}/${property._id}`)}
                    className="flex-1 px-3 sm:px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 text-xs sm:text-sm font-medium"
                  >
                    View
                  </button>
                  {property.status === 'sold_out' ? (
                    <button
                      disabled
                      className="flex-1 px-3 sm:px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-xs sm:text-sm font-medium"
                      title="Sold out properties cannot be edited"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`${basePath}/${property._id}/edit`)}
                      className="flex-1 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Properties;