import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import ExportButton from '../../components/common/ExportButton';
import useDebounce from '../../hooks/useDebounce';

const Properties = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activePartnerships, setActivePartnerships] = useState([]);
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Debounce search for real-time filtering
  const debouncedSearch = useDebounce(search, 300);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0
  });
  const itemsPerPage = 12;

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

  // Export columns configuration
  const exportColumns = [
    { key: 'name', header: 'Property Name' },
    { key: 'type', header: 'Type' },
    { key: 'location.city', header: 'City' },
    { key: 'location.state', header: 'State' },
    { key: 'pricing.basePrice', header: 'Price' },
    { key: 'details.bedrooms', header: 'Bedrooms' },
    { key: 'details.bathrooms', header: 'Bathrooms' },
    { key: 'details.builtUpArea', header: 'Area' },
    { key: 'region', header: 'Region' },
    { key: 'status', header: 'Status' }
  ];

  useEffect(() => {
    fetchPartnerships();
  }, []);

  // Handle partnership selection from URL params
  useEffect(() => {
    const partnershipIdFromUrl = searchParams.get('partnership');
    if (partnershipIdFromUrl && activePartnerships.length > 0) {
      const partnership = activePartnerships.find(p => p._id === partnershipIdFromUrl);
      if (partnership) {
        setSelectedPartnership(partnership);
      }
    }
  }, [searchParams, activePartnerships]);

  useEffect(() => {
    if (selectedPartnership) {
      fetchProperties();
    }
  }, [selectedPartnership, debouncedSearch, typeFilter, regionFilter, currentPage]);

  const fetchPartnerships = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partner-company/my-companies');
      const active = response.data.data.partnerships.filter(
        p => p.status === 'active'
      );
      setActivePartnerships(active);

      // Check for URL partnership param first
      const partnershipIdFromUrl = searchParams.get('partnership');
      if (partnershipIdFromUrl) {
        const urlPartnership = active.find(p => p._id === partnershipIdFromUrl);
        if (urlPartnership) {
          setSelectedPartnership(urlPartnership);
          return;
        }
      }

      // Auto-select first active partnership with active subscription
      const activeWithSubscription = active.find(p => p.companySubscriptionActive !== false);
      if (activeWithSubscription) {
        setSelectedPartnership(activeWithSubscription);
      } else if (active.length > 0 && !selectedPartnership) {
        // Fallback to first partnership if none with active subscription
        setSelectedPartnership(active[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load partnerships');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    if (!selectedPartnership) return;

    try {
      setPropertiesLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (regionFilter) params.append('region', regionFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);

      const response = await api.get(
        `/properties/partnership/${selectedPartnership._id}?${params.toString()}`
      );
      setProperties(response.data.data.properties || []);
      setPagination(response.data.data.pagination || { total: 0, page: 1, pages: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load properties');
    } finally {
      setPropertiesLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatPrice = (property) => {
    if (property.pricing?.priceOnRequest) {
      return 'Price on Request';
    }
    const symbol = property.pricing?.currency === 'AED' ? 'AED ' : '₹';
    const price = property.pricing?.basePrice || 0;

    if (property.region === 'dubai') {
      if (price >= 1000000) {
        return `${symbol}${(price / 1000000).toFixed(2)}M`;
      } else if (price >= 1000) {
        return `${symbol}${(price / 1000).toFixed(0)}K`;
      }
      return `${symbol}${price.toLocaleString()}`;
    } else {
      if (price >= 10000000) {
        return `${symbol}${(price / 10000000).toFixed(2)} Cr`;
      } else if (price >= 100000) {
        return `${symbol}${(price / 100000).toFixed(2)} Lac`;
      }
      return `${symbol}${price.toLocaleString()}`;
    }
  };

  const getCommissionDisplay = (property) => {
    if (!selectedPartnership) return null;

    // Check if fixed commission
    if (property.commission?.isFixed && property.commission?.fixedAmount) {
      return {
        isFixed: true,
        fixedAmount: property.commission.fixedAmount,
        currency: property.pricing?.currency || 'INR'
      };
    }

    const baseCommission = property.commission?.basePercentage || 0;
    const tierPercentage = selectedPartnership.commissionPercentage ||
      (selectedPartnership.tier === 'platinum' ? 60 :
       selectedPartnership.tier === 'gold' ? 50 :
       selectedPartnership.tier === 'silver' ? 40 : 30);

    const partnerCommission = (baseCommission * tierPercentage) / 100;

    return {
      isFixed: false,
      base: baseCommission,
      tier: tierPercentage,
      partner: partnerCommission
    };
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Properties" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Properties" subtitle="Browse available properties" color={config.color}>
      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Subscription Inactive Warning */}
      {selectedPartnership && selectedPartnership.companySubscriptionActive === false && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-800 font-medium">Properties Temporarily Unavailable</p>
              <p className="text-amber-700 text-sm mt-1">
                Properties are temporarily unavailable. Please contact the company administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Active Partnerships */}
      {activePartnerships.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 mb-2">No active partnerships found</p>
          <p className="text-sm text-gray-400 mb-4">Join a company to view their properties</p>
          <button
            onClick={() => navigate('/partner/my-companies')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            View My Companies
          </button>
        </div>
      ) : (
        <>
          {/* Company Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Company
                </label>
                <select
                  value={selectedPartnership?._id || ''}
                  onChange={(e) => {
                    const partnership = activePartnerships.find(p => p._id === e.target.value);
                    setSelectedPartnership(partnership);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[250px]"
                >
                  {activePartnerships.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.companyId?.name} ({p.tier} tier)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPartnership && (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-gray-500">Your Tier:</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium capitalize
                      ${selectedPartnership.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                        selectedPartnership.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                        selectedPartnership.tier === 'silver' ? 'bg-gray-200 text-gray-800' :
                        'bg-orange-100 text-orange-800'}`}>
                      {selectedPartnership.tier}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Commission:</span>
                    <span className="ml-2 font-semibold text-indigo-600">
                      {selectedPartnership.commissionPercentage ||
                        (selectedPartnership.tier === 'platinum' ? 60 :
                         selectedPartnership.tier === 'gold' ? 50 :
                         selectedPartnership.tier === 'silver' ? 40 : 30)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                {propertyTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Regions</option>
                <option value="india">India</option>
                <option value="dubai">Dubai</option>
              </select>
              <ExportButton
                data={properties}
                columns={exportColumns}
                filename="properties"
                title="Properties List"
              />
            </div>
          </div>

          {/* Properties Grid */}
          {propertiesLoading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {selectedPartnership?.companySubscriptionActive === false ? (
                <>
                  <p className="text-gray-500 mb-2">Properties Temporarily Unavailable</p>
                  <p className="text-sm text-gray-400">
                    Properties are temporarily unavailable. Please contact the company administrator.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-2">No properties available</p>
                  <p className="text-sm text-gray-400">
                    {selectedPartnership?.companyId?.name || 'This company'} hasn't listed any properties yet
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const commission = getCommissionDisplay(property);

                return (
                  <div
                    key={property._id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Property Image */}
                    <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-500 relative">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images.find(img => img.isPrimary)?.url || property.images[0].url}
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                      {/* Status Badge */}
                      {property.status === 'sold_out' && (
                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                          SOLD
                        </span>
                      )}
                      {/* Region Badge */}
                      <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-90">
                        {property.region === 'india' ? 'India' : 'Dubai'}
                      </span>
                    </div>

                    {/* Property Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{property.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {property.location?.city}, {property.location?.state || property.location?.emirate}
                      </p>

                      {/* Details */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                        {property.details?.bedrooms && (
                          <span>{property.details.bedrooms} Bed</span>
                        )}
                        {property.details?.bathrooms && (
                          <span>{property.details.bathrooms} Bath</span>
                        )}
                        {property.details?.builtUpArea && (
                          <span>{property.details.builtUpArea} {property.details.areaUnit || 'sqft'}</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(property)}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {propertyTypes.find(t => t.value === property.type)?.label}
                        </span>
                      </div>

                      {/* Commission Badge */}
                      {commission && (commission.isFixed ? commission.fixedAmount : commission.base > 0) && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          {commission.isFixed ? (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Your Commission:</span>
                                <span className="font-semibold text-green-700">
                                  {commission.currency === 'AED' ? 'AED ' : '₹'}{parseFloat(commission.fixedAmount).toLocaleString()} (Fixed)
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Fixed commission amount
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Your Commission:</span>
                                <span className="font-semibold text-green-700">
                                  {commission.partner.toFixed(1)}% of sale
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Base: {commission.base}% × Your Share: {commission.tier}%
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4">
                        {property.status === 'sold_out' ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
                          >
                            Property Sold
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/partner/properties/${property._id}`)}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        </>
      )}
    </DashboardLayout>
  );
};

export default Properties;