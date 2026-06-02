import { useState, useEffect } from 'react';

// Country codes with flags and phone formats
const countries = [
  { code: 'IN', name: 'India', dialCode: '+91', format: '10 digits', placeholder: '9876543210', regex: /^[6-9]\d{9}$/, minLength: 10, maxLength: 10 },
  { code: 'AE', name: 'UAE', dialCode: '+971', format: '9 digits', placeholder: '501234567', regex: /^[1-9]\d{8}$/, minLength: 9, maxLength: 9 },
  { code: 'US', name: 'United States', dialCode: '+1', format: '10 digits', placeholder: '2025551234', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', format: '10-11 digits', placeholder: '7911123456', regex: /^\d{10,11}$/, minLength: 10, maxLength: 11 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', format: '9 digits', placeholder: '501234567', regex: /^\d{9}$/, minLength: 9, maxLength: 9 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', format: '8 digits', placeholder: '30123456', regex: /^\d{8}$/, minLength: 8, maxLength: 8 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', format: '8 digits', placeholder: '50123456', regex: /^\d{8}$/, minLength: 8, maxLength: 8 },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', format: '8 digits', placeholder: '30123456', regex: /^\d{8}$/, minLength: 8, maxLength: 8 },
  { code: 'OM', name: 'Oman', dialCode: '+968', format: '8 digits', placeholder: '90123456', regex: /^\d{8}$/, minLength: 8, maxLength: 8 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', format: '8 digits', placeholder: '81234567', regex: /^\d{8}$/, minLength: 8, maxLength: 8 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', format: '9-10 digits', placeholder: '121234567', regex: /^\d{9,10}$/, minLength: 9, maxLength: 10 },
  { code: 'AU', name: 'Australia', dialCode: '+61', format: '9 digits', placeholder: '412345678', regex: /^\d{9}$/, minLength: 9, maxLength: 9 },
  { code: 'CA', name: 'Canada', dialCode: '+1', format: '10 digits', placeholder: '4165551234', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'DE', name: 'Germany', dialCode: '+49', format: '10-11 digits', placeholder: '1512345678', regex: /^\d{10,11}$/, minLength: 10, maxLength: 11 },
  { code: 'FR', name: 'France', dialCode: '+33', format: '9 digits', placeholder: '612345678', regex: /^\d{9}$/, minLength: 9, maxLength: 9 },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', format: '9-10 digits', placeholder: '211234567', regex: /^\d{9,10}$/, minLength: 9, maxLength: 10 },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', format: '9 digits', placeholder: '721234567', regex: /^\d{9}$/, minLength: 9, maxLength: 9 },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', format: '10 digits', placeholder: '8012345678', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'EG', name: 'Egypt', dialCode: '+20', format: '10 digits', placeholder: '1012345678', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', format: '10 digits', placeholder: '3012345678', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', format: '10 digits', placeholder: '1812345678', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', format: '9 digits', placeholder: '711234567', regex: /^\d{9}$/, minLength: 9, maxLength: 9 },
  { code: 'NP', name: 'Nepal', dialCode: '+977', format: '10 digits', placeholder: '9812345678', regex: /^\d{10}$/, minLength: 10, maxLength: 10 },
  { code: 'OTHER', name: 'Other', dialCode: '', format: '', placeholder: 'Enter number with country code', regex: /^.{5,15}$/, minLength: 5, maxLength: 15 },
];

// Country flag emoji mapping
const countryFlags = {
  'IN': '🇮🇳',
  'AE': '🇦🇪',
  'US': '🇺🇸',
  'GB': '🇬🇧',
  'SA': '🇸🇦',
  'QA': '🇶🇦',
  'KW': '🇰🇼',
  'BH': '🇧🇭',
  'OM': '🇴🇲',
  'SG': '🇸🇬',
  'MY': '🇲🇾',
  'AU': '🇦🇺',
  'CA': '🇨🇦',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'NZ': '🇳🇿',
  'ZA': '🇿🇦',
  'NG': '🇳🇬',
  'EG': '🇪🇬',
  'PK': '🇵🇰',
  'BD': '🇧🇩',
  'LK': '🇱🇰',
  'NP': '🇳🇵',
  'OTHER': '🌍',
};

