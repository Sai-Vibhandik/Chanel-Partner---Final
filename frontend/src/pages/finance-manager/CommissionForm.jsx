import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// Default tier percentages (what % of property's base commission each tier gets)
// Example: If property has 5% base, Gold tier (50%) gets 2.5% effective rate
const DEFAULT_TIER_PERCENTAGES = {
  bronze: 25,     // 25% of base
  silver: 35,    // 35% of base
  gold: 50,      // 50% of base
  platinum: 75   // 75% of base
};

const CommissionForm = () => {
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.finance_manager;
  // All roles use the same path since routes are under /finance-manager
  const basePath = '/finance-manager/commissions';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [partnerships, setPartnerships] = useState([]);
  const [properties, setProperties] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    partnershipId: '',
    propertyId: '',
    visitId: '',
    source: {
      type: 'direct',
      notes: ''
    },
    saleDetails: {
      salePrice: '',
      saleDate: '',
      buyerName: '',
      buyerPhone: '',
      buyerEmail: ''
    },
    notes: ''
  });

  // Preview calculations
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchPartnerships();
    fetchProperties();
    fetchCompanySettings();
  }, []);

  useEffect(() => {
    if (formData.partnershipId && formData.propertyId && formData.saleDetails.salePrice) {
      calculatePreview();
    }
  }, [formData.partnershipId, formData.propertyId, formData.saleDetails.salePrice]);

  const fetchPartnerships = async () => {
    try {
      // Get partnerships for the user's company
      const response = await api.get(`/partner-company/company/${user.companyId}/partners`);
      console.log('Partnerships response:', response.data);
      setPartnerships(response.data.data.partnerships.filter(p => p.status === 'active'));
    } catch (err) {
      console.error('Failed to load partnerships:', err.response?.data || err.message);
    }
  };

  const fetchProperties = async () => {
    try {
      // Get properties for the company
      const response = await api.get('/properties');
      console.log('Properties response:', response.data);
      // Only show active properties (not sold or draft)
      setProperties(response.data.data.properties.filter(p => p.status === 'active'));
    } catch (err) {
      console.error('Failed to load properties:', err.response?.data || err.message);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await api.get('/companies/my-settings');
      setCompanySettings(response.data.data.settings);
    } catch (err) {
      console.error('Failed to load company settings');
    }
  };

  const calculatePreview = () => {
    const selectedPartnership = partnerships.find(p => p._id === formData.partnershipId);
    const selectedProperty = properties.find(p => p._id === formData.propertyId);

    if (!selectedPartnership || !selectedProperty || !formData.saleDetails.salePrice) {
      setPreview(null);
      return;
    }

    const salePrice = parseFloat(formData.saleDetails.salePrice);
    if (isNaN(salePrice) || salePrice <= 0) {
      setPreview(null);
      return;
    }

    const currency = selectedProperty.pricing?.currency || 'INR';

    // Check if property has fixed commission
    if (selectedProperty.commission?.isFixed && selectedProperty.commission?.fixedAmount) {
      setPreview({
        isFixed: true,
        fixedAmount: selectedProperty.commission.fixedAmount,
        currency,
        tier: selectedPartnership.tier,
        commissionAmount: selectedProperty.commission.fixedAmount
      });
      return;
    }

    // Get property's base commission percentage (e.g., 5%)
    const propertyBasePercentage = selectedProperty.commission?.basePercentage || selectedProperty.commission?.percentage || 0;

    // If property has no base commission set, show warning
    if (propertyBasePercentage === 0) {
      setPreview({
        isFixed: false,
        tier: selectedPartnership.tier,
        propertyBasePercentage: 0,
        tierPercentage: 0,
        effectivePercentage: 0,
        commissionAmount: 0,
        currency,
        warning: 'This property has no commission percentage set. Please edit the property to add commission.'
      });
      return;
    }

    // Get tier percentage from company settings or use defaults
    // This is what % of the base commission the partner gets
    const tierPercentages = companySettings?.tierPercentages || DEFAULT_TIER_PERCENTAGES;
    const tierPercentage = tierPercentages[selectedPartnership.tier] || DEFAULT_TIER_PERCENTAGES[selectedPartnership.tier] || 25;

    // Check for partner-specific override
    const overridePercentage = selectedPartnership.commissionOverride?.percentage;

    // Calculate effective percentage and commission amount
    let effectivePercentage;
    if (overridePercentage) {
      // Partner has custom override percentage
      effectivePercentage = overridePercentage;
    } else {
      // Standard calculation: property base × tier percentage
      // Example: 5% × 50% = 2.5%
      effectivePercentage = (propertyBasePercentage * tierPercentage) / 100;
    }

    const commissionAmount = Math.round(salePrice * (effectivePercentage / 100));

    setPreview({
      isFixed: false,
      tier: selectedPartnership.tier,
      propertyBasePercentage,
      tierPercentage,
      overridePercentage,
      effectivePercentage,
      commissionAmount,
      currency
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('saleDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        saleDetails: { ...prev.saleDetails, [field]: value }
      }));
    } else if (name.startsWith('source.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        source: { ...prev.source, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.partnershipId) {
      setError('Please select a partner');
      return;
    }

    if (!formData.propertyId) {
      setError('Please select a property');
      return;
    }

    if (!formData.saleDetails.salePrice || parseFloat(formData.saleDetails.salePrice) <= 0) {
      setError('Please enter a valid sale price');
      return;
    }

    if (!formData.saleDetails.buyerName || !formData.saleDetails.buyerPhone) {
      setError('Buyer name and phone are required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/commissions', {
        partnershipId: formData.partnershipId,
        propertyId: formData.propertyId,
        visitId: formData.visitId || null,
        source: {
          type: formData.source.type,
          notes: formData.source.notes || null
        },
        saleDetails: {
          salePrice: parseFloat(formData.saleDetails.salePrice),
          saleDate: formData.saleDetails.saleDate || null,
          buyerName: formData.saleDetails.buyerName,
          buyerPhone: formData.saleDetails.buyerPhone,
          buyerEmail: formData.saleDetails.buyerEmail || null
        },
        notes: formData.notes || null
      });

      navigate(basePath);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create commission');
    } finally {
      setLoading(false);
    }
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

  const selectedPartnership = partnerships.find(p => p._id === formData.partnershipId);
  const selectedProperty = properties.find(p => p._id === formData.propertyId);

  return (
    <DashboardLayout sidebarLinks={config.links} title="Create Commission" subtitle="Add a new commission entry" color={config.color}>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Source & Deal Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Source</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How did this deal come?
              </label>
              <select
                name="source.type"
                value={formData.source.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="direct">Direct (Partner brought client)</option>
                <option value="visit">From a Visit</option>
                <option value="referral">Referral</option>
                <option value="marketing">Marketing Campaign</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Notes
              </label>
              <input
                type="text"
                name="source.notes"
                value={formData.source.notes}
                onChange={handleInputChange}
                placeholder="e.g., Client came through exhibition..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Partner Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner & Property</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Partner *
              </label>
              <select
                name="partnershipId"
                value={formData.partnershipId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a partner</option>
                {partnerships.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.partnerId?.firstName} {p.partnerId?.lastName} ({p.companyId?.name}) - {p.tier}
                  </option>
                ))}
              </select>
              {selectedPartnership && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Tier: <span className="font-medium capitalize">{selectedPartnership.tier}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Tier Share: <span className="font-bold text-green-600">{companySettings?.tierPercentages?.[selectedPartnership.tier] || DEFAULT_TIER_PERCENTAGES[selectedPartnership.tier]}%</span>
                    <span className="text-xs text-gray-500"> (of property base commission)</span>
                  </p>
                  {selectedPartnership.commissionOverride?.percentage && (
                    <p className="text-sm text-blue-600">
                      Custom Override: <span className="font-bold">{selectedPartnership.commissionOverride.percentage}%</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property *
              </label>
              <select
                name="propertyId"
                value={formData.propertyId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} - {p.location?.city} ({formatCurrency(p.pricing?.basePrice, p.pricing?.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sale Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sale Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Price *
              </label>
              <input
                type="number"
                name="saleDetails.salePrice"
                value={formData.saleDetails.salePrice}
                onChange={handleInputChange}
                placeholder="Enter sale price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
              {selectedProperty && (
                <p className="mt-1 text-sm text-gray-500">
                  Property Price: <span className="font-medium">{formatCurrency(selectedProperty.pricing?.basePrice, selectedProperty.pricing?.currency)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Date
              </label>
              <input
                type="date"
                name="saleDetails.saleDate"
                value={formData.saleDetails.saleDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buyer Name *
              </label>
              <input
                type="text"
                name="saleDetails.buyerName"
                value={formData.saleDetails.buyerName}
                onChange={handleInputChange}
                placeholder="Enter buyer name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buyer Phone *
              </label>
              <input
                type="tel"
                name="saleDetails.buyerPhone"
                value={formData.saleDetails.buyerPhone}
                onChange={handleInputChange}
                placeholder="Enter buyer phone"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buyer Email
              </label>
              <input
                type="email"
                name="saleDetails.buyerEmail"
                value={formData.saleDetails.buyerEmail}
                onChange={handleInputChange}
                placeholder="Enter buyer email (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Commission Preview */}
        {preview && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Commission Preview</h3>

            {preview.warning ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                <p className="font-medium">⚠️ {preview.warning}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600">Property Base</p>
                    <p className="text-xl font-bold text-gray-900">{preview.propertyBasePercentage}%</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600">Partner Tier</p>
                    <p className="text-xl font-bold text-gray-900 capitalize">{preview.tier}</p>
                    <p className="text-xs text-gray-500">({preview.tierPercentage}% of base)</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600">Effective Rate</p>
                    <p className="text-xl font-bold text-gray-900">{preview.effectivePercentage.toFixed(2)}%</p>
                    {preview.overridePercentage && (
                      <p className="text-xs text-blue-600">(Custom override)</p>
                    )}
                  </div>

                  <div className="bg-green-600 rounded-lg p-4">
                    <p className="text-sm text-green-100">Commission Amount</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(preview.commissionAmount, preview.currency)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-green-700">
                  <strong>Calculation:</strong> {formatCurrency(parseFloat(formData.saleDetails.salePrice), preview.currency)} × {preview.effectivePercentage.toFixed(2)}% = {formatCurrency(preview.commissionAmount, preview.currency)}
                </p>
                <p className="mt-1 text-xs text-green-600">
                  {preview.overridePercentage ? (
                    `Using partner's custom override: ${preview.overridePercentage}%`
                  ) : (
                    `${preview.propertyBasePercentage}% (property) × ${preview.tierPercentage}% (${preview.tier} tier) = ${preview.effectivePercentage.toFixed(2)}%`
                  )}
                </p>
              </>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>

          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            placeholder="Any additional notes or remarks..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Commission'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CommissionForm;