import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const AGREEMENT_TYPES = [
  { value: 'nda', label: 'Non-Disclosure Agreement (NDA)', description: 'Protects confidential information' },
  { value: 'nca', label: 'Non-Compete Agreement (NCA)', description: 'Prevents working with competitors' },
  { value: 'cpa', label: 'Channel Partner Agreement (CPA)', description: 'Defines commission terms and responsibilities' },
  { value: 'code_of_conduct', label: 'Code of Conduct', description: 'Expected behavior and ethics' },
  { value: 'gdpr_consent', label: 'GDPR Consent Form', description: 'Data privacy consent' },
  { value: 'other', label: 'Custom Agreement', description: 'Other legal agreements' }
];

const PLACEHOLDER_CONTENT = `AGREEMENT

This Agreement is entered into on {{date}} by and between:

COMPANY: {{companyName}}
('Company')

PARTNER: {{partnerName}}
('Partner')

WHEREAS, the Company desires to engage the Partner as a channel partner for the promotion and sale of its real estate properties;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. TERMS OF ENGAGEMENT
The Partner shall act as a channel partner for the Company and shall promote the Company's properties to potential buyers.

2. COMMISSION
The Partner shall be entitled to commission as per the Company's policies.

3. CONFIDENTIALITY
The Partner agrees to maintain the confidentiality of all proprietary information shared by the Company.

4. TERM
This Agreement shall remain in effect until terminated by either party.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Company: _________________________
Date: _________________________

Partner: _________________________
Date: _________________________`;

const AgreementTemplates = () => {
  const { user } = useAuth();
  const config = sidebarConfig[user?.role] || sidebarConfig.company_superadmin;
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'nda',
    content: PLACEHOLDER_CONTENT,
    description: '',
    isRequired: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/agreements');
      setTemplates(response.data.data.templates);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load agreement templates');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    const typeInfo = AGREEMENT_TYPES.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      type,
      name: typeInfo?.label || ''
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'nda',
      content: PLACEHOLDER_CONTENT,
      description: '',
      isRequired: true
    });
    setSelectedTemplate(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      description: template.description || '',
      isRequired: template.isRequired
    });
    setShowModal(true);
  };

  const openViewModal = (template) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const openDeleteModal = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (selectedTemplate) {
        // Update existing
        await api.put(`/agreements/${selectedTemplate._id}`, formData);
        setSuccess('Agreement template updated successfully');
      } else {
        // Create new
        await api.post('/agreements', formData);
        setSuccess('Agreement template created successfully');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save agreement template');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewVersion = async (template) => {
    if (!window.confirm('This will create a new version of this agreement. All existing partners will need to sign the updated version. Continue?')) {
      return;
    }

    try {
      setError('');
      await api.post(`/agreements/${template._id}/new-version`);
      setSuccess('New version created. Partners will be notified to sign the updated agreement.');
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create new version');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      setError('');
      await api.put(`/agreements/${template._id}`, { isActive: !template.isActive });
      setSuccess(`Agreement template ${template.isActive ? 'deactivated' : 'activated'}`);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update template');
    }
  };

  const handleDelete = async () => {
    try {
      setError('');
      await api.delete(`/agreements/${selectedTemplate._id}`);
      setSuccess('Agreement template deleted');
      setShowDeleteModal(false);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const getTypeLabel = (type) => {
    return AGREEMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Agreement Templates" subtitle="Manage legal agreement templates" color={config.color}>
      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agreement Templates</h2>
          <p className="text-gray-600 mt-1">Create and manage legal agreements for channel partners</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">How Agreements Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Partners must sign all required agreements before they can view properties</li>
          <li>• When you update an agreement, create a new version so partners can re-sign</li>
          <li>• Old signed versions are preserved for legal compliance</li>
          <li>• Use placeholders: <code className="bg-blue-100 px-1 rounded">{'{{partnerName}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{companyName}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{date}}'}</code></li>
        </ul>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Agreement Templates</h3>
          <p className="text-gray-500 mb-4">Create your first agreement template for channel partners</p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    {template.description && (
                      <div className="text-sm text-gray-500">{template.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {getTypeLabel(template.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">v{template.version}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(template)}
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        template.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {template.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {template.isRequired ? (
                      <span className="text-red-600 font-medium text-sm">Required</span>
                    ) : (
                      <span className="text-gray-500 text-sm">Optional</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openViewModal(template)}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                        title="View"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCreateNewVersion(template)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="New Version"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(template)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedTemplate ? 'Edit Agreement Template' : 'Create Agreement Template'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agreement Type *</label>
                {selectedTemplate ? (
                  <input
                    type="text"
                    value={getTypeLabel(formData.type)}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                ) : (
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {AGREEMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {AGREEMENT_TYPES.find(t => t.value === formData.type)?.description}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agreement Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Non-Disclosure Agreement for Channel Partners"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description shown to partners before signing"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agreement Content *</label>
                <p className="text-sm text-gray-500 mb-2">
                  Use placeholders: <code className="bg-gray-100 px-1 rounded">{'{{partnerName}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{companyName}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{partnerPhone}}'}</code>
                </p>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  required
                />
              </div>

              {/* Required Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isRequired"
                  id="isRequired"
                  checked={formData.isRequired}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isRequired" className="text-sm text-gray-700">
                  Required agreement (partners must sign before viewing properties)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (selectedTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-500">Version {selectedTemplate.version} • {getTypeLabel(selectedTemplate.type)}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap font-mono text-sm">
                {selectedTemplate.content}
              </div>
              <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <span>Status: <span className={selectedTemplate.isActive ? 'text-green-600' : 'text-gray-500'}>{selectedTemplate.isActive ? 'Active' : 'Inactive'}</span></span>
                <span>Required: <span className={selectedTemplate.isRequired ? 'text-red-600' : 'text-gray-500'}>{selectedTemplate.isRequired ? 'Yes' : 'No'}</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Agreement Template</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{selectedTemplate.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AgreementTemplates;