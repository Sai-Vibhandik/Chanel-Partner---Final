import AgreementTemplate from '../models/AgreementTemplate.js';
import AgreementSignature from '../models/AgreementSignature.js';

/**
 * Check if all required agreements are signed for a partnership
 * @param {string} partnershipId - The partnership ID
 * @param {string} companyId - The company ID
 * @returns {Promise<{ allSigned: boolean, pendingAgreements: Array, signedCount: number, totalCount: number }>}
 */
export const checkAllRequiredAgreementsSigned = async (partnershipId, companyId) => {
  // Get all required agreement templates for this company
  const requiredTemplates = await AgreementTemplate.find({
    companyId,
    isActive: true,
    isRequired: true
  }).select('_id name type version');

  // If no required agreements, consider all signed
  if (requiredTemplates.length === 0) {
    return {
      allSigned: true,
      pendingAgreements: [],
      signedCount: 0,
      totalCount: 0
    };
  }

  // Get all signed agreements for this partnership
  const signedAgreements = await AgreementSignature.find({
    partnershipId,
    status: 'signed',
    isLatestVersion: true
  }).select('agreementTemplateId');

  const signedTemplateIds = signedAgreements.map(sa => sa.agreementTemplateId.toString());

  // Find which required templates are not signed
  const pendingTemplates = requiredTemplates.filter(
    template => !signedTemplateIds.includes(template._id.toString())
  );

  return {
    allSigned: pendingTemplates.length === 0,
    pendingAgreements: pendingTemplates.map(t => ({
      id: t._id,
      name: t.name,
      type: t.type
    })),
    signedCount: requiredTemplates.length - pendingTemplates.length,
    totalCount: requiredTemplates.length
  };
};

/**
 * Get pending agreement names for error messages
 * @param {Array} pendingAgreements - Array of pending agreements
 * @returns {string} Formatted string of pending agreement names
 */
export const getPendingAgreementNames = (pendingAgreements) => {
  if (!pendingAgreements || pendingAgreements.length === 0) return '';

  const names = pendingAgreements.map(a => a.name || a.type?.toUpperCase() || 'Unknown Agreement');

  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(' and ');
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
};

export default {
  checkAllRequiredAgreementsSigned,
  getPendingAgreementNames
};