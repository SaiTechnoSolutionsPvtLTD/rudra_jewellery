import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Stamps() {
  const { showToast } = useToast();
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    applicable_for: [],
    sort_order: '',
    description: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchStamps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stamps');
      setStamps(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load stamp master items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStamps();
    const handleUpdate = () => fetchStamps();
    window.addEventListener('rudhra_stamps_updated', handleUpdate);
    window.addEventListener('rudhra_inventory_updated', handleUpdate);
    return () => {
      window.removeEventListener('rudhra_stamps_updated', handleUpdate);
      window.removeEventListener('rudhra_inventory_updated', handleUpdate);
    };
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    const maxSort = stamps.reduce((max, item) => {
      const num = parseInt(item.sort_order, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    setFormData({
      name: '',
      code: '',
      applicable_for: [],
      sort_order: (maxSort + 1).toString(),
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    let appArr = [];
    if (item.applicable_for) {
      if (item.applicable_for === 'All') {
        appArr = ['Gold', 'Silver', 'Platinum', 'Diamond', 'Stone'];
      } else {
        appArr = item.applicable_for.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    setFormData({
      name: item.name || '',
      code: item.code || '',
      applicable_for: appArr,
      sort_order: item.sort_order ? String(item.sort_order) : '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const toggleApplicableMaterial = (material) => {
    setFormData((prev) => {
      const current = prev.applicable_for || [];
      if (current.includes(material)) {
        return { ...prev, applicable_for: current.filter((m) => m !== material) };
      } else {
        return { ...prev, applicable_for: [...current, material] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a stamp name (e.g. 916, 925, 999)', 'error');
      return;
    }
    if (!formData.applicable_for || formData.applicable_for.length === 0) {
      showToast('Please select at least one material type (Gold, Platinum, Silver, Diamond, or Stone)', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        applicable_for: Array.isArray(formData.applicable_for)
          ? formData.applicable_for.join(',')
          : formData.applicable_for,
      };

      if (editingItem) {
        await api.put(`/stamps/${editingItem.id}`, payload);
        showToast('Stamp master updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/stamps', payload);
        showToast('Stamp master created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchStamps();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save stamp master';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/stamps/${deleteTarget.id}`);
      showToast(`Stamp "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchStamps();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete stamp', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderMaterialBadges = (applicableStr) => {
    if (!applicableStr) return null;
    const raw = applicableStr;
    const list = raw === 'All' ? ['Gold', 'Silver', 'Platinum', 'Diamond', 'Stone'] : raw.split(',').map((s) => s.trim());

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {list.includes('Gold') && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <i className="fa-solid fa-coins mr-1 text-[9px] text-amber-600"></i>Gold
          </span>
        )}
        {list.includes('Platinum') && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
            <i className="fa-solid fa-ring mr-1 text-[9px] text-teal-600"></i>Platinum
          </span>
        )}
        {list.includes('Silver') && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <i className="fa-solid fa-coins mr-1 text-[9px] text-slate-500"></i>Silver
          </span>
        )}
        {list.includes('Diamond') && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <i className="fa-solid fa-gem mr-1 text-[9px] text-blue-600"></i>Diamond
          </span>
        )}
        {list.includes('Stone') && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <i className="fa-solid fa-cube mr-1 text-[9px] text-purple-600"></i>Stone
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stamp Master</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hallmarking stamps, purity marks, and link with Gold, Platinum, Silver, Diamond, or Stone</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#b01622] text-white rounded-lg text-sm font-semibold hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-plus text-xs"></i> Add Stamp
        </button>
      </div>

      {/* Grid of Stamps */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500">Loading Stamp Master...</span>
        </div>
      ) : stamps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-16 text-center text-gray-400">
          <i className="fa-solid fa-certificate text-4xl mb-3 text-gray-300"></i>
          <p className="text-sm font-semibold text-gray-700">No Stamps added yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "+ Add Stamp" to create your first stamp entry</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stamps
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm border border-amber-200 shrink-0">
                          <i className="fa-solid fa-certificate"></i>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.name}</h3>
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5 bg-stone-100 text-stone-600 font-mono">
                            Sort: #{item.sort_order || item.id}
                          </span>
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

                    {renderMaterialBadges(item.applicable_for)}

                    {item.description && (
                      <p className="text-xs text-gray-500 leading-relaxed mt-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(stamps.length / itemsPerPage) || 1}
              totalItems={stamps.length}
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
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-stone-50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-certificate text-[#b01622]"></i>
                {editingItem ? 'Edit Stamp Master' : 'Add New Stamp Master'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Stamp Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 916, 999, IGI Certified, BIS Hallmarked"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622]"
                />
              </div>

              {/* Link With Gold / Platinum / Silver / Diamond / Stone Checkbox Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Link With Material Type <span className="text-[#b01622]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(formData.applicable_for || []).includes('Gold')}
                      onChange={() => toggleApplicableMaterial('Gold')}
                      className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-amber-900">
                      <i className="fa-solid fa-coins text-amber-600"></i> Gold
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(formData.applicable_for || []).includes('Platinum')}
                      onChange={() => toggleApplicableMaterial('Platinum')}
                      className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-teal-900">
                      <i className="fa-solid fa-ring text-teal-600"></i> Platinum
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(formData.applicable_for || []).includes('Silver')}
                      onChange={() => toggleApplicableMaterial('Silver')}
                      className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-slate-800">
                      <i className="fa-solid fa-coins text-slate-500"></i> Silver
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(formData.applicable_for || []).includes('Diamond')}
                      onChange={() => toggleApplicableMaterial('Diamond')}
                      className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-blue-900">
                      <i className="fa-solid fa-gem text-blue-600"></i> Diamond
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(formData.applicable_for || []).includes('Stone')}
                      onChange={() => toggleApplicableMaterial('Stone')}
                      className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-purple-900">
                      <i className="fa-solid fa-cube text-purple-600"></i> Stone
                    </span>
                  </label>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Stamps will be dynamically filtered in dropdowns based on product material type (e.g. Silver stamps for Silver items).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 916, IGI, GIA"
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
                  placeholder="Description of the stamp mark..."
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
                  {saving ? 'Saving...' : editingItem ? 'Update Stamp' : 'Save Stamp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Stamp Master"
        message={`Are you sure you want to delete stamp "${deleteTarget?.name}"?`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
