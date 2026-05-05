import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth Pages
import Login from './pages/auth/Login';
import RegisterCompany from './pages/auth/RegisterCompany';
import RegisterPartner from './pages/auth/RegisterPartner';
import SelectCompany from './pages/auth/SelectCompany';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import ProfileSettings from './pages/auth/ProfileSettings';

// Platform Admin Pages
import PlatformDashboard from './pages/platform/Dashboard';
import Companies from './pages/platform/Companies';
import CompanyDetails from './pages/platform/CompanyDetails';
import PlatformPartners from './pages/platform/Partners';

// Company SuperAdmin Pages
import CompanyDashboard from './pages/company/Dashboard';
import CompanySettings from './pages/company/Settings';
import CompanyPartners from './pages/company/Partners';
import CompanyPartnerDetails from './pages/company/PartnerDetails';
import CompanyTeam from './pages/company/Team';
import CompanyOfficeManagement from './pages/company/OfficeManagement';
import AgreementTemplates from './pages/admin/AgreementTemplates';
import SignedAgreements from './pages/admin/SignedAgreements';
import AgreementDetail from './pages/admin/AgreementDetail';
import KYCVerification from './pages/admin/KYCVerification';
import KYCDetail from './pages/admin/KYCDetail';

// Partner Manager Pages
import PartnerManagerDashboard from './pages/partner-manager/Dashboard';
import PartnerManagerPartners from './pages/partner-manager/Partners';
import PartnerManagerPartnerDetails from './pages/partner-manager/PartnerDetails';
import PartnerManagerPartnershipDetails from './pages/partner-manager/PartnershipDetails';
import PartnerManagerVisits from './pages/partner-manager/Visits';
import PartnerManagerVisitDetails from './pages/partner-manager/VisitDetails';
import PartnerManagerOfficeManagement from './pages/partner-manager/OfficeManagement';

// Property Manager Pages
import PropertyManagerDashboard from './pages/property-manager/Dashboard';
import Properties from './pages/property-manager/Properties';
import PropertyDetails from './pages/property-manager/PropertyDetails';
import PropertyForm from './pages/property-manager/PropertyForm';

// Finance Manager Pages
import FinanceManagerDashboard from './pages/finance-manager/Dashboard';
import FinanceManagerCommissions from './pages/finance-manager/Commissions';
import FinanceManagerCommissionForm from './pages/finance-manager/CommissionForm';
import FinanceManagerCommissionDetails from './pages/finance-manager/CommissionDetails';
import ViewerDashboard from './pages/viewer/Dashboard';

// Partner Pages
import PartnerDashboard from './pages/partner/Dashboard';
import PartnerProfile from './pages/partner/Profile';
import MyCompanies from './pages/partner/MyCompanies';
import PartnershipDetails from './pages/partner/PartnershipDetails';
import PartnerProperties from './pages/partner/Properties';
import PartnerPropertyDetails from './pages/partner/PropertyDetails';
import PartnerVisits from './pages/partner/Visits';
import PartnerVisitDetails from './pages/partner/VisitDetails';
import PartnerCommissions from './pages/partner/Commissions';
import PartnerCommissionDetails from './pages/partner/CommissionDetails';
import AgreementSigning from './pages/partner/AgreementSigning';
import PartnerAgreements from './pages/partner/Agreements';
import CompanyAgreements from './pages/partner/CompanyAgreements';
import PartnerChat from './pages/partner/Chat';

// Chat Pages
import CompanyChat from './pages/company/Chat';
import LoginLogs from './pages/company-superadmin/LoginLogs';
import Analytics from './pages/company/Analytics';
import EmailLogs from './pages/company/EmailLogs';
import PartnerManagerChat from './pages/partner-manager/Chat';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children;
};

// Get dashboard path based on role
const getDashboardPath = (role) => {
  switch (role) {
    case 'platform_admin':
      return '/platform/dashboard';
    case 'company_superadmin':
      return '/company/dashboard';
    case 'partner_manager':
      return '/partner-manager/dashboard';
    case 'property_manager':
      return '/property-manager/dashboard';
    case 'finance_manager':
      return '/finance-manager/dashboard';
    case 'viewer':
      return '/viewer/dashboard';
    case 'partner':
      return '/partner/dashboard';
    default:
      return '/login';
  }
};

