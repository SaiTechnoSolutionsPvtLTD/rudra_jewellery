import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function SettingStyles() {
  const { showToast } = useToast();
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'fa-regular fa-gem',
    description: '',
    color: 'red',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const availableIcons = [
    { value: 'fa-regular fa-gem', label: 'Gem' },
    { value: 'fa-solid fa-ring', label: 'Ring' },
    { value: 'fa-solid fa-vihara', label: 'Temple' },
    { value: 'fa-regular fa-star', label: 'Star' },
    { value: 'fa-solid fa-crown', label: 'Crown' },
    { value: 'fa-solid fa-circle-notch', label: 'Circle' },
    { value: 'fa-solid fa-sparkles', label: 'Sparkles' },
    { value: 'fa-solid fa-certificate', label: 'Badge' },
  ];

  const availableColors = [
    { value: 'red', label: 'Red / Ruby', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    { value: 'amber', label: 'Amber / Gold', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { value: 'emerald', label: 'Emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { value: 'blue', label: 'Blue / Sapphire', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { value: 'purple', label: 'Purple / Amethyst', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { value: 'slate', label: 'Slate / Platinum', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  ];

  const fetchStyles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/styles');
      setStyles(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load setting styles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  const openAddModal = () => {
    setEditingStyle(null);
    setFormData({
      name: '',
      icon: 'fa-regular fa-gem',
      description: '',
      color: 'red',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (style) => {
    setEditingStyle(style);
    setFormData({
      name: style.name || '',
      icon: style.icon || 'fa-regular fa-gem',
      description: style.description || '',
      color: style.color || 'red',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a style name', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingStyle) {
        await api.put(`/styles/${editingStyle.id}`, formData);
        showToast('Style updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/styles', formData);
        showToast('Style created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchStyles();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save style';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/styles/${deleteTarget.id}`);
      showToast(`Style "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchStyles();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete style', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Setting Styles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and add new jewellery styles to the project</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#b01622] text-white rounded-lg text-sm font-semibold hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-plus text-xs"></i> Add Style
        </button>
      </div>

      {/* Grid of Styles */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500">Loading styles...</span>
        </div>
      ) : styles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-16 text-center text-gray-400">
          <i className="fa-regular fa-gem text-4xl mb-3 text-gray-300"></i>
          <p className="text-sm font-semibold text-gray-700">No setting styles created yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "+ Add Style" to create your first jewellery style</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {styles
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((style) => {
            const colorDef = availableColors.find((c) => c.value === style.color) || availableColors[0];

            return (
              <div
                key={style.id}
                className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorDef.bg} ${colorDef.text} text-lg`}>
                        <i className={style.icon || 'fa-regular fa-gem'}></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{style.name}</h3>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5 ${colorDef.bg} ${colorDef.text}`}>
                          {colorDef.label.split('/')[0].trim()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(style)}
                        className="w-8 h-8 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(style)}
                        className="w-8 h-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                    {style.description || 'No description provided for this jewellery setting style.'}
                  </p>
                </div>
              </div>
            );
          })}
          </div>
          {/* Pagination */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(styles.length / itemsPerPage) || 1}
              totalItems={styles.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
            />
          </div>
        </>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editingStyle ? 'Edit Setting Style' : 'Add New Setting Style'}
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
                  Style Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Antique Temple, Micro Pave"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Icon / Motif</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  >
                    {availableIcons.map((ic) => (
                      <option key={ic.value} value={ic.value}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Color Palette</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  >
                    {availableColors.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Brief description of the style and when it is used..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white resize-none"
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
                  {saving ? 'Saving...' : editingStyle ? 'Update Style' : 'Save Style'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Style"
        message={`Are you sure you want to delete style "${deleteTarget?.name}"?`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
