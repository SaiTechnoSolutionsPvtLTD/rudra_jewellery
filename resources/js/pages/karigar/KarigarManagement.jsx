import React, { useState, useEffect, useTransition } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import KarigarWorkModal from './KarigarWorkModal';
import BenchMetalModal from '../../components/BenchMetalModal';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal } from '../../utils/numberInputUtils';

const INITIAL_FORM_STATE = {
  karigar_code: '',
  name: '',
  primary_phone: '',
  secondary_phone: '',
  email: '',
  specialization: '',
  experience_years: 5,
  workshop_name: '',
  workshop_address: '',
  city: 'Chennai',
  state: 'Tamil Nadu',
  zip_code: '',
  pan_number: '',
  aadhar_number: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  standard_wastage_percent: 4.50,
  making_charge_per_gram: 550.00,
  current_gold_balance_grams: 0.000,
  status: 'active',
  avatar_url: '',
  notes: '',
};

export default function KarigarManagement() {
  const { isKarigar } = useAuth();
  const { showToast } = useToast();

  if (isKarigar) {
    return <Navigate to="/job-order/receive" replace />;
  }
  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_karigars: 0,
    active_karigars: 0,
    on_leave_karigars: 0,
    total_gold_balance: 0,
    avg_wastage_percent: 0,
  });

  // Filter & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formTab, setFormTab] = useState('general'); // 'general' | 'craft' | 'kyc'
  const [editingKarigar, setEditingKarigar] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Profile View Drawer state
  const [isBenchModalOpen, setIsBenchModalOpen] = useState(false);
  const [viewKarigar, setViewKarigar] = useState(null);
  const [viewDrawerTab, setViewDrawerTab] = useState('works'); // 'works' | 'profile'
  const [selectedKarigarWorks, setSelectedKarigarWorks] = useState([]);
  const [loadingKarigarWorks, setLoadingKarigarWorks] = useState(false);
  const [workModalOrderId, setWorkModalOrderId] = useState(null);

  // Auto-open work order if specified in query string (?open_order=XX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openOrderId = params.get('open_order') || params.get('work_order_id');
    if (openOrderId) {
      setWorkModalOrderId(openOrderId);
    }
  }, []);

  const fetchKarigarWorks = async (karigarId) => {
    try {
      setLoadingKarigarWorks(true);
      const res = await api.get(`/karigars/${karigarId}/works`);
      if (res.data?.status === 'success') {
        const works = res.data.data || [
          ...(res.data.active_works || []),
          ...(res.data.completed_works || []),
        ];
        setSelectedKarigarWorks(works);
      }
    } catch (e) {
      console.error('Failed to load artisan works', e);
    } finally {
      setLoadingKarigarWorks(false);
    }
  };

  useEffect(() => {
    if (viewKarigar?.id) {
      // Seed with current_assigned_order immediately to prevent empty state flash
      if (viewKarigar.current_assigned_order) {
        setSelectedKarigarWorks([viewKarigar.current_assigned_order]);
      } else {
        setSelectedKarigarWorks([]);
      }
      fetchKarigarWorks(viewKarigar.id);
      setViewDrawerTab('works');
    } else {
      setSelectedKarigarWorks([]);
    }
  }, [viewKarigar]);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status dropdown toggle state
  const [openStatusId, setOpenStatusId] = useState(null);

  // Dynamic Work Specifications from Master
  const [specifications, setSpecifications] = useState([]);

  const fetchSpecifications = async () => {
    try {
      const res = await api.get('/work-specifications');
      if (res.data?.data && res.data.data.length > 0) {
        setSpecifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load specifications', err);
    }
  };

  useEffect(() => {
    fetchSpecifications();
  }, []);

  const SPECIALIZATION_OPTIONS = specifications.map(s => s.name);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.status-dropdown-container')) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch karigars list & stats from backend
  const fetchKarigars = async (searchOverride = null, pageOverride = null, perPageOverride = null) => {
    try {
      // On first load show full spinner; subsequent fetches show a subtle refreshing bar
      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      // Guard against React SyntheticEvent when invoked directly from onClick
      const activeSearch = typeof searchOverride === 'string' ? searchOverride : searchTerm;
      const activePage = typeof pageOverride === 'number' ? pageOverride : currentPage;
      const activePerPage = typeof perPageOverride === 'number' ? perPageOverride : itemsPerPage;
      const params = {
        page: activePage,
        per_page: activePerPage,
        search: activeSearch,
        specialization: specializationFilter,
        status: statusFilter,
      };

      const res = await api.get('/karigars', { params });
      if (res.data.status === 'success') {
        setKarigars(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.meta) {
          setCurrentPage(res.data.meta.current_page);
          setTotalPages(res.data.meta.last_page);
          setTotalItems(res.data.meta.total);
        }
      }
    } catch (err) {
      console.error('Error fetching karigars:', err);
      showToast('Failed to load artisan records', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoad(false);
    }
  };

  // Auto-search effect with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKarigars(searchTerm, 1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, itemsPerPage, specializationFilter, statusFilter]);

  // Handle immediate manual search trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchKarigars(searchTerm, 1);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    fetchKarigars('', 1);
  };

  // Generate Karigar Code
  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await api.get('/karigars/generate-code');
      if (res.data.status === 'success') {
        setFormData(prev => ({ ...prev, karigar_code: res.data.code }));
        showToast(`Generated code: ${res.data.code}`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not generate code', 'error');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = async () => {
    setEditingKarigar(null);
    setFormErrors({});
    setFormTab('general');
    setFormData({
      ...INITIAL_FORM_STATE,
      specialization: specifications[0]?.name || '',
    });
    setIsFormModalOpen(true);

    // Auto generate next code for convenience
    try {
      setGeneratingCode(true);
      const res = await api.get('/karigars/generate-code');
      if (res.data.status === 'success') {
        setFormData(prev => ({ ...prev, karigar_code: res.data.code }));
      }
    } catch (e) {
      console.warn('Could not auto fetch code', e);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (karigar) => {
    setEditingKarigar(karigar);
    setFormErrors({});
    setFormTab('general');
    setFormData({
      karigar_code: karigar.karigar_code || '',
      name: karigar.name || '',
      primary_phone: karigar.primary_phone || '',
      secondary_phone: karigar.secondary_phone || '',
      email: karigar.email || '',
      specialization: karigar.specialization || (specifications[0]?.name || ''),
      experience_years: karigar.experience_years ?? 5,
      workshop_name: karigar.workshop_name || '',
      workshop_address: karigar.workshop_address || '',
      city: karigar.city || '',
      state: karigar.state || '',
      zip_code: karigar.zip_code || '',
      pan_number: karigar.pan_number || '',
      aadhar_number: karigar.aadhar_number || '',
      bank_name: karigar.bank_name || '',
      account_number: karigar.account_number || '',
      ifsc_code: karigar.ifsc_code || '',
      upi_id: karigar.upi_id || '',
      standard_wastage_percent: karigar.standard_wastage_percent ?? 4.5,
      making_charge_per_gram: karigar.making_charge_per_gram ?? 550,
      current_gold_balance_grams: karigar.current_gold_balance_grams ?? 0,
      status: karigar.status || 'active',
      avatar_url: karigar.avatar_url || '',
      notes: karigar.notes || '',
    });
    setIsFormModalOpen(true);
  };

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If specialization changed, auto-suggest benchmark wastage and making charge from Master
    if (name === 'specialization') {
      const matched = specifications.find(s => s.name === value);
      if (matched) {
        setFormData(prev => ({
          ...prev,
          specialization: value,
          standard_wastage_percent: matched.default_wastage_percent ?? prev.standard_wastage_percent,
          making_charge_per_gram: Number(matched.default_making_charge) > 0 ? matched.default_making_charge : prev.making_charge_per_gram,
        }));
        if (formErrors[name]) {
          setFormErrors(prev => ({ ...prev, [name]: null }));
        }
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Tab 1: Artisan & Workshop (Non-optional fields)
    if (!formData.karigar_code?.trim()) errors.karigar_code = 'Karigar code is required';
    if (!formData.name?.trim()) errors.name = 'Artisan full name is required';
    if (!formData.primary_phone?.trim()) errors.primary_phone = 'Primary mobile number is required';
    if (!formData.email?.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (formData.experience_years === '' || formData.experience_years === null || isNaN(Number(formData.experience_years))) {
      errors.experience_years = 'Years of experience is required';
    } else if (Number(formData.experience_years) < 0) {
      errors.experience_years = 'Experience cannot be negative';
    }
    if (!formData.workshop_name?.trim()) errors.workshop_name = 'Workshop/Karkhana name is required';
    if (!formData.workshop_address?.trim()) errors.workshop_address = 'Workshop street address is required';
    if (!formData.city?.trim()) errors.city = 'City is required';
    if (!formData.state?.trim()) errors.state = 'State is required';
    if (!formData.zip_code?.trim()) errors.zip_code = 'Pincode is required';

    // Tab 2: Craft & Bench Metal (Non-optional fields)
    if (!formData.specialization?.trim()) errors.specialization = 'Please select a craft specialization';
    if (formData.standard_wastage_percent === '' || formData.standard_wastage_percent === null || isNaN(Number(formData.standard_wastage_percent))) {
      errors.standard_wastage_percent = 'Standard wastage allowance is required';
    } else if (Number(formData.standard_wastage_percent) < 0 || Number(formData.standard_wastage_percent) > 100) {
      errors.standard_wastage_percent = 'Wastage must be between 0% and 100%';
    }
    if (formData.making_charge_per_gram === '' || formData.making_charge_per_gram === null || isNaN(Number(formData.making_charge_per_gram))) {
      errors.making_charge_per_gram = 'Making charge is required';
    } else if (Number(formData.making_charge_per_gram) < 0) {
      errors.making_charge_per_gram = 'Making charge cannot be negative';
    }
    if (formData.current_gold_balance_grams === '' || formData.current_gold_balance_grams === null || isNaN(Number(formData.current_gold_balance_grams))) {
      errors.current_gold_balance_grams = 'Metal on bench is required (enter 0 if none)';
    } else if (Number(formData.current_gold_balance_grams) < 0) {
      errors.current_gold_balance_grams = 'Metal balance cannot be negative';
    }

    // Tab 3: Financial & KYC (Non-optional fields)
    if (!formData.pan_number?.trim()) errors.pan_number = 'PAN number is required';
    if (!formData.aadhar_number?.trim()) errors.aadhar_number = 'Aadhar number is required';
    if (!formData.bank_name?.trim()) errors.bank_name = 'Bank name is required';
    if (!formData.account_number?.trim()) errors.account_number = 'Bank account number is required';
    if (!formData.ifsc_code?.trim()) errors.ifsc_code = 'IFSC code is required';

    setFormErrors(errors);

    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      const tab1Keys = ['karigar_code', 'name', 'primary_phone', 'email', 'experience_years', 'workshop_name', 'workshop_address', 'city', 'state', 'zip_code'];
      const tab2Keys = ['specialization', 'standard_wastage_percent', 'making_charge_per_gram', 'current_gold_balance_grams'];
      const tab3Keys = ['pan_number', 'aadhar_number', 'bank_name', 'account_number', 'ifsc_code'];

      if (tab1Keys.some(k => errors[k])) {
        setFormTab('general');
      } else if (tab2Keys.some(k => errors[k])) {
        setFormTab('craft');
      } else if (tab3Keys.some(k => errors[k])) {
        setFormTab('kyc');
      }
      return false;
    }
    return true;
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fill in all required inputs (marked in red) before saving.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        experience_years: parseInt(formData.experience_years) || 0,
        standard_wastage_percent: parseFloat(formData.standard_wastage_percent) || 0,
        making_charge_per_gram: parseFloat(formData.making_charge_per_gram) || 0,
        current_gold_balance_grams: parseFloat(formData.current_gold_balance_grams) || 0,
      };

      if (editingKarigar) {
        const res = await api.put(`/karigars/${editingKarigar.id}`, payload);
        if (res.data.status === 'success') {
          showToast(`Artisan "${formData.name}" updated successfully!`, 'success');
          setIsFormModalOpen(false);
          fetchKarigars();
        }
      } else {
        const res = await api.post('/karigars', payload);
        if (res.data.status === 'success') {
          showToast(`Artisan "${formData.name}" registered successfully!`, 'success');
          setIsFormModalOpen(false);
          fetchKarigars();
        }
      }
    } catch (err) {
      console.error('Error saving karigar:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        setFormErrors(err.response.data.errors);
        showToast('Validation failed. Check form errors.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Failed to save artisan record', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm and handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/karigars/${deleteTarget.id}`);
      if (res.data.status === 'success') {
        showToast(`Artisan "${deleteTarget.name}" deleted successfully`, 'success');
        setDeleteTarget(null);
        fetchKarigars();
      }
    } catch (err) {
      console.error('Error deleting karigar:', err);
      showToast('Failed to delete artisan', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick toggle status directly
  const handleToggleStatus = async (karigar, newStatus) => {
    try {
      await api.put(`/karigars/${karigar.id}`, {
        ...karigar,
        status: newStatus,
      });
      showToast(`${karigar.name} marked as ${newStatus.replace('_', ' ')}`, 'success');
      fetchKarigars();
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] p-3 sm:p-5 lg:p-5 space-y-4">
      {/* Subtle top refresh bar — visible only during background re-fetches */}
      {refreshing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: '3px' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #b01622, #e05a63, #b01622)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s infinite linear',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
      )}

      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1 tracking-wider uppercase">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[9px] text-stone-400"></i>
            <span className="text-[#b01622] font-bold">Artisans & Goldsmiths</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b01622] to-[#801824] text-white flex items-center justify-center shadow-md shadow-red-950/20 text-lg">
              <i className="fa-solid fa-users-gear"></i>
            </span>
            Karigar Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Track master artisans, bench wastage allowances, craft making charges & bullion work-in-progress.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchKarigars()}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Refresh List"
          >
            <i className={`fa-solid fa-arrows-rotate text-stone-500 ${loading ? 'fa-spin text-[#b01622]' : ''}`}></i>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-[#b01622] to-[#8f111b] hover:from-[#9c131d] hover:to-[#7c0e17] text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/20 transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg active:scale-95"
          >
            <i className="fa-solid fa-user-plus text-sm"></i>
            <span>Add New Karigar</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Artisans */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">Total Artisans</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-[#b01622] flex items-center justify-center text-xs shrink-0 shadow-2xs">
              <i className="fa-solid fa-people-group"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-stone-900 tracking-tight font-sans leading-none">{stats.total_karigars}</p>
            <p className="text-[11px] text-stone-400 font-medium mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Registered artisans</p>
          </div>
        </div>

        {/* Active on Bench */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">Active On Bench</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-emerald-700 tracking-tight font-sans leading-none">{stats.active_karigars}</p>
            <p className="text-[11px] text-emerald-600/80 font-medium mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Ready for job orders</p>
          </div>
        </div>

        {/* On Leave / Inactive */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">On Leave / Off</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
              <i className="fa-solid fa-mug-hot"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-amber-700 tracking-tight font-sans leading-none">{stats.on_leave_karigars}</p>
            <p className="text-[11px] text-amber-600/80 font-medium mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Temporary away</p>
          </div>
        </div>

        {/* Gold on Bench */}
        <div
          onClick={() => setIsBenchModalOpen(true)}
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
          title="Click to open pop-up displaying metal on bench balance per karigar"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
              Metal On Bench
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
              <i className="fa-solid fa-cubes-stacked"></i>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-2xl font-extrabold text-stone-900 tracking-tight font-sans leading-none">
                {Number(stats.total_gold_balance).toFixed(3)}
              </span>
              <span className="text-xs font-bold text-amber-700 font-sans">g</span>
            </div>
            <p className="text-[11px] text-amber-700/90 font-medium mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Pure 24K / 22K balance</p>
          </div>
        </div>

        {/* Avg Wastage Rate */}
        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">Avg. Wastage</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
              <i className="fa-solid fa-percent"></i>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-stone-900 tracking-tight font-sans leading-none">
              {Number(stats.avg_wastage_percent).toFixed(2)}%
            </p>
            <p className="text-[11px] text-stone-400 font-medium mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Standard craft norm</p>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <i className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs ${loading && searchTerm ? 'fa-solid fa-arrows-rotate animate-spin text-[#b01622]' : 'fa-solid fa-magnifying-glass text-stone-400'
              }`}></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Auto-search by name, code (KRG-...), phone, craft, workshop..."
              className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                title="Clear search"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>
        </form>

        {/* Filters and View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Specialization Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">Craft:</span>
            <select
              value={specializationFilter}
              onChange={(e) => {
                setSpecializationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:border-[#b01622] cursor-pointer"
            >
              <option value="all">All Specializations</option>
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${statusFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('on_leave'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${statusFilter === 'on_leave'
                ? 'bg-amber-500 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              On Leave
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${statusFilter === 'inactive'
                ? 'bg-stone-500 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              Inactive
            </button>
          </div>

          {/* Table vs Grid View Toggle */}
          <div className="flex items-center border border-stone-200 rounded-xl p-0.5 bg-stone-50">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`w-8 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${viewMode === 'table' ? 'bg-white text-[#b01622] shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              <i className="fa-solid fa-table-list"></i>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Cards Grid View"
              className={`w-8 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${viewMode === 'grid' ? 'bg-white text-[#b01622] shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              <i className="fa-solid fa-table-cells-large"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Content View: Table or Grid */}
      {(loading && initialLoad) ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 border-3 border-stone-200 border-t-[#b01622] rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-semibold text-stone-700">Loading master artisans...</p>
          <p className="text-xs text-stone-400 mt-1">Retrieving workshop profiles and metal ledgers</p>
        </div>
      ) : karigars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fa-solid fa-user-slash"></i>
          </div>
          <h3 className="text-base font-bold text-stone-800 mb-1">No Karigars Found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-5">
            {searchTerm || specializationFilter !== 'all' || statusFilter !== 'all'
              ? 'No artisans match the current filter or search criteria. Try clearing your filters.'
              : 'Start by creating your first master goldsmith or artisan profile.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {(searchTerm || specializationFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSpecializationFilter('all');
                  setStatusFilter('all');
                  setCurrentPage(1);
                  fetchKarigars();
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#b01622] hover:bg-[#90121b] text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              Add New Karigar
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fdf0f0] border-b border-red-200 text-[11px] font-bold text-[#b01622] uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-5">Artisan & Code</th>
                  <th className="py-3.5 px-5">Craft Specialization</th>
                  <th className="py-3.5 px-5">Assignment Status</th>
                  <th className="py-3.5 px-5">Contact Details</th>
                  <th className="py-3.5 px-5 text-right">Bench Metal WIP</th>
                  <th className="py-3.5 px-5 text-center">Wastage / MC</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {karigars.map((karigar, index) => (
                  <tr key={karigar.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Artisan Name & Code */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {karigar.avatar_url ? (
                          <img
                            src={karigar.avatar_url}
                            alt={karigar.name}
                            className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#801824] to-[#b01622] text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                            {karigar.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span
                              className="font-bold text-stone-900 hover:text-[#b01622] cursor-pointer text-sm whitespace-nowrap"
                              onClick={() => setViewKarigar(karigar)}
                            >
                              {karigar.name}
                            </span>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 font-mono text-[11px] font-semibold text-stone-600 whitespace-nowrap">
                              {karigar.karigar_code}
                            </span>
                          </div>
                          <div className="text-xs text-stone-400 mt-1 whitespace-nowrap flex items-center gap-1.5">
                            {karigar.experience_years > 0 && (
                              <span>{karigar.experience_years} yrs exp</span>
                            )}
                            {karigar.experience_years > 0 && <span>•</span>}
                            <span>{karigar.city || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Specialization */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs whitespace-nowrap">
                          <i className="fa-solid fa-gem text-[10px] text-amber-600"></i>
                          {karigar.specialization}
                        </span>
                        {karigar.workshop_name && (
                          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 whitespace-nowrap" title={karigar.workshop_name}>
                            <i className="fa-solid fa-shop text-[10px] text-stone-400"></i>
                            <span>{karigar.workshop_name}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Assignment Status & Bench Work */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {karigar.is_available ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <i className="fa-solid fa-circle-check text-[10px] text-emerald-500"></i>
                            Available for Order
                          </span>
                          <div className="text-[10.5px] text-stone-400">
                            {karigar.completed_works_count || 0} finished jobs
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (karigar.current_assigned_order?.id) {
                                setWorkModalOrderId(karigar.current_assigned_order.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-100 cursor-pointer transition-colors"
                            title="Click to open artisan workbench"
                          >
                            <i className="fa-solid fa-hammer text-[10px] text-amber-600"></i>
                            Busy • {karigar.current_assigned_order?.work_order_number || 'Active Order'}
                          </button>
                          <div className="text-[10.5px] text-amber-800 font-medium">
                            {karigar.current_assigned_order?.status?.toUpperCase()}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-stone-800 font-semibold whitespace-nowrap">
                          <i className="fa-solid fa-phone text-[11px] text-stone-400"></i>
                          <a href={`tel:${karigar.primary_phone}`} className="hover:text-[#b01622]">
                            {karigar.primary_phone}
                          </a>
                        </div>
                        {karigar.email ? (
                          <div className="text-[11px] text-stone-400 flex items-center gap-2 whitespace-nowrap" title={karigar.email}>
                            <i className="fa-regular fa-envelope text-[10px] text-stone-400"></i>
                            <span>{karigar.email}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 whitespace-nowrap">
                            <i className="fa-solid fa-location-dot text-[10px] text-stone-400"></i>
                            <span>{karigar.city || '-'}{karigar.state ? `, ${karigar.state}` : ''}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Bench Metal Balance */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div>
                        <span className="font-mono font-bold text-stone-900 text-sm">
                          {Number(karigar.current_gold_balance_grams || 0).toFixed(3)}
                        </span>
                        <span className="text-xs font-bold text-amber-700 ml-1 font-sans">g</span>
                        <div className="text-[11px] text-stone-400 mt-0.5 font-medium whitespace-nowrap">Pure Gold WIP</div>
                      </div>
                    </td>

                    {/* Wastage & Making Charges */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center whitespace-nowrap">
                        <span className="font-bold text-stone-900 text-xs">
                          {Number(karigar.standard_wastage_percent || 0).toFixed(2)}%
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-stone-100 rounded text-[11px] font-medium text-stone-600 border border-stone-200 mt-1">
                          ₹{Number(karigar.making_charge_per_gram || 0).toFixed(0)}/g
                        </span>
                      </div>
                    </td>

                    {/* Status Toggle Badge */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <div className="relative inline-block text-left status-dropdown-container">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStatusId(openStatusId === karigar.id ? null : karigar.id);
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold capitalize cursor-pointer transition-all shadow-2xs whitespace-nowrap ${karigar.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : karigar.status === 'on_leave'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200'
                            }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${karigar.status === 'active'
                              ? 'bg-emerald-500 animate-pulse'
                              : karigar.status === 'on_leave'
                                ? 'bg-amber-500'
                                : 'bg-stone-400'
                              }`}
                          ></span>
                          {karigar.status?.replace('_', ' ')}
                          <i className={`fa-solid fa-angle-down text-[10px] text-stone-400 transition-transform ${openStatusId === karigar.id ? 'rotate-180' : ''}`}></i>
                        </button>

                        {/* Dropdown status switcher on click */}
                        {openStatusId === karigar.id && (
                          <div
                            className={`absolute right-0 z-50 w-40 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 animate-fade-in ${index >= karigars.length - 2 ? 'bottom-full mb-2' : 'top-full mt-2'
                              }`}
                          >
                            <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1 text-left">
                              Update Status
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(karigar, 'active');
                                setOpenStatusId(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${karigar.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 font-bold'
                                : 'text-stone-700 hover:bg-stone-50 font-medium'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <span>Active</span>
                              </div>
                              {karigar.status === 'active' && (
                                <i className="fa-solid fa-check text-[10px] text-emerald-600"></i>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(karigar, 'on_leave');
                                setOpenStatusId(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${karigar.status === 'on_leave'
                                ? 'bg-amber-50 text-amber-800 font-bold'
                                : 'text-stone-700 hover:bg-stone-50 font-medium'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                <span>On Leave</span>
                              </div>
                              {karigar.status === 'on_leave' && (
                                <i className="fa-solid fa-check text-[10px] text-amber-600"></i>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(karigar, 'inactive');
                                setOpenStatusId(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${karigar.status === 'inactive'
                                ? 'bg-stone-100 text-stone-900 font-bold'
                                : 'text-stone-600 hover:bg-stone-50 font-medium'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-stone-400 shrink-0"></span>
                                <span>Inactive</span>
                              </div>
                              {karigar.status === 'inactive' && (
                                <i className="fa-solid fa-check text-[10px] text-stone-500"></i>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewKarigar(karigar)}
                          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="View Full Details & Assigned Works"
                        >
                          <i className="fa-regular fa-eye text-xs"></i>
                        </button>
                        {karigar.current_assigned_order && (
                          <button
                            type="button"
                            onClick={() => setWorkModalOrderId(karigar.current_assigned_order.id)}
                            className="w-8 h-8 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                            title={`Open Artisan Workbench (${karigar.current_assigned_order.work_order_number})`}
                          >
                            <i className="fa-solid fa-screwdriver-wrench text-xs"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(karigar)}
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-[#b01622] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Edit Karigar"
                        >
                          <i className="fa-regular fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(karigar)}
                          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-red-100 text-stone-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Delete Karigar"
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
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchKarigars(searchTerm, page);
            }}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
              fetchKarigars(searchTerm, 1, limit);
            }}
          />
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {karigars.map((karigar) => (
              <div
                key={karigar.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {karigar.avatar_url ? (
                        <img
                          src={karigar.avatar_url}
                          alt={karigar.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#801824] to-[#b01622] text-white font-bold flex items-center justify-center text-lg shadow-xs shrink-0">
                          {karigar.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3
                          className="font-bold text-stone-900 text-sm hover:text-[#b01622] cursor-pointer transition-colors"
                          onClick={() => setViewKarigar(karigar)}
                        >
                          {karigar.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono font-semibold text-stone-600">
                            {karigar.karigar_code}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            • {karigar.experience_years} yrs exp
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Availability Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${karigar.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : karigar.status === 'on_leave'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-600 border border-stone-300'
                          }`}
                      >
                        {karigar.status?.replace('_', ' ')}
                      </span>

                      {karigar.is_available ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <i className="fa-solid fa-circle-check text-[8px] mr-1 text-emerald-600"></i>
                          Available
                        </span>
                      ) : (
                        <span
                          onClick={() => {
                            if (karigar.current_assigned_order?.id) {
                              setWorkModalOrderId(karigar.current_assigned_order.id);
                            }
                          }}
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer hover:bg-amber-200"
                          title="Click to open workbench"
                        >
                          <i className="fa-solid fa-hammer text-[8px] mr-1 text-amber-700"></i>
                          Busy • {karigar.current_assigned_order?.work_order_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Specialization & Workshop */}
                  <div className="mb-4">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 mb-1.5">
                      <i className="fa-solid fa-gem text-[10px] text-amber-600 mr-1.5"></i>
                      {karigar.specialization}
                    </span>
                    {karigar.workshop_name && (
                      <p className="text-xs text-stone-600 truncate flex items-center gap-1.5">
                        <i className="fa-solid fa-shop text-[10px] text-stone-400"></i>
                        {karigar.workshop_name}
                      </p>
                    )}
                  </div>

                  {/* Bench Metal and Rates Stats Box */}
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80 grid grid-cols-3 gap-2 text-center mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase">Bench Gold</p>
                      <p className="text-xs font-bold text-stone-900 mt-0.5 font-mono">
                        {Number(karigar.current_gold_balance_grams || 0).toFixed(2)} <span className="text-[9px] font-sans text-amber-700">g</span>
                      </p>
                    </div>
                    <div className="border-x border-stone-200">
                      <p className="text-[10px] font-semibold text-stone-400 uppercase">Wastage</p>
                      <p className="text-xs font-bold text-stone-900 mt-0.5">
                        {Number(karigar.standard_wastage_percent || 0).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase">Making Chg</p>
                      <p className="text-xs font-bold text-stone-900 mt-0.5">
                        ₹{Number(karigar.making_charge_per_gram || 0).toFixed(0)}/g
                      </p>
                    </div>
                  </div>

                  {/* Contact Quick Details */}
                  <div className="space-y-1 text-xs text-stone-600 mb-4">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-phone text-[11px] text-stone-400 w-4"></i>
                      <a href={`tel:${karigar.primary_phone}`} className="hover:text-[#b01622] font-medium">
                        {karigar.primary_phone}
                      </a>
                    </div>
                    {karigar.email && (
                      <div className="flex items-center gap-2 truncate">
                        <i className="fa-regular fa-envelope text-[11px] text-stone-400 w-4"></i>
                        <span className="truncate">{karigar.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewKarigar(karigar)}
                    className="flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    View Details
                  </button>
                  {karigar.current_assigned_order && (
                    <button
                      type="button"
                      onClick={() => setWorkModalOrderId(karigar.current_assigned_order.id)}
                      className="p-1.5 text-amber-800 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      title={`Open Workbench (${karigar.current_assigned_order.work_order_number})`}
                    >
                      <i className="fa-solid fa-screwdriver-wrench text-xs"></i>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(karigar)}
                    className="p-1.5 text-stone-500 hover:text-[#b01622] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <i className="fa-regular fa-pen-to-square text-xs"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(karigar)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <i className="fa-regular fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Grid Pagination */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchKarigars(searchTerm, page);
              }}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
                fetchKarigars(searchTerm, 1, limit);
              }}
            />
          </div>
        </div>
      )}

      {/* CREATE / EDIT KARIGAR MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto">
            {/* Modal Header with Red Gradient */}
            <div className="px-6 py-4.5 border-b border-red-900/30 flex items-center justify-between bg-gradient-to-r from-[#801824] via-[#9c131d] to-[#b01622] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center text-base shadow-sm">
                  <i className={editingKarigar ? 'fa-solid fa-user-pen' : 'fa-solid fa-user-plus'}></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">
                    {editingKarigar ? `Edit Artisan: ${editingKarigar.name}` : 'Register New Karigar'}
                  </h3>
                  <p className="text-xs text-red-100/80">
                    Enter craft competencies, wastage parameters, KYC and workshop location.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Tabs with Error Indicators */}
            {(() => {
              const tab1HasError = ['karigar_code', 'name', 'primary_phone', 'email', 'experience_years', 'workshop_name', 'workshop_address', 'city', 'state', 'zip_code'].some(k => !!formErrors[k]);
              const tab2HasError = ['specialization', 'standard_wastage_percent', 'making_charge_per_gram', 'current_gold_balance_grams'].some(k => !!formErrors[k]);
              const tab3HasError = ['pan_number', 'aadhar_number', 'bank_name', 'account_number', 'ifsc_code'].some(k => !!formErrors[k]);

              return (
                <div className="px-6 pt-3 border-b border-stone-200 flex items-center gap-6 bg-white">
                  <button
                    type="button"
                    onClick={() => setFormTab('general')}
                    className={`pb-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${formTab === 'general'
                      ? 'text-[#b01622] border-b-2 border-[#b01622]'
                      : 'text-stone-500 hover:text-stone-800'
                      }`}
                  >
                    <i className="fa-solid fa-id-card-clip"></i>
                    <span>1. Artisan & Workshop</span>
                    {tab1HasError && (
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" title="Missing required fields"></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTab('craft')}
                    className={`pb-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${formTab === 'craft'
                      ? 'text-[#b01622] border-b-2 border-[#b01622]'
                      : 'text-stone-500 hover:text-stone-800'
                      }`}
                  >
                    <i className="fa-solid fa-scale-balanced"></i>
                    <span>2. Craft Terms & Bench Metal</span>
                    {tab2HasError && (
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" title="Missing required fields"></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTab('kyc')}
                    className={`pb-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${formTab === 'kyc'
                      ? 'text-[#b01622] border-b-2 border-[#b01622]'
                      : 'text-stone-500 hover:text-stone-800'
                      }`}
                  >
                    <i className="fa-solid fa-building-columns"></i>
                    <span>3. KYC & Bank Details</span>
                    {tab3HasError && (
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" title="Missing required fields"></span>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: ARTISAN & WORKSHOP */}
              {formTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Karigar Code */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Karigar Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="karigar_code"
                          value={formData.karigar_code}
                          onChange={handleInputChange}
                          placeholder="e.g. KRG-1006"
                          className={`flex-1 px-3 py-2 bg-stone-50 border rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:bg-white ${formErrors.karigar_code ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={handleGenerateCode}
                          disabled={generatingCode}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                          title="Generate unique sequence code"
                        >
                          {generatingCode ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Auto Gen'}
                        </button>
                      </div>
                      {formErrors.karigar_code && <p className="text-[11px] text-red-500 mt-1">{formErrors.karigar_code}</p>}
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Full Name / Master Artisan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Rajesh Varma"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.name ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.name && <p className="text-[11px] text-red-500 mt-1">{formErrors.name}</p>}
                    </div>

                    {/* Primary Phone */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Primary Contact / Mobile <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                        <input
                          type="text"
                          name="primary_phone"
                          value={formData.primary_phone}
                          onChange={handleInputChange}
                          placeholder="+91 98401 23456"
                          className={`w-full pl-8 pr-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.primary_phone ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                      </div>
                      {formErrors.primary_phone && <p className="text-[11px] text-red-500 mt-1">{formErrors.primary_phone}</p>}
                    </div>

                    {/* Secondary Phone */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Secondary Phone (Optional)
                      </label>
                      <div className="relative">
                        <i className="fa-solid fa-mobile-screen absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                        <input
                          type="text"
                          name="secondary_phone"
                          value={formData.secondary_phone}
                          onChange={handleInputChange}
                          placeholder="+91 98401 23457"
                          className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="fa-regular fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="artisan@rudrajewellery.com"
                          className={`w-full pl-8 pr-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.email ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                      </div>
                      {formErrors.email && <p className="text-[11px] text-red-500 mt-1">{formErrors.email}</p>}
                    </div>

                    {/* Experience Years */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Years of Experience <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        name="experience_years"
                        value={formData.experience_years}
                        onChange={handleInputChange}
                        placeholder="e.g. 10"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.experience_years ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.experience_years && <p className="text-[11px] text-red-500 mt-1">{formErrors.experience_years}</p>}
                    </div>
                  </div>

                  {/* Workshop & Location Section */}
                  <div className="pt-3 border-t border-stone-100">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-warehouse text-[#b01622]"></i>
                      Workshop & Studio Location
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Workshop / Karkhana Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="workshop_name"
                          value={formData.workshop_name}
                          onChange={handleInputChange}
                          placeholder="e.g. Varma Handcrafted Filigree Studio"
                          className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.workshop_name ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        {formErrors.workshop_name && <p className="text-[11px] text-red-500 mt-1">{formErrors.workshop_name}</p>}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Street / Workshop Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          name="workshop_address"
                          value={formData.workshop_address}
                          onChange={handleInputChange}
                          placeholder="Door No, Street Name, Goldsmith Colony, Sowcarpet"
                          className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white resize-none ${formErrors.workshop_address ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        {formErrors.workshop_address && <p className="text-[11px] text-red-500 mt-1">{formErrors.workshop_address}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Chennai"
                          className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.city ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        {formErrors.city && <p className="text-[11px] text-red-500 mt-1">{formErrors.city}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          State & Pincode <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              placeholder="Tamil Nadu"
                              className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.state ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                                }`}
                            />
                            {formErrors.state && <p className="text-[11px] text-red-500 mt-1">{formErrors.state}</p>}
                          </div>
                          <div>
                            <input
                              type="text"
                              name="zip_code"
                              value={formData.zip_code}
                              onChange={handleInputChange}
                              placeholder="600079"
                              className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.zip_code ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                                }`}
                            />
                            {formErrors.zip_code && <p className="text-[11px] text-red-500 mt-1">{formErrors.zip_code}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Profile Photo URL */}
                  <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Operational Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                      >
                        <option value="active">Active (Taking Jobs)</option>
                        <option value="on_leave">On Leave (Temporary Away)</option>
                        <option value="inactive">Inactive (Archived)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Artisan Profile Image (Optional)
                      </label>
                      <div className="flex items-center gap-3">
                        {formData.avatar_url ? (
                          <div className="relative group shrink-0">
                            <img
                              src={formData.avatar_url}
                              alt="Artisan Preview"
                              className="w-12 h-12 rounded-xl object-cover border border-stone-300 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, avatar_url: '' }))}
                              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-xs hover:bg-red-700 cursor-pointer"
                              title="Remove Image"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                            <i className="fa-regular fa-image text-lg"></i>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <label className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 cursor-pointer transition-colors w-full justify-center sm:w-auto">
                            <i className="fa-solid fa-upload text-stone-500 text-xs"></i>
                            <span>{formData.avatar_url ? 'Change Image' : 'Upload Image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    showToast?.('Image size should be less than 5MB', 'error');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFormData((prev) => ({ ...prev, avatar_url: reader.result }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <span className="block text-[10px] text-stone-400 mt-1">PNG, JPG or WEBP (Max 5MB)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CRAFT TERMS & BENCH METAL */}
              {formTab === 'craft' && (
                <div className="space-y-5">
                  <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <i className="fa-solid fa-circle-info text-amber-700 text-sm mt-0.5"></i>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Craft parameters determine auto-calculated wastage percentages and making charges on work orders created for this Karigar. Metal on bench reflects raw bullion or unfinished jewelry currently held at their workshop.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Specialization */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700">
                          Primary Craft Specialization <span className="text-red-500">*</span>
                        </label>
                        <Link
                          to="/masters/work-specifications"
                          target="_blank"
                          className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1"
                          title="Manage craft specifications in Master (opens in new tab)"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                          <span>+ Manage Specifications</span>
                        </Link>
                      </div>
                      <select
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.specialization ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      >
                        <option value="">Select Craft Specialization</option>
                        {SPECIALIZATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {formErrors.specialization && <p className="text-[11px] text-red-500 mt-1">{formErrors.specialization}</p>}
                    </div>

                    {/* Standard Wastage % */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Standard Wastage Allowance (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          inputMode="decimal"
                          onKeyDown={handleDecimalKeyDown}
                          name="standard_wastage_percent"
                          value={formData.standard_wastage_percent}
                          onChange={(e) => setFormData({ ...formData, standard_wastage_percent: sanitizeDecimal(e.target.value) })}
                          className={`w-full pl-3 pr-8 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white no-spinners ${formErrors.standard_wastage_percent ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none select-none">%</span>
                      </div>
                      {formErrors.standard_wastage_percent ? (
                        <p className="text-[11px] text-red-500 mt-1">{formErrors.standard_wastage_percent}</p>
                      ) : (
                        <p className="text-[11px] text-stone-400 mt-1">Normal benchmark is 3.50% - 6.00%</p>
                      )}
                    </div>

                    {/* Making Charge per gram */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Default Making Charge (₹ / gram) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">₹</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          inputMode="decimal"
                          onKeyDown={handleDecimalKeyDown}
                          name="making_charge_per_gram"
                          value={formData.making_charge_per_gram}
                          onChange={(e) => setFormData({ ...formData, making_charge_per_gram: sanitizeDecimal(e.target.value) })}
                          className={`w-full pl-7 pr-8 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white no-spinners ${formErrors.making_charge_per_gram ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none select-none">/g</span>
                      </div>
                      {formErrors.making_charge_per_gram ? (
                        <p className="text-[11px] text-red-500 mt-1">{formErrors.making_charge_per_gram}</p>
                      ) : (
                        <p className="text-[11px] text-stone-400 mt-1">Standard rate for regular casting or handcrafting</p>
                      )}
                    </div>

                    {/* Current Gold Balance on Bench */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Current Metal on Bench (Grams) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          inputMode="decimal"
                          onKeyDown={handleDecimalKeyDown}
                          name="current_gold_balance_grams"
                          value={formData.current_gold_balance_grams}
                          onChange={(e) => setFormData({ ...formData, current_gold_balance_grams: sanitizeDecimal(e.target.value) })}
                          placeholder="0.000"
                          className={`w-full pl-3 pr-16 py-2 bg-stone-50 border rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:bg-white no-spinners ${formErrors.current_gold_balance_grams ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                            }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 text-xs font-bold pointer-events-none select-none">grams</span>
                      </div>
                      {formErrors.current_gold_balance_grams ? (
                        <p className="text-[11px] text-red-500 mt-1">{formErrors.current_gold_balance_grams}</p>
                      ) : (
                        <p className="text-[11px] text-stone-400 mt-1">
                          Opening pure gold balance physically assigned to this goldsmith (enter 0 if none).
                        </p>
                      )}
                    </div>

                    {/* Craftsmanship Notes */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Craftsmanship Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="e.g. Master at 22K Nagas and temple chokers. Proficient in antique matte polishing and hollow bead work."
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b01622] focus:bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: KYC & BANK DETAILS */}
              {formTab === 'kyc' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PAN Card */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        PAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="pan_number"
                        value={formData.pan_number}
                        onChange={handleInputChange}
                        placeholder="ABCDE1234F"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs uppercase font-mono font-bold text-stone-900 focus:outline-none focus:bg-white ${formErrors.pan_number ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.pan_number && <p className="text-[11px] text-red-500 mt-1">{formErrors.pan_number}</p>}
                    </div>

                    {/* Aadhar Number */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Aadhar Card Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="aadhar_number"
                        value={formData.aadhar_number}
                        onChange={handleInputChange}
                        placeholder="1234 5678 9012"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-mono font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.aadhar_number ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.aadhar_number && <p className="text-[11px] text-red-500 mt-1">{formErrors.aadhar_number}</p>}
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        placeholder="State Bank of India / HDFC"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.bank_name ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.bank_name && <p className="text-[11px] text-red-500 mt-1">{formErrors.bank_name}</p>}
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Bank Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleInputChange}
                        placeholder="50100234123456"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs font-mono font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.account_number ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.account_number && <p className="text-[11px] text-red-500 mt-1">{formErrors.account_number}</p>}
                    </div>

                    {/* IFSC Code */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        IFSC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={handleInputChange}
                        placeholder="SBIN0001234"
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-xl text-xs uppercase font-mono font-medium text-stone-900 focus:outline-none focus:bg-white ${formErrors.ifsc_code ? 'border-red-500 bg-red-50/30' : 'border-stone-300 focus:border-[#b01622]'
                          }`}
                      />
                      {formErrors.ifsc_code && <p className="text-[11px] text-red-500 mt-1">{formErrors.ifsc_code}</p>}
                    </div>

                    {/* UPI ID */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        UPI ID / Virtual Payment Address (Optional)
                      </label>
                      <input
                        type="text"
                        name="upi_id"
                        value={formData.upi_id}
                        onChange={handleInputChange}
                        placeholder="karigarname@oksbi"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {formTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'kyc' ? 'craft' : 'general')}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-left mr-1.5"></i>
                      Previous
                    </button>
                  )}
                  {formTab !== 'kyc' && (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'general' ? 'craft' : 'kyc')}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Next
                      <i className="fa-solid fa-arrow-right ml-1.5"></i>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-[#b01622] to-[#801824] hover:from-[#9c131d] hover:to-[#6d131e] text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>{editingKarigar ? 'Update Karigar' : 'Register Karigar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARTISAN DETAIL VIEW DRAWER / MODAL */}
      {viewKarigar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto">
            {/* Header with Artisan Avatar and Status */}
            <div className="p-6 bg-gradient-to-r from-[#801824] via-[#9c131d] to-[#b01622] text-white relative">
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewKarigar;
                    setViewKarigar(null);
                    handleOpenEdit(target);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Update artisan details & terms"
                >
                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewKarigar(null)}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              <div className="flex items-center gap-4">
                {viewKarigar.avatar_url ? (
                  <img
                    src={viewKarigar.avatar_url}
                    alt={viewKarigar.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#801824] to-[#b01622] text-white font-bold flex items-center justify-center text-2xl shadow-md shrink-0">
                    {viewKarigar.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-serif font-bold text-white tracking-tight">
                      {viewKarigar.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${viewKarigar.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        }`}
                    >
                      {viewKarigar.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-stone-300 text-xs">
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-amber-300 font-semibold">
                      {viewKarigar.karigar_code}
                    </span>
                    <span>•</span>
                    <span>{viewKarigar.specialization}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Drawer Tabs */}
            <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-2 gap-2 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setViewDrawerTab('works')}
                className={`py-2.5 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t-2 ${viewDrawerTab === 'works'
                  ? 'bg-white text-[#b01622] border-[#b01622] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 border-transparent'
                  }`}
              >
                <i className="fa-solid fa-screwdriver-wrench text-xs"></i>
                <span>Workbench & Assigned Works</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${(viewKarigar?.current_assigned_order || selectedKarigarWorks.some(w => !['completed', 'cancelled', 'final_received'].includes(w.status)))
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-stone-200 text-stone-600'
                  }`}>
                  {(viewKarigar?.current_assigned_order || selectedKarigarWorks.some(w => !['completed', 'cancelled', 'final_received'].includes(w.status))) ? '1 Active' : '0 Active'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewDrawerTab('profile')}
                className={`py-2.5 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t-2 ${viewDrawerTab === 'profile'
                  ? 'bg-white text-[#b01622] border-[#b01622] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 border-transparent'
                  }`}
              >
                <i className="fa-regular fa-id-card text-xs"></i>
                <span>Artisan Profile & KYC</span>
              </button>
            </div>

            {/* Content Details (Tabs) */}
            <div className="flex-1 overflow-y-auto p-6 text-xs text-stone-700">
              {viewDrawerTab === 'works' ? (() => {
                const activeList = selectedKarigarWorks.filter(
                  (w) => !['completed', 'cancelled', 'final_received'].includes(w.status)
                );
                const effectiveActiveOrders = activeList.length > 0
                  ? activeList
                  : (viewKarigar?.current_assigned_order ? [viewKarigar.current_assigned_order] : []);

                const completedList = selectedKarigarWorks.filter(
                  (w) => ['completed', 'final_received'].includes(w.status)
                );

                return (
                  <div className="space-y-6">
                    {/* Active Work Orders on Bench */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                          <i className="fa-solid fa-hammer text-[#b01622]"></i>
                          <span>Active Project on Bench</span>
                          {loadingKarigarWorks && <i className="fa-solid fa-circle-notch fa-spin text-[10px] text-stone-400 ml-1"></i>}
                        </h4>
                        {effectiveActiveOrders.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Artisan Busy (1 Active Project Rule)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Ready for New Assignment
                          </span>
                        )}
                      </div>

                      {effectiveActiveOrders.length > 0 ? (
                        effectiveActiveOrders.map((wo) => (
                          <div
                            key={wo.id}
                            className="bg-stone-50 rounded-2xl border-2 border-amber-200 p-4 space-y-3 shadow-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#b01622]">
                                  {wo.work_order_number}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                  {wo.status?.replace('_', ' ')}
                                </span>
                                {wo.return_count > 0 && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                    Rework Cycle #{wo.return_count}
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-stone-500 font-medium">
                                Due: {wo.delivery_date ? new Date(wo.delivery_date).toLocaleDateString('en-GB') : 'Immediate'}
                              </div>
                            </div>

                            <div>
                              <h5 className="font-bold text-stone-900 text-xs">{wo.product_name}</h5>
                              <p className="text-[11px] text-stone-500 mt-0.5">
                                Stage: <span className="font-semibold text-gray-800 capitalize">{wo.current_stage?.replace(/_/g, ' ') || 'Assigned'}</span> •{' '}
                                Allotted Pure Metal: <span className="font-mono font-bold text-stone-900">{Number(wo.allotted_weight || 0).toFixed(3)}g</span>
                              </p>
                            </div>

                            {/* Return Alert if returned */}
                            {wo.return_reason && (
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
                                <i className="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 shrink-0"></i>
                                <div>
                                  <span className="font-bold block">Returned by Admin for Rework:</span>
                                  <p className="mt-0.5 text-rose-800">{wo.return_reason}</p>
                                </div>
                              </div>
                            )}

                            {/* Delay Alert if delay reason exists */}
                            {wo.karigar_data?.delay_reason && (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                                <i className="fa-solid fa-clock-rotate-left text-amber-600 shrink-0"></i>
                                <span>
                                  <strong>Delay Update:</strong> {wo.karigar_data.delay_reason}
                                  {wo.karigar_data.delay_date && ` • Revised Due: ${new Date(wo.karigar_data.delay_date).toLocaleDateString('en-GB')}`}
                                </span>
                              </div>
                            )}

                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200">
                              <span className="text-[11px] text-stone-400">
                                {wo.karigar_submitted_at ? `Submitted on ${new Date(wo.karigar_submitted_at).toLocaleString('en-IN')}` : 'Work in progress'}
                              </span>
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/job-order/receive?order_id=${wo.id}`}
                                  className="px-3 py-2 bg-white hover:bg-stone-100 text-[#b01622] border border-[#b01622] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                  <i className="fa-solid fa-box-archive"></i>
                                  <span>Receive Work Order</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setWorkModalOrderId(wo.id)}
                                  className="px-3.5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                                >
                                  <i className="fa-solid fa-pen-ruler"></i>
                                  <span>Update Weight & Delay</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : loadingKarigarWorks ? (
                        <div className="py-8 text-center text-stone-400 space-y-2">
                          <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#b01622]"></i>
                          <p className="text-xs font-medium">Checking active bench orders...</p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-base">
                            <i className="fa-solid fa-circle-check"></i>
                          </div>
                          <h5 className="font-bold text-emerald-900 text-xs">No Active Work Order On Bench</h5>
                          <p className="text-[11px] text-emerald-700 max-w-sm mx-auto">
                            Artisan is currently available to accept a new work order assignment in Job Creation module.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Completed Work Orders History */}
                    <div className="space-y-3 pt-2">
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                        <i className="fa-solid fa-clock-rotate-left text-stone-400"></i>
                        <span>Completed Work History ({completedList.length})</span>
                      </h4>

                      {completedList.length > 0 ? (
                        <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 bg-white">
                          {completedList.map((cw) => (
                            <div key={cw.id} className="p-3 hover:bg-stone-50 flex items-center justify-between gap-3 text-xs transition-colors">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-stone-900">{cw.work_order_number}</span>
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    COMPLETED
                                  </span>
                                </div>
                                <p className="text-stone-600 text-[11px] mt-0.5">{cw.product_name}</p>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-bold text-stone-900 block">
                                  {Number(cw.completed_weight || cw.allotted_weight || 0).toFixed(3)}g
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  {cw.updated_at ? new Date(cw.updated_at).toLocaleDateString('en-GB') : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-400 italic py-2">No completed orders on record yet.</p>
                      )}
                    </div>
                  </div>
                );
              })() : (
                /* TAB 2: PROFILE & KYC */
                <div className="space-y-5">
                  {/* Bench Metal and Terms Grid */}
                  <div className="grid grid-cols-3 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase">Bench Gold Balance</p>
                      <p className="text-base font-bold text-stone-900 mt-0.5 font-mono">
                        {Number(viewKarigar.current_gold_balance_grams || 0).toFixed(3)}
                        <span className="text-xs font-sans text-amber-700 ml-1">g</span>
                      </p>
                    </div>
                    <div className="border-x border-stone-200">
                      <p className="text-[10px] font-semibold text-stone-400 uppercase">Wastage Standard</p>
                      <p className="text-base font-bold text-stone-900 mt-0.5">
                        {Number(viewKarigar.standard_wastage_percent || 0).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase">Making Charge</p>
                      <p className="text-base font-bold text-stone-900 mt-0.5">
                        ₹{Number(viewKarigar.making_charge_per_gram || 0).toFixed(0)}/g
                      </p>
                    </div>
                  </div>

                  {/* Contact & Workshop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <h4 className="font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <i className="fa-solid fa-address-book text-[#b01622]"></i>
                        Contact Info
                      </h4>
                      <p className="flex items-center gap-2">
                        <i className="fa-solid fa-phone text-stone-400 w-4"></i>
                        <span className="font-semibold text-stone-900">{viewKarigar.primary_phone}</span>
                      </p>
                      {viewKarigar.secondary_phone && (
                        <p className="flex items-center gap-2">
                          <i className="fa-solid fa-mobile-screen text-stone-400 w-4"></i>
                          <span>{viewKarigar.secondary_phone}</span>
                        </p>
                      )}
                      {viewKarigar.email && (
                        <p className="flex items-center gap-2">
                          <i className="fa-regular fa-envelope text-stone-400 w-4"></i>
                          <span>{viewKarigar.email}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <i className="fa-solid fa-briefcase text-stone-400 w-4"></i>
                        <span>{viewKarigar.experience_years} Years Craft Experience</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <h4 className="font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <i className="fa-solid fa-shop text-[#b01622]"></i>
                        Workshop Location
                      </h4>
                      <p className="font-semibold text-stone-900">
                        {viewKarigar.workshop_name || 'Individual Bench Goldsmith'}
                      </p>
                      <p className="text-stone-600 leading-relaxed">
                        {viewKarigar.workshop_address || 'No street address specified'}
                      </p>
                      <p className="text-stone-500">
                        {viewKarigar.city}, {viewKarigar.state} - {viewKarigar.zip_code || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* KYC & Financial Details */}
                  <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3">
                    <h4 className="font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider text-[11px]">
                      <i className="fa-solid fa-building-columns text-[#b01622]"></i>
                      KYC & Bank Accounts
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">PAN Number</span>
                        <p className="font-mono font-bold text-stone-900 mt-0.5">{viewKarigar.pan_number || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">Aadhar Number</span>
                        <p className="font-mono font-medium text-stone-900 mt-0.5">{viewKarigar.aadhar_number || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">Bank Name</span>
                        <p className="font-medium text-stone-900 mt-0.5">{viewKarigar.bank_name || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">IFSC Code</span>
                        <p className="font-mono font-medium text-stone-900 mt-0.5">{viewKarigar.ifsc_code || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">Account Number</span>
                        <p className="font-mono font-bold text-stone-900 mt-0.5">{viewKarigar.account_number || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-stone-400 font-semibold uppercase">UPI ID</span>
                        <p className="font-medium text-stone-900 mt-0.5">{viewKarigar.upi_id || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {viewKarigar.notes && (
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                      <span className="font-bold text-stone-700 block mb-1">Craftsmanship Notes:</span>
                      <p className="text-stone-600 leading-relaxed">{viewKarigar.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = viewKarigar;
                  setViewKarigar(null);
                  handleOpenEdit(target);
                }}
                className="px-4 py-2 bg-[#b01622] hover:bg-[#90121b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <i className="fa-regular fa-pen-to-square"></i>
                Edit Karigar Details
              </button>

              <button
                type="button"
                onClick={() => setViewKarigar(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTISAN WORKBENCH MODAL */}
      <KarigarWorkModal
        isOpen={!!workModalOrderId}
        workOrderId={workModalOrderId}
        onClose={() => {
          setWorkModalOrderId(null);
          if (viewKarigar?.id) {
            fetchKarigarWorks(viewKarigar.id);
          }
          fetchKarigars();
        }}
        onUpdated={() => {
          if (viewKarigar?.id) {
            fetchKarigarWorks(viewKarigar.id);
          }
          fetchKarigars();
        }}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Artisan Profile"
        message={`Are you sure you want to remove artisan "${deleteTarget?.name}" (${deleteTarget?.karigar_code})? Any assigned jobs or metal balances will need reconciliation.`}
        confirmText="Yes, Delete Artisan"
        confirmIcon="fa-regular fa-trash-can"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Bench Metal Pop-up Modal */}
      <BenchMetalModal
        isOpen={isBenchModalOpen}
        onClose={() => setIsBenchModalOpen(false)}
        totalBenchMetal={Number(stats.total_gold_balance || 0)}
        karigarsList={karigars}
      />
    </div>
  );
}
