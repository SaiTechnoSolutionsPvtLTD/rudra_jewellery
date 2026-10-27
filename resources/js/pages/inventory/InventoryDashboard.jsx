import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import InventoryDeleteModal from './InventoryDeleteModal';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);

  const [stats, setStats] = useState({});

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Diamond vault state for Total Diamond Carats card
  const [diamondVault, setDiamondVault] = useState({ totalCarats: 0, totalCount: 0, breakdown: [] });
  const [showDiamondModal, setShowDiamondModal] = useState(false);
  const [showAllDiamondStamps, setShowAllDiamondStamps] = useState(false);

  // Stone vault state for Raw Stone card
  const [stoneVault, setStoneVault] = useState({ totalWeight: 0, totalCount: 0, breakdown: [] });
  const [showStoneModal, setShowStoneModal] = useState(false);
  const [showAllStoneStamps, setShowAllStoneStamps] = useState(false);

  // Low Stock Alerts Horizontal Scroll Ref & State
  const alertsScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkAlertScroll = () => {
    if (alertsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = alertsScrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const handleScrollAlerts = (direction) => {
    if (alertsScrollRef.current) {
      const scrollAmount = 340;
      alertsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkAlertScroll, 350);
    }
  };

  useEffect(() => {
    checkAlertScroll();
    const el = alertsScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkAlertScroll);
      window.addEventListener('resize', checkAlertScroll);
      return () => {
        el.removeEventListener('scroll', checkAlertScroll);
        window.removeEventListener('resize', checkAlertScroll);
      };
    }
  }, [stats]);

  const [loading, setLoading] = useState(true);

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
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch master categories once on mount
  useEffect(() => {
    // Purge any stale phantom caches from legacy runs
    try {
      localStorage.removeItem('rudhra_inventory_stats');
      localStorage.removeItem('rudhra_diamond_vault');
      localStorage.removeItem('rudhra_inventory_products');
      localStorage.removeItem('rudhra_inventory_categories');
    } catch (e) {}

    api.get('/inventory/categories')
      .then((res) => {
        const catData = res.data || [];
        setCategories(catData);
      })
      .catch((err) => console.error('Failed to load categories', err));

    // Fetch diamond vault data
    fetchDiamondVault();
  }, []);

  const fetchDiamondVault = async () => {
    try {
      const res = await api.get('/raw-materials/unified-stock');
      const summary = res.data?.summary || {};
      const diaBreakdown = res.data?.diamond_by_stamp || [];
      const stBreakdown = res.data?.stone_by_stamp || [];

      setDiamondVault({
        totalCarats: Number(summary.diamond_total_carats || 0),
        totalCount: Number(summary.diamond_total_count || 0),
        breakdown: diaBreakdown,
      });

      setStoneVault({
        totalWeight: Number(summary.stone_total_weight || 0),
        totalCount: Number(summary.stone_total_count || 0),
        breakdown: stBreakdown,
      });
    } catch (err) {
      console.error('Failed to fetch vault data:', err);
    }
  };

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
    gold: { weight: '0.000 kg' },
    diamond: { weight: '0.00 ct' },
    stone: { weight: '0 units' },
    silver_1: { weight: '0.000 kg' },
    silver_2: { weight: '0.000 kg' },
  };

  const jewelValues = stats?.jewel_values || {
    gold: { weight: '0.000 g', fine_weight: '0.000 g', amount: '₹0' },
    stone: { weight: '0 units', amount: '₹0' },
    silver: { weight: '0.000 g', amount: '₹0' },
    diamond: { weight: '0.000 ct', amount: '₹0' },
  };

  const lowStockAlerts = Array.isArray(stats?.low_stock_alerts) ? stats.low_stock_alerts : [];

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

      {/* 2. Raw Stock Section (Red Pill + 4 Cards Grid) */}
      <div>
        <div className="inline-block px-4 py-1.5 bg-[#b01622] text-white text-xs font-bold rounded-xl mb-3 shadow-2xs">
          Raw Material Stock
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          
          {/* Raw Gold Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-700 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-coins"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Raw Gold</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {rawValues.gold?.weight || '0.000 kg'}
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                Vault Balance
              </div>
            </div>
          </div>

          {/* Raw Diamond Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100/70 text-[#b01622] flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-gem"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Raw Diamond</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {rawValues.diamond?.weight || '0.00 ct'}
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                Vault Balance
              </div>
            </div>
          </div>

          {/* Raw Stone Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col hover:border-amber-200 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-800 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-circle-dot"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Raw Stone</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {stoneVault.totalWeight > 0
                  ? Number(stoneVault.totalWeight).toFixed(3)
                  : (rawValues.stone?.weight?.replace(' units', '').replace(' ct', '') || '0.000')} <span className="text-xs font-sans font-semibold text-stone-400">ct</span>
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                <i className="fa-solid fa-boxes-stacked text-[9px] mr-1 text-amber-500"></i>
                {stoneVault.totalCount || 0} pcs vault
              </div>
            </div>
            {stoneVault.breakdown.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStoneModal(true)}
                className="mt-auto pt-2 text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 w-full py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                View by Stamp ({stoneVault.breakdown.length})
              </button>
            )}
          </div>

          {/* Raw Silver Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xs shrink-0 border border-red-100">
                <i className="fa-solid fa-ring"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Raw Silver</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {rawValues.silver_1?.weight || rawValues.silver?.weight || '0.000 kg'}
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                Vault Balance
              </div>
            </div>
          </div>

          {/* Total Diamond Carats Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col hover:border-cyan-200 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center text-xs shrink-0 border border-cyan-100">
                <i className="fa-solid fa-gem"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Total Diamonds</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {diamondVault.totalCarats.toFixed(3)} <span className="text-xs font-sans font-semibold text-stone-400">ct</span>
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                <i className="fa-solid fa-boxes-stacked text-[9px] mr-1 text-cyan-400"></i>
                {diamondVault.totalCount} pcs vault
              </div>
            </div>
            {diamondVault.breakdown.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDiamondModal(true)}
                className="mt-auto pt-2 text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 w-full py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                View by Stamp ({diamondVault.breakdown.length})
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 3. Jewellery Stock Section (Red Pill + 4 Cards Grid) */}
      <div>
        <div className="inline-block px-4 py-1.5 bg-[#b01622] text-white text-xs font-bold rounded-xl mb-3 shadow-2xs">
          Jewellery Stock
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Gold Jewellery Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fa-solid fa-coins"></i>
                </div>
                <span className="text-[11px] font-semibold text-stone-400">Gold Jewellery</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.5 font-mono" title="Fine Gold (Pure) Weight">
                Fine: {jewelValues.gold?.fine_weight || '0.000 g'}
              </span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {jewelValues.gold?.weight || '0.000 g'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium mt-0.5">
                <span>Finished Goods</span>
                <span className="text-amber-800 font-semibold font-mono text-[10px]">Pure: {jewelValues.gold?.fine_weight || '0.000 g'}</span>
              </div>
            </div>
          </div>

          {/* Stone Jewellery Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-800 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-circle-dot"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Stone Jewellery</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {jewelValues.stone?.weight || '0 units'}
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                Finished Goods
              </div>
            </div>
          </div>

          {/* Silver Jewellery Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xs shrink-0 border border-red-100">
                <i className="fa-solid fa-ring"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Silver Jewellery</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {jewelValues.silver?.weight || '0.000 g'}
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                Finished Goods
              </div>
            </div>
          </div>

          {/* Diamond Jewellery Stock Card */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100/70 text-[#b01622] flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-gem"></i>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Diamond Jewellery</span>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 tracking-tight font-mono">
                {jewelValues.diamond?.weight || '0.000 ct'}
              </div>
              <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                Finished Goods
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <i className="fa-solid fa-triangle-exclamation text-amber-600 text-sm"></i>
            <span>Low Stock Alerts</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-200/60">
              {lowStockAlerts.length} {lowStockAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>

          {/* Left / Right Scroll Arrow Buttons (appears when alerts overflow or > 3) */}
          {lowStockAlerts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScrollAlerts('left')}
                disabled={!canScrollLeft}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all border ${
                  canScrollLeft
                    ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-2xs cursor-pointer'
                    : 'bg-stone-100/60 text-stone-300 border-stone-200/60 cursor-not-allowed opacity-50'
                }`}
                title="Scroll left"
                aria-label="Scroll left"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              <button
                type="button"
                onClick={() => handleScrollAlerts('right')}
                disabled={!canScrollRight}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all border ${
                  canScrollRight
                    ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-2xs cursor-pointer'
                    : 'bg-stone-100/60 text-stone-300 border-stone-200/60 cursor-not-allowed opacity-50'
                }`}
                title="Scroll right"
                aria-label="Scroll right"
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          )}
        </div>

        {lowStockAlerts.length > 0 ? (
          <div
            ref={alertsScrollRef}
            onScroll={checkAlertScroll}
            className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1"
          >
            {lowStockAlerts.map((item, idx) => {
              const qtyNum = typeof item.stock_qty === 'number' ? item.stock_qty : parseFloat(item.stock_qty || 0);
              const isOut = item.is_out_of_stock || qtyNum <= 0;
              const unit = item.unit || 'units';

              let formattedVal = '';
              if (item.is_raw_material) {
                if (unit === 'ct') {
                  formattedVal = `${qtyNum.toFixed(2)} ct`;
                } else if (unit === 'g' || unit === 'kg') {
                  formattedVal = `${qtyNum.toFixed(3)} ${unit}`;
                } else {
                  formattedVal = `${Math.max(0, parseInt(qtyNum))} ${unit}`;
                }
              } else {
                formattedVal = `${String(Math.max(0, parseInt(qtyNum))).padStart(2, '0')} units`;
              }

              const stockText = isOut
                ? (item.is_raw_material ? `Out of Stock (00 ${unit})` : 'Out of Stock (00)')
                : `Current Stock: ${formattedVal}`;

              // Determine icon & badge theme per material
              const nameLower = (item.name || '').toLowerCase();
              const matType = (item.material_type || '').toLowerCase();

              let theme = {
                icon: 'fa-boxes-stacked',
                iconColor: 'bg-amber-50 text-amber-700 border-amber-200',
                border: 'border-amber-100 hover:border-amber-300',
              };

              if (nameLower.includes('silver') || matType === 'silver') {
                theme = {
                  icon: 'fa-ring',
                  iconColor: 'bg-slate-100 text-slate-700 border-slate-200',
                  border: 'border-slate-200 hover:border-slate-400',
                };
              } else if (nameLower.includes('diamond') || matType === 'diamond') {
                theme = {
                  icon: 'fa-gem',
                  iconColor: 'bg-cyan-50 text-cyan-600 border-cyan-200',
                  border: 'border-cyan-100 hover:border-cyan-300',
                };
              } else if (nameLower.includes('gold') || matType === 'gold') {
                theme = {
                  icon: 'fa-coins',
                  iconColor: 'bg-amber-100/70 text-amber-700 border-amber-200',
                  border: 'border-amber-200 hover:border-amber-400',
                };
              } else if (nameLower.includes('stone') || matType === 'stone') {
                theme = {
                  icon: 'fa-circle-dot',
                  iconColor: 'bg-purple-50 text-purple-700 border-purple-200',
                  border: 'border-purple-100 hover:border-purple-300',
                };
              }

              return (
                <div
                  key={item.id || idx}
                  className={`bg-white rounded-xl p-3.5 border ${theme.border} shadow-2xs flex items-center justify-between gap-3 transition-colors shrink-0 ${lowStockAlerts.length <= 3 ? 'flex-1 min-w-[260px]' : 'min-w-[290px] sm:min-w-[320px] max-w-[360px]'}`}
                >
                  <div
                    className="min-w-0 flex-1 flex items-center gap-2.5 cursor-pointer"
                    onClick={() => {
                      if (!item.is_raw_material) {
                        setSearchTerm(item.name);
                        setCurrentPage(1);
                      } else {
                        navigate('/purchase/entry', {
                          state: {
                            purchase_type: 'raw_material',
                            metal_type: matType || (nameLower.includes('silver') ? 'silver' : nameLower.includes('diamond') ? 'diamond' : nameLower.includes('gold') ? 'gold' : 'gold'),
                            raw_material_id: item.raw_material_id || item.id,
                            raw_material_name: item.name,
                          }
                        });
                      }
                    }}
                    title={item.is_raw_material ? 'Click to restock raw material in Purchase Entry' : 'Click to filter by this product in table'}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 border ${theme.iconColor}`}>
                      <i className={`fa-solid ${theme.icon}`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-xs truncate hover:text-[#b01622] transition-colors">
                        {item.name}
                      </h4>
                      <div className="mt-0.5">
                        <span className={`text-[11px] font-semibold ${isOut ? 'text-red-600 font-bold' : 'text-amber-700'}`}>
                          {stockText}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.is_raw_material) {
                        navigate('/purchase/entry', {
                          state: {
                            purchase_type: 'raw_material',
                            metal_type: matType || (nameLower.includes('silver') ? 'silver' : nameLower.includes('diamond') ? 'diamond' : nameLower.includes('gold') ? 'gold' : 'gold'),
                            raw_material_id: item.raw_material_id || item.id,
                            raw_material_name: item.name,
                          }
                        });
                      } else {
                        navigate('/purchase/entry', { state: { productId: item.id, productName: item.name } });
                      }
                    }}
                    className="text-xs font-bold text-[#b01622] hover:text-[#8f1019] hover:underline cursor-pointer shrink-0 transition-colors px-1 py-0.5"
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
                <th className="py-3 px-3 text-center w-12 whitespace-nowrap">S.No</th>
                <th className="py-3 pl-3 pr-2 whitespace-nowrap">Product Name &amp; SKU</th>
                <th className="py-3 px-2 whitespace-nowrap">Design No.</th>
                <th className="py-3 px-2 whitespace-nowrap">Category</th>
                <th className="py-3 px-2 whitespace-nowrap">Purity</th>
                <th className="py-3 px-2 whitespace-nowrap">Quality</th>
                <th className="py-3 px-2 whitespace-nowrap">Weight</th>
                <th className="py-3 px-2 whitespace-nowrap">Stock QTY</th>
                <th className="py-3 px-2 whitespace-nowrap">Location</th>
                <th className="py-3 px-2 whitespace-nowrap">Status</th>
                <th className="py-3 pl-2 pr-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-stone-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-stone-400 space-y-2">
                    <i className="fa-solid fa-boxes-stacked text-3xl text-stone-300"></i>
                    <p className="font-semibold text-stone-600">No products found</p>
                    <p className="text-[11px] text-stone-400">
                      Try adjusting your search query, or click "+ Add New Item" to create products.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => {
                  const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                  const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes || '{}') : (p.attributes || {});
                  
                  // Product image
                  const imageSrc = p.thumbnail_url || p.image_url || p.image || (attrs.images && attrs.images[0]) || '/placeholder-jewelry.png';

                  // Category
                  const categoryName = p.category?.name || attrs.category_name || 'Gold';

                  // Design No.
                  const designNo = p.design_no || attrs.design_no || '—';

                  // Purity & Quality separated strictly
                  const purityVal = attrs.purity || attrs.gold_type || attrs.karat || '—';
                  const qualityVal = attrs.quality || attrs.setting_style || attrs.stamp || 'Hallmark';

                  // Weight derivation strictly from product attributes
                  const rawGross = parseFloat(attrs.unit_gross_wt || attrs.gross_wt || p.opening_stock_weight || 0);
                  const displayGross = (rawGross > 0 && rawGross < 0.1) ? (rawGross * 1000) : rawGross;
                  const weightStr = displayGross > 0 ? `${Number(displayGross.toFixed(3))}g` : '—';

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
                      {/* 0. S.No */}
                      <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-medium whitespace-nowrap">
                        {rowNum}
                      </td>

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

                              return (
                                <>
                                  <div className="font-bold text-gray-900 text-xs leading-snug truncate max-w-[170px]" title={cleanName}>
                                    {cleanName}
                                  </div>
                                  <div className="text-[11px] font-mono text-stone-400 font-semibold mt-0.5">
                                    <span>{skuCode}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* 2. Design No. */}
                      <td className="py-2.5 px-2 font-mono font-bold text-gray-900 text-xs whitespace-nowrap">
                        {designNo}
                      </td>

                      {/* 3. Category */}
                      <td className="py-2.5 px-2 text-stone-700 font-semibold text-xs whitespace-nowrap">
                        {categoryName}
                      </td>

                      {/* 4. Purity */}
                      <td className="py-2.5 px-2 text-stone-700 font-semibold text-xs whitespace-nowrap">
                        {purityVal}
                      </td>

                      {/* 5. Quality */}
                      <td className="py-2.5 px-2 text-stone-700 font-medium text-xs whitespace-nowrap">
                        {qualityVal}
                      </td>

                      {/* 6. Weight */}
                      <td className="py-2.5 px-2 whitespace-nowrap font-bold text-gray-900 text-xs">
                        {weightStr}
                      </td>

                      {/* 7. Stock QTY */}
                      <td className="py-2.5 px-2 font-bold text-gray-900 text-xs whitespace-nowrap">
                        {qtyFormatted}
                      </td>

                      {/* 8. Location */}
                      <td className="py-2.5 px-2 text-stone-700 font-medium text-xs whitespace-nowrap">
                        {location}
                      </td>

                      {/* 9. Status */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {statusBadge}
                      </td>

                      {/* 10. Actions (Edit, View, Delete) */}
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

      {/* Diamond Stock Breakdown by Stamp Modal */}
      {showDiamondModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-stone-50 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Diamond Stock by Stamp / Grade</h3>
                  <p className="text-[11px] text-stone-500">Authoritative vault breakdown</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiamondModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="mb-3 p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">Total Vault Balance</span>
                  <span className="text-lg font-black text-cyan-950 font-mono">
                    {diamondVault.totalCarats.toFixed(3)} ct
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">Total Pieces</span>
                  <span className="text-sm font-bold text-stone-700 font-mono">
                    {diamondVault.totalCount} pcs
                  </span>
                </div>
              </div>

              {(() => {
                const activeStamps = diamondVault.breakdown.filter(
                  item => Number(item.available_carats || 0) > 0 || Number(item.available_count || 0) > 0
                );
                const displayList = (showAllDiamondStamps || activeStamps.length === 0)
                  ? diamondVault.breakdown
                  : activeStamps;

                return (
                  <>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-center w-12">S.No</th>
                          <th className="py-2.5 px-3">Stamp / Grade</th>
                          <th className="py-2.5 px-3 text-right">Available Carats</th>
                          <th className="py-2.5 px-3 text-right">Available Pieces</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {displayList.length > 0 ? (
                          displayList.map((item, idx) => {
                            const hasStock = Number(item.available_carats || 0) > 0 || Number(item.available_count || 0) > 0;
                            return (
                              <tr key={idx} className="hover:bg-cyan-50/30 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-medium">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-stone-900 flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${hasStock ? 'bg-cyan-500 ring-2 ring-cyan-200' : 'bg-stone-300'}`}></span>
                                  <span>{item.stamp || 'Unclassified'}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-900">
                                  {Number(item.available_carats || 0).toFixed(3)} ct
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                                  {Number(item.available_count || 0)} pcs
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-stone-400">
                              No diamond stamps recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
                      <span>
                        Showing {displayList.length} of {diamondVault.breakdown.length} stamps
                        {activeStamps.length > 0 && !showAllDiamondStamps && ` (${activeStamps.length} with active balance)`}
                      </span>
                      {diamondVault.breakdown.length > activeStamps.length && (
                        <button
                          type="button"
                          onClick={() => setShowAllDiamondStamps(!showAllDiamondStamps)}
                          className="text-cyan-700 hover:text-cyan-900 font-bold underline cursor-pointer text-[11px]"
                        >
                          {showAllDiamondStamps ? 'Hide Empty Stamps' : `Show All Master Stamps (${diamondVault.breakdown.length})`}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDiamondModal(false);
                  navigate('/purchase/stock#diamond-stock-section');
                }}
                className="px-4 py-2 bg-[#b01622] hover:bg-[#8f121b] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow flex items-center gap-2 cursor-pointer"
              >
                <span>View More</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
              <button
                type="button"
                onClick={() => setShowDiamondModal(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Colour Stone Stock Breakdown by Stamp / Variety Modal */}
      {showStoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-stone-50 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-circle-dot"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Colour Stone Stock by Stamp / Variety</h3>
                  <p className="text-[11px] text-stone-500">Authoritative vault breakdown</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStoneModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="mb-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Total Vault Balance</span>
                  <span className="text-lg font-black text-amber-950 font-mono">
                    {Number(stoneVault.totalWeight || 0).toFixed(3)} ct
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Total Pieces</span>
                  <span className="text-sm font-bold text-stone-700 font-mono">
                    {stoneVault.totalCount || 0} pcs
                  </span>
                </div>
              </div>

              {(() => {
                const activeStamps = stoneVault.breakdown.filter(
                  item => Number(item.available_carats || item.available_weight || 0) > 0 || Number(item.available_count || 0) > 0
                );
                const displayList = (showAllStoneStamps || activeStamps.length === 0)
                  ? stoneVault.breakdown
                  : activeStamps;

                return (
                  <>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-center w-12">S.No</th>
                          <th className="py-2.5 px-3">Stamp / Variety</th>
                          <th className="py-2.5 px-3 text-right">Available Carats</th>
                          <th className="py-2.5 px-3 text-right">Available Pieces</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {displayList.length > 0 ? (
                          displayList.map((item, idx) => {
                            const hasStock = Number(item.available_carats || item.available_weight || 0) > 0 || Number(item.available_count || 0) > 0;
                            return (
                              <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-medium">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-stone-900 flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${hasStock ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-stone-300'}`}></span>
                                  <span>{item.stamp || 'Unclassified'}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                                  {Number(item.available_carats || item.available_weight || 0).toFixed(3)} ct
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                                  {Number(item.available_count || 0)} pcs
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-stone-400">
                              No colour stone stamps recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
                      <span>
                        Showing {displayList.length} of {stoneVault.breakdown.length} stamps
                        {activeStamps.length > 0 && !showAllStoneStamps && ` (${activeStamps.length} with active balance)`}
                      </span>
                      {stoneVault.breakdown.length > activeStamps.length && (
                        <button
                          type="button"
                          onClick={() => setShowAllStoneStamps(!showAllStoneStamps)}
                          className="text-amber-800 hover:text-amber-900 font-bold underline cursor-pointer text-[11px]"
                        >
                          {showAllStoneStamps ? 'Hide Empty Stamps' : `Show All Master Stamps (${stoneVault.breakdown.length})`}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowStoneModal(false);
                  navigate('/purchase/stock');
                }}
                className="px-4 py-2 bg-[#b01622] hover:bg-[#8f121b] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow flex items-center gap-2 cursor-pointer"
              >
                <span>View More</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
              <button
                type="button"
                onClick={() => setShowStoneModal(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
