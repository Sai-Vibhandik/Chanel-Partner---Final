import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

const SelectCompany = () => {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, [regionFilter]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (regionFilter) params.append('region', regionFilter);

      const response = await api.get(`/companies/public/list?${params.toString()}`);
      setCompanies(response.data.data.companies);
    } catch (err) {
      setError('Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCompanies();
  };

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
  };

  const handleContinue = () => {
    if (selectedCompany) {
      navigate(`/register/partner?company=${selectedCompany._id}`);
    }
  };

  const getRegionBadge = (regions) => {
    if (!regions || regions.length === 0) return null;
    return regions.map(region => (
      <span
        key={region}
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          region === 'india'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-blue-100 text-blue-800'
        }`}
      >
        {region === 'india' ? '🇮🇳 India' : '🇦🇪 Dubai'}
      </span>
    ));
  };

  const getTierInfo = (tierPercentages) => {
    if (!tierPercentages) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Commission:</span>
        <span className="text-green-600 font-medium">
          {tierPercentages.bronze || 30}% - {tierPercentages.platinum || 60}%
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
              Choose Your<br />Partner Company
            </h1>
            <p className="text-lg text-cyan-100 max-w-md">
              Select a real estate company to partner with and start earning commissions on property deals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{companies.length}</div>
              <div className="text-cyan-100 text-sm mt-1">Active Companies</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">30-60%</div>
              <div className="text-cyan-100 text-sm mt-1">Commission Rates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Company Selection */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-2xl">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Select a Company</h2>
            <p className="text-gray-500 mt-2">Choose a company to partner with</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">All Regions</option>
                <option value="india">🇮🇳 India</option>
                <option value="dubai">🇦🇪 Dubai</option>
              </select>
              <button
                type="submit"
                className="px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          {/* Company List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500">No companies found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {companies.map((company) => (
                <div
                  key={company._id}
                  onClick={() => handleSelectCompany(company)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedCompany?._id === company._id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                      {company.logo?.url ? (
                        <img
                          src={company.logo.url}
                          alt={company.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {company.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                        {selectedCompany?._id === company._id && (
                          <svg className="w-6 h-6 text-cyan-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Location */}
                      {company.address?.city && (
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {company.address.city}
                          {company.address.country && `, ${company.address.country}`}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {getRegionBadge(company.regions)}
                        {company.stats?.totalPartners > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {company.stats.totalPartners} partners
                          </span>
                        )}
                      </div>

                      {/* Commission Info */}
                      {getTierInfo(company.settings?.tierPercentages)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Back to Login
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedCompany}
              className="flex-1 py-3 px-4 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Registration
            </button>
          </div>

          {/* Help Text */}
          <p className="mt-4 text-center text-sm text-gray-500">
            Can't find your company?{' '}
            <a href="/register/company" className="text-cyan-600 hover:text-cyan-500 font-medium">
              Register a new company
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectCompany;