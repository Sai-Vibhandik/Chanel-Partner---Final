/**
 * IP Geolocation Service
 * Uses free IP geolocation APIs to get location data from IP addresses
 */

import axios from 'axios';

// Cache for geolocation results (in-memory cache)
const geoCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get geolocation data from IP address
 * Uses ip-api.com (free, no API key required, 45 requests/minute limit)
 * @param {string} ip - IP address
 * @returns {Promise<Object>} Location data
 */
export const getGeoFromIP = async (ip) => {
  // Skip for localhost/private IPs
  if (!ip || isPrivateIP(ip)) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null
    };
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Using ip-api.com (free tier)
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 3000 // 3 second timeout
    });

    const data = response.data;

    if (data.status === 'success') {
      const location = {
        country: data.country || null,
        countryCode: data.countryCode || null,
        region: data.regionName || data.region || null,
        city: data.city || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
        timezone: data.timezone || null
      };

      // Cache the result
      geoCache.set(ip, { data: location, timestamp: Date.now() });

      return location;
    }

    // If status is not success, return empty
    return getEmptyLocation();
  } catch (error) {
    // Log error but don't throw - geolocation is optional
    console.error('Geolocation lookup failed:', error.message);

    // Try fallback service
    try {
      const fallbackLocation = await getGeoFromIPFallback(ip);
      if (fallbackLocation) {
        geoCache.set(ip, { data: fallbackLocation, timestamp: Date.now() });
        return fallbackLocation;
      }
    } catch (fallbackError) {
      console.error('Fallback geolocation also failed:', fallbackError.message);
    }

    return getEmptyLocation();
  }
};

/**
 * Fallback geolocation using ipapi.co
 */
const getGeoFromIPFallback = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000
    });

    const data = response.data;

    if (!data.error) {
      return {
        country: data.country_name || null,
        countryCode: data.country_code || null,
        region: data.region || null,
        city: data.city || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        timezone: data.timezone || null
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if IP is private/local
 */
const isPrivateIP = (ip) => {
  if (!ip) return true;

  // IPv4 private ranges
  const privateRanges = [
    /^127\./, // Loopback
    /^10\./, // Class A private
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // Class B private
    /^192\.168\./, // Class C private
    /^169\.254\./, // Link-local
    /^0\.0\.0\.0/, // Default
    /^::1/, // IPv6 loopback
    /^fc00:/, // IPv6 private
    /^fe80:/ // IPv6 link-local
  ];

  return privateRanges.some(range => range.test(ip));
};

/**
 * Get empty location object
 */
const getEmptyLocation = () => ({
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null
});

/**
 * Get location display string
 */
export const getLocationDisplay = (location) => {
  if (!location) return 'Unknown';

  const parts = [];

  if (location.city) parts.push(location.city);
  if (location.region && location.region !== location.city) {
    parts.push(location.region);
  }
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(', ') : 'Unknown';
};

/**
 * Clear geolocation cache (for testing/maintenance)
 */
export const clearGeoCache = () => {
  geoCache.clear();
};

export default {
  getGeoFromIP,
  getLocationDisplay,
  clearGeoCache
};