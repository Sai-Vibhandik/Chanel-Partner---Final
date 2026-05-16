import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import Modal, { ModalContent, ModalFooter, ModalButton } from '../../components/common/Modal';
import { FormField, Input, Select, Checkbox, FormRow, FormActions, Button } from '../../components/common/FormFields';
import { validateEmail, validatePhone, validateName, validateMinLength, handlePhoneInput } from '../../utils/validation';

const Team = () => {
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'viewer',
    password: '',
    sendInvite: true
  });

  const roleOptions = [
    { value: 'company_superadmin', label: 'Company SuperAdmin', description: 'Full access to company settings and team' },
    { value: 'partner_manager', label: 'Partner Manager', description: 'Manage partners and KYC verification' },
    { value: 'property_manager', label: 'Property Manager', description: 'Manage properties and listings' },
    { value: 'finance_manager', label: 'Finance Manager', description: 'Manage commissions and payouts' },
    { value: 'viewer', label: 'Viewer', description: 'View only access to dashboards' }
  ];

  const getRoleBadge = (role) => {
    const styles = {
      company_superadmin: 'bg-purple-100 text-purple-800',
      partner_manager: 'bg-blue-100 text-blue-800',
      property_manager: 'bg-green-100 text-green-800',
      finance_manager: 'bg-yellow-100 text-yellow-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return styles[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const option = roleOptions.find(o => o.value === role);
    return option ? option.label : role;
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await api.get(`/company/${user.companyId}/team?${params.toString()}`);
      setTeam(response.data.data.team);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    const firstNameError = validateName(formData.firstName, 'First name');
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = validateName(formData.lastName, 'Last name');
    if (lastNameError) errors.lastName = lastNameError;

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    if (formData.phone) {
      const phoneError = validatePhone(formData.phone);
      if (phoneError) errors.phone = phoneError;
    }

    if (formData.password && formData.password.length > 0) {
      const passwordError = validateMinLength(formData.password, 8, 'Password');
      if (passwordError) errors.password = passwordError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePhoneChange = (e) => {
    const value = handlePhoneInput(e, null, null);
    setFormData(prev => ({ ...prev, phone: value }));
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setFieldErrors({});

      await api.post(`/company/${user.companyId}/team`, formData);

      setSuccess('Team member added successfully');
      setShowAddModal(false);
      resetForm();
      fetchTeam();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setFieldErrors({});

      await api.put(`/company/${user.companyId}/team/${selectedMember._id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      });

      setSuccess('Team member updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchTeam();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team member');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (member) => {
    try {
      await api.put(`/company/${user.companyId}/team/${member._id}/status`, {
        isActive: !member.isActive
      });

      setSuccess(`Team member ${member.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchTeam();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteMember = async () => {
    try {
      setSaving(true);
      await api.delete(`/company/${user.companyId}/team/${selectedMember._id}`);
      setSuccess('Team member removed successfully');
      setShowDeleteModal(false);
      setSelectedMember(null);
      fetchTeam();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove team member');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (member) => {
    try {
      await api.post(`/company/${user.companyId}/team/${member._id}/resend-invite`);
      setSuccess('Invitation resent successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      password: '',
      sendInvite: false
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (member) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'viewer',
      password: '',
      sendInvite: true
    });
    setSelectedMember(null);
    setFieldErrors({});
  };

  const filteredTeam = team.filter(member => {
    const matchesSearch = !search ||
      member.firstName.toLowerCase().includes(search.toLowerCase()) ||
      member.lastName.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && member.isActive) ||
      (statusFilter === 'inactive' && !member.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Team" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-48 sm:min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Team" subtitle="Manage your team members" color={config.color}>
      {/* Messages - Only show when no modals are open */}
      {error && !showAddModal && !showEditModal && !showDeleteModal && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Total Team</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">{team.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Active</p>
          <p className="text-xl sm:text-3xl font-bold text-green-600 mt-1">
            {team.filter(m => m.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Pending Verification</p>
          <p className="text-xl sm:text-3xl font-bold text-yellow-600 mt-1">
            {team.filter(m => !m.isEmailVerified).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-500">Managers</p>
          <p className="text-xl sm:text-3xl font-bold text-indigo-600 mt-1">
            {team.filter(m => m.role.includes('manager')).length}
          </p>
        </div>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <input
                type="text"
                placeholder="Search team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full sm:w-auto"
              />
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm flex-1 sm:flex-none"
                >
                  <option value="">All Roles</option>
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm flex-1 sm:flex-none"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
            >
              + Add Team Member
            </button>
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Verified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>No team members found</p>
                  </td>
                </tr>
              ) : (
                filteredTeam.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.isEmailVerified ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openEditModal(member)}
                          className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`px-3 py-1 text-sm font-medium ${
                            member.isActive ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {!member.isEmailVerified && (
                          <button
                            onClick={() => handleResendInvite(member)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Resend
                          </button>
                        )}
                        {member._id !== user._id && (
                          <button
                            onClick={() => openDeleteModal(member)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card View - Mobile */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredTeam.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No team members found</p>
            </div>
          ) : (
            filteredTeam.map((member) => (
              <div key={member._id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {member.isEmailVerified && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditModal(member)}
                    className="px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(member)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      member.isActive ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'
                    }`}
                  >
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {!member.isEmailVerified && (
                    <button
                      onClick={() => handleResendInvite(member)}
                      className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg"
                    >
                      Resend
                    </button>
                  )}
                  {member._id !== user._id && (
                    <button
                      onClick={() => openDeleteModal(member)}
                      className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Team Member Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setError(''); setFieldErrors({}); }} title="Add Team Member" size="md">
        <form onSubmit={handleAddMember}>
          <ModalContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            <FormRow cols={2}>
              <FormField label="First Name" required error={fieldErrors.firstName}>
                <Input
                  value={formData.firstName}
                  onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' })); }}
                  maxLength={50}
                  required
                  error={fieldErrors.firstName}
                />
              </FormField>
              <FormField label="Last Name" required error={fieldErrors.lastName}>
                <Input
                  value={formData.lastName}
                  onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: '' })); }}
                  maxLength={50}
                  required
                  error={fieldErrors.lastName}
                />
              </FormField>
            </FormRow>
            <FormField label="Email" required className="mt-4" error={fieldErrors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' })); }}
                maxLength={100}
                required
                error={fieldErrors.email}
              />
            </FormField>
            <FormField label="Phone" className="mt-4" error={fieldErrors.phone}>
              <Input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={16}
                placeholder="10-digit mobile number"
                error={fieldErrors.phone}
              />
            </FormField>
            <FormField label="Role" required className="mt-4">
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={roleOptions}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {roleOptions.find(o => o.value === formData.role)?.description}
              </p>
            </FormField>
            <FormField label="Password (optional)" className="mt-4" error={fieldErrors.password}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' })); }}
                  maxLength={128}
                  placeholder="Leave empty to auto-generate (min 8 chars)"
                  error={fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.475a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-3.795 5.603M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </FormField>
            <div className="mt-4">
              <Checkbox
                id="sendInvite"
                label="Send invitation email to the user"
                checked={formData.sendInvite}
                onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
              />
            </div>
          </ModalContent>
          <ModalFooter>
            <ModalButton variant="secondary" onClick={() => { setShowAddModal(false); setFieldErrors({}); }}>
              Cancel
            </ModalButton>
            <ModalButton variant="primary" loading={saving}>
              {saving ? 'Adding...' : 'Add Team Member'}
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Team Member Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setError(''); setFieldErrors({}); }} title="Edit Team Member" size="md">
        <form onSubmit={handleEditMember}>
          <ModalContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            <FormRow cols={2}>
              <FormField label="First Name" required error={fieldErrors.firstName}>
                <Input
                  value={formData.firstName}
                  onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' })); }}
                  maxLength={50}
                  required
                  error={fieldErrors.firstName}
                />
              </FormField>
              <FormField label="Last Name" required error={fieldErrors.lastName}>
                <Input
                  value={formData.lastName}
                  onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: '' })); }}
                  maxLength={50}
                  required
                  error={fieldErrors.lastName}
                />
              </FormField>
            </FormRow>
            <FormField label="Email" required className="mt-4" error={fieldErrors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' })); }}
                maxLength={100}
                required
                error={fieldErrors.email}
              />
            </FormField>
            <FormField label="Phone" className="mt-4" error={fieldErrors.phone}>
              <Input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={16}
                placeholder="10-digit mobile number"
                error={fieldErrors.phone}
              />
            </FormField>
            <FormField label="Role" required className="mt-4">
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={roleOptions}
                required
                disabled={selectedMember?._id === user._id}
              />
              {selectedMember?._id === user._id && (
                <p className="text-xs text-yellow-600 mt-1">You cannot change your own role</p>
              )}
            </FormField>
          </ModalContent>
          <ModalFooter>
            <ModalButton variant="secondary" onClick={() => { setShowEditModal(false); setFieldErrors({}); }}>
              Cancel
            </ModalButton>
            <ModalButton variant="primary" loading={saving}>
              {saving ? 'Updating...' : 'Update Member'}
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setError(''); }} size="sm">
        <ModalContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="text-center">
            <svg className="w-14 h-14 sm:w-16 sm:h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Permanently Delete Team Member?</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Are you sure you want to permanently delete <strong>{selectedMember?.firstName} {selectedMember?.lastName}</strong>? This action cannot be undone. All their data will be removed.
            </p>
            <p className="text-yellow-600 text-xs sm:text-sm mt-2">
              To temporarily disable access, use the "Deactivate" button instead.
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => { setShowDeleteModal(false); setError(''); }}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" loading={saving} onClick={handleDeleteMember}>
            {saving ? 'Deleting...' : 'Permanently Delete'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  );
};

export default Team;
