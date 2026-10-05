import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import InventoryDeleteModal from './InventoryDeleteModal';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Instant synchronous hydration from localStorage cache
  const [products, setProducts] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_inventory_products');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [stats, setStats] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_inventory_stats');
      if (c) return JSON.parse(c) || {};
    } catch (e) {}
    return {};
  });

  const [categories, setCategories] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_inventory_categories');
      if (c) return JSON.parse(c) || [];
    } catch (e) {}
    return [];
  });

  const [subcategories, setSubcategories] = useState([]);

  const [loading, setLoading] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_inventory_products');
      if (c && JSON.parse(c).length > 0) return false;
    } catch (e) {}
    return true;
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_inventory_products');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (e) {}
    return 0;
  });
  const [totalPages, setTotalPages] = useState(1);

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [liveRate22k, setLiveRate22k] = useState(0);

  // Fetch master categories & live metal rates once on mount
  useEffect(() => {
    api.get('/metal-rates').then(res => {
      if (res.data?.raw22k) setLiveRate22k(res.data.raw22k);
    }).catch(() => {});

    api.get('/inventory/categories')
      .then((res) => {
        const catData = res.data || [];
        setCategories(catData);
        localStorage.setItem('rudhra_inventory_categories', JSON.stringify(catData));
      })
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory', {
        params: {
          page: currentPage,
          per_page: itemsPerPage,
          search: searchTerm,
          category_id: categoryFilter,
          subcategory_id: subcategoryFilter,
          status: statusFilter,
          tab: activeTab,
          period: periodFilter,
        },
      });

      const prods = res.data.products?.data || [];
      const newStats = res.data.stats || {};
      setProducts(prods);
      setTotalItems(res.data.products?.total || 0);
      setTotalPages(res.data.products?.last_page || 1);
      setStats(newStats);

      // Persist to local cache so on page reload everything shows instantly
      localStorage.setItem('rudhra_inventory_products', JSON.stringify(prods));
      if (newStats && Object.keys(newStats).length > 0) {
        localStorage.setItem('rudhra_inventory_stats', JSON.stringify(newStats));
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      showToast('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, subcategoryFilter, statusFilter, activeTab, periodFilter, currentPage, itemsPerPage]);

  // Handle category change to update subcategories
  useEffect(() => {
    if (categoryFilter !== 'all') {
      const selected = categories.find((c) => String(c.id) === String(categoryFilter));
      setSubcategories(selected?.subcategories || []);
    } else {
      setSubcategories([]);
    }
    setSubcategoryFilter('all');
  }, [categoryFilter]);

  const handleClearAll = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setStatusFilter('all');
    setActiveTab('all');
    setCurrentPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/products/${deleteTarget.id}`);
      showToast(`Product "${deleteTarget.name}" deleted successfully`, 'success', 'Product Removed');
      setDeleteTarget(null);
      fetchInventory();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Safe accessor helpers for cards matching reference image
  const rawValues = stats.raw_values || {
    gold: { weight: '0.000 kg', amount: '₹0', change: '+0.0%', is_increase: true },
    diamond: { weight: '0.00 ct', amount: '₹0', change: '+0.0%', is_increase: true },
    stone: { weight: '0 units', amount: '₹0', change: '+0.0%', is_increase: true },
    silver_1: { weight: '0.000 kg', amount: '₹0', change: '+0.0%', is_increase: true },
    silver_2: { weight: '0.000 kg', amount: '₹0', change: '+0.0%', is_increase: true },
  };

  const jewelValues = stats?.jewel_values || {
    gold: { weight: '0.000 kg', amount: '₹0', change: '+0.0%', is_increase: true },
    stone: { weight: '0 units', amount: '₹0', change: '+0.0%', is_increase: true },
    silver: { weight: '0.000 kg', amount: '₹0', change: '+0.0%', is_increase: true },
    diamond: { weight: '0.00 ct', amount: '₹0', change: '+0.0%', is_increase: true },
  };

  const lowStockAlerts = Array.isArray(stats?.low_stock_alerts) ? stats.low_stock_alerts : [];

  // Helper function to render dynamic % change badges
  const renderBadge = (item) => {
    const isInc = item?.is_increase !== false;
    const changeVal = item?.change || '+0.0%';
    return (
      <span className={`font-semibold flex items-center text-[10px] ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>
        <i className={`fa-solid ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-[8px] mr-0.5`}></i>
        {changeVal}
      </span>
    );
  };

  return (
    <div className="w-full pb-14 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      
      {/* 1. Header with Breadcrumbs & Action Buttons (Matching Reference Image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Real-time status of Imperial Heritage collections
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bulk Upload Button */}
          <Link
            to="/inventory/bulk-upload"
            className="px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-regular fa-file-lines text-stone-700 text-sm"></i>
            <span>Bulk Upload</span>
          </Link>

          {/* Add New Item Button (Matching Reference Image) */}
          <Link
            to="/inventory/add-new/category"
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-circle-plus text-xs"></i>
            <span>Add New Item</span>
          </Link>
        </div>
      </div>

      {/* 2. Raw Values Section (Red Pill + 4 Cards Grid) */}
      <div>
        <div className="inline-block px-4 py-1.5 bg-[#b01622] text-white text-xs font-bold rounded-xl mb-3 shadow-2xs">
          Raw Values
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Gold Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-700 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-coins"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Gold Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {rawValues.gold?.weight || '0.000 kg'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{rawValues.gold?.amount || '₹0'}</span>
                {renderBadge(rawValues.gold)}
              </div>
            </div>
          </div>

          {/* Diamond Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100/70 text-[#b01622] flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-gem"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Diamond Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {rawValues.diamond?.weight || '0.00 ct'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{rawValues.diamond?.amount || '₹0'}</span>
                {renderBadge(rawValues.diamond)}
              </div>
            </div>
          </div>

          {/* Stone Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-800 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-circle-dot"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Stone Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {rawValues.stone?.weight || '0 units'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{rawValues.stone?.amount || '₹0'}</span>
                {renderBadge(rawValues.stone)}
              </div>
            </div>
          </div>

          {/* Silver Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xs shrink-0 border border-red-100">
                <i className="fa-solid fa-ring"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Silver Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {rawValues.silver_1?.weight || rawValues.silver?.weight || '0.000 kg'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{rawValues.silver_1?.amount || rawValues.silver?.amount || '₹0'}</span>
                {renderBadge(rawValues.silver_1 || rawValues.silver)}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Jewel Value Section (Red Pill + 4 Cards Grid) */}
      <div>
        <div className="inline-block px-4 py-1.5 bg-[#b01622] text-white text-xs font-bold rounded-xl mb-3 shadow-2xs">
          Jewel Value
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Gold Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-700 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-coins"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Gold Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {jewelValues.gold?.weight || '0.000 kg'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{jewelValues.gold?.amount || '₹0'}</span>
                {renderBadge(jewelValues.gold)}
              </div>
            </div>
          </div>

          {/* Stone Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-800 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-circle-dot"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Stone Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {jewelValues.stone?.weight || '0 units'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{jewelValues.stone?.amount || '₹0'}</span>
                {renderBadge(jewelValues.stone)}
              </div>
            </div>
          </div>

          {/* Silver Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xs shrink-0 border border-red-100">
                <i className="fa-solid fa-ring"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Silver Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {jewelValues.silver?.weight || '0.000 kg'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{jewelValues.silver?.amount || '₹0'}</span>
                {renderBadge(jewelValues.silver)}
              </div>
            </div>
          </div>

          {/* Diamond Value Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100/70 text-[#b01622] flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-gem"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Diamond Value</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {jewelValues.diamond?.weight || '0.00 ct'}
              </div>
              <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                <span>{jewelValues.diamond?.amount || '₹0'}</span>
                {renderBadge(jewelValues.diamond)}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Search and Filters Bar (Matching Reference Image) */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by SKU, product name..."
            className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-gray-900 placeholder-stone-400 focus:outline-hidden focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer transition-colors"
              title="Clear search"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>

        {/* Dropdowns & Clear Action */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 bg-stone-50 border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-700 focus:outline-hidden focus:border-[#b01622] cursor-pointer transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 bg-stone-50 border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-700 focus:outline-hidden focus:border-[#b01622] cursor-pointer transition-colors"
          >
            <option value="all">Stock Status</option>
            <option value="active">Active / In Stock</option>
            <option value="low_stock">Low Stock (≤ 2)</option>
            <option value="inactive">Out of Stock</option>
          </select>

          {/* Clear All Button */}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-bold text-[#b01622] hover:text-[#8f1019] hover:underline px-2 py-1 cursor-pointer transition-colors whitespace-nowrap"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* 5. Low Stock Alerts Section (Matching Reference Image) */}
      <div className="bg-[#fffdf5] rounded-2xl p-5 border border-amber-200/90 border-l-4 border-l-amber-500 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <i className="fa-solid fa-triangle-exclamation text-amber-600 text-sm"></i>
            <span>Low Stock Alerts</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-200/60">
              {lowStockAlerts.length} {lowStockAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
        </div>

        {lowStockAlerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {lowStockAlerts.map((item, idx) => {
              const qtyNum = typeof item.stock_qty === 'number' ? item.stock_qty : parseInt(item.stock_qty || 0);
              const formattedQty = String(Math.max(0, qtyNum)).padStart(2, '0');
              const isOut = item.is_out_of_stock || qtyNum <= 0;
              const stockText = isOut
                ? 'Out of Stock (00)'
                : `Current Stock: ${formattedQty} ${item.is_raw_material ? (item.unit || 'units') : 'units'}`;

              return (
                <div
                  key={item.id || idx}
                  className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-2xs flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                >
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      if (!item.is_raw_material) {
                        setSearchTerm(item.name);
                        setCurrentPage(1);
                      } else {
                        navigate('/purchase/entry');
                      }
                    }}
                    title={item.is_raw_material ? 'Click to open Purchase Entry for Raw Metal' : 'Click to filter by this product in table'}
                  >
                    <h4 className="font-bold text-gray-900 text-xs truncate hover:text-[#b01622] transition-colors">
                      {item.name}
                    </h4>
                    <div className="mt-0.5">
                      <span className={`text-[11px] font-semibold ${isOut ? 'text-red-600 font-bold' : 'text-amber-700'}`}>
                        {stockText}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/purchase/entry', { state: { productId: item.id, productName: item.name } })}
                    className="text-xs font-bold text-[#b01622] hover:text-[#8f1019] hover:underline cursor-pointer shrink-0 transition-colors"
                    title="Restock this item"
                  >
                    ! Restock
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-3.5 border border-emerald-100 flex items-center gap-2.5 text-emerald-700 text-xs font-medium">
            <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
            <span>All inventory stock levels are healthy. No items currently require restocking.</span>
          </div>
        )}
      </div>

      {/* 6. Products Table (Exact columns matching Reference Image 2) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/80 text-stone-700 font-semibold text-xs">
                <th className="py-3 pl-3 pr-2 whitespace-nowrap">Product Name &amp; SKU</th>
                <th className="py-3 px-2 whitespace-nowrap">Category</th>
                <th className="py-3 px-2 whitespace-nowrap">Purity/Quality</th>
                <th className="py-3 px-2 whitespace-nowrap">Weight &amp; Price</th>
                <th className="py-3 px-2 whitespace-nowrap">Stock QTY</th>
                <th className="py-3 px-2 whitespace-nowrap">Location</th>
                <th className="py-3 px-2 whitespace-nowrap">Status</th>
                <th className="py-3 pl-2 pr-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400 space-y-2">
                    <i className="fa-solid fa-boxes-stacked text-3xl text-stone-300"></i>
                    <p className="font-semibold text-stone-600">No products found</p>
                    <p className="text-[11px] text-stone-400">
                      Try adjusting your search query, or click "+ Add New Item" to create products.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes || '{}') : (p.attributes || {});
                  
                  // Product image
                  const imageSrc = p.thumbnail_url || p.image_url || p.image || (attrs.images && attrs.images[0]) || '/placeholder-jewelry.png';

                  // Category
                  const categoryName = p.category?.name || attrs.category_name || 'Gold';

                  // Purity / Quality derivation strictly from product attributes / stamp / karat
                  const rawPurity = attrs.purity || attrs.gold_type || attrs.karat || attrs.stamp || attrs.quality || '';
                  let purityQuality = rawPurity;
                  if (!purityQuality) {
                    purityQuality = '22K Hallmark';
                  } else if (!purityQuality.toLowerCase().includes('hallmark') && !purityQuality.toLowerCase().includes('color') && !purityQuality.toLowerCase().includes('silver')) {
                    purityQuality = `${purityQuality} Hallmark`;
                  }

                  // Weight & Price stacked derivation strictly from product attributes
                  const grossWt = attrs.gross_wt || p.opening_stock_weight || 0;
                  const weightStr = grossWt > 0 ? `${grossWt}g` : '—';
                  const saleVal = attrs.sale_value || attrs.price || attrs.rate || attrs.sale_rate || p.opening_stock_rate || 0;
                  const priceStr = saleVal > 0 ? `₹${Number(saleVal).toLocaleString('en-IN')}` : '₹0';

                  // Stock Quantity (Formatted as 2 digits e.g. 08, 02, 00)
                  const pieces = p.current_stock_qty ?? attrs.pieces ?? 0;
                  const qtyFormatted = String(Math.max(0, pieces)).padStart(2, '0');

                  // Location from product attributes
                  const location = attrs.vault_location || attrs.location || 'Central Vault';

                  // Status badge matching reference image (Healthy, Low Stock, Out of Stock)
                  let statusBadge = null;
                  if (pieces > 5) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Healthy
                      </span>
                    );
                  } else if (pieces > 0) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Low Stock
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Out of Stock
                      </span>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* 1. Product Name & SKU */}
                      <td className="py-2.5 pl-3 pr-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={imageSrc}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-stone-200 bg-stone-100 shrink-0 shadow-2xs"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder-jewelry.png';
                            }}
                          />
                          <div className="min-w-0">
                            {(() => {
                              const cleanName = (p.name || '').replace(/\s*\(\d+\s*Parts\)/gi, '');
                              const catCode = (p.category?.code || p.category?.name || 'PRD').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
                              const subCode = (p.subcategory?.code || p.subcategory?.name || 'GEN').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
                              const skuCode = p.sku || attrs.sku || `SKU-${catCode}-${subCode}-${String(p.id).padStart(4, '0')}`;
                              const designCode = p.product_code || attrs.design_no;

                              return (
                                <>
                                  <div className="font-bold text-gray-900 text-xs leading-snug truncate max-w-[170px]" title={cleanName}>
                                    {cleanName}
                                  </div>
                                  <div className="text-[11px] font-mono text-stone-400 font-semibold mt-0.5 flex items-center gap-1">
                                    <span>{skuCode}</span>
                                    {designCode && designCode !== skuCode && (
                                      <span className="text-[10px] font-sans text-stone-400/80" title={`Design Code: ${designCode}`}>
                                        ({designCode})
                                      </span>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* 2. Category */}
                      <td className="py-2.5 px-2 text-stone-700 font-semibold text-xs whitespace-nowrap">
                        {categoryName}
                      </td>

                      {/* 3. Purity/Quality */}
                      <td className="py-2.5 px-2 text-stone-700 font-medium text-xs whitespace-nowrap">
                        {purityQuality}
                      </td>

                      {/* 4. Weight & Price (Stacked) */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">{weightStr}</div>
                        <div className="text-[11px] text-stone-400 font-medium mt-0.5">{priceStr}</div>
                      </td>

                      {/* 5. Stock QTY */}
                      <td className="py-2.5 px-2 font-bold text-gray-900 text-xs whitespace-nowrap">
                        {qtyFormatted}
                      </td>

                      {/* 6. Location */}
                      <td className="py-2.5 px-2 text-stone-700 font-medium text-xs whitespace-nowrap">
                        {location}
                      </td>

                      {/* 7. Status */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {statusBadge}
                      </td>

                      {/* 8. Actions (Edit, View, Delete) */}
                      <td className="py-2.5 pl-2 pr-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Edit Product */}
                          <Link
                            to={`/inventory/products/${p.id}/edit`}
                            className="w-7 h-7 rounded-lg text-stone-500 hover:text-gray-900 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit product"
                          >
                            <i className="fa-solid fa-pen text-xs"></i>
                          </Link>

                          {/* View Product Details */}
                          <Link
                            to={`/inventory/products/${p.id}`}
                            className="w-7 h-7 rounded-lg text-stone-500 hover:text-gray-900 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="View product details"
                          >
                            <i className="fa-regular fa-eye text-xs"></i>
                          </Link>

                          {/* Delete Product */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="w-7 h-7 rounded-lg text-red-600 hover:text-white hover:bg-[#b01622] bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
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

        {/* Pagination Controls */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          {/* Left: Summary & Rows per page selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing <strong className="text-gray-900">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to{' '}
              <strong className="text-gray-900">{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of{' '}
              <strong className="text-gray-900">{totalItems}</strong> items
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-stone-300">
              <span className="text-stone-400">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-hidden focus:border-[#b01622] cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentPage <= 1
                  ? 'bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs cursor-pointer'
              }`}
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
              <span>Previous</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-[#b01622] text-white shadow-2xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentPage >= totalPages
                  ? 'bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs cursor-pointer'
              }`}
            >
              <span>Next</span>
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Screen Delete) */}
      <InventoryDeleteModal
        isOpen={!!deleteTarget}
        product={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

    </div>
  );
}
