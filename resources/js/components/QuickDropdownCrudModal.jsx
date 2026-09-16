import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';

export default function QuickDropdownCrudModal({
  isOpen,
  onClose,
  type, // 'gold_type' | 'setting_style' | 'diamond_range'
  onItemSelect, // callback when an item is added or selected: (value, fullItem) => void
  onRefresh, // callback to refresh parent metadata
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    purity: '',
    description: '',
    color: 'red',
    min_ct: '',
    max_ct: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const config = {
    gold_type: {
      title: 'Manage Gold Types',
      icon: 'fa-solid fa-coins',
      endpoint: '/gold-types',
      itemName: 'Gold Type',
      emptyNamePlaceholder: 'e.g. 20 Carat Rose Gold or 18KT White Gold',
    },
    setting_style: {
      title: 'Manage Setting Styles',
      icon: 'fa-regular fa-gem',
      endpoint: '/styles',
      itemName: 'Setting Style',
      emptyNamePlaceholder: 'e.g. Micro Pave Setting or Channel Setting',
    },
    diamond_range: {
      title: 'Manage Diamond Wt Ranges',
      icon: 'fa-solid fa-gem',
      endpoint: '/diamond-ranges',
      itemName: 'Diamond Range',
      emptyNamePlaceholder: 'e.g. 2 – 3 Carat or Solitaire Above 3 CT',
    },
  }[type] || {
    title: 'Manage Options',
    icon: 'fa-solid fa-list',
    endpoint: '/gold-types',
    itemName: 'Option',
    emptyNamePlaceholder: 'Enter name',
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(config.endpoint);
      setItems(res.data || []);
    } catch (err) {
      console.error(err);
      showToast(`Failed to load ${config.itemName} list`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchItems();
    }
  }, [isOpen, type]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      purity: '',
      description: '',
      color: 'red',
      min_ct: '',
      max_ct: '',
    });
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      purity: item.purity || '',
      description: item.description || '',
      color: item.color || 'red',
      min_ct: item.min_ct !== null && item.min_ct !== undefined ? String(item.min_ct) : '',
      max_ct: item.max_ct !== null && item.max_ct !== undefined ? String(item.max_ct) : '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast(`Please provide a valid ${config.itemName} name`, 'error');
      return;
    }

    setSaving(true);
    try {
      let savedItem = null;
      if (editingId) {
        // Update
        const res = await api.put(`${config.endpoint}/${editingId}`, formData);
        savedItem = res.data?.data || res.data;
        showToast(`${config.itemName} "${formData.name}" updated successfully`, 'success');
      } else {
        // Create
        const res = await api.post(config.endpoint, formData);
        savedItem = res.data?.data || res.data;
        showToast(`${config.itemName} "${formData.name}" added successfully`, 'success');
      }

      resetForm();
      await fetchItems();
      if (onRefresh) onRefresh();

      if (savedItem && onItemSelect) {
        if (type === 'diamond_range') {
          onItemSelect(savedItem.code || savedItem.id, savedItem);
        } else {
          onItemSelect(savedItem.name, savedItem);
        }
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || `Failed to save ${config.itemName}`;
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`${config.endpoint}/${deleteTarget.id}`);
      showToast(`${config.itemName} "${deleteTarget.name}" deleted successfully`, 'success');
      setDeleteTarget(null);
      await fetchItems();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      showToast(`Failed to delete ${config.itemName}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg">
              <i className={config.icon}></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-snug">{config.title}</h3>
              <p className="text-xs text-gray-500">Create, edit, or remove dropdown options dynamically</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Add / Edit Input Card */}
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 border border-gray-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <i className={editingId ? 'fa-solid fa-pen text-amber-600' : 'fa-solid fa-plus text-[#b01622]'}></i>
                {editingId ? `Edit ${config.itemName}` : `Add New ${config.itemName}`}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={config.emptyNamePlaceholder}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 h-[38px] bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622]"
                />
              </div>

              {/* Diamond specific fields: Min & Max Carat */}
              {type === 'diamond_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Carat (CT)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="e.g. 1.00"
                      value={formData.min_ct}
                      onChange={(e) => setFormData({ ...formData, min_ct: e.target.value })}
                      className="w-full px-3 h-[38px] bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Max Carat (CT, Optional)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="e.g. 2.00 (leave blank for above)"
                      value={formData.max_ct}
                      onChange={(e) => setFormData({ ...formData, max_ct: e.target.value })}
                      className="w-full px-3 h-[38px] bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622]"
                    />
                  </div>
                </div>
              )}

              {/* Gold Type specific field: Purity */}
              {type === 'gold_type' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Purity / Karat Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 75.0% Fine Gold / 18KT"
                    value={formData.purity}
                    onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    className="w-full px-3.5 h-[38px] bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              )}

              {/* Setting Style specific field: Description */}
              {type === 'setting_style' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Delicate gemstone prong setting"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 h-[38px] bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className={editingId ? 'fa-solid fa-check' : 'fa-solid fa-plus'}></i>
                      {editingId ? 'Save Changes' : `Add ${config.itemName}`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Existing Items List */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Current {config.itemName} Options ({items.length})
              </span>
              <span className="text-[11px] text-gray-400">Click row to select immediately</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#b01622]"></i> Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No items found. Add the first one above!
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                {items.map((item) => {
                  const isBeingEdited = editingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 transition-colors ${
                        isBeingEdited ? 'bg-amber-50/60' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <div
                        className="flex-1 cursor-pointer pr-3"
                        onClick={() => {
                          if (onItemSelect) {
                            if (type === 'diamond_range') {
                              onItemSelect(item.code || item.id, item);
                            } else {
                              onItemSelect(item.name, item);
                            }
                            showToast(`Selected "${item.name}"`, 'success');
                            onClose();
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-xs">{item.name}</span>
                          {item.code && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-mono">
                              {item.code}
                            </span>
                          )}
                        </div>

                        {/* Extra details line */}
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                          {type === 'diamond_range' && (
                            <span>
                              {item.min_ct !== null ? `${item.min_ct} CT` : '0 CT'}
                              {item.max_ct !== null ? ` to ${item.max_ct} CT` : '+'}
                            </span>
                          )}
                          {type === 'gold_type' && item.purity && <span>{item.purity}</span>}
                          {type === 'setting_style' && item.description && <span>{item.description}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          title="Edit"
                          className="w-7 h-7 rounded-md hover:bg-gray-200/80 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <i className="fa-solid fa-pen text-[11px]"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                          className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-[#b01622] transition-colors"
                        >
                          <i className="fa-regular fa-trash-can text-[11px]"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${config.itemName}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Future uploads will not have this option in the dropdown.`}
        confirmText="Yes, Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
