import jwt from 'jsonwebtoken';

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiry time (default from env or '7d')
 */
export const generateToken = (payload, expiresIn = null) => {
  const tokenPayload = {
    userId: payload.userId,
    companyId: payload.companyId,
    role: payload.role,
    ...payload // Include any additional fields like pendingRegId, orderId, type, etc.
  };

  return jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    {
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Decode JWT token (without verification)
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};