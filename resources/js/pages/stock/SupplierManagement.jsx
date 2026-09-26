import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

export default function SupplierManagement() {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewSupplier, setViewSupplier] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState(null);

  // Form State
  const initialFormState = {
    supplier_code: '',
    name: '',
    company_name: '',
    supplier_type: 'raw_gold',
    phone: '',
    email: '',
    gstin: '',
    pan_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch: '',
    status: 'active',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch Suppliers from API
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data?.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load suppliers list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter & Search Logic
  const filteredSuppliers = suppliers.filter((item) => {
    // Type Filter
    if (filterType !== 'all' && item.supplier_type !== filterType) {
      return false;
    }
    // Status Filter
    if (filterStatus !== 'all' && item.status !== filterStatus) {
      return false;
    }
    // Search Term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const codeMatch = (item.supplier_code || '').toLowerCase().includes(term);
      const nameMatch = (item.name || '').toLowerCase().includes(term);
      const companyMatch = (item.company_name || '').toLowerCase().includes(term);
      const phoneMatch = (item.phone || '').toLowerCase().includes(term);
      const gstinMatch = (item.gstin || '').toLowerCase().includes(term);
      const cityMatch = (item.city || '').toLowerCase().includes(term);
      return codeMatch || nameMatch || companyMatch || phoneMatch || gstinMatch || cityMatch;
    }

    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Auto-generate Supplier Code
  const generateSupplierCode = () => {
    const nextNum = suppliers.length + 101;
    return `SUP-${nextNum}`;
  };

  // Open Modal for Create
  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedSupplierId(null);
    setFormData({
      ...initialFormState,
      supplier_code: generateSupplierCode()
    });
    setShowAddEditModal(true);
  };

  // Open Modal for Edit
  const openEditModal = (supplier) => {
    setIsEditMode(true);
    setSelectedSupplierId(supplier.id);
    setFormData({
      supplier_code: supplier.supplier_code || '',
      name: supplier.name || '',
      company_name: supplier.company_name || '',
      supplier_type: supplier.supplier_type || 'raw_gold',
      phone: supplier.phone || '',
      email: supplier.email || '',
      gstin: supplier.gstin || '',
      pan_number: supplier.pan_number || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      bank_name: supplier.bank_name || '',
      account_number: supplier.account_number || '',
      ifsc_code: supplier.ifsc_code || '',
      branch: supplier.branch || '',
      status: supplier.status || 'active',
      notes: supplier.notes || ''
    });
    setShowAddEditModal(true);
  };

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Add / Edit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = [];
    if (!formData.supplier_code?.trim()) missing.push('Supplier Code');
    if (!formData.name?.trim()) missing.push('Supplier Name');
    if (!formData.phone?.trim()) missing.push('Primary Phone');
    if (!formData.email?.trim()) missing.push('Email Address');
    if (!formData.address?.trim()) missing.push('Street Address');
    if (!formData.city?.trim()) missing.push('City');
    if (!formData.state?.trim()) missing.push('State');
    if (!formData.pincode?.trim()) missing.push('Pincode');

    if (missing.length > 0) {
      showToast(`Please enter all required fields (marked in red): ${missing.join(', ')}`, 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const res = await api.put(`/suppliers/${selectedSupplierId}`, formData);
        showToast(res.data?.message || 'Supplier updated successfully!', 'success');
      } else {
        const res = await api.post('/suppliers', formData);
        showToast(res.data?.message || 'Supplier registered successfully!', 'success');
      }
      setShowAddEditModal(false);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save supplier details', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (supplier) => {
    setDeleteSupplierTarget(supplier);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deleteSupplierTarget) return;
    try {
      await api.delete(`/suppliers/${deleteSupplierTarget.id}`);
      showToast(`Supplier ${deleteSupplierTarget.name} deleted successfully!`, 'success');
      setShowDeleteModal(false);
      setDeleteSupplierTarget(null);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete supplier', 'error');
    }
  };

  // Open View Details Modal
  const openViewModal = (supplier) => {
    setViewSupplier(supplier);
    setShowViewModal(true);
  };

  // Helper Badge Colors for Supplier Type
  const getSupplierTypeBadge = (type) => {
    switch (type) {
      case 'raw_gold':
        return { label: 'Raw Gold Dealer', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'fa-solid fa-coins' };
      case 'bullion':
        return { label: 'Bullion Merchant', color: 'bg-[#b01622]/10 text-[#b01622] border-red-200', icon: 'fa-solid fa-[#b01622] fa-vault' };
      case 'finished_jewellery':
        return { label: 'Jewellery Vendor', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'fa-solid fa-gem' };
      case 'gemstones':
        return { label: 'Gemstone Supplier', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: 'fa-solid fa-ring' };
      default:
        return { label: 'Packaging / Other', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'fa-solid fa-box' };
    }
  };

  // Metrics Summary
  const rawGoldCount = suppliers.filter(s => s.supplier_type === 'raw_gold').length;
  const bullionCount = suppliers.filter(s => s.supplier_type === 'bullion').length;
  const activeCount = suppliers.filter(s => s.status === 'active').length;

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            STOCK MANAGEMENT <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-600">SUPPLIERS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Supplier Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage Raw Gold Vendors, Bullion Merchants, Finished Jewellery Wholesalers & Gemstone Suppliers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-user-plus text-xs"></i>
            Register New Supplier
          </button>
          
          <button
            onClick={fetchSuppliers}
            className="p-2.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh Suppliers"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center text-lg">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Suppliers</span>
            <div className="text-xl font-bold text-gray-900">{suppliers.length} Registered</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg border border-amber-200">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Raw Gold Dealers</span>
            <div className="text-xl font-bold text-amber-800">{rawGoldCount} Vendors</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg border border-red-200">
            <i className="fa-solid fa-vault"></i>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Bullion Merchants</span>
            <div className="text-xl font-bold text-[#b01622]">{bullionCount} Merchants</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg border border-emerald-200">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Active Suppliers</span>
            <div className="text-xl font-bold text-emerald-800">{activeCount} Active</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Table Filters & Search Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full md:max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by code, firm name, contact, phone, GSTIN..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622] focus:border-[#b01622] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            >
              <option value="all">All Supplier Types</option>
              <option value="raw_gold">Raw Gold Dealers</option>
              <option value="bullion">Bullion Merchants</option>
              <option value="finished_jewellery">Finished Jewellery Vendors</option>
              <option value="gemstones">Gemstone Suppliers</option>
              <option value="packaging">Packaging & Other</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Suppliers Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3.5 px-4">Code & Firm Name</th>
                <th className="py-3.5 px-4">Supplier Category</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">GSTIN & PAN</th>
                <th className="py-3.5 px-4">City / Location</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <i className="fa-solid fa-spinner animate-spin text-xl text-[#b01622] mb-2"></i>
                    <p>Loading suppliers list...</p>
                  </td>
                </tr>
              ) : paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <i className="fa-solid fa-users-slash text-3xl text-gray-300 mb-2"></i>
                    <p className="font-semibold text-gray-700">No suppliers found</p>
                    <p className="text-xs text-gray-400 mt-1">Try resetting filters or search criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((item) => {
                  const typeBadge = getSupplierTypeBadge(item.supplier_type);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      
                      {/* Code & Firm Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{item.name}</div>
                        {item.company_name && (
                          <div className="text-gray-500 text-[11px] truncate max-w-xs">{item.company_name}</div>
                        )}
                        <span className="inline-block font-mono text-[10px] font-semibold text-[#b01622] bg-red-50 px-1.5 py-0.2 rounded border border-red-100 mt-1">
                          {item.supplier_code}
                        </span>
                      </td>

                      {/* Supplier Category Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeBadge.color}`}>
                          <i className={`${typeBadge.icon} text-xs`}></i>
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">{item.phone || 'N/A'}</div>
                        {item.email && (
                          <div className="text-gray-500 text-[11px] font-mono">{item.email}</div>
                        )}
                      </td>

                      {/* GSTIN & PAN */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {item.gstin ? (
                          <div className="font-bold text-gray-800">{item.gstin}</div>
                        ) : (
                          <span className="text-gray-400 italic">No GSTIN</span>
                        )}
                        {item.pan_number && (
                          <div className="text-gray-500">PAN: {item.pan_number}</div>
                        )}
                      </td>

                      {/* City / Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{item.city || 'N/A'}</div>
                        <div className="text-gray-500 text-[11px]">{item.state || '-'}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openViewModal(item)}
                            className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="View Full Supplier Profile"
                          >
                            <i className="fa-regular fa-eye"></i>
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Supplier Details"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>

                          <button
                            onClick={() => openDeleteModal(item)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Supplier"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredSuppliers.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
              totalItems={filteredSuppliers.length}
            />
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT SUPPLIER MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#b01622]/30 border border-[#b01622]/40 text-red-400 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-building-user"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-serif">
                    {isEditMode ? 'Edit Supplier Details' : 'Register New Jewellery Supplier'}
                  </h3>
                  <p className="text-xs text-gray-300">Enter firm details, contact information, GSTIN & bank credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* SECTION 1: General Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-[#b01622]"></i> Basic Identification & Type
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Supplier Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="supplier_code"
                      value={formData.supplier_code}
                      onChange={handleInputChange}
                      required
                      placeholder="SUP-101"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Supplier / Firm Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Vummidi Bullion Traders"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Company / Brand Name (Optional)
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Vummidi Raw Gold Co."
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Supplier Category / Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="supplier_type"
                      value={formData.supplier_type}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="raw_gold">Raw Gold Dealer (Melting Gold)</option>
                      <option value="bullion">Bullion Merchant (Coins & Bars)</option>
                      <option value="finished_jewellery">Finished Jewellery Vendor</option>
                      <option value="gemstones">Gemstone / Diamond Merchant</option>
                      <option value="packaging">Packaging & Accessories</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Primary Phone / Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+91 98400 00000"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="supplier@jewels.com"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: GSTIN & Tax Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-receipt text-[#b01622]"></i> Tax & Identification Credentials (Optional)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      GSTIN Number (Optional)
                    </label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleInputChange}
                      placeholder="33AAAAA0000A1Z5"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono font-semibold uppercase text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      PAN Card Number (Optional)
                    </label>
                    <input
                      type="text"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleInputChange}
                      placeholder="AAAAA0000A"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono font-semibold uppercase text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Account Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="active">Active Account</option>
                      <option value="inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Address Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-[#b01622]"></i> Location & Address
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      placeholder="Door No, Street Name, Bazaar Area"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Chennai"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      placeholder="Tamil Nadu"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      required
                      placeholder="600001"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Bank Account Credentials */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-[#b01622] fa-building-columns text-[#b01622]"></i> Bank Account Credentials (Optional)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      placeholder="HDFC Bank"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Account Number (Optional)
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={formData.account_number}
                      onChange={handleInputChange}
                      placeholder="502000000000"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      IFSC Code (Optional)
                    </label>
                    <input
                      type="text"
                      name="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={handleInputChange}
                      placeholder="HDFC0000004"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono uppercase text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Branch (Optional)
                    </label>
                    <input
                      type="text"
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      placeholder="Sowcarpet"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Notes & Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Additional Remarks / Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Notes about supply lead time, purity standards, payment terms..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                ></textarea>
              </div>

              {/* Form Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> {isEditMode ? 'Save Changes' : 'Register Supplier'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW SUPPLIER DETAILS MODAL */}
      {showViewModal && viewSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-emerald-400 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-building"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-serif">{viewSupplier.name}</h3>
                  <span className="font-mono text-xs text-gray-300">{viewSupplier.supplier_code}</span>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* View Body */}
            <div className="p-6 space-y-5 text-xs">
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {getSupplierTypeBadge(viewSupplier.supplier_type).label}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Account Status</span>
                  <span className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                    viewSupplier.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {viewSupplier.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block font-semibold mb-1">Company / Firm Name:</span>
                  <span className="font-bold text-gray-900">{viewSupplier.company_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold mb-1">Phone / Mobile:</span>
                  <span className="font-bold text-gray-900">{viewSupplier.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold mb-1">Email:</span>
                  <span className="font-mono text-gray-800">{viewSupplier.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold mb-1">GSTIN:</span>
                  <span className="font-mono font-bold text-gray-900">{viewSupplier.gstin || 'N/A'}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <span className="text-gray-400 block font-semibold mb-1">Location Address:</span>
                <p className="text-gray-800 font-medium">
                  {viewSupplier.address ? `${viewSupplier.address}, ` : ''}
                  {viewSupplier.city || ''} {viewSupplier.state ? `, ${viewSupplier.state}` : ''} {viewSupplier.pincode ? `- ${viewSupplier.pincode}` : ''}
                </p>
              </div>

              {/* Bank Details */}
              <div className="border-t border-gray-100 pt-3">
                <span className="text-gray-400 block font-bold mb-2 uppercase text-[10px] tracking-wider">Bank Account Credentials</span>
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Bank Name</span>
                    <span className="font-bold text-emerald-950">{viewSupplier.bank_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Account No</span>
                    <span className="font-mono font-bold text-emerald-950">{viewSupplier.account_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">IFSC Code</span>
                    <span className="font-mono font-bold text-emerald-950">{viewSupplier.ifsc_code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Branch</span>
                    <span className="font-bold text-emerald-950">{viewSupplier.branch || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {viewSupplier.notes && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-gray-400 block font-semibold mb-1">Notes & Remarks:</span>
                  <p className="text-gray-700 italic bg-gray-50 p-2.5 rounded-lg border border-gray-200">{viewSupplier.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deleteSupplierTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-trash-can"></i>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Delete Supplier?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-gray-800">{deleteSupplierTarget.name}</span> ({deleteSupplierTarget.supplier_code})?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
