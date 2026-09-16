import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function DiamondRanges() {
  const { showToast } = useToast();
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRange, setEditingRange] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    min_ct: '',
    max_ct: '',
    description: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchRanges = async () => {
    try {
      setLoading(true);
      const res = await api.get('/diamond-ranges');
      setRanges(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load diamond ranges', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, []);

  const openAddModal = () => {
    setEditingRange(null);
    setFormData({
      name: '',
      code: '',
      min_ct: '',
      max_ct: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingRange(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      min_ct: item.min_ct !== null && item.min_ct !== undefined ? String(item.min_ct) : '',
      max_ct: item.max_ct !== null && item.max_ct !== undefined ? String(item.max_ct) : '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a Diamond Range name', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingRange) {
        await api.put(`/diamond-ranges/${editingRange.id}`, formData);
        showToast('Diamond range updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/diamond-ranges', formData);
        showToast('Diamond range created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchRanges();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save diamond range';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/diamond-ranges/${deleteTarget.id}`);
      showToast(`Diamond range "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchRanges();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete diamond range', 'error');
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
            <span className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg shadow-2xs">
              <i className="fa-solid fa-gem"></i>
            </span>
            Diamond Weight Ranges
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure diamond carat brackets used for product classification, upload dropdowns, and catalog filtering.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Add Diamond Range
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Weight Brackets</div>
          <div className="text-2xl font-black text-gray-900">{ranges.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Carat ranges available for filtering</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Small Diamonds</div>
          <div className="text-2xl font-black text-cyan-600">
            {ranges.filter(r => (r.max_ct !== null && r.max_ct <= 1.0)).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Under 1.00 Carat / pavé ranges</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Solitaire Brackets</div>
          <div className="text-2xl font-black text-blue-700">
            {ranges.filter(r => (r.min_ct !== null && r.min_ct >= 1.0)).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">1.00 CT and larger gemstones</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#b01622] mb-2 block"></i>
            Loading diamond ranges...
          </div>
        ) : ranges.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-gem text-3xl text-gray-300 mb-3 block"></i>
            No diamond ranges configured yet. Click "Add Diamond Range" to create one.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Range Name</th>
                    <th className="px-5 py-3.5">Code / Slug</th>
                    <th className="px-5 py-3.5">Min Carat</th>
                    <th className="px-5 py-3.5">Max Carat</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {ranges
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((range) => (
                    <tr key={range.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-xs">
                            <i className="fa-solid fa-gem"></i>
                          </span>
                          <span className="font-bold text-gray-900 text-[13px]">{range.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-mono text-[11px] rounded">
                          {range.code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700 font-mono">
                        {range.min_ct !== null ? `${Number(range.min_ct).toFixed(3)} CT` : '0.000 CT'}
                      </td>
                      <td className="px-5 py-4 text-gray-700 font-mono">
                        {range.max_ct !== null ? `${Number(range.max_ct).toFixed(3)} CT` : <span className="text-gray-400">No limit (+)</span>}
                      </td>
                      <td className="px-5 py-4 text-gray-500 max-w-xs truncate">
                        {range.description || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(range)}
                            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(range)}
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
              totalPages={Math.ceil(ranges.length / itemsPerPage) || 1}
              totalItems={ranges.length}
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
                <i className={editingRange ? 'fa-solid fa-pen text-cyan-600' : 'fa-solid fa-plus text-[#b01622]'}></i>
                {editingRange ? 'Edit Diamond Range' : 'Add New Diamond Range'}
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
                  Range Display Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2 – 3 Carat"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Code / Identifier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2_to_3 (auto-generated if blank)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Min Carat (CT)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 2.000"
                    value={formData.min_ct}
                    onChange={(e) => setFormData({ ...formData, min_ct: e.target.value })}
                    className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Max Carat (CT)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 3.000 (blank = +)"
                    value={formData.max_ct}
                    onChange={(e) => setFormData({ ...formData, max_ct: e.target.value })}
                    className="w-full px-3.5 h-[40px] bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Brief description of diamonds matching this range..."
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
                      <i className={editingRange ? 'fa-solid fa-check' : 'fa-solid fa-plus'}></i>
                      {editingRange ? 'Update' : 'Create'}
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
        title="Delete Diamond Range"
        message={`Are you sure you want to delete range "${deleteTarget?.name}"? Future product designs will not have this option in the dropdown.`}
        confirmText="Yes, Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
