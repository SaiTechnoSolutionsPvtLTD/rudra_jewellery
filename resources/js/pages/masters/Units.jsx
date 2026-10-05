import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Units() {
  const { showToast } = useToast();
  const [units, setUnits] = useState([]);
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
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/units');
      setUnits(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load unit master items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      sort_order: (units.length + 1).toString(),
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      sort_order: item.sort_order ? String(item.sort_order) : '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a unit name (e.g. Carat, Gram, Pcs)', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.put(`/units/${editingItem.id}`, formData);
        showToast('Unit master updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/units', formData);
        showToast('Unit master created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchUnits();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save unit master';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/units/${deleteTarget.id}`);
      showToast(`Unit "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchUnits();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete unit', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Unit Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage measurement units (Carats, Grams, Ct, Pieces, Kg) for inventory and component specification
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#b01622] text-white rounded-lg text-sm font-semibold hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-plus text-xs"></i> Add Unit
        </button>
      </div>

      {/* Grid of Units */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500">Loading Unit Master...</span>
        </div>
      ) : units.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-16 text-center text-gray-400">
          <i className="fa-solid fa-scale-balanced text-4xl mb-3 text-gray-300"></i>
          <p className="text-sm font-semibold text-gray-700">No Units added yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "+ Add Unit" to create your first unit entry</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {units
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-sm border border-red-200">
                          <i className="fa-solid fa-scale-balanced"></i>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.code && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono">
                                Code: {item.code}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-50 text-stone-500 font-mono">
                              #{item.sort_order || item.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="w-8 h-8 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="w-8 h-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      {item.description || `Measurement unit "${item.name}" for component metrics and product inventory weight.`}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(units.length / itemsPerPage) || 1}
              totalItems={units.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
            />
          </div>
        </>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editingItem ? 'Edit Unit Master' : 'Add New Unit Master'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Unit Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carat, Gram, Ct, Pieces"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unit Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. g, ct, pcs"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    placeholder="1, 2, 3..."
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Description of the measurement unit..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] resize-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Unit' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Unit Master"
        message={`Are you sure you want to delete unit "${deleteTarget?.name}"?`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
