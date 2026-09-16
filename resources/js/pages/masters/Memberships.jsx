import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Memberships() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discount_percentage: '5.00',
    reward_points_multiplier: '1.50',
    validity_months: '12',
    min_purchase_amount: '50000',
    description: '',
    status: 'active'
  });

  const fetchData = async () => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const res = await api.get('/memberships');
      setMemberships(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load membership plans', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      discount_percentage: '5.00',
      reward_points_multiplier: '1.50',
      validity_months: '12',
      min_purchase_amount: '50000',
      description: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      discount_percentage: item.discount_percentage !== undefined ? item.discount_percentage : '5.00',
      reward_points_multiplier: item.reward_points_multiplier !== undefined ? item.reward_points_multiplier : '1.50',
      validity_months: item.validity_months !== undefined ? item.validity_months : '12',
      min_purchase_amount: item.min_purchase_amount !== undefined ? item.min_purchase_amount : '0',
      description: item.description || '',
      status: item.status || 'active'
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'code') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = [];
    if (!formData.name?.trim()) missing.push('Plan Name');
    if (!formData.code?.trim()) missing.push('Plan Code');
    if (formData.discount_percentage === '' || formData.discount_percentage === null) missing.push('Discount Percentage');
    if (formData.reward_points_multiplier === '' || formData.reward_points_multiplier === null) missing.push('Reward Points Multiplier');
    if (formData.validity_months === '' || formData.validity_months === null) missing.push('Validity Period');
    if (formData.min_purchase_amount === '' || formData.min_purchase_amount === null) missing.push('Minimum Purchase');

    if (missing.length > 0) {
      showToast(`Please enter all required fields: ${missing.join(', ')}`, 'error', 'Validation Error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/memberships/${editingId}`, formData);
        showToast('Membership plan updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/memberships', formData);
        showToast('New Membership plan created successfully!', 'success', 'Created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error saving membership plan.';
      showToast(errorMsg, 'error', 'Operation Failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/memberships/${deleteTarget.id}`);
      showToast(`Membership Plan "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete membership plan', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = memberships.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = memberships.filter(m => m.status === 'active').length;
  const maxDiscount = memberships.length > 0 ? Math.max(...memberships.map(m => m.discount_percentage || 0)) : 0;

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            MASTERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">MEMBERSHIPS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Membership Tiers & Plans</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Add Membership Plan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-id-card"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Membership Plans</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{memberships.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Tiers</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeCount}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-percent"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Max Discount Tier</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {maxDiscount}% OFF
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search plan name, code..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4">PLAN NAME</th>
                <th className="px-6 py-4">CODE</th>
                <th className="px-6 py-4">DISCOUNT %</th>
                <th className="px-6 py-4">POINTS MULTIPLIER</th>
                <th className="px-6 py-4">VALIDITY</th>
                <th className="px-6 py-4">MIN PURCHASE</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {(loading && initialLoad) ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading membership plans...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                    No membership plans found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-semibold shrink-0">
                        <i className="fa-solid fa-[#b01622] fa-crown"></i>
                      </div>
                      <div>
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-xs font-normal text-gray-400 truncate max-w-xs">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-800 border border-gray-200">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-red-50 text-[#b01622] text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">
                        {item.discount_percentage}% OFF
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs border border-amber-200">
                        {item.reward_points_multiplier}x Points
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-700">
                      {item.validity_months} Months
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">
                      ₹{Number(item.min_purchase_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-md border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3 text-gray-400">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 hover:text-[#b01622] transition-colors cursor-pointer"
                          title="Edit Membership Plan"
                        >
                          <i className="fa-regular fa-pen-to-square text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Membership Plan"
                        >
                          <i className="fa-regular fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE / EDIT MEMBERSHIP MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Membership Plan' : 'Add New Membership Plan'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Gold Privilege Club"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>

                {/* Plan Code */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Plan Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. MEM-GLD"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Discount Percentage */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Discount Percentage (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleInputChange}
                    placeholder="5.00"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>

                {/* Reward Points Multiplier */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Reward Points Multiplier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="reward_points_multiplier"
                    value={formData.reward_points_multiplier}
                    onChange={handleInputChange}
                    placeholder="1.5"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Validity Period */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Validity Period (Months) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="validity_months"
                    value={formData.validity_months}
                    onChange={handleInputChange}
                    placeholder="12"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>

                {/* Minimum Purchase Amount */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Minimum Purchase (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="min_purchase_amount"
                    value={formData.min_purchase_amount}
                    onChange={handleInputChange}
                    placeholder="50000"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Description & Tier Benefits (Optional)
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detail tier benefits, discounts on making charges, or exclusive privileges..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors resize-none"
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {editingId ? 'Update Membership Plan' : 'Save Membership Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Membership Plan?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.code})? This action cannot be undone.`
            : ''
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
}
