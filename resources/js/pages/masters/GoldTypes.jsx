import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { handleIntegerKeyDown, sanitizeInteger } from '../../utils/numberInputUtils';

export default function GoldTypes() {
  const { showToast } = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    purity: '',
    sort_order: '',
    description: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/gold-types');
      setTypes(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load gold types', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const openAddModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      purity: '',
      sort_order: types.length + 1,
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingType(item);
    setFormData({
      name: item.name || '',
      purity: item.purity || '',
      sort_order: item.sort_order || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a Gold Type name', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingType) {
        await api.put(`/gold-types/${editingType.id}`, formData);
        showToast('Gold type updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/gold-types', formData);
        showToast('Gold type created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchTypes();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save gold type';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/gold-types/${deleteTarget.id}`);
      showToast(`Gold type "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchTypes();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete gold type', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shadow-2xs">
              <i className="fa-solid fa-coins"></i>
            </span>
            Gold Types Master
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage metal purity standards and karat categories available for product designs & jewelry billing.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Add Gold Type
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Gold Types</div>
          <div className="text-2xl font-black text-gray-900">{types.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Active metal options in catalog</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Standard Karats</div>
          <div className="text-2xl font-black text-amber-600">
            {types.filter(t => ['14 Carat', '18 Carat', '22 Carat', '24 Carat'].includes(t.name)).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Hallmark certified purity baselines</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Custom Alloys</div>
          <div className="text-2xl font-black text-slate-700">
            {types.filter(t => !['14 Carat', '18 Carat', '22 Carat', '24 Carat'].includes(t.name)).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Rose gold, white gold & custom types</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#b01622] mb-2 block"></i>
            Loading gold types...
          </div>
        ) : types.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-coins text-3xl text-gray-300 mb-3 block"></i>
            No gold types configured yet. Click "Add Gold Type" to create one.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Order</th>
                    <th className="px-5 py-3.5">Gold Type</th>
                    <th className="px-5 py-3.5">Purity / Karat Note</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {types
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4 text-gray-400 font-mono text-[11px]">
                        #{type.sort_order || type.id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                            <i className="fa-solid fa-coins"></i>
                          </span>
                          <span className="font-bold text-gray-900 text-[13px]">{type.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {type.purity ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-[11px] border border-amber-100">
                            {type.purity}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Standard</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 max-w-xs truncate">
                        {type.description || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(type)}
                            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(type)}
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
              totalPages={Math.ceil(types.length / itemsPerPage) || 1}
              totalItems={types.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
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
                <i className={editingType ? 'fa-solid fa-pen text-amber-600' : 'fa-solid fa-plus text-[#b01622]'}></i>
                {editingType ? 'Edit Gold Type' : 'Add New Gold Type'}
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
                  Gold Type Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 18 Carat, 20 Carat Rose Gold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Purity / Karat Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 75.0% Fine Gold / 18KT"
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Brief description of the alloy or gold purity..."
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
                      <i className={editingType ? 'fa-solid fa-check' : 'fa-solid fa-plus'}></i>
                      {editingType ? 'Update' : 'Create'}
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
        title="Delete Gold Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Future product designs will not have this option in the dropdown.`}
        confirmText="Yes, Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
