import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const LegalPages = () => {
  const config = sidebarConfig.platform_admin;
  const toast = useToast();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/legal');
      setPages(response.data.data);
    } catch (err) {
      toast.error('Failed to load legal pages.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage.title || !editingPage.content) {
      toast.error('Title and content are required.');
      return;
    }

    try {
      setSaving(true);

      await api.put(`/legal/${editingPage.slug}`, {
        title: editingPage.title,
        content: editingPage.content,
      });

      toast.success('Page updated successfully.');
      fetchPages();
      setEditingPage(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Legal Pages" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Legal Pages" subtitle="Manage privacy policy and terms of service" color={config.color}>
      {editingPage ? (
        /* Edit Page */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Edit {editingPage.title}</h2>
            <button
              onClick={() => setEditingPage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editingPage.title}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content (HTML)
              </label>
              <textarea
                value={editingPage.content}
                onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                rows={20}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingPage(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Pages List */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{page.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      /{page.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.updatedBy?.firstName ? (
                      <div>
                        <div>{formatDate(page.lastUpdated || page.updatedAt)}</div>
                        <div className="text-xs text-gray-400">
                          by {page.updatedBy.firstName} {page.updatedBy.lastName}
                        </div>
                      </div>
                    ) : (
                      formatDate(page.lastUpdated || page.updatedAt)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingPage(page)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No legal pages found. Default pages will be created automatically.
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">HTML Formatting Tips</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Use <code className="bg-gray-200 px-1 rounded">&lt;h2&gt;</code> for section headings</p>
          <p>• Use <code className="bg-gray-200 px-1 rounded">&lt;p&gt;</code> for paragraphs</p>
          <p>• Use <code className="bg-gray-200 px-1 rounded">&lt;ul&gt;&lt;li&gt;</code> for bullet lists</p>
          <p>• Use <code className="bg-gray-200 px-1 rounded">&lt;strong&gt;</code> for bold text</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LegalPages;