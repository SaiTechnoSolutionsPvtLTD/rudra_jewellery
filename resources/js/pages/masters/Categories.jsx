import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import FormBuilderModal from '../../components/FormBuilderModal';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Form builder modal state
  const [formBuilderTarget, setFormBuilderTarget] = useState(null);
  const [savingSchema, setSavingSchema] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active'
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
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

    if (!formData.name.trim()) {
      showToast('Please enter a Category Name', 'error', 'Validation Error');
      return;
    }
    if (!formData.code.trim()) {
      showToast('Please enter a Category Code', 'error', 'Validation Error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
        showToast('Category updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/categories', formData);
        showToast('New Category created successfully!', 'success', 'Created');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error saving category details.';
      showToast(errorMsg, 'error', 'Operation Failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      showToast(`Category "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveFormSchema = async (fieldsSchema) => {
    if (!formBuilderTarget) return;
    setSavingSchema(true);
    try {
      await api.put(`/categories/${formBuilderTarget.id}`, {
        name: formBuilderTarget.name,
        code: formBuilderTarget.code,
        description: formBuilderTarget.description,
        status: formBuilderTarget.status,
        form_schema: fieldsSchema
      });
      showToast(`Custom form configured for "${formBuilderTarget.name}"`, 'success', 'Form Configured');
      setFormBuilderTarget(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to save form configuration', 'error', 'Error');
    } finally {
      setSavingSchema(false);
    }
  };

  const filteredItems = categories.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = categories.filter(c => c.status === 'active').length;

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            MASTERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">CATEGORIES</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Add Category
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-cubes"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Categories</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{categories.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Categories</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeCount}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-gem"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Metal & Gem Categories</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {categories.filter(c => ['GOLD', 'SILVER', 'DIAMOND', 'PLATINUM'].includes((c.code || '').toUpperCase())).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
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
              placeholder="Search by code, name, or description..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
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
                <th className="px-6 py-4">CATEGORY NAME</th>
                <th className="px-6 py-4">CODE</th>
                <th className="px-6 py-4">DESCRIPTION</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading categories...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    No categories found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-semibold shrink-0">
                        {item.code ? item.code.substring(0, 2) : 'CAT'}
                      </div>
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-800 border border-gray-200">
                        {item.code}
                      </span>
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
                          title="Edit Category"
                        >
                          <i className="fa-regular fa-pen-to-square text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Category"
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

      {/* CREATE / EDIT CATEGORY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Category' : 'Add New Category'}
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
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Gold, Silver, Diamond, Platinum"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Category Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. GOLD, SILVER, DIAMOND"
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
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short description of this category..."
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
                  {editingId ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Category?"
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
        title="Category Form Builder"
        targetItem={formBuilderTarget}
        saving={savingSchema}
        onSave={handleSaveFormSchema}
        onClose={() => setFormBuilderTarget(null)}
      />

    </div>
  );
}
