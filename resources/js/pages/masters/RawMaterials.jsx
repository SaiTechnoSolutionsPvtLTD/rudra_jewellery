import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function RawMaterials() {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    material_type: 'gold',
    code: '',
    karat: '',
    purity: '',
    unit: 'g',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/raw-materials');
      setMaterials(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load raw materials master', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    const maxSort = materials.reduce((max, item) => {
      const num = parseInt(item.sort_order, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    setFormData({
      name: '',
      material_type: 'gold',
      code: `RM-GLD-${Math.floor(1000 + Math.random() * 9000)}`,
      karat: '24K',
      purity: '99.9%',
      unit: 'g',
      description: '',
      is_active: true,
      sort_order: maxSort + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      material_type: item.material_type || 'gold',
      code: item.code || '',
      karat: item.karat || '',
      purity: item.purity || '',
      unit: item.unit || 'g',
      description: item.description || '',
      is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
      sort_order: item.sort_order || 0,
    });
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType) => {
    let defaultUnit = 'g';
    let defaultKarat = '';
    let defaultPurity = '';
    let prefix = 'RM-GLD';

    if (newType === 'gold') {
      defaultUnit = 'g';
      defaultKarat = '24K';
      defaultPurity = '99.9%';
      prefix = 'RM-GLD';
    } else if (newType === 'silver') {
      defaultUnit = 'g';
      defaultKarat = '';
      defaultPurity = '999 Fine';
      prefix = 'RM-SLV';
    } else if (newType === 'platinum') {
      defaultUnit = 'g';
      defaultKarat = '';
      defaultPurity = '950 Fine';
      prefix = 'RM-PLT';
    } else if (newType === 'diamond') {
      defaultUnit = 'ct';
      defaultKarat = '';
      defaultPurity = 'VVS1 / EF';
      prefix = 'RM-DIA';
    } else if (newType === 'stone') {
      defaultUnit = 'pcs';
      defaultKarat = '';
      defaultPurity = 'Natural Gemstone';
      prefix = 'RM-STN';
    }

    setFormData((prev) => ({
      ...prev,
      material_type: newType,
      unit: defaultUnit,
      karat: defaultKarat,
      purity: defaultPurity,
      code: !editingItem ? `${prefix}-${Math.floor(1000 + Math.random() * 9000)}` : prev.code,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a raw material name', 'error');
      return;
    }
    if (!formData.unit.trim()) {
      showToast('Please specify a unit of measurement', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.put(`/raw-materials/${editingItem.id}`, formData);
        showToast('Raw material updated successfully', 'success');
      } else {
        await api.post('/raw-materials', formData);
        showToast('Raw material created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save raw material';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/raw-materials/${deleteTarget.id}`);
      showToast('Raw material deleted successfully', 'success');
      setDeleteTarget(null);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to delete raw material';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      !searchTerm ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.karat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.purity?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || m.material_type?.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage) || 1;
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'gold':
      case 'gold_24k':
      case 'gold_22k':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Gold</span>;
      case 'silver':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Silver</span>;
      case 'platinum':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-300">Platinum</span>;
      case 'diamond':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">Diamond</span>;
      case 'stone':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Precious Stone</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{type}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-serif flex items-center gap-2.5">
            <i className="fa-solid fa-boxes-stacked text-[#b01622]"></i>
            Raw Materials Master
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Authoritative registry of raw materials used in purchases, opening vault stocks, and production allocations.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8f121b] text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <i className="fa-solid fa-plus text-[11px]"></i>
          Add Raw Material
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Total Materials</div>
          <div className="text-xl font-black text-stone-900 font-mono">{materials.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Gold & Metals</div>
          <div className="text-xl font-black text-amber-900 font-mono">
            {materials.filter((m) => ['gold', 'gold_24k', 'gold_22k', 'silver', 'platinum'].includes(m.material_type?.toLowerCase())).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-1">Diamonds & Stones</div>
          <div className="text-xl font-black text-cyan-900 font-mono">
            {materials.filter((m) => ['diamond', 'stone'].includes(m.material_type?.toLowerCase())).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Active Materials</div>
          <div className="text-xl font-black text-emerald-900 font-mono">
            {materials.filter((m) => m.is_active !== false).length}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search material name, code, karat..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#b01622] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-stone-500 font-semibold whitespace-nowrap">Filter Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#b01622]"
          >
            <option value="all">All Material Types</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="platinum">Platinum</option>
            <option value="diamond">Diamond</option>
            <option value="stone">Precious Stones</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] font-bold tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4 text-center w-14">S.No</th>
                <th className="py-3 px-4">Raw Material Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Purity / Karat</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Current Vault Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-base text-[#b01622] mr-2"></i>
                    Loading raw materials master...
                  </td>
                </tr>
              ) : paginatedMaterials.length > 0 ? (
                paginatedMaterials.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-stone-400">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{item.name}</div>
                      {item.description && (
                        <div className="text-[10px] text-stone-400 truncate max-w-xs">{item.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-600 font-semibold">{item.code || '—'}</td>
                    <td className="py-3.5 px-4">{getTypeBadge(item.material_type)}</td>
                    <td className="py-3.5 px-4">
                      {item.purity ? (
                        <span className="font-semibold text-stone-900">{item.purity}</span>
                      ) : null}
                      {item.karat && (
                        <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {item.karat}
                        </span>
                      )}
                      {!item.purity && !item.karat && <span className="text-stone-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-600 uppercase">
                      {item.unit || 'g'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                      {Number(item.current_balance || 0).toFixed(3)} {item.unit || 'g'}
                      {Number(item.current_count || 0) > 0 && (
                        <span className="block text-[10px] font-normal text-stone-400">
                          Count: {Number(item.current_count)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Raw Material"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Raw Material"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    No raw materials found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredMaterials.length > 0 && (
          <div className="border-t border-stone-200 bg-stone-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredMaterials.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => {
                setItemsPerPage(num);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 bg-stone-50 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#b01622] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-cubes-stacked"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {editingItem ? 'Edit Raw Material' : 'Add New Raw Material'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Configure vault raw material specification & unit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Raw Material Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold 24K (999 Fine Pure Bullion)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Material Type / Metal <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.material_type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#b01622]"
                  >
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond (Loose)</option>
                    <option value="stone">Precious Stones / Gemstones</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Material Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RM-GLD-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 font-mono focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Purity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 99.9% or 916"
                    value={formData.purity}
                    onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Karat
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24K, 22K"
                    value={formData.karat}
                    onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#b01622]"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ct">Carats (ct)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="units">Units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Description / Specification Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or supplier details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-[#b01622] focus:ring-[#b01622]"
                  />
                  <span>Active in Purchase & Vault selections</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#b01622] hover:bg-[#8f121b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>}
                    <span>{editingItem ? 'Update Material' : 'Save Material'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Raw Material"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? If this material has recorded inventory transactions, it cannot be deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
