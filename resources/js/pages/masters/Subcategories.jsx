import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import FormBuilderModal from '../../components/FormBuilderModal';

export default function Subcategories() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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

  // Form builder modal state
  const [formBuilderTarget, setFormBuilderTarget] = useState(null);
  const [savingSchema, setSavingSchema] = useState(false);
  
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    code: '',
    description: '',
    status: 'active'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, catRes] = await Promise.all([
        api.get('/subcategories'),
        api.get('/categories')
      ]);
      setSubcategories(subRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load subcategories or categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      category_id: categories.length > 0 ? categories[0].id : '',
      name: '',
      code: '',
      description: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      category_id: item.category_id || '',
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      status: item.status || 'active'
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'code') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_id) {
      showToast('Please select a Parent Category', 'error', 'Validation Error');
      return;
    }
    if (!formData.name.trim()) {
      showToast('Please enter a Subcategory Name', 'error', 'Validation Error');
      return;
    }
    if (!formData.code.trim()) {
      showToast('Please enter a Subcategory Code', 'error', 'Validation Error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/subcategories/${editingId}`, formData);
        showToast('Subcategory updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/subcategories', formData);
        showToast('New Subcategory created successfully!', 'success', 'Created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error saving subcategory details.';
      showToast(errorMsg, 'error', 'Operation Failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/subcategories/${deleteTarget.id}`);
      showToast(`Subcategory "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete subcategory', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveFormSchema = async (fieldsSchema) => {
    if (!formBuilderTarget) return;
    setSavingSchema(true);
    try {
      await api.put(`/subcategories/${formBuilderTarget.id}`, {
        category_id: formBuilderTarget.category_id,
        name: formBuilderTarget.name,
        code: formBuilderTarget.code,
        description: formBuilderTarget.description,
        status: formBuilderTarget.status,
        form_schema: fieldsSchema
      });
      showToast(`Custom form configured for Subcategory "${formBuilderTarget.name}"`, 'success', 'Form Configured');
      setFormBuilderTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save subcategory form configuration', 'error', 'Error');
    } finally {
      setSavingSchema(false);
    }
  };

  const filteredItems = subcategories.filter(item => {
    const categoryName = item.category?.name || '';
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = categoryFilter === 'all' || item.category_id == categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = subcategories.filter(s => s.status === 'active').length;
  const uniqueCategoriesCount = new Set(subcategories.map(s => s.category_id)).size;

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            MASTERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">SUBCATEGORIES</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Subcategory Management</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Add Subcategory
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-sitemap"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Subcategories</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{subcategories.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Subcategories</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeCount}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-cubes"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Categories Mapped</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {uniqueCategoriesCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
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
              placeholder="Search subcategories, codes, or category..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Parent Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
              ))}
            </select>

            {/* Status Filter */}
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
                <th className="px-6 py-4">SUBCATEGORY NAME</th>
                <th className="px-6 py-4">CODE</th>
                <th className="px-6 py-4">PARENT CATEGORY</th>
                <th className="px-6 py-4">DESCRIPTION</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading subcategories...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    No subcategories found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-semibold shrink-0">
                        {item.code ? item.code.substring(0, 2) : 'SC'}
                      </div>
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-800 border border-gray-200">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-[#b01622] text-xs font-semibold px-3 py-1 rounded-full border border-red-100">
                          <i className="fa-solid fa-cubes text-[10px]"></i>
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-md">
                      {item.description || '-'}
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
                          onClick={() => setFormBuilderTarget(item)}
                          className="p-1 hover:text-[#b01622] transition-colors cursor-pointer"
                          title="Configure Custom Form Fields"
                        >
                          <i className="fa-solid fa-sliders text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 hover:text-[#b01622] transition-colors cursor-pointer"
                          title="Edit Subcategory"
                        >
                          <i className="fa-regular fa-pen-to-square text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Subcategory"
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

      {/* CREATE / EDIT SUBCATEGORY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Subcategory' : 'Add New Subcategory'}
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Parent Category Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Parent Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Subcategory Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Chains, Rings, Bangles, Payal"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Subcategory Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. G-CHN, G-RNG, S-PAY"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
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
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short description for this subcategory..."
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
                  {editingId ? 'Update Subcategory' : 'Save Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Subcategory?"
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

      {/* FORM BUILDER MODAL */}
      <FormBuilderModal
        isOpen={!!formBuilderTarget}
        title="Subcategory Form Builder"
        targetItem={formBuilderTarget}
        saving={savingSchema}
        onSave={handleSaveFormSchema}
        onClose={() => setFormBuilderTarget(null)}
      />

    </div>
  );
}
