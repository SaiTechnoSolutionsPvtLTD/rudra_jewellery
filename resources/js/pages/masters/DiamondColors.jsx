import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { handleIntegerKeyDown, sanitizeInteger } from '../../utils/numberInputUtils';

export default function DiamondColors() {
  const { showToast } = useToast();
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sort_order: '',
    description: '',
    status: 'active',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchColors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/diamond-colors');
      setColors(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load diamond colors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    const maxSort = colors.reduce((max, item) => {
      const num = parseInt(item.sort_order, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    setFormData({
      name: '',
      code: '',
      sort_order: maxSort + 1,
      description: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      sort_order: item.sort_order || '',
      description: item.description || '',
      status: item.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a Diamond Color name', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.put(`/diamond-colors/${editingItem.id}`, formData);
        showToast('Diamond color updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/diamond-colors', formData);
        showToast('Diamond color created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchColors();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save diamond color';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/diamond-colors/${deleteTarget.id}`);
      showToast(`Diamond color "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchColors();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete diamond color', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredColors = colors.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg shadow-2xs">
              <i className="fa-solid fa-palette"></i>
            </span>
            Diamond Colour Master
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage standard GIA diamond color grades (D-Z, Fancy) available in diamond range item selection.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Add Diamond Colour
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Colour Grades</div>
          <div className="text-2xl font-black text-gray-900">{colors.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Configured color options</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Colorless Grades</div>
          <div className="text-2xl font-black text-cyan-600">
            {colors.filter((c) => ['D', 'E', 'F'].includes(c.code)).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">D, E, F premium grades</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Status</div>
          <div className="text-2xl font-black text-emerald-600">
            {colors.filter((c) => c.status === 'active').length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Available in dropdowns</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {/* Search bar header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
            <input
              type="text"
              placeholder="Search by color grade, code, or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#b01622] mb-2 block"></i>
            Loading diamond colors...
          </div>
        ) : filteredColors.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-palette text-3xl text-gray-300 mb-3 block"></i>
            No diamond colors found. Click "Add Diamond Colour" to create one.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-center w-14">S.No</th>
                    <th className="px-5 py-3.5">Colour Name</th>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredColors
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-4 text-center text-gray-500 font-mono text-[11px] font-semibold">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-xs">
                              <i className="fa-solid fa-gem"></i>
                            </span>
                            <span className="font-bold text-gray-900 text-[13px]">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {item.code ? (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border border-slate-200">
                              {item.code}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.status === 'inactive'
                                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-xs truncate">
                          {item.description || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="w-8 h-8 rounded-lg text-gray-400 hover:text-[#b01622] hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <i className="fa-regular fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredColors.length / itemsPerPage) || 1}
              totalItems={filteredColors.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => {
                setItemsPerPage(num);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <i className={editingItem ? 'fa-solid fa-pen text-cyan-600' : 'fa-solid fa-plus text-[#b01622]'}></i>
                {editingItem ? 'Edit Diamond Colour' : 'Add New Diamond Colour'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Colour Grade Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. D (Colorless), G (Near Colorless)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Short Code / Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. D, E, F, G"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={formData.sort_order}
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => setFormData({ ...formData, sort_order: sanitizeInteger(e.target.value) })}
                    className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Brief description of the color grade..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className={editingItem ? 'fa-solid fa-check' : 'fa-solid fa-plus'}></i>
                      {editingItem ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Diamond Colour Grade"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? It will no longer appear in the diamond master selection.`}
        confirmText="Yes, Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
