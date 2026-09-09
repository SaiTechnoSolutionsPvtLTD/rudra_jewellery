import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { showToast } = useToast();

  // View Mode: 'grouped' (Grouped by Category - Collapsed by default) or 'table' (Flat list)
  const [viewMode, setViewMode] = useState('grouped');

  // Accordion state for grouped view (empty object = ALL COLLAPSED BY DEFAULT)
  const [expandedCategories, setExpandedCategories] = useState({});

  // Specification Modal target state
  const [specModalProduct, setSpecModalProduct] = useState(null);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, subRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/subcategories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setSubcategories(subRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load products or master data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCategoryExpand = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const expandAllCategories = () => {
    const all = {};
    categories.forEach(c => { all[c.id] = true; });
    setExpandedCategories(all);
  };

  const collapseAllCategories = () => {
    setExpandedCategories({});
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      showToast(`Product "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete product', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredPageSubcategories = categoryFilter === 'all' 
    ? subcategories 
    : subcategories.filter(s => String(s.category_id) === String(categoryFilter));

  const filteredItems = products.filter(item => {
    const catName = item.category?.name || '';
    const subName = item.subcategory?.name || '';
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.product_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          catName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          subName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = categoryFilter === 'all' || String(item.category_id) === String(categoryFilter);
    const matchesSub = subcategoryFilter === 'all' || String(item.subcategory_id) === String(subcategoryFilter);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCat && matchesSub && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = products.filter(p => p.status === 'active').length;

  // Group products by category for Grouped view
  const groupedProducts = categories.map(cat => {
    const catProducts = filteredItems.filter(p => String(p.category_id) === String(cat.id));
    return {
      category: cat,
      products: catProducts
    };
  });

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            MASTERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">PRODUCTS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management ({products.length} Items)</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/masters/products/create"
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Add Product
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-gem"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Seeded Products</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{products.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Products</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeCount}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Categories</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {categories.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6 space-y-4">
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
              placeholder="Search product name, code/SKU..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white text-[#b01622] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-folder-closed mr-1.5"></i> Category Accordion (Collapsed)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#b01622] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-list mr-1.5"></i> All Products List
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubcategoryFilter('all');
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
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
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Subcategories</option>
              {filteredPageSubcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
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

        {/* Global Expand / Collapse Control Buttons for Grouped View */}
        {viewMode === 'grouped' && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">
              Click any Category header below to expand and view products.
            </span>
            <div className="flex items-center gap-3 font-semibold">
              <button
                type="button"
                onClick={collapseAllCategories}
                className="text-gray-600 hover:text-[#b01622] cursor-pointer flex items-center gap-1"
              >
                <i className="fa-solid fa-compress text-[11px]"></i> Collapse All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={expandAllCategories}
                className="text-[#b01622] hover:underline cursor-pointer flex items-center gap-1"
              >
                <i className="fa-solid fa-expand text-[11px]"></i> Expand All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: GROUPED BY CATEGORY (COLLAPSED BY DEFAULT) */}
      {viewMode === 'grouped' ? (
        <div className="space-y-4 mb-8">
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200">
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading products and categories...
            </div>
          ) : groupedProducts.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200">
              No categories found.
            </div>
          ) : (
            groupedProducts.map(({ category, products: catProds }) => {
              const isExpanded = !!expandedCategories[category.id];

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden transition-all"
                >
                  {/* Category Header Bar (Click to Expand / Collapse) */}
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpand(category.id)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#f6eee9] to-white hover:bg-gray-100/80 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#b01622] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                        <i className="fa-solid fa-gem"></i>
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-900 flex items-center gap-2">
                          {category.name}
                          <span className="font-mono text-xs font-semibold text-gray-500 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                            {category.code}
                          </span>
                        </div>
                        {category.description && (
                          <div className="text-xs text-gray-500">{category.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#b01622] border border-red-100 shadow-xs">
                        {catProds.length} {catProds.length === 1 ? 'Product' : 'Products'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white text-gray-500 border border-gray-200 flex items-center justify-center text-xs">
                        <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#b01622]' : ''}`}></i>
                      </div>
                    </div>
                  </button>

                  {/* Expandable Category Product Table */}
                  {isExpanded && (
                    <div className="border-t border-gray-200/80 overflow-x-auto">
                      {catProds.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400 italic">
                          No products found matching criteria in {category.name}.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200/60">
                              <th className="px-6 py-3">PRODUCT NAME</th>
                              <th className="px-6 py-3">SKU / CODE</th>
                              <th className="px-6 py-3">SUBCATEGORY</th>
                              <th className="px-6 py-3">SPECIFICATION</th>
                              <th className="px-6 py-3">STATUS</th>
                              <th className="px-6 py-3 text-center">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm divide-y divide-gray-100">
                            {catProds.map(item => (
                              <tr key={item.id} className="hover:bg-red-50/20 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-gray-900 flex items-center gap-3">
                                  {item.thumbnail_url || item.image_url ? (
                                    <img
                                      src={item.thumbnail_url || item.image_url}
                                      alt={item.name}
                                      className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0 bg-white"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-semibold shrink-0">
                                      <i className="fa-solid fa-ring"></i>
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-xs font-bold text-gray-900">{item.name}</div>
                                    {item.description && <div className="text-[11px] font-normal text-gray-400 truncate max-w-xs">{item.description}</div>}
                                  </div>
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-800 border border-gray-200">
                                    {item.product_code}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5">
                                  {item.subcategory ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-700 font-medium bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                      {item.subcategory.name}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5">
                                  <button
                                    type="button"
                                    onClick={() => setSpecModalProduct(item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#b01622] text-xs font-semibold rounded-lg border border-red-100 transition-colors cursor-pointer"
                                  >
                                    <i className="fa-solid fa-sliders text-[11px]"></i>
                                    Specification
                                  </button>
                                </td>
                                <td className="px-6 py-3.5">
                                  {item.status === 'active' ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inactive
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5 text-center">
                                  <div className="flex items-center justify-center gap-3 text-gray-400">
                                    <Link
                                      to={`/masters/products/${item.id}/edit`}
                                      className="p-1 hover:text-[#b01622] transition-colors cursor-pointer"
                                      title="Edit Product"
                                    >
                                      <i className="fa-regular fa-pen-to-square text-sm"></i>
                                    </Link>
                                    <button
                                      onClick={() => setDeleteTarget(item)}
                                      className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                                      title="Delete Product"
                                    >
                                      <i className="fa-regular fa-trash-can text-sm"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VIEW MODE 2: FLAT ALL PRODUCTS TABLE */
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">PRODUCT NAME</th>
                  <th className="px-6 py-4">SKU / CODE</th>
                  <th className="px-6 py-4">CATEGORY & SUBCATEGORY</th>
                  <th className="px-6 py-4">SPECIFICATION</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading products...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No products found. Click <strong>Add Product</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                        {item.thumbnail_url || item.image_url ? (
                          <img
                            src={item.thumbnail_url || item.image_url}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-semibold shrink-0">
                            <i className="fa-solid fa-ring"></i>
                          </div>
                        )}
                        <div>
                          <div>{item.name}</div>
                          {item.description && <div className="text-xs font-normal text-gray-400 truncate max-w-xs">{item.description}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-800 border border-gray-200">
                          {item.product_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {item.category && (
                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-[#b01622] text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit">
                              {item.category.name}
                            </span>
                          )}
                          {item.subcategory && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-medium pl-1">
                              <i className="fa-solid fa-angle-right text-[10px] text-gray-400"></i>
                              {item.subcategory.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSpecModalProduct(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#b01622] text-xs font-semibold rounded-lg border border-red-100 transition-colors cursor-pointer"
                        >
                          <i className="fa-solid fa-sliders text-[11px]"></i>
                          Specification
                        </button>
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
                          <Link
                            to={`/masters/products/${item.id}/edit`}
                            className="p-1 hover:text-[#b01622] transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <i className="fa-regular fa-pen-to-square text-sm"></i>
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Product"
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

          {/* Pagination Controls for Flat Table */}
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
      )}

      {/* PRODUCT SPECIFICATIONS MODAL */}
      {specModalProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                {specModalProduct.thumbnail_url || specModalProduct.image_url ? (
                  <img
                    src={specModalProduct.thumbnail_url || specModalProduct.image_url}
                    alt={specModalProduct.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg font-semibold shrink-0">
                    <i className="fa-solid fa-gem"></i>
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-gray-900">{specModalProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-800 border border-gray-200">
                      {specModalProduct.product_code}
                    </span>
                    {specModalProduct.category && (
                      <span className="bg-red-50 text-[#b01622] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {specModalProduct.category.name}
                      </span>
                    )}
                    {specModalProduct.subcategory && (
                      <span className="text-xs text-gray-500 font-medium">
                        / {specModalProduct.subcategory.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSpecModalProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Specifications Body */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#b01622] uppercase tracking-wider">
                <i className="fa-solid fa-sliders"></i>
                <span>Configured Product Attributes</span>
              </div>

              {!specModalProduct.attributes || Object.keys(specModalProduct.attributes).length === 0 ? (
                <div className="text-xs text-gray-400 italic py-6 text-center bg-gray-50 rounded-xl border border-gray-100">
                  No specific attributes recorded for this product.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(specModalProduct.attributes).map(([key, val]) => {
                    if (val === null || val === undefined || val === '') return null;
                    const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
                    const formattedKey = key.replace(/_/g, ' ');

                    return (
                      <div key={key} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          {formattedKey}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 capitalize">
                          {displayVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Description */}
              {specModalProduct.description && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Description / Remarks
                  </div>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                    {specModalProduct.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-5 mt-5 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSpecModalProduct(null)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Specifications
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Product?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.product_code})? This action cannot be undone.`
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
