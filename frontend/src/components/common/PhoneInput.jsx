import { useState, useEffect } from 'react';

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
  defaultCountry = 'in',
}) => {
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry.toUpperCase());

  // Country options with dial codes
  const countries = [
    { code: 'IN', name: 'India', dialCode: '+91' },
    { code: 'AE', name: 'UAE', dialCode: '+971' },
    { code: 'US', name: 'USA', dialCode: '+1' },
    { code: 'GB', name: 'UK', dialCode: '+44' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
    { code: 'QA', name: 'Qatar', dialCode: '+974' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965' },
    { code: 'BH', name: 'Bahrain', dialCode: '+973' },
    { code: 'OM', name: 'Oman', dialCode: '+968' },
    { code: 'SG', name: 'Singapore', dialCode: '+65' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60' },
    { code: 'AU', name: 'Australia', dialCode: '+61' },
    { code: 'CA', name: 'Canada', dialCode: '+1' },
    { code: 'DE', name: 'Germany', dialCode: '+49' },
    { code: 'FR', name: 'France', dialCode: '+33' },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
    { code: 'ZA', name: 'South Africa', dialCode: '+27' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234' },
    { code: 'EG', name: 'Egypt', dialCode: '+20' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
    { code: 'NP', name: 'Nepal', dialCode: '+977' },
  ];

  // Get dial code for country
  const getDialCode = (code) => {
    const country = countries.find(c => c.code === code);
    return country ? country.dialCode : '+91';
  };

  // Parse initial value
  useEffect(() => {
    if (value) {
      // If value includes country code prefix, extract the number part
      const dialCode = countryCode ? getDialCode(countryCode) : '';
      if (dialCode && value.startsWith(dialCode)) {
        setPhone(value.slice(dialCode.length));
      } else if (value.startsWith('+')) {
        // Value has + prefix, try to match with country dial code
        const matchingCountry = countries.find(c => value.startsWith(c.dialCode));
        if (matchingCountry) {
          setSelectedCountry(matchingCountry.code);
          setPhone(value.slice(matchingCountry.dialCode.length));
        } else {
          setPhone(value);
        }
      } else {
        setPhone(value);
      }
    }
  }, [value, countryCode]);

  // Update country when prop changes
  useEffect(() => {
    if (countryCode) {
      setSelectedCountry(countryCode.toUpperCase());
    }
  }, [countryCode]);

  // Validate phone number
  const validatePhoneNumber = (phoneNumber, country) => {
    const fieldName = label || 'Contact Number';

    if (!phoneNumber || phoneNumber.trim() === '') {
      return required ? `${fieldName} is required.` : null;
    }

    // Remove non-digits for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Country-specific validation rules
    const rules = {
      'IN': { length: 10, pattern: /^[6-9]\d{9}$/, message: `${fieldName} must be 10 digits starting with 6-9.` },
      'AE': { length: 9, pattern: /^[1-9]\d{8}$/, message: `${fieldName} must be 9 digits.` },
      'US': { length: 10, pattern: /^\d{10}$/, message: `${fieldName} must be 10 digits.` },
      'GB': { minLength: 10, maxLength: 11, pattern: /^\d{10,11}$/, message: `${fieldName} must be 10-11 digits.` },
      'SA': { length: 9, pattern: /^\d{9}$/, message: `${fieldName} must be 9 digits.` },
      'QA': { length: 8, pattern: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
      'KW': { length: 8, pattern: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
      'BH': { length: 8, pattern: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
      'OM': { length: 8, pattern: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
      'SG': { length: 8, pattern: /^\d{8}$/, message: `${fieldName} must be 8 digits.` },
      'MY': { minLength: 9, maxLength: 10, pattern: /^\d{9,10}$/, message: `${fieldName} must be 9-10 digits.` },
      'AU': { length: 9, pattern: /^\d{9}$/, message: `${fieldName} must be 9 digits.` },
      'CA': { length: 10, pattern: /^\d{10}$/, message: `${fieldName} must be 10 digits.` },
    };

    const rule = rules[country];

    if (rule) {
      if (rule.length && digitsOnly.length !== rule.length) {
        return `${fieldName} must be ${rule.length} digits.`;
      }
      if (rule.minLength && rule.maxLength) {
        if (digitsOnly.length < rule.minLength || digitsOnly.length > rule.maxLength) {
          return `${fieldName} must be ${rule.minLength}-${rule.maxLength} digits.`;
        }
      }
      if (rule.pattern && !rule.pattern.test(digitsOnly)) {
        return rule.message;
      }
    } else {
      // Generic validation for other countries
      if (digitsOnly.length < 5 || digitsOnly.length > 15) {
        return `${fieldName} must be 5-15 digits.`;
      }
    }

    return null;
  };

  const handlePhoneChange = (e) => {
    const inputValue = e.target.value;
    // Only allow digits and some special characters
    const cleanedValue = inputValue.replace(/[^\d\s\-()]/g, '');
    setPhone(cleanedValue);

    // Validate and call callbacks
    const validationError = validatePhoneNumber(cleanedValue, selectedCountry);
    if (onError) {
      onError(validationError);
    }

    if (onChange) {
      // Combine country code and phone number
      const fullPhone = getDialCode(selectedCountry) + cleanedValue.replace(/\D/g, '');
      onChange(fullPhone);
    }
  };

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);

    // Re-validate with new country
    const validationError = validatePhoneNumber(phone, newCountry);
    if (onError) {
      onError(validationError);
    }

    if (onCountryChange) {
      onCountryChange(newCountry);
    }

    // Update the full phone value with new country code
    if (onChange && phone) {
      const fullPhone = getDialCode(newCountry) + phone.replace(/\D/g, '');
      onChange(fullPhone);
    }
  };

  const handleBlur = () => {
    const validationError = validatePhoneNumber(phone, selectedCountry);
    if (onError) {
      onError(validationError);
    }
  };

  const selectedCountryData = countries.find(c => c.code === selectedCountry) || countries[0];

  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}{required && <span className="text-red-500 align-super">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={selectedCountry}
          onChange={handleCountryChange}
          disabled={disabled}
          className={`px-3 py-3 border rounded-xl shadow-sm text-gray-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'}`}
        >
          {countries.map(country => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.dialCode})
            </option>
          ))}
        </select>
        <input
          type="text"
          value={phone}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || 'Contact Number'}
          className={`flex-1 px-4 py-3 border rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default PhoneInput;