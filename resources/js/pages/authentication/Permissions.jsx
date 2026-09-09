import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Permissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete Confirm Modal State
  const [deleteTargetPerm, setDeleteTargetPerm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Default Actions available in the form grid (matching user's image)
  const defaultActionList = ['Create', 'Edit', 'View', 'Delete', 'Update', 'Approve', 'Reject'];

  const [formData, setFormData] = useState({
    module_name: '',
    actions: ['Create', 'Edit', 'View', 'Delete', 'Update', 'Approve', 'Reject'],
    custom_actions: '',
    description: ''
  });

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/permissions');
      setPermissions(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to load permission modules', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      module_name: '',
      actions: ['Create', 'Edit', 'View', 'Delete', 'Update', 'Approve', 'Reject'],
      custom_actions: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (perm) => {
    setEditingId(perm.id);
    setFormData({
      module_name: perm.module_name || '',
      actions: Array.isArray(perm.actions) ? perm.actions : (perm.actions ? JSON.parse(perm.actions) : []),
      custom_actions: perm.custom_actions || '',
      description: perm.description || ''
    });
    setShowModal(true);
  };

  const handleToggleAction = (actionName) => {
    setFormData(prev => {
      const current = prev.actions || [];
      if (current.includes(actionName)) {
        return { ...prev, actions: current.filter(a => a !== actionName) };
      } else {
        return { ...prev, actions: [...current, actionName] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.module_name.trim()) {
      showToast('Please enter a Module Name (e.g. users)', 'error', 'Validation Error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/permissions/${editingId}`, formData);
        showToast(`Permission module "${formData.module_name}" updated successfully!`, 'success', 'Updated');
      } else {
        await api.post('/permissions', formData);
        showToast(`New permission module "${formData.module_name}" created successfully!`, 'success', 'Created');
      }
      setShowModal(false);
      fetchPermissions();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save permissions module', 'error', 'Operation Failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetPerm) return;
    setDeleting(true);
    try {
      await api.delete(`/permissions/${deleteTargetPerm.id}`);
      showToast(`Permission module "${deleteTargetPerm.module_name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTargetPerm(null);
      fetchPermissions();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete permission module', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredPermissions = permissions.filter(perm => 
    (perm.module_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (perm.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage) || 1;
  const paginatedPermissions = filteredPermissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            AUTHENTICATION <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">MODULE PERMISSIONS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Module Permissions</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#f9572a] hover:bg-[#e0451a] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Create Permissions
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#f9572a] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-shield"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Permission Modules</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{permissions.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-key"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Configured System Actions</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {permissions.reduce((acc, p) => acc + (Array.isArray(p.actions) ? p.actions.length : 0), 0)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">System Coverage</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">100%</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search module permissions..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#f9572a] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Permissions Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4">MODULE NAME</th>
                <th className="px-6 py-4">ENABLED ACTIONS</th>
                <th className="px-6 py-4">CUSTOM ACTIONS</th>
                <th className="px-6 py-4">SHARED DESCRIPTION</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading permissions...
                  </td>
                </tr>
              ) : paginatedPermissions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    No permission modules found.
                  </td>
                </tr>
              ) : (
                paginatedPermissions.map(perm => {
                  const actionList = Array.isArray(perm.actions) ? perm.actions : [];
                  return (
                    <tr key={perm.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 capitalize">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-key text-xs text-[#f9572a]"></i>
                          <span>{perm.module_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {actionList.map(act => (
                            <span key={act} className="bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                              {act}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-600">
                        {perm.custom_actions || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                        {perm.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3 text-gray-400">
                          <button
                            onClick={() => handleOpenEditModal(perm)}
                            className="p-1 hover:text-[#f9572a] transition-colors"
                            title="Edit Permissions"
                          >
                            <i className="fa-regular fa-pen-to-square text-sm"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTargetPerm(perm)}
                            className="p-1 hover:text-red-600 transition-colors"
                            title="Delete Permission Module"
                          >
                            <i className="fa-regular fa-trash-can text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredPermissions.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE / EDIT PERMISSION MODAL (Exact Visual Replica of User-Uploaded Screenshot) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-gray-100 my-8">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Module Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Module Name
                </label>
                <input
                  type="text"
                  name="module_name"
                  value={formData.module_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, module_name: e.target.value }))}
                  placeholder="example: users"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f9572a] focus:ring-1 focus:ring-[#f9572a] transition-colors"
                />
              </div>

              {/* Default Actions (7 Checkbox Cards matching image layout) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Default Actions
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {defaultActionList.map(action => {
                    const isChecked = formData.actions?.includes(action);
                    return (
                      <div
                        key={action}
                        onClick={() => handleToggleAction(action)}
                        className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          isChecked 
                            ? 'bg-white border-gray-300 shadow-sm' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                      >
                        <span className={`text-xs font-semibold ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                          {action}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Actions */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Custom Actions
                </label>
                <input
                  type="text"
                  name="custom_actions"
                  value={formData.custom_actions}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_actions: e.target.value }))}
                  placeholder="example: export, assign, download"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f9572a] focus:ring-1 focus:ring-[#f9572a] transition-colors"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Add extra actions separated by commas or spaces.
                </p>
              </div>

              {/* Shared Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Shared Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description applied to all newly created permissions"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f9572a] focus:ring-1 focus:ring-[#f9572a] transition-colors resize-none"
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#f9572a] hover:bg-[#e0451a] text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {editingId ? 'Update Permissions' : 'Create Permissions'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetPerm}
        title="Delete Permission Module?"
        message={
          deleteTargetPerm
            ? `Are you sure you want to delete permission settings for module "${deleteTargetPerm.module_name}"? Roles relying on these permissions may be affected.`
            : ''
        }
        confirmText="Delete Module"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetPerm(null)}
      />

    </div>
  );
}
