import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function ItemsMaster() {
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    category_id: '',
    subcategory_id: '',
    name: '',
    code: '',
    description: '',
    status: 'active',
  });

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catRes, subRes] = await Promise.all([
        api.get('/items'),
        api.get('/categories'),
        api.get('/subcategories'),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : (itemsRes.data?.data || []));
      setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || []));
      setSubcategories(Array.isArray(subRes.data) ? subRes.data : (subRes.data?.data || []));
    } catch (err) {
      console.error('Error fetching master items:', err);
      showToast('Failed to load Master Items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered subcategories for Modal form based on chosen category_id
  const modalSubcategories = useMemo(() => {
    if (!formData.category_id) return subcategories;
    return subcategories.filter(sub => String(sub.category_id) === String(formData.category_id));
  }, [subcategories, formData.category_id]);

  // Filtered subcategories for top filter bar based on categoryFilter
  const filterSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return subcategories;
    return subcategories.filter(sub => String(sub.category_id) === String(categoryFilter));
  }, [subcategories, categoryFilter]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    const defaultCat = categories.length > 0 ? categories[0].id : '';
    const defaultSubs = subcategories.filter(s => String(s.category_id) === String(defaultCat));
    const defaultSub = defaultSubs.length > 0 ? defaultSubs[0].id : '';

    setFormData({
      category_id: defaultCat,
      subcategory_id: defaultSub,
      name: '',
      code: '',
      description: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      category_id: item.category_id || (item.subcategory?.category_id || ''),
      subcategory_id: item.subcategory_id || '',
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      status: item.status || 'active',
    });
    setShowModal(true);
  };

  const handleCategoryChangeInModal = (e) => {
    const catId = e.target.value;
    const subs = subcategories.filter(s => String(s.category_id) === String(catId));
    setFormData(prev => ({
      ...prev,
      category_id: catId,
      subcategory_id: subs.length > 0 ? subs[0].id : '',
    }));
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

    if (!formData.subcategory_id) {
      showToast('Please select a Subcategory for this item', 'error', 'Validation Error');
      return;
    }
    if (!formData.name.trim()) {
      showToast('Item Name is required', 'error', 'Validation Error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, formData);
        showToast('Item Master updated successfully!', 'success');
      } else {
        await api.post('/items', formData);
        showToast('New Item Master created successfully!', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save Item Master', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/items/${deleteTarget.id}`);
      showToast(`Item "${deleteTarget.name}" deleted successfully!`, 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete item', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (categoryFilter !== 'all') {
        const catId = item.category_id || item.subcategory?.category_id;
        if (String(catId) !== String(categoryFilter)) return false;
      }
      // Subcategory filter
      if (subcategoryFilter !== 'all') {
        if (String(item.subcategory_id) !== String(subcategoryFilter)) return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        if ((item.status || 'active') !== statusFilter) return false;
      }
      // Search
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const nameMatch = (item.name || '').toLowerCase().includes(term);
        const codeMatch = (item.code || '').toLowerCase().includes(term);
        const subMatch = (item.subcategory?.name || '').toLowerCase().includes(term);
        const catMatch = (item.category?.name || '').toLowerCase().includes(term);
        return nameMatch || codeMatch || subMatch || catMatch;
      }
      return true;
    });
  }, [items, categoryFilter, subcategoryFilter, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const activeCount = useMemo(() => items.filter(i => (i.status || 'active') === 'active').length, [items]);

  const linkedSubcategoriesCount = useMemo(() => {
    const uniqueSubIds = new Set(items.map(i => i.subcategory_id).filter(Boolean));
    return uniqueSubIds.size;
  }, [items]);
  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            MASTERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-600">ITEM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif flex items-center gap-2.5">
            <i className="fa-solid fa-tags text-[#b01622]"></i>
            Item Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create & link specific items to subcategories. Items populate dynamically in the <strong className="text-gray-800">Inventory Product Add form</strong> after subcategory selection.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Add New Item
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Items</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{items.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg">
            <i className="fa-solid fa-list-ul"></i>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Items</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i className="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Linked Subcategories</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{linkedSubcategoriesCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <i className="fa-solid fa-diagram-project"></i>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <i className="fa-solid fa-filter text-gray-400 text-xs"></i>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filters:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubcategoryFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Subcategory Filter */}
            <select
              value={subcategoryFilter}
              onChange={(e) => {
                setSubcategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Subcategories</option>
              {filterSubcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Search Box */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search item or code..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#b01622]"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100/80 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3.5 px-4 text-center w-14">S.No</th>
                <th className="py-3.5 px-4">Item Code</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Linked Category</th>
                <th className="py-3.5 px-4">Linked Subcategory</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500 font-semibold">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
                    Loading Master Items...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <i className="fa-solid fa-box-open text-3xl text-gray-300 mb-2 block"></i>
                    <p className="font-semibold text-gray-700">No Item Masters found</p>
                    <p className="text-xs text-gray-400 mt-1">Try changing filters or add a new Item Master above.</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* S.No */}
                    <td className="py-3.5 px-4 text-center font-mono text-gray-500 font-semibold">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>

                    {/* Item Code */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded border border-gray-200 text-[11px]">
                        {item.code || `ITM-${item.id}`}
                      </span>
                    </td>

                    {/* Item Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">{item.description}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block bg-red-50 text-[#b01622] font-semibold text-[11px] px-2 py-0.5 rounded-full border border-red-100">
                        {item.category?.name || item.subcategory?.category?.name || 'General'}
                      </span>
                    </td>

                    {/* Subcategory */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block bg-blue-50 text-blue-800 font-semibold text-[11px] px-2.5 py-0.5 rounded-full border border-blue-100">
                        {item.subcategory?.name || 'Standard'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        (item.status || 'active') === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (item.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}></span>
                        {item.status || 'active'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredItems.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
              totalItems={filteredItems.length}
            />
          </div>
        )}

      </div>

      {/* CREATE / EDIT ITEM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            
            <div className="bg-[#b01622] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-tags"></i>
                {editingId ? 'Edit Item Master' : 'Add New Item Master'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Parent Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleCategoryChangeInModal}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Subcategory <span className="text-red-500">*</span>
                </label>
                <select
                  name="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                >
                  <option value="">-- Select Subcategory --</option>
                  {modalSubcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              {/* Item Name & Item Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Temple Choker"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Item Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. ITM-CHK-01"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Description / Remarks
                </label>
                <textarea
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional details or specifications for this item..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#b01622]"
                ></textarea>
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      Save Item Master
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Item Master"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
}