// Public Route - redirect to dashboard if logged in
const PublicRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register/company" element={<PublicRoute><RegisterCompany /></PublicRoute>} />
      <Route path="/select-company" element={<PublicRoute><SelectCompany /></PublicRoute>} />
      <Route path="/register/partner" element={<PublicRoute><RegisterPartner /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/verify-email/:token" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

      {/* Profile Settings - All authenticated users */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={null}>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />

      {/* Platform Admin Routes */}
      <Route
        path="/platform/dashboard"
        element={
          <ProtectedRoute allowedRoles={['platform_admin']}>
            <PlatformDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/companies"
        element={
          <ProtectedRoute allowedRoles={['platform_admin']}>
            <Companies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/companies/:id"
        element={
          <ProtectedRoute allowedRoles={['platform_admin']}>
            <CompanyDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/partners"
        element={
          <ProtectedRoute allowedRoles={['platform_admin']}>
            <PlatformPartners />
          </ProtectedRoute>
        }
      />

      {/* Company SuperAdmin Routes */}
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/properties"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <Properties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/properties/new"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <PropertyForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/properties/:id"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <PropertyDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/properties/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <PropertyForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/visits"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <PartnerManagerVisits />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/visits/:id"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <PartnerManagerVisitDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/settings"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanySettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/partners"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanyPartners />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/partners/:id"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanyPartnerDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/team"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanyTeam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/offices"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanyOfficeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/agreements"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin', 'partner_manager']}>
            <AgreementTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/signed-agreements"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin', 'partner_manager']}>
            <SignedAgreements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/signed-agreements/:partnershipId"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin', 'partner_manager']}>
            <AgreementDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/kyc-verification"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin', 'partner_manager']}>
            <KYCVerification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/kyc-verification/:partnershipId"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin', 'partner_manager']}>
            <KYCDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/chat"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <CompanyChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/login-logs"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <LoginLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/email-logs"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <EmailLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/analytics"
        element={
          <ProtectedRoute allowedRoles={['company_superadmin']}>
            <Analytics />
          </ProtectedRoute>
        }
      />

      {/* Partner Manager Routes */}
      <Route
        path="/partner-manager/dashboard"
        element={
          <ProtectedRoute allowedRoles={['partner_manager']}>
            <PartnerManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/partners"
        element={
          <ProtectedRoute allowedRoles={['partner_manager']}>
            <PartnerManagerPartners />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/partners/:id"
        element={
          <ProtectedRoute allowedRoles={['partner_manager']}>
            <PartnerManagerPartnerDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/partnership/:id"
        element={
          <ProtectedRoute allowedRoles={['partner_manager']}>
            <PartnerManagerPartnershipDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/visits"
        element={
          <ProtectedRoute allowedRoles={['partner_manager', 'company_superadmin']}>
            <PartnerManagerVisits />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/visits/:id"
        element={
          <ProtectedRoute allowedRoles={['partner_manager', 'company_superadmin']}>
            <PartnerManagerVisitDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/offices"
        element={
          <ProtectedRoute allowedRoles={['partner_manager', 'company_superadmin']}>
            <PartnerManagerOfficeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner-manager/chat"
        element={
          <ProtectedRoute allowedRoles={['partner_manager']}>
            <PartnerManagerChat />
          </ProtectedRoute>
        }
      />

      {/* Property Manager Routes */}
      <Route
        path="/property-manager/dashboard"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <PropertyManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-manager/properties"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <Properties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-manager/properties/new"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <PropertyForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-manager/properties/:id"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <PropertyDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-manager/properties/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <PropertyForm />
          </ProtectedRoute>
        }
      />

      {/* Finance Manager Routes */}
      <Route
        path="/finance-manager/dashboard"
        element={
          <ProtectedRoute allowedRoles={['finance_manager']}>
            <FinanceManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance-manager/commissions"
        element={
          <ProtectedRoute allowedRoles={['finance_manager', 'company_superadmin', 'partner_manager']}>
            <FinanceManagerCommissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance-manager/commissions/new"
        element={
          <ProtectedRoute allowedRoles={['finance_manager', 'company_superadmin', 'partner_manager']}>
            <FinanceManagerCommissionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance-manager/commissions/:id"
        element={
          <ProtectedRoute allowedRoles={['finance_manager', 'company_superadmin', 'partner_manager']}>
            <FinanceManagerCommissionDetails />
          </ProtectedRoute>
        }
      />

      {/* Viewer Routes */}
      <Route
        path="/viewer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['viewer']}>
            <ViewerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Partner Routes */}
      <Route
        path="/partner/dashboard"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/profile"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/my-companies"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <MyCompanies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/company/:id"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnershipDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/properties"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerProperties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/properties/:id"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerPropertyDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/visits"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerVisits />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/visits/:id"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerVisitDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/commissions"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerCommissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/commissions/:id"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerCommissionDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/agreements"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerAgreements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/agreements/:partnershipId"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <CompanyAgreements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/agreements/sign"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <AgreementSigning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partner/chat"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerChat />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;