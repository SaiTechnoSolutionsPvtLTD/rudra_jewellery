import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import { DEFAULT_COMPANY_INFO, fetchCompanyInfo } from '../../utils/companyInfoService';

export default function CompanyInfoMaster() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ ...DEFAULT_COMPANY_INFO });

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/company-info');
      const data = response?.data;
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
        const def = data.find(c => c.is_default) || data[0];
        localStorage.setItem('rudhra_company_info', JSON.stringify(def));
        window.dispatchEvent(new CustomEvent('rudhra_company_info_updated', { detail: def }));
      } else {
        setCompanies([DEFAULT_COMPANY_INFO]);
        localStorage.setItem('rudhra_company_info', JSON.stringify(DEFAULT_COMPANY_INFO));
      }
    } catch (err) {
      console.warn('Company info fetch warning, using local state:', err);
      const stored = localStorage.getItem('rudhra_company_info');
      if (stored) {
        try { setCompanies([JSON.parse(stored)]); } catch (e) { setCompanies([DEFAULT_COMPANY_INFO]); }
      } else {
        setCompanies([DEFAULT_COMPANY_INFO]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedCompany(null);
    setFormData({
      company_name: '',
      tagline: '',
      address_line1: '',
      address_line2: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600079',
      state_code: '33',
      phone: '',
      alternate_phone: '',
      email: '',
      website: '',
      gstin: '',
      pan_no: '',
      reg_no: '',
      hallmark_license: '',
      terms_and_conditions: "1. Goods once sold will not be taken back or exchanged after 7 days.\n2. Weight and purity certified as per BIS Hallmark standards.\n3. Subject to jurisdiction only.",
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch: '',
      logo_url: '/logo.png',
      is_default: companies.length === 0,
      is_active: true
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (comp) => {
    setSelectedCompany(comp);
    setFormData({
      company_name: comp.company_name || '',
      tagline: comp.tagline || '',
      address_line1: comp.address_line1 || '',
      address_line2: comp.address_line2 || '',
      city: comp.city || '',
      state: comp.state || '',
      pincode: comp.pincode || '',
      state_code: comp.state_code || '',
      phone: comp.phone || '',
      alternate_phone: comp.alternate_phone || '',
      email: comp.email || '',
      website: comp.website || '',
      gstin: comp.gstin || '',
      pan_no: comp.pan_no || '',
      reg_no: comp.reg_no || '',
      hallmark_license: comp.hallmark_license || '',
      terms_and_conditions: comp.terms_and_conditions || '',
      bank_name: comp.bank_name || '',
      account_number: comp.account_number || '',
      ifsc_code: comp.ifsc_code || '',
      branch: comp.branch || '',
      logo_url: comp.logo_url || '/logo.png',
      is_default: Boolean(comp.is_default),
      is_active: Boolean(comp.is_active)
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (comp) => {
    setSelectedCompany(comp);
    setIsDeleteModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      showToast('Company Name is required', 'error', 'Validation Error');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedCompany?.id) {
        const res = await api.put(`/company-info/${selectedCompany.id}`, formData);
        showToast('Company details updated successfully!', 'success', 'Updated');
        if (res.data?.is_default) {
          localStorage.setItem('rudhra_company_info', JSON.stringify(res.data));
          window.dispatchEvent(new CustomEvent('rudhra_company_info_updated', { detail: res.data }));
        }
      } else {
        const res = await api.post('/company-info', formData);
        showToast('New Company profile added successfully!', 'success', 'Created');
        if (res.data?.is_default) {
          localStorage.setItem('rudhra_company_info', JSON.stringify(res.data));
          window.dispatchEvent(new CustomEvent('rudhra_company_info_updated', { detail: res.data }));
        }
      }
      setIsFormModalOpen(false);
      loadCompanies();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save company details.';
      showToast(msg, 'error', 'Operation Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (comp) => {
    try {
      if (comp.id) {
        await api.post(`/company-info/${comp.id}/set-default`);
      }
      const updatedList = companies.map(c => ({
        ...c,
        is_default: c.id === comp.id || c === comp
      }));
      setCompanies(updatedList);
      localStorage.setItem('rudhra_company_info', JSON.stringify(comp));
      window.dispatchEvent(new CustomEvent('rudhra_company_info_updated', { detail: comp }));
      showToast(`"${comp.company_name}" set as default for Bills & Reports!`, 'success', 'Default Updated');
      loadCompanies();
    } catch (err) {
      console.error(err);
      showToast('Failed to update default company profile', 'error', 'Error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCompany?.id) {
      setIsDeleteModalOpen(false);
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/company-info/${selectedCompany.id}`);
      showToast(`Company profile "${selectedCompany.company_name}" deleted`, 'success', 'Deleted');
      setIsDeleteModalOpen(false);
      loadCompanies();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete company profile', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCompanies = companies.filter(c =>
    (c.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.gstin || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCompany = companies.find(c => c.is_default) || companies[0] || DEFAULT_COMPANY_INFO;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1">
            <Link to="/dashboard" className="hover:text-[#b01622] transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-stone-700">Masters</span>
            <span>/</span>
            <span className="text-[#b01622] font-semibold">Company Info</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <i className="fa-solid fa-[#b01622] fa-building text-xl text-[#b01622]"></i>
            Company Information Master
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage showroom address, GSTIN, BIS Hallmark license, bank details, and legal footers printed on sales bills, invoices, work orders, and financial reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Add New Company Profile
          </button>
        </div>
      </div>

      {/* Live Bill & Report Header Preview Card */}
      <div className="bg-gradient-to-br from-amber-500/10 via-stone-900/5 to-red-500/10 p-5 rounded-2xl border border-amber-200/60 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <i className="fa-solid fa-receipt text-amber-700"></i>
            Active Print Header Preview (Bills & Reports)
          </div>
          <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
            Live Default
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm max-w-3xl mx-auto text-center font-sans space-y-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <img src={activeCompany?.logo_url || '/logo.png'} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain" />
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#b01622] uppercase">{activeCompany?.company_name || 'RUDRA JEWELLERS'}</h2>
              {activeCompany?.tagline && (
                <p className="text-[11px] font-medium text-stone-500">{activeCompany.tagline}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-stone-700 font-medium">
            {[activeCompany?.address_line1, activeCompany?.address_line2, activeCompany?.city, activeCompany?.state && `${activeCompany.state} - ${activeCompany?.pincode || ''}`]
              .filter(Boolean)
              .join(', ')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-stone-600">
            {activeCompany?.phone && <span><strong>Phone:</strong> {activeCompany.phone}</span>}
            {activeCompany?.email && <span><strong>Email:</strong> {activeCompany.email}</span>}
            {activeCompany?.website && <span><strong>Web:</strong> {activeCompany.website}</span>}
          </div>

          <div className="pt-2 border-t border-dashed border-stone-200 flex flex-wrap items-center justify-center gap-x-6 text-[10px] font-mono text-stone-700">
            {activeCompany?.gstin && <span><strong>GSTIN:</strong> {activeCompany.gstin}</span>}
            {activeCompany?.reg_no && <span><strong>Reg No:</strong> {activeCompany.reg_no}</span>}
            {activeCompany?.hallmark_license && <span><strong>BIS Hallmark:</strong> {activeCompany.hallmark_license}</span>}
          </div>
        </div>
      </div>

      {/* Search & Companies Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company profiles by name, city, GSTIN..."
              className="w-full pl-9 pr-8 py-2 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-[#b01622] bg-stone-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <span className="text-xs text-stone-500 font-medium">
            Showing {filteredCompanies.length} company profile{filteredCompanies.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 shadow-2xs">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mb-2"></i>
            <p className="text-xs text-stone-500 font-medium">Loading company master details...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <i className="fa-solid fa-building-circle-xmark text-4xl text-stone-300"></i>
            <p className="text-sm font-semibold text-stone-700">No company profiles found</p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg hover:bg-[#8e111a] transition-colors"
            >
              Add Company Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCompanies.map((comp, index) => (
              <div
                key={comp.id || index}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-2xs flex flex-col justify-between ${
                  comp.is_default
                    ? 'border-[#b01622] ring-2 ring-[#b01622]/10 bg-red-50/10'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  {/* Top Badges & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-stone-900">{comp.company_name}</span>
                      {comp.is_default && (
                        <span className="text-[10px] font-extrabold bg-[#b01622] text-white px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                          <i className="fa-solid fa-star text-[8px]"></i> Default Bill Header
                        </span>
                      )}
                      {!comp.is_default && comp.is_active && (
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(comp)}
                        className="p-1.5 text-stone-600 hover:text-[#b01622] hover:bg-stone-100 rounded-lg text-xs transition-colors"
                        title="Edit Company Details"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      {!comp.is_default && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(comp)}
                          className="p-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                          title="Delete Company Profile"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {comp.tagline && (
                    <p className="text-xs text-stone-500 italic mb-3">{comp.tagline}</p>
                  )}

                  {/* Details Grid */}
                  <div className="space-y-2 text-xs border-t border-stone-100 pt-3">
                    <div className="flex items-start gap-2">
                      <i className="fa-solid fa-location-dot text-stone-400 text-xs mt-0.5 shrink-0"></i>
                      <span className="text-stone-700">
                        {[comp.address_line1, comp.address_line2, comp.city, comp.state, comp.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-stone-400 block font-medium">GSTIN</span>
                        <span className="font-mono font-bold text-stone-800">{comp.gstin || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">BIS Hallmark License</span>
                        <span className="font-mono font-bold text-stone-800">{comp.hallmark_license || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Contact Phone</span>
                        <span className="text-stone-800 font-semibold">{comp.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Email</span>
                        <span className="text-stone-800 font-semibold">{comp.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  {!comp.is_default ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(comp)}
                      className="text-xs font-bold text-[#b01622] hover:text-[#8e111a] hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-circle-check"></i> Set As Default Print Header
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <i className="fa-solid fa-[#b01622] fa-check-double text-[#b01622]"></i> Active Default Profile
                    </span>
                  )}

                  <span className="text-[10px] text-stone-400 font-mono">
                    State Code: {comp.state_code || '33'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Company Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-5 bg-stone-900 text-white rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-building-circle-check text-amber-400 text-lg"></i>
                <h3 className="font-bold text-base">
                  {selectedCompany ? 'Edit Company Information' : 'Add New Company Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section 1: Core Company Profile */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-1.5 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-[#b01622]"></i>
                  1. Company Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="e.g. RUDRA JEWELLERS"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Tagline / Sub-Title</label>
                    <input
                      type="text"
                      name="tagline"
                      value={formData.tagline}
                      onChange={handleChange}
                      placeholder="e.g. Exclusive Fine Gold & Diamond Jewellery"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Logo Image Path / URL</label>
                    <input
                      type="text"
                      name="logo_url"
                      value={formData.logo_url}
                      onChange={handleChange}
                      placeholder="/logo.png"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={handleChange}
                        className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622]"
                      />
                      Set as Default Print Header
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622]"
                      />
                      Active Profile
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 2: Address & Contact Info */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-1.5 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-map-location-dot text-[#b01622]"></i>
                  2. Address & Contact Numbers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      name="address_line1"
                      value={formData.address_line1}
                      onChange={handleChange}
                      placeholder="e.g. 124, N.S.C. Bose Road"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Address Line 2 / Area</label>
                    <input
                      type="text"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={handleChange}
                      placeholder="e.g. Sowcarpet"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Chennai"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="Tamil Nadu"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder="600079"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Primary Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98400 12345"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Alternate Phone / Landline</label>
                    <input
                      type="text"
                      name="alternate_phone"
                      value={formData.alternate_phone}
                      onChange={handleChange}
                      placeholder="044-25380000"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="info@rudrajewellers.com"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="www.rudrajewellers.com"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Tax, Licensing & Registration */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-1.5 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-[#b01622]"></i>
                  3. GST, PAN & BIS Hallmark Licenses
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="33AAACR1234F1Z0"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">State Code</label>
                    <input
                      type="text"
                      name="state_code"
                      value={formData.state_code}
                      onChange={handleChange}
                      placeholder="33 (Tamil Nadu)"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      name="pan_no"
                      value={formData.pan_no}
                      onChange={handleChange}
                      placeholder="AAACR1234F"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Business Registration No.</label>
                    <input
                      type="text"
                      name="reg_no"
                      value={formData.reg_no}
                      onChange={handleChange}
                      placeholder="CHN/2026/JEW/9912"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">BIS Hallmark License No.</label>
                    <input
                      type="text"
                      name="hallmark_license"
                      value={formData.hallmark_license}
                      onChange={handleChange}
                      placeholder="HM-339018274"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Legal Footer Terms */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-1.5 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-[#b01622] fa-scale-balanced"></i>
                  4. Bill Terms & Conditions
                </h4>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Bill Footer Terms & Conditions</label>
                  <textarea
                    name="terms_and_conditions"
                    rows={4}
                    value={formData.terms_and_conditions}
                    onChange={handleChange}
                    placeholder="Enter legal terms to print on bill footers..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                  {selectedCompany ? 'Update Company Profile' : 'Save Company Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Company Profile"
        message={`Are you sure you want to delete "${selectedCompany?.company_name}"?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
