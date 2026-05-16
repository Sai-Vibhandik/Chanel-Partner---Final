import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const PropertyManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig.property_manager;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    soldOut: 0,
    byType: {}
  });
  const [recentProperties, setRecentProperties] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentProperties();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/properties/stats');
      const data = res.data.data || {};

      setStats({
        total: data.overview?.total || 0,
        active: data.overview?.active || 0,
        draft: data.overview?.draft || 0,
        soldOut: data.overview?.soldOut || 0,
        byType: data.byType || {}
      });
    } catch (error) {
      console.error('Error fetching property stats:', error);
    }
  };

  const fetchRecentProperties = async () => {
    try {
      const res = await api.get('/properties?limit=5&sort=-createdAt');
      const properties = res.data?.data?.properties || [];
      setRecentProperties(properties);
    } catch (error) {
      console.error('Error fetching recent properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Property type display names and colors
  const typeConfig = {
    apartment: { label: 'Apartment', color: 'orange' },
    villa: { label: 'Villa', color: 'amber' },
    plot: { label: 'Plot', color: 'purple' },
    commercial: { label: 'Commercial', color: 'blue' },
    office: { label: 'Office', color: 'cyan' },
    retail: { label: 'Retail', color: 'pink' },
    warehouse: { label: 'Warehouse', color: 'emerald' },
    land: { label: 'Land', color: 'green' }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-700',
      draft: 'bg-yellow-100 text-yellow-700',
      sold_out: 'bg-red-100 text-red-700',
      off_market: 'bg-gray-100 text-gray-700'
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Property Management" subtitle="Manage properties and listings" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">Manage your property portfolio efficiently.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.total}</p>
              <p className="text-sm text-orange-600 mt-1">In portfolio</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Listings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.active}</p>
              <p className="text-sm text-green-600 mt-1">Currently live</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Draft Properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.draft}</p>
              <p className="text-sm text-yellow-600 mt-1">Awaiting review</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Sold Out</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.soldOut}</p>
              <p className="text-sm text-purple-600 mt-1">Closed deals</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Property Types */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Properties by Type</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : Object.keys(stats.byType).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No properties added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byType).map(([type, count]) => {
              const config = typeConfig[type] || { label: type, color: 'gray' };
              return (
                <div key={type} className={`p-4 bg-${config.color}-50 rounded-lg border border-${config.color}-100`}>
                  <p className="text-sm text-gray-500">{config.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Properties */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Properties</h3>
          <button
            onClick={() => navigate('/property-manager/properties')}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            View All
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : recentProperties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p>No properties added yet</p>
            <button
              onClick={() => navigate('/property-manager/properties/new')}
              className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Add your first property
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentProperties.map((property) => (
                  <tr
                    key={property._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/property-manager/properties/${property._id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {property.images?.[0]?.url ? (
                          <img
                            src={property.images[0].url}
                            alt={property.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{property.name}</p>
                          <p className="text-sm text-gray-500">{property.pricing?.currency === 'AED' ? 'AED' : '₹'}{property.pricing?.basePrice?.toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-900">{typeConfig[property.type]?.label || property.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {property.location?.city}, {property.location?.state || property.location?.emirate || ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(property.status)}`}>
                        {property.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {property.stats?.totalViews || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PropertyManagerDashboard;