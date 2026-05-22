import api from '../utils/api';

/**
 * Get company plan limits and usage
 */
export const getPlanLimits = async () => {
  const response = await api.get('/companies/my-limits');
  return response.data;
};

/**
 * Get subscription status
 */
export const getSubscriptionStatus = async () => {
  const response = await api.get('/companies/subscription-status');
  return response.data;
};

export default {
  getPlanLimits,
  getSubscriptionStatus
};