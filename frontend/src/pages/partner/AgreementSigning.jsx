import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const AgreementSigning = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partnershipId = searchParams.get('partnershipId');
  const config = sidebarConfig.partner;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Separate pending and signed agreements
  const [pendingAgreements, setPendingAgreements] = useState([]);
  const [signedAgreements, setSignedAgreements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedName, setTypedName] = useState('');
  const [signatureError, setSignatureError] = useState('');

  // Validate signature name
  const validateSignature = (name) => {
    const trimmedName = name.trim();

    // Check empty
    if (!trimmedName) {
      return 'Please type your name to sign.';
    }

    // Check minimum length (at least 2 characters for a valid name)
    if (trimmedName.length < 2) {
      return 'Name must be at least 2 characters long.';
    }

    // Check maximum length
    if (trimmedName.length > 100) {
      return 'Name must not exceed 100 characters.';
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes, and dots)
    const validNameRegex = /^[a-zA-Z\s\-'.]+$/;
    if (!validNameRegex.test(trimmedName)) {
      return 'Name can only contain letters, spaces, hyphens, apostrophes, and periods.';
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(trimmedName)) {
      return 'Name must contain at least one letter.';
    }

    // Check for consecutive special characters
    if (/[\-'.]{2,}/.test(trimmedName)) {
      return 'Name contains invalid consecutive special characters.';
    }

    return null; // No error
  };

  const handleSignatureChange = (e) => {
    let value = e.target.value;

    // Only allow valid characters: letters, spaces, hyphens, apostrophes, and periods
    value = value.replace(/[^a-zA-Z\s\-'.]/g, '');

    // Enforce maximum length of 100 characters
    if (value.length > 100) {
      value = value.substring(0, 100);
    }

    setTypedName(value);

    // Clear error when user starts typing valid input
    if (signatureError && value.trim().length >= 2) {
      const error = validateSignature(value);
      if (!error) {
        setSignatureError('');
      }
    }
  };

  useEffect(() => {
    if (!partnershipId) {
      toast.error('Partnership ID is required.');
      setLoading(false);
      return;
    }
    fetchAgreements();
  }, [partnershipId]);

  const fetchAgreements = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/agreements/partner/agreements?partnershipId=${partnershipId}`);
      const { agreements } = response.data.data;

      // Separate pending (need to sign) from already signed
      const pending = [];
      const signed = [];

      agreements.forEach(agreement => {
        if (agreement.isSigned) {
          // Already signed current version
          signed.push({
            ...agreement,
            status: 'signed'
          });
        } else {
          // All unsigned agreements are pending (no distinction for re-sign)
          pending.push({
            ...agreement,
            status: 'pending'
          });
        }
      });

      setPendingAgreements(pending);
      setSignedAgreements(signed);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load agreements.');
    } finally {
      setLoading(false);
    }
  };

  const currentAgreement = pendingAgreements[currentIndex];

  const handleSign = async () => {
    // Validate signature
    const validationError = validateSignature(typedName);
    if (validationError) {
      setSignatureError(validationError);
      return;
    }

    if (!currentAgreement || !currentAgreement._id) {
      toast.error('No agreement selected. Please try again.');
      return;
    }

    try {
      setSubmitting(true);

      await api.post(`/agreements/partner/agreements/${currentAgreement._id}/sign`, {
        partnershipId,
        typedName: typedName.trim()
      });

      toast.success(`"${currentAgreement.name}" signed successfully!`);
      setTypedName('');
      setSignatureError('');

      // Check if there are more agreements to sign
      if (currentIndex < pendingAgreements.length - 1) {
        // Move to next pending agreement
        setCurrentIndex(currentIndex + 1);
      } else {
        // All pending agreements signed - refresh
        await fetchAgreements();
        // After refresh, if no more pending, the component will show success screen
      }
    } catch (err) {
      console.error('Sign agreement error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to sign agreement. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const replacePlaceholders = (content) => {
    if (!content) return '';
    return content
      .replace(/{{partnerName}}/g, user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '_________________')
      .replace(/{{companyName}}/g, '_________________')
      .replace(/{{date}}/g, new Date().toLocaleDateString())
      .replace(/{{partnerPhone}}/g, user?.phone || '_________________')
      .replace(/{{partnerEmail}}/g, user?.email || '_________________');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout
        sidebarLinks={config.links}
        title="Sign Agreements"
        subtitle="Review and sign your partnership agreements"
        color={config.color}
      >
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agreements...</p>
        </div>
      </DashboardLayout>
    );
  }

  // No pending agreements - all signed
  if (pendingAgreements.length === 0) {
    return (
      <DashboardLayout
        sidebarLinks={config.links}
        title="Sign Agreements"
        subtitle="Review and sign your partnership agreements"
        color={config.color}
      >
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">All Agreements Signed!</h2>
            <p className="text-gray-600 mb-4">You have signed all required agreements.</p>
            <button
              onClick={() => navigate('/partner/agreements')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to Agreements
            </button>
          </div>

          {/* Signed Agreements History */}
          {signedAgreements.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Signed Agreements History</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {signedAgreements.map((agreement) => (
                  <div key={agreement._id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{agreement.name}</div>
                      <div className="text-sm text-gray-500">
                        Version {agreement.signature?.version || agreement.version} • Signed on {formatDate(agreement.signature?.signedAt)}
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Signed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Sign Agreements"
      subtitle={`Pending: ${pendingAgreements.length} agreement${pendingAgreements.length > 1 ? 's' : ''} to sign`}
      color={config.color}
    >
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Signing {currentIndex + 1} of {pendingAgreements.length}
          </span>
          <span className="text-sm text-gray-600">
            {Math.round(((currentIndex) / pendingAgreements.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex) / pendingAgreements.length) * 100}%` }}
          ></div>
        </div>

        {/* Agreement Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {pendingAgreements.map((agreement, index) => (
            <span
              key={agreement._id}
              className={`px-3 py-1 text-sm rounded-full ${
                index < currentIndex
                  ? 'bg-green-100 text-green-800'
                  : index === currentIndex
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {index < currentIndex ? '✓ ' : ''}
              {agreement.name}
              {agreement.needsResign && ' (Updated)'}
            </span>
          ))}
        </div>
      </div>

      {/* Current Agreement to Sign */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Update Warning */}
        {currentAgreement?.needsResign && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">This agreement has been updated!</span>
              {currentAgreement.previousVersion && (
                <span className="text-yellow-700">(Previously signed v{currentAgreement.previousVersion})</span>
              )}
            </div>
          </div>
        )}

        {/* Agreement Header */}
        <div className="bg-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{currentAgreement?.name}</h2>
              <p className="text-indigo-100 text-sm mt-1">{currentAgreement?.description}</p>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded text-sm text-white">
              v{currentAgreement?.version}
            </span>
          </div>
        </div>

        {/* Agreement Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
            {replacePlaceholders(currentAgreement?.content)}
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-t border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type your full name as signature *
              </label>
              <input
                type="text"
                value={typedName}
                onChange={handleSignatureChange}
                onBlur={() => {
                  if (typedName.trim()) {
                    const error = validateSignature(typedName);
                    if (error) setSignatureError(error);
                  }
                }}
                placeholder="Enter your full legal name"
                maxLength={100}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  signatureError
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-indigo-500'
                }`}
                required
              />
              <div className="flex justify-between mt-1">
                <div>
                  {signatureError && (
                    <p className="text-sm text-red-600">{signatureError}</p>
                  )}
                  {!signatureError && (
                    <p className="text-xs text-gray-500">
                      By typing your name, you agree that this electronic signature is as legally binding as a physical signature.
                    </p>
                  )}
                </div>
                <span className={`text-xs flex-shrink-0 ml-2 ${typedName.length > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                  {typedName.length}/100
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                2-100 characters. Letters, spaces, hyphens, apostrophes, and periods allowed.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/partner/agreements')}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Save for Later
              </button>
              <button
                onClick={handleSign}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Signing...' : 'Sign & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Already Signed Agreements History */}
      {signedAgreements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Already Signed ({signedAgreements.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {signedAgreements.map((agreement) => (
              <div key={agreement._id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{agreement.name}</div>
                  <div className="text-sm text-gray-500">
                    Version {agreement.signature?.version || agreement.version} • Signed on {formatDate(agreement.signature?.signedAt)}
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  Signed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AgreementSigning;