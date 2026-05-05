import OfficeManagement from '../company/OfficeManagement';

// Reuse the same OfficeManagement component with partner_manager role
const PartnerManagerOfficeManagement = () => {
  return <OfficeManagement role="partner_manager" />;
};

export default PartnerManagerOfficeManagement;