const PhoneInput = ({
  value = '',
  onChange,
  onError,
  countryCode = '',
  onCountryChange,
  error,
  required = true,
  disabled = false,
  placeholder = '',
  className = '',
  label = 'Contact Number',
  showLabel = true,
  defaultCountry = 'IN',
}) => {
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find(c => c.code === (countryCode || defaultCountry)) || countries[0]
  );
  const [localValue, setLocalValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Parse initial value to extract country code and phone number
  useEffect(() => {
    if (value) {
      // Check if value starts with +
      if (value.startsWith('+')) {
        // Try to match with a country dial code
        const matchedCountry = countries.find(c => c.dialCode && value.startsWith(c.dialCode));
        if (matchedCountry && matchedCountry.code !== 'OTHER') {
          setSelectedCountry(matchedCountry);
          setLocalValue(value.slice(matchedCountry.dialCode.length));
          if (onCountryChange) {
            onCountryChange(matchedCountry.code);
          }
        } else {
          setLocalValue(value);
        }
      } else {
        setLocalValue(value);
      }
    }
  }, [value]);

  // Update selected country when countryCode prop changes
  useEffect(() => {
    if (countryCode) {
      const country = countries.find(c => c.code === countryCode);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [countryCode]);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowDropdown(false);

    // Validate the number with new country
    const validationError = validateNumber(localValue, country);
    if (onError) {
      onError(validationError);
    }

    // Call onCountryChange callback
    if (onCountryChange) {
      onCountryChange(country.code);
    }

    // Update parent with full phone number
    if (onChange) {
      const fullNumber = country.dialCode + localValue;
      onChange(fullNumber);
    }
  };

  const validateNumber = (number, country = selectedCountry) => {
    const fieldName = label || 'Contact Number';
    if (!number) {
      return required ? `${fieldName} is required.` : null;
    }

    // Remove spaces and dashes
    const cleanNumber = number.replace(/[\s\-\(\)]/g, '');

    // Check length
    if (cleanNumber.length < country.minLength) {
      return `${fieldName} must be at least ${country.minLength} digits.`;
    }
    if (cleanNumber.length > country.maxLength) {
      return `${fieldName} must be no more than ${country.maxLength} digits.`;
    }

    // Check regex pattern
    if (country.regex && !country.regex.test(cleanNumber)) {
      if (country.code === 'IN') {
        return `${fieldName} must be 10 digits starting with 6-9.`;
      }
      if (country.code === 'AE') {
        return `${fieldName} must be 9 digits.`;
      }
      return `Please enter a valid ${fieldName}.`;
    }

    return null;
  };

  const handleInputChange = (e) => {
    let inputValue = e.target.value;

    // Only allow digits
    inputValue = inputValue.replace(/\D/g, '');

    // Limit to max length
    if (inputValue.length > selectedCountry.maxLength) {
      inputValue = inputValue.slice(0, selectedCountry.maxLength);
    }

    setLocalValue(inputValue);

    // Clear error when user starts typing
    if (error && onError) {
      onError(null);
    }

    // Call onChange callback with full phone number including country code
    if (onChange) {
      const fullNumber = selectedCountry.dialCode + inputValue;
      onChange(fullNumber);
    }
  };

  const handleBlur = () => {
    const validationError = validateNumber(localValue);
    if (onError) {
      onError(validationError);
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}{required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        {/* Country Code Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={`flex items-center gap-1 px-3 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-gray-900 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
          >
            <span className="text-lg">{countryFlags[selectedCountry.code] || '🌍'}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search country..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const search = e.target.value.toLowerCase();
                    const countryItems = document.querySelectorAll('[data-country-item]');
                    countryItems.forEach(item => {
                      const text = item.textContent.toLowerCase();
                      item.style.display = text.includes(search) ? '' : 'none';
                    });
                  }}
                />
              </div>
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  data-country-item
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${selectedCountry.code === country.code ? 'bg-cyan-50' : ''}`}
                >
                  <span className="text-lg">{countryFlags[country.code] || '🌍'}</span>
                  <span className="text-sm">{country.name}</span>
                  <span className="text-sm text-gray-500 ml-auto">{country.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={selectedCountry.maxLength}
          placeholder={placeholder || selectedCountry.placeholder}
          className={`flex-1 px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default PhoneInput;
export { countries, countryFlags };