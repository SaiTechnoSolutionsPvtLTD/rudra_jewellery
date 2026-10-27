import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Operations() {
  const { showToast } = useToast();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    icon: 'fa-solid fa-gears',
    color: 'amber',
    sort_order: '',
    status: 'active',
    description: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const availableIcons = [
    { value: 'fa-solid fa-gears', label: 'Gears / General' },
    { value: 'fa-solid fa-fire-burner', label: 'Fire / Casting' },
    { value: 'fa-solid fa-hammer', label: 'Hammer / Filing' },
    { value: 'fa-solid fa-bolt', label: 'Torch / Soldering' },
    { value: 'fa-solid fa-puzzle-piece', label: 'Puzzle / Assembly' },
    { value: 'fa-regular fa-gem', label: 'Gem / Setting' },
    { value: 'fa-solid fa-wand-magic-sparkles', label: 'Sparkles / Polishing' },
    { value: 'fa-solid fa-certificate', label: 'Badge / Finishing' },
    { value: 'fa-solid fa-palette', label: 'Palette / Enamel' },
    { value: 'fa-solid fa-pen-nib', label: 'Pen / Engraving' },
    { value: 'fa-solid fa-crosshairs', label: 'Laser / Marking' },
    { value: 'fa-solid fa-clipboard-check', label: 'Check / Inspection' },
    { value: 'fa-solid fa-droplet', label: 'Droplet / Plating' },
    { value: 'fa-solid fa-ring', label: 'Ring / Jewellery' },
  ];

  const availableColors = [
    { value: 'amber', label: 'Amber / Gold', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    { value: 'slate', label: 'Slate / Metal', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
    { value: 'red', label: 'Red / Ruby', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    { value: 'blue', label: 'Blue / Sapphire', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    { value: 'purple', label: 'Purple / Amethyst', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    { value: 'emerald', label: 'Emerald / Green', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { value: 'rose', label: 'Rose / Pink', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    { value: 'indigo', label: 'Indigo / Deep Blue', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    { value: 'teal', label: 'Teal / Cyan', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  ];

  const getColorClasses = (colorName) => {
    return availableColors.find(c => c.value === colorName) || availableColors[0];
  };

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/operations');
      setOperations(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load manufacturing operations master', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const filteredOperations = operations.filter((item) => {
    const matchesSearch = !searchQuery.trim() || (
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOperations.length / itemsPerPage) || 1;
  const paginatedOperations = filteredOperations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    setEditingItem(null);
    const maxSort = operations.reduce((max, item) => {
      const num = parseInt(item.sort_order, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    setFormData({
      name: '',
      code: '',
      icon: 'fa-solid fa-gears',
      color: 'amber',
      sort_order: (maxSort + 1).toString(),
      status: 'active',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      icon: item.icon || 'fa-solid fa-gears',
      color: item.color || 'amber',
      sort_order: item.sort_order !== undefined && item.sort_order !== null ? String(item.sort_order) : '',
      status: item.status || 'active',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter an operation name (e.g. Casting, Polishing)', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.put(`/operations/${editingItem.id}`, formData);
        showToast('Operation updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/operations', formData);
        showToast('Operation created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchOperations();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save operation';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/operations/${deleteTarget.id}`);
      showToast(`Operation "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchOperations();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete operation', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Operation Master</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#b01622]/10 text-[#b01622]">
              {operations.length} Operations
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage manufacturing operations (Casting, Filing, Setting, Polishing) dynamically used across Work in Progress tracking
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#b01622] text-white rounded-lg text-sm font-semibold hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Add Operation</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search operations by name, code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-hidden focus:border-[#b01622] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-hidden focus:border-[#b01622]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <span className="text-xs text-gray-500 ml-auto sm:ml-2">
            Showing <strong>{filteredOperations.length}</strong> of <strong>{operations.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <i className="fa-solid fa-circle-notch animate-spin text-2xl text-[#b01622] mb-2"></i>
            <p className="text-xs font-medium">Loading manufacturing operations master...</p>
          </div>
        ) : filteredOperations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
              <i className="fa-solid fa-gears text-lg"></i>
            </div>
            <p className="text-sm font-bold text-gray-800">No Operations Found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? 'Try adjusting your search criteria' : 'Click "Add Operation" above to create your first operation'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-14 text-center">S.No</th>
                  <th className="py-3 px-4">Operation Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {paginatedOperations.map((op, idx) => {
                  const colorObj = getColorClasses(op.color);
                  return (
                    <tr key={op.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-gray-500 font-semibold">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center border text-xs ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}>
                            <i className={op.icon || 'fa-solid fa-gears'}></i>
                          </span>
                          <span className="text-xs">{op.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                        {op.code ? (
                          <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px]">
                            {op.code}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 max-w-sm truncate" title={op.description}>
                        {op.description || <span className="text-gray-300 italic">No description provided</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            op.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${op.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {op.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(op)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="Edit Operation"
                          >
                            <i className="fa-solid fa-pencil text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(op)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Operation"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredOperations.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              totalItems={filteredOperations.length}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#b01622]/10 text-[#b01622] flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-gears"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {editingItem ? 'Edit Manufacturing Operation' : 'Add New Operation'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Defines a workshop production stage for Work in Progress tracking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">
                    Operation Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Casting, Filing, Polishing, Stone Setting"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Short Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CST, FIL, POL"
                    maxLength={10}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    placeholder="e.g. 1, 2, 3"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                  >
                    {availableIcons.map((ic) => (
                      <option key={ic.value} value={ic.value}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Color Theme</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                  >
                    {availableColors.map((col) => (
                      <option key={col.value} value={col.value}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">Status</label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                      <input
                        type="radio"
                        name="op_status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={() => setFormData({ ...formData, status: 'active' })}
                        className="text-[#b01622] focus:ring-[#b01622]"
                      />
                      <span>Active (Available in Work in Progress)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-500">
                      <input
                        type="radio"
                        name="op_status"
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={() => setFormData({ ...formData, status: 'inactive' })}
                        className="text-[#b01622] focus:ring-[#b01622]"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the manufacturing operation instructions or stages..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-hidden focus:border-[#b01622] resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#b01622] text-white rounded-lg text-xs font-semibold hover:bg-[#90121b] cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>{editingItem ? 'Update Operation' : 'Save Operation'}</span>
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
        title="Delete Operation?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? It will no longer appear in future Work in Progress operations.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Operation'}
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
