import React, { useState, useEffect, useTransition } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { handleDecimalKeyDown } from '../../utils/numberInputUtils';

const AVAILABLE_ICONS = [
  { value: 'fa-solid fa-gem', label: 'Diamond / Gem' },
  { value: 'fa-solid fa-vihara', label: 'Temple / Antique' },
  { value: 'fa-solid fa-cubes-stacked', label: 'Casting / Bars' },
  { value: 'fa-solid fa-palette', label: 'Meenakari / Color' },
  { value: 'fa-solid fa-star', label: 'Polishing / Sparkle' },
  { value: 'fa-solid fa-feather-pointed', label: 'Filigree / Burin' },
  { value: 'fa-solid fa-crown', label: 'Bridal / Crown' },
  { value: 'fa-solid fa-link', label: 'Chains / Links' },
  { value: 'fa-solid fa-ring', label: 'Rings / Bands' },
  { value: 'fa-solid fa-fire', label: 'Torch / Soldering' },
  { value: 'fa-solid fa-microscope', label: 'Micro-Setting' },
  { value: 'fa-solid fa-compass-drafting', label: 'CAD / Design' },
];

const AVAILABLE_COLORS = [
  { value: 'amber', label: 'Gold / Amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { value: 'emerald', label: 'Emerald / Green', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { value: 'blue', label: 'Sapphire / Blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { value: 'red', label: 'Ruby / Red', bg: 'bg-red-50', text: 'text-[#b01622]', border: 'border-red-200' },
  { value: 'purple', label: 'Amethyst / Purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { value: 'slate', label: 'Platinum / Slate', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
];

const INITIAL_FORM = {
  name: '',
  code: '',
  description: '',
  default_wastage_percent: 4.50,
  default_making_charge: 0,
  icon: 'fa-solid fa-gem',
  color: 'amber',
  status: 'active',
  sort_order: 0,
};

export default function WorkSpecifications() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [specs, setSpecs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active_count: 0,
    inactive_count: 0,
    avg_wastage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Views
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Detail View Modal
  const [viewingSpec, setViewingSpec] = useState(null);
  const [specDetailLoading, setSpecDetailLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch specifications
  const fetchSpecs = async (searchOverride = null) => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      // Guard against React SyntheticEvent when invoked directly from onClick
      const q = typeof searchOverride === 'string' ? searchOverride : search;
      if (q && q.trim()) params.search = q.trim();

      const res = await api.get('/work-specifications', { params });
      setSpecs(res.data?.data || []);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load work specifications', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoad(false);
    }
  };

  // Debounced auto-search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSpecs(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSpecs(search);
  };

  // Open Create
  const handleOpenCreate = () => {
    setEditingSpec(null);
    setFormData({
      ...INITIAL_FORM,
      code: `SPEC-${String(stats.total + 1).padStart(3, '0')}`,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (spec) => {
    setEditingSpec(spec);
    setFormData({
      name: spec.name || '',
      code: spec.code || '',
      description: spec.description || '',
      default_wastage_percent: spec.default_wastage_percent ?? 4.5,
      default_making_charge: spec.default_making_charge ?? 0,
      icon: spec.icon || 'fa-solid fa-gem',
      color: spec.color || 'amber',
      status: spec.status || 'active',
      sort_order: spec.sort_order ?? 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Save / Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Craft specification name is required';
    if (!formData.code?.trim()) errors.code = 'Specification code is required';
    if (formData.default_wastage_percent === '' || formData.default_wastage_percent === null || isNaN(Number(formData.default_wastage_percent))) {
      errors.default_wastage_percent = 'Default wastage allowance is required';
    } else if (Number(formData.default_wastage_percent) < 0 || Number(formData.default_wastage_percent) > 100) {
      errors.default_wastage_percent = 'Wastage must be between 0% and 100%';
    }
    if (formData.default_making_charge === '' || formData.default_making_charge === null || isNaN(Number(formData.default_making_charge))) {
      errors.default_making_charge = 'Base making charge is required';
    } else if (Number(formData.default_making_charge) < 0) {
      errors.default_making_charge = 'Making charge cannot be negative';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fill in all required inputs (marked in red) before saving.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingSpec) {
        await api.put(`/work-specifications/${editingSpec.id}`, formData);
        showToast('Work specification updated successfully!', 'success');
      } else {
        await api.post('/work-specifications', formData);
        showToast('Work specification created successfully!', 'success');
      }
      setIsModalOpen(false);
      fetchSpecs();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error saving specification';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status inline
  const handleToggleStatus = async (spec) => {
    const newStatus = spec.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/work-specifications/${spec.id}`, {
        ...spec,
        status: newStatus,
      });
      showToast(`Specification marked as ${newStatus}`, 'success');
      fetchSpecs();
    } catch (err) {
      console.error(err);
      showToast('Failed to change status', 'error');
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/work-specifications/${deleteTarget.id}`);
      showToast('Specification deleted successfully', 'success');
      setDeleteTarget(null);
      fetchSpecs();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to delete specification';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // View detail
  const handleOpenView = async (spec) => {
    setViewingSpec(spec);
    try {
      setSpecDetailLoading(true);
      const res = await api.get(`/work-specifications/${spec.id}`);
      setViewingSpec({
        ...res.data.data,
        assigned_karigars: res.data.assigned_karigars || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSpecDetailLoading(false);
    }
  };

  const getColorClasses = (colorName) => {
    const found = AVAILABLE_COLORS.find((c) => c.value === colorName);
    return found || AVAILABLE_COLORS[0];
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Subtle top refresh bar */}
      {refreshing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: '3px' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #b01622, #e05a63, #b01622)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s infinite linear',
          }} />
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
            <span>Masters</span>
            <i className="fa-solid fa-chevron-right text-[9px] text-stone-400"></i>
            <span className="text-[#b01622] font-bold">Artisan Craft Specifications</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-[#b01622] flex items-center justify-center text-lg shadow-2xs">
              <i className="fa-solid fa-shapes"></i>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
                Work Specifications
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Manage jewellery craft specializations, benchmark wastage allowances, and default artisan making charges.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchSpecs()}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-all flex items-center gap-2"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'animate-spin text-[#b01622]' : ''}`}></i>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-red-900/10 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Add Specification</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
              Total Crafts
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-[#b01622] flex items-center justify-center text-xs shrink-0">
              <i className="fa-solid fa-shapes"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-stone-900 tracking-tight font-sans leading-none">
              {stats.total}
            </p>
            <p className="text-[11px] text-stone-400 font-medium mt-1.5 whitespace-nowrap">
              Active crafts in catalogue
            </p>
          </div>
        </div>

        {/* Active Crafts */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
              Active In ERP
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0">
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-emerald-700 tracking-tight font-sans leading-none">
              {stats.active_count}
            </p>
            <p className="text-[11px] text-emerald-600/80 font-medium mt-1.5 whitespace-nowrap">
              Available for work orders
            </p>
          </div>
        </div>

        {/* Inactive Crafts */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
              Inactive / Archived
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-xs shrink-0">
              <i className="fa-solid fa-pause"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-amber-700 tracking-tight font-sans leading-none">
              {stats.inactive_count}
            </p>
            <p className="text-[11px] text-amber-600/80 font-medium mt-1.5 whitespace-nowrap">
              Hidden from job selection
            </p>
          </div>
        </div>

        {/* Benchmark Wastage */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
              Avg Benchmark Wastage
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs shrink-0">
              <i className="fa-solid fa-percent"></i>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-2xl font-extrabold text-stone-900 tracking-tight font-sans leading-none">
                {Number(stats.avg_wastage).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-indigo-700 font-sans">%</span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium mt-1.5 whitespace-nowrap">
              Industry standard norm
            </p>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Auto Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <i className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs ${
              loading && search ? 'fa-solid fa-arrows-rotate animate-spin text-[#b01622]' : 'fa-solid fa-magnifying-glass text-stone-400'
            }`}></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Auto-search by craft name, code (SPEC-...), description..."
              className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchSpecs('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                title="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </form>

        {/* Status & View Mode */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Status Pills */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center text-xs font-semibold text-stone-600">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'hover:text-stone-900'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'hover:text-stone-900'
              }`}
            >
              Active ({stats.active_count})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'inactive' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'hover:text-stone-900'
              }`}
            >
              Inactive ({stats.inactive_count})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center text-stone-600 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#b01622] shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              <i className="fa-solid fa-grip"></i>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'table' ? 'bg-white text-[#b01622] shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              <i className="fa-solid fa-list"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {(loading && initialLoad) ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 border-3 border-[#b01622] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-stone-600">Loading work specifications...</p>
        </div>
      ) : specs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#b01622] flex items-center justify-center text-2xl mx-auto mb-3">
            <i className="fa-solid fa-shapes"></i>
          </div>
          <h3 className="text-base font-bold text-stone-800">No specifications found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or resetting your status filters.'
              : 'Add your first artisan craft specification to start categorizing karigars.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              + Add Specification
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {specs
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((spec) => {
            const colorMeta = getColorClasses(spec.color);
            return (
              <div
                key={spec.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-stone-300"
              >
                <div className="p-5">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${colorMeta.bg} ${colorMeta.text} border ${colorMeta.border} flex items-center justify-center text-lg shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                    >
                      <i className={spec.icon || 'fa-solid fa-gem'}></i>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                        {spec.code}
                      </span>
                      {/* Active / Inactive Badge Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(spec)}
                        title={`Click to mark as ${spec.status === 'active' ? 'Inactive' : 'Active'}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          spec.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            spec.status === 'active' ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
                          }`}
                        ></span>
                        <span>{spec.status}</span>
                      </button>
                    </div>
                  </div>

                  {/* Specification Name & Description */}
                  <h3
                    onClick={() => handleOpenView(spec)}
                    className="text-base font-bold text-stone-900 group-hover:text-[#b01622] transition-colors cursor-pointer"
                  >
                    {spec.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 min-h-[32px]">
                    {spec.description || 'No specialized process notes recorded for this craft category.'}
                  </p>

                  {/* Benchmark Metrics Box */}
                  <div className="mt-4 bg-stone-50 rounded-xl p-3 border border-stone-200/80 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Benchmark Wastage</p>
                      <p className="text-sm font-bold text-stone-900 mt-0.5 font-sans">
                        {Number(spec.default_wastage_percent).toFixed(2)}
                        <span className="text-xs font-semibold text-stone-500 ml-0.5">%</span>
                      </p>
                    </div>
                    <div className="border-l border-stone-200/70 pl-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Base Making</p>
                      <p className="text-sm font-bold text-stone-900 mt-0.5 font-sans">
                        ₹{Number(spec.default_making_charge).toLocaleString('en-IN')}
                        <span className="text-[10px] font-normal text-stone-400 ml-0.5">/g</span>
                      </p>
                    </div>
                  </div>

                  {/* Assigned Karigars count */}
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-people-group text-stone-400 text-[11px]"></i>
                      <span>Master Artisans:</span>
                    </span>
                    <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                      {spec.karigars_count ?? 0} Karigar{(spec.karigars_count ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenView(spec)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5"
                  >
                    <i className="fa-regular fa-eye text-[11px]"></i>
                    <span>Details</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(spec)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg text-xs transition-colors"
                      title="Edit Specification"
                    >
                      <i className="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(spec)}
                      className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs transition-colors"
                      title="Delete Specification"
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          {/* Grid Pagination */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(specs.length / itemsPerPage) || 1}
              totalItems={specs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
            />
          </div>
        </>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-stone-700">
              <thead className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-5">Craft Specification</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4 text-right">Standard Wastage</th>
                  <th className="py-3.5 px-4 text-right">Base Making Rate</th>
                  <th className="py-3.5 px-4 text-center">Assigned Artisans</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {specs
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((spec) => {
                  const colorMeta = getColorClasses(spec.color);
                  return (
                    <tr key={spec.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${colorMeta.bg} ${colorMeta.text} border ${colorMeta.border} flex items-center justify-center text-sm shrink-0`}
                          >
                            <i className={spec.icon || 'fa-solid fa-gem'}></i>
                          </div>
                          <div>
                            <p
                              onClick={() => handleOpenView(spec)}
                              className="font-bold text-stone-900 hover:text-[#b01622] cursor-pointer"
                            >
                              {spec.name}
                            </p>
                            <p className="text-[11px] text-stone-400 line-clamp-1 max-w-xs">{spec.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-600 text-xs">{spec.code}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-sans">
                        {Number(spec.default_wastage_percent).toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-sans">
                        ₹{Number(spec.default_making_charge).toLocaleString('en-IN')}/g
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md text-xs">
                          {spec.karigars_count ?? 0} Karigars
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(spec)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            spec.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              spec.status === 'active' ? 'bg-emerald-600' : 'bg-stone-400'
                            }`}
                          ></span>
                          <span>{spec.status}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenView(spec)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
                            title="View Details"
                          >
                            <i className="fa-regular fa-eye"></i>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(spec)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
                            title="Edit"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(spec)}
                            className="p-1.5 text-stone-400 hover:text-red-700 rounded-lg"
                            title="Delete"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Table Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(specs.length / itemsPerPage) || 1}
            totalItems={specs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
          />
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg">
                  <i className={editingSpec ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-plus'}></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {editingSpec ? 'Edit Work Specification' : 'Add New Work Specification'}
                  </h2>
                  <p className="text-xs text-stone-500">
                    Define artisan craft specialization, benchmark norms, and making rates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Craft Specification Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Antique & Temple Work, Jadau Craft"
                    className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622] ${
                      formErrors.name ? 'border-red-500 bg-red-50/30' : 'border-stone-200'
                    }`}
                  />
                  {formErrors.name && <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Code / SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. SPEC-009"
                    className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs sm:text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622] ${
                      formErrors.code ? 'border-red-500 bg-red-50/30' : 'border-stone-200'
                    }`}
                  />
                  {formErrors.code && <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.code}</p>}
                </div>
              </div>

              {/* Benchmark Wastage & Base Making Charge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Default Wastage Allowance (%) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      name="default_wastage_percent"
                      value={formData.default_wastage_percent}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={handleInputChange}
                      className={`w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border rounded-xl text-xs sm:text-sm font-sans text-stone-900 no-spinners focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622] ${
                        formErrors.default_wastage_percent ? 'border-red-500 bg-red-50/30' : 'border-stone-200'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 pointer-events-none select-none">
                      %
                    </span>
                  </div>
                  {formErrors.default_wastage_percent && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.default_wastage_percent}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Base Making Charge (₹ / Gram) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 pointer-events-none select-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      name="default_making_charge"
                      value={formData.default_making_charge}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={handleInputChange}
                      placeholder="0"
                      className={`w-full pl-8 pr-12 py-2.5 bg-stone-50 border rounded-xl text-xs sm:text-sm font-sans text-stone-900 no-spinners focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622] ${
                        formErrors.default_making_charge ? 'border-red-500 bg-red-50/30' : 'border-stone-200'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-stone-400 pointer-events-none select-none">
                      /g
                    </span>
                  </div>
                  {formErrors.default_making_charge && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.default_making_charge}</p>
                  )}
                </div>
              </div>

              {/* Icon & Color Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Badge Icon
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 bg-stone-50 p-2 rounded-xl border border-stone-200">
                    {AVAILABLE_ICONS.map((ic) => (
                      <button
                        key={ic.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, icon: ic.value }))}
                        title={ic.label}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
                          formData.icon === ic.value
                            ? 'bg-[#b01622] text-white shadow-2xs font-bold'
                            : 'text-stone-600 hover:bg-stone-200/70'
                        }`}
                      >
                        <i className={ic.value}></i>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Accent Color
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {AVAILABLE_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, color: col.value }))}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          formData.color === col.value
                            ? `${col.bg} ${col.text} ${col.border} ring-2 ring-stone-900/10 shadow-2xs`
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${col.bg.replace('50', '500')}`}></span>
                        <span className="capitalize">{col.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Craft Description & Technical Notes (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Details on required tools, stone prong styles, gold touch purity expectations..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]/20 focus:border-[#b01622]"
                ></textarea>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <p className="text-xs font-bold text-stone-900">Active Status</p>
                  <p className="text-[11px] text-stone-500">
                    Active specifications appear in artisan forms and job allocation menus.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, status: p.status === 'active' ? 'inactive' : 'active' }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.status === 'active' ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-red-900/10 transition-all flex items-center gap-2"
                >
                  {submitting && <i className="fa-solid fa-arrows-rotate animate-spin text-xs"></i>}
                  <span>{editingSpec ? 'Update Specification' : 'Create Specification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {viewingSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl ${getColorClasses(viewingSpec.color).bg} ${
                    getColorClasses(viewingSpec.color).text
                  } border ${getColorClasses(viewingSpec.color).border} flex items-center justify-center text-xl shadow-2xs`}
                >
                  <i className={viewingSpec.icon || 'fa-solid fa-gem'}></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-900">{viewingSpec.name}</h2>
                    <span className="font-mono text-xs bg-stone-100 px-2 py-0.5 rounded border border-stone-200 font-bold text-stone-600">
                      {viewingSpec.code}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">Craft Specification & Assigned Master Artisans</p>
                </div>
              </div>
              <button
                onClick={() => setViewingSpec(null)}
                className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Description */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Process Overview</p>
                <p className="text-xs text-stone-700 leading-relaxed">
                  {viewingSpec.description || 'No specialized process notes recorded.'}
                </p>
              </div>

              {/* Benchmarks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Benchmark Wastage Allowance
                  </p>
                  <p className="text-xl font-extrabold text-stone-900 font-sans">
                    {Number(viewingSpec.default_wastage_percent).toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Applied to work orders & meltdowns</p>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Base Making Rate</p>
                  <p className="text-xl font-extrabold text-stone-900 font-sans">
                    ₹{Number(viewingSpec.default_making_charge).toLocaleString('en-IN')}
                    <span className="text-xs text-stone-500 font-normal"> /g</span>
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Starting making charge guideline</p>
                </div>
              </div>

              {/* Assigned Artisans List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Assigned Master Artisans ({viewingSpec.assigned_karigars?.length || 0})
                  </h4>
                </div>

                {specDetailLoading ? (
                  <div className="py-6 text-center text-xs text-stone-400">
                    <i className="fa-solid fa-arrows-rotate animate-spin mr-2"></i>Loading artisans...
                  </div>
                ) : viewingSpec.assigned_karigars?.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {viewingSpec.assigned_karigars.map((k) => (
                      <div
                        key={k.id}
                        className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200/70 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-100/70 text-[#b01622] font-bold flex items-center justify-center text-[11px]">
                            {k.name?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-stone-800">{k.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono ml-2">{k.karigar_code}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-stone-700 font-sans">
                            {Number(k.current_gold_balance_grams ?? k.current_gold_balance ?? 0).toFixed(3)}g
                          </span>
                          <span
                            className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              k.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {k.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic bg-stone-50 p-3 rounded-xl border border-dashed border-stone-200 text-center">
                    No artisans currently assigned to this craft specification.
                  </p>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const spec = viewingSpec;
                    setViewingSpec(null);
                    handleOpenEdit(spec);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <i className="fa-regular fa-pen-to-square text-xs"></i>
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingSpec(null)}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Work Specification?"
        message={`Are you sure you want to permanently delete the specification "${deleteTarget?.name}" (${deleteTarget?.code})? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Specification'}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
