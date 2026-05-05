/**
 * User-Agent Parser Utility
 * Extracts device, OS, and browser information from user-agent string
 */

/**
 * Parse user-agent string and extract device info
 * @param {string} userAgent - The user-agent string
 * @returns {Object} Parsed device, os, and browser info
 */
export const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      device: { type: 'unknown', brand: null, model: null },
      os: { name: null, version: null },
      browser: { name: null, version: null }
    };
  }

  const ua = userAgent.toLowerCase();

  return {
    device: detectDevice(ua),
    os: detectOS(ua),
    browser: detectBrowser(ua)
  };
};

/**
 * Detect device type
 */
const detectDevice = (ua) => {
  // Device type
  let type = 'desktop';
  let brand = null;
  let model = null;

  // Check for mobile devices
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    type = 'mobile';
  } else if (/ipad|tablet|kindle|silk/i.test(ua)) {
    type = 'tablet';
  }

  // Detect brand and model for mobile devices
  if (type === 'mobile' || type === 'tablet') {
    // Apple devices
    if (/iphone/i.test(ua)) {
      brand = 'Apple';
      model = 'iPhone';
    } else if (/ipad/i.test(ua)) {
      brand = 'Apple';
      model = 'iPad';
    } else if (/android/i.test(ua)) {
      brand = 'Android';
      // Try to extract device model
      const modelMatch = ua.match(/android\s[\d.]+;\s([^;)]+)/i);
      if (modelMatch) {
        model = modelMatch[1].trim();
        // Common brands
        if (/samsung|galaxy/i.test(model)) brand = 'Samsung';
        else if (/pixel/i.test(model)) brand = 'Google';
        else if (/oneplus/i.test(model)) brand = 'OnePlus';
        else if (/xiaomi|redmi|mi\s/i.test(model)) brand = 'Xiaomi';
        else if (/huawei|honor/i.test(model)) brand = 'Huawei';
        else if (/oppo/i.test(model)) brand = 'OPPO';
        else if (/vivo/i.test(model)) brand = 'Vivo';
        else if (/realme/i.test(model)) brand = 'Realme';
      }
    }
  } else {
    // Desktop brand detection
    if (/windows/i.test(ua)) {
      brand = 'PC';
    } else if (/mac/i.test(ua)) {
      brand = 'Apple';
    } else if (/linux/i.test(ua)) {
      brand = 'Linux';
    }
  }

  return { type, brand, model };
};

/**
 * Detect operating system
 */
const detectOS = (ua) => {
  let name = null;
  let version = null;

  // Windows
  if (/windows nt/i.test(ua)) {
    name = 'Windows';
    const winVersion = ua.match(/windows nt\s([\d.]+)/i);
    if (winVersion) {
      const ver = parseFloat(winVersion[1]);
      // Map Windows NT version to Windows version
      const winVersions = {
        '10.0': '10/11',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': '7',
        '6.0': 'Vista',
        '5.1': 'XP'
      };
      version = winVersions[winVersion[1]] || winVersion[1];
    }
  }
  // macOS
  else if (/mac os x|macintosh/i.test(ua)) {
    name = 'macOS';
    const macVersion = ua.match(/mac os x\s([\d_]+)/i);
    if (macVersion) {
      version = macVersion[1].replace(/_/g, '.');
    }
  }
  // iOS
  else if (/iphone|ipad|ipod/i.test(ua)) {
    name = 'iOS';
    const iosVersion = ua.match(/os\s([\d_]+)/i);
    if (iosVersion) {
      version = iosVersion[1].replace(/_/g, '.');
    }
  }
  // Android
  else if (/android/i.test(ua)) {
    name = 'Android';
    const androidVersion = ua.match(/android\s([\d.]+)/i);
    if (androidVersion) {
      version = androidVersion[1];
    }
  }
  // Linux
  else if (/linux/i.test(ua)) {
    name = 'Linux';
    // Try to detect distro
    if (/ubuntu/i.test(ua)) {
      name = 'Ubuntu';
    } else if (/fedora/i.test(ua)) {
      name = 'Fedora';
    } else if (/debian/i.test(ua)) {
      name = 'Debian';
    }
  }
  // Chrome OS
  else if (/cros/i.test(ua)) {
    name = 'Chrome OS';
  }

  return { name, version };
};

/**
 * Detect browser
 */
const detectBrowser = (ua) => {
  let name = null;
  let version = null;

  // Order matters - check more specific browsers first

  // Edge (Chromium)
  if (/edg\//i.test(ua)) {
    name = 'Edge';
    const match = ua.match(/edg\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Edge (Legacy)
  else if (/edge/i.test(ua)) {
    name = 'Edge';
    const match = ua.match(/edge\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Opera
  else if (/opr\//i.test(ua)) {
    name = 'Opera';
    const match = ua.match(/opr\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Brave (appears as Chrome, but has Brave in UA)
  else if (/brave/i.test(ua)) {
    name = 'Brave';
    const match = ua.match(/chrome\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Chrome
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) {
    name = 'Chrome';
    const match = ua.match(/chrome\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Firefox
  else if (/firefox\//i.test(ua)) {
    name = 'Firefox';
    const match = ua.match(/firefox\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Safari
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) {
    name = 'Safari';
    const match = ua.match(/version\/([\d.]+)/i);
    if (match) version = match[1];
  }
  // Internet Explorer
  else if (/msie|trident/i.test(ua)) {
    name = 'Internet Explorer';
    const match = ua.match(/(?:msie\s|rv:)([\d.]+)/i);
    if (match) version = match[1];
  }

  return { name, version };
};

/**
 * Get concise device summary
 */
export const getDeviceSummary = (parsedUA) => {
  const parts = [];

  if (parsedUA.browser.name) {
    parts.push(`${parsedUA.browser.name}${parsedUA.browser.version ? ` ${parsedUA.browser.version}` : ''}`);
  }

  if (parsedUA.os.name) {
    parts.push(`${parsedUA.os.name}${parsedUA.os.version ? ` ${parsedUA.os.version}` : ''}`);
  }

  if (parsedUA.device.brand) {
    parts.push(parsedUA.device.model || parsedUA.device.brand);
  }

  return parts.length > 0 ? parts.join(' • ') : 'Unknown Device';
};

export default {
  parseUserAgent,
  getDeviceSummary
};