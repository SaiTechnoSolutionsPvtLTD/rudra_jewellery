import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

export default function StockManagement() {
  // Instant synchronous hydration from localStorage cache
  const [categories, setCategories] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_stock_categories');
      if (c) return JSON.parse(c) || [];
    } catch (e) {}
    return [];
  });

  const [products, setProducts] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_stock_products');
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [subcategories, setSubcategories] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_stock_subcategories');
      if (c) return JSON.parse(c) || [];
    } catch (e) {}
    return [];
  });

  const [loading, setLoading] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_stock_products');
      if (c && JSON.parse(c).length > 0) return false;
    } catch (e) {}
    return true;
  });
  
  // Selected category for Card-click filtering
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  
  // Filtering & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Specification Details Modal state
  const [specModalProduct, setSpecModalProduct] = useState(null);

  // Opening Stock Entry Pane/Modal states
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [openingStockMode, setOpeningStockMode] = useState('bulk'); // 'bulk' or 'single'
  const [savingStock, setSavingStock] = useState(false);
  
  // Single Product Opening Stock Form
  const [selectedSingleProductId, setSelectedSingleProductId] = useState('');
  const [singleStockForm, setSingleStockForm] = useState({
    opening_stock_qty: 0,
    opening_stock_weight: '',
    opening_stock_rate: '',
    opening_stock_date: new Date().toISOString().split('T')[0],
    current_stock_qty: 0
  });

  // Bulk Opening Stock Form Data: Map of productId -> stock object
  const [bulkStockData, setBulkStockData] = useState(() => {
    try {
      const c = localStorage.getItem('rudhra_stock_products');
      if (c) {
        const prods = JSON.parse(c);
        if (Array.isArray(prods) && prods.length > 0) {
          const map = {};
          prods.forEach(p => {
            const opQty = p.opening_stock_qty ?? 0;
            const currQty = (p.current_stock_qty && p.current_stock_qty > 0) ? p.current_stock_qty : opQty;
            map[p.id] = {
              id: p.id,
              opening_stock_qty: opQty,
              opening_stock_weight: p.opening_stock_weight ?? '',
              opening_touch: p.opening_touch ?? 100,
              opening_fine_weight: p.opening_fine_weight ?? '',
              opening_stock_rate: p.opening_stock_rate ?? '',
              opening_stock_date: p.opening_stock_date || new Date().toISOString().split('T')[0],
              current_stock_qty: currQty
            };
          });
          return map;
        }
      }
    } catch (e) {}
    return {};
  });
  const [bulkFilterCategory, setBulkFilterCategory] = useState('all');
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);

  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      const [catRes, prodRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
        api.get('/subcategories')
      ]);

      const rawCatData = catRes.data || [];
      
      // Deduplicate categories by ID or Code
      const seen = new Set();
      const uniqueCategories = rawCatData.filter(cat => {
        const identifier = cat.id || cat.code || cat.name;
        if (seen.has(identifier)) return false;
        seen.add(identifier);
        return true;
      });

      const prods = prodRes.data || [];
      const subs = subRes.data || [];
      setCategories(uniqueCategories);
      setProducts(prods);
      setSubcategories(subs);

      // Persist in localStorage for instant render on reload
      if (uniqueCategories.length > 0) {
        localStorage.setItem('rudhra_stock_categories', JSON.stringify(uniqueCategories));
      }
      if (prods.length > 0) {
        localStorage.setItem('rudhra_stock_products', JSON.stringify(prods));
      }
      if (subs.length > 0) {
        localStorage.setItem('rudhra_stock_subcategories', JSON.stringify(subs));
      }

      // Initialize bulk stock form data
      const initialBulkMap = {};
      prods.forEach(p => {
        const opQty = p.opening_stock_qty ?? 0;
        const currQty = (p.current_stock_qty && p.current_stock_qty > 0) ? p.current_stock_qty : opQty;
        initialBulkMap[p.id] = {
          id: p.id,
          opening_stock_qty: opQty,
          opening_stock_weight: p.opening_stock_weight ?? '',
          opening_touch: p.opening_touch ?? 100,
          opening_fine_weight: p.opening_fine_weight ?? '',
          opening_stock_rate: p.opening_stock_rate ?? '',
          opening_stock_date: p.opening_stock_date || new Date().toISOString().split('T')[0],
          current_stock_qty: currQty
        };
      });
      setBulkStockData(initialBulkMap);

    } catch (err) {
      console.error(err);
      showToast('Failed to load stock management data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category Icon & Theme Helper
  const getCategoryTheme = (code = '', name = '') => {
    const key = (code || name).toUpperCase();
    if (key.includes('GOLD')) {
      return {
        bgColor: 'bg-amber-500',
        lightBg: 'bg-amber-50 hover:bg-amber-100/70',
        borderColor: 'border-amber-400',
        textColor: 'text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        gradient: 'from-amber-500 to-yellow-600',
        icon: 'fa-solid fa-coins',
        activeRing: 'ring-2 ring-amber-500 border-amber-500 shadow-amber-100'
      };
    }
    if (key.includes('SILVER')) {
      return {
        bgColor: 'bg-slate-400',
        lightBg: 'bg-slate-50 hover:bg-slate-100/70',
        borderColor: 'border-slate-300',
        textColor: 'text-slate-700',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        gradient: 'from-slate-400 to-slate-600',
        icon: 'fa-solid fa-ring',
        activeRing: 'ring-2 ring-slate-500 border-slate-500 shadow-slate-100'
      };
    }
    if (key.includes('DIAMOND')) {
      return {
        bgColor: 'bg-cyan-500',
        lightBg: 'bg-cyan-50 hover:bg-cyan-100/70',
        borderColor: 'border-cyan-300',
        textColor: 'text-cyan-800',
        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        gradient: 'from-cyan-400 to-blue-600',
        icon: 'fa-regular fa-gem',
        activeRing: 'ring-2 ring-cyan-500 border-cyan-500 shadow-cyan-100'
      };
    }
    if (key.includes('STONE') || key.includes('STORE')) {
      return {
        bgColor: 'bg-emerald-500',
        lightBg: 'bg-emerald-50 hover:bg-emerald-100/70',
        borderColor: 'border-emerald-300',
        textColor: 'text-emerald-800',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        gradient: 'from-emerald-500 to-teal-600',
        icon: 'fa-solid fa-cubes',
        activeRing: 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-100'
      };
    }
    return {
      bgColor: 'bg-[#b01622]',
      lightBg: 'bg-red-50 hover:bg-red-100/70',
      borderColor: 'border-red-200',
      textColor: 'text-[#b01622]',
      badgeBg: 'bg-red-100 text-red-800 border-red-200',
      gradient: 'from-[#b01622] to-red-700',
      icon: 'fa-solid fa-layer-group',
      activeRing: 'ring-2 ring-[#b01622] border-[#b01622] shadow-red-100'
    };
  };

  // Helper to compute metrics per category
  const getCategoryMetrics = (catId, catCode, catName) => {
    const matchingProducts = products.filter(p => {
      if (p.category_id && String(p.category_id) === String(catId)) return true;
      if (p.category && (p.category.code === catCode || p.category.name.toLowerCase() === catName.toLowerCase())) return true;
      return false;
    });

    let totalNetWeightGrams = 0;
    let totalQty = 0;

    matchingProducts.forEach(p => {
      const attrs = p.attributes || {};
      const qty = parseInt(p.current_stock_qty ?? p.opening_stock_qty ?? 1, 10);
      let unitWeight = 0;

      if (p.opening_stock_weight) unitWeight = parseFloat(p.opening_stock_weight) || 0;
      else if (attrs.net_weight) unitWeight = parseFloat(attrs.net_weight) || 0;
      else if (attrs.weight) unitWeight = parseFloat(attrs.weight) || 0;

      totalNetWeightGrams += unitWeight * (qty > 0 ? qty : 1);
      totalQty += qty;
    });

    const weightKg = (totalNetWeightGrams / 1000).toFixed(3);

    return {
      count: matchingProducts.length,
      totalQty,
      netWeightGrams: totalNetWeightGrams > 0 ? totalNetWeightGrams.toFixed(2) + ' g' : '0.00 g',
      netWeightKg: totalNetWeightGrams > 0 ? weightKg + ' KG' : '0.000 KG',
      formattedWeight: totalNetWeightGrams > 0 ? `${totalNetWeightGrams.toFixed(2)} g (${weightKg} KG)` : '0.00 g (0.000 KG)'
    };
  };

  // Available Stock Calculations (Grams & KG)
  let totalAvailableQty = 0;
  let totalAvailableWeightGrams = 0;
  let totalAvailableValuation = 0;
  let totalOpeningQty = 0;

  products.forEach(p => {
    const attrs = p.attributes || {};
    const opQty = parseInt(p.opening_stock_qty || 0, 10);
    const currQty = parseInt(p.current_stock_qty ?? p.opening_stock_qty ?? 0, 10);
    const qty = currQty > 0 ? currQty : (opQty > 0 ? opQty : 1);

    totalOpeningQty += opQty;
    totalAvailableQty += qty;

    let unitWeight = 0;
    if (p.opening_stock_weight) unitWeight = parseFloat(p.opening_stock_weight) || 0;
    else if (attrs.net_weight) unitWeight = parseFloat(attrs.net_weight) || 0;
    else if (attrs.weight) unitWeight = parseFloat(attrs.weight) || 0;

    const rate = parseFloat(p.opening_stock_rate || attrs.rate || 0);
    const prodWeight = unitWeight;
    totalAvailableWeightGrams += prodWeight;

    if (prodWeight > 0 && rate > 0) {
      totalAvailableValuation += prodWeight * rate;
    }
  });

  const totalAvailableWeightKG = (totalAvailableWeightGrams / 1000).toFixed(3);

  // Handle Card Click
  const handleCardClick = (catId) => {
    if (selectedCategoryId === String(catId)) {
      setSelectedCategoryId('all');
    } else {
      setSelectedCategoryId(String(catId));
    }
    setCurrentPage(1);
  };

  // Subcategory filter options based on selected category
  const filteredSubcategories = selectedCategoryId === 'all'
    ? subcategories
    : subcategories.filter(s => String(s.category_id) === String(selectedCategoryId));

  // Filter products for the table
  const filteredProducts = products.filter(p => {
    if (selectedCategoryId !== 'all') {
      const selectedCat = categories.find(c => String(c.id) === String(selectedCategoryId));
      const matchesId = p.category_id && String(p.category_id) === String(selectedCategoryId);
      const matchesCatCode = selectedCat && p.category && p.category.code === selectedCat.code;
      const matchesCatName = selectedCat && p.category && p.category.name.toLowerCase() === selectedCat.name.toLowerCase();
      if (!matchesId && !matchesCatCode && !matchesCatName) {
        return false;
      }
    }

    if (subcategoryFilter !== 'all' && String(p.subcategory_id) !== String(subcategoryFilter)) {
      return false;
    }

    if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const nameMatch = (p.name || '').toLowerCase().includes(term);
      const codeMatch = (p.product_code || '').toLowerCase().includes(term);
      const catMatch = (p.category?.name || '').toLowerCase().includes(term);
      const subMatch = (p.subcategory?.name || '').toLowerCase().includes(term);
      return nameMatch || codeMatch || catMatch || subMatch;
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeCategoryObj = categories.find(c => String(c.id) === String(selectedCategoryId));

  // Handlers for Opening Stock Modal / Pane
  const openOpeningStockPane = (productToEdit = null) => {
    if (productToEdit) {
      setOpeningStockMode('single');
      setSelectedSingleProductId(String(productToEdit.id));
      setSingleStockForm({
        opening_stock_qty: productToEdit.opening_stock_qty ?? 0,
        opening_stock_weight: productToEdit.opening_stock_weight ?? '',
        opening_touch: productToEdit.opening_touch ?? 100,
        opening_fine_weight: productToEdit.opening_fine_weight ?? '',
        opening_stock_rate: productToEdit.opening_stock_rate ?? '',
        opening_stock_date: productToEdit.opening_stock_date || new Date().toISOString().split('T')[0],
        current_stock_qty: productToEdit.current_stock_qty ?? productToEdit.opening_stock_qty ?? 0
      });
    } else {
      setOpeningStockMode('bulk');
      if (products.length > 0 && !selectedSingleProductId) {
        const firstP = products[0];
        setSelectedSingleProductId(String(firstP.id));
        setSingleStockForm({
          opening_stock_qty: firstP.opening_stock_qty ?? 0,
          opening_stock_weight: firstP.opening_stock_weight ?? '',
          opening_touch: firstP.opening_touch ?? 100,
          opening_fine_weight: firstP.opening_fine_weight ?? '',
          opening_stock_rate: firstP.opening_stock_rate ?? '',
          opening_stock_date: firstP.opening_stock_date || new Date().toISOString().split('T')[0],
          current_stock_qty: firstP.current_stock_qty ?? firstP.opening_stock_qty ?? 0
        });
      }
    }
    setShowOpeningStockModal(true);
  };

  const handleSingleProductSelectChange = (e) => {
    const prodId = e.target.value;
    setSelectedSingleProductId(prodId);
    const prod = products.find(p => String(p.id) === String(prodId));
    if (prod) {
      setSingleStockForm({
        opening_stock_qty: prod.opening_stock_qty ?? 0,
        opening_stock_weight: prod.opening_stock_weight ?? '',
        opening_touch: prod.opening_touch ?? 100,
        opening_fine_weight: prod.opening_fine_weight ?? '',
        opening_stock_rate: prod.opening_stock_rate ?? '',
        opening_stock_date: prod.opening_stock_date || new Date().toISOString().split('T')[0],
        current_stock_qty: prod.current_stock_qty ?? prod.opening_stock_qty ?? 0
      });
    }
  };

  const handleSingleStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSingleProductId) {
      showToast('Please select a product first', 'error');
      return;
    }
    setSavingStock(true);
    try {
      const res = await api.post(`/products/${selectedSingleProductId}/opening-stock`, singleStockForm);
      showToast(res.data?.message || 'Opening stock updated successfully!', 'success');
      setShowOpeningStockModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update opening stock', 'error');
    } finally {
      setSavingStock(false);
    }
  };

  const handleBulkChange = (prodId, field, val) => {
    setBulkStockData(prev => {
      const currentObj = prev[prodId] || {};
      const updatedObj = { ...currentObj, [field]: val };
      if (field === 'opening_stock_qty') {
        updatedObj.current_stock_qty = val;
      }
      return {
        ...prev,
        [prodId]: updatedObj
      };
    });
  };

  const applyBatchDateToAll = () => {
    setBulkStockData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], opening_stock_date: batchDate };
      });
      return updated;
    });
    showToast(`Batch date applied to all items (${batchDate})`, 'info');
  };

  const handleBulkStockSubmit = async () => {
    setSavingStock(true);
    try {
      const itemsList = Object.values(bulkStockData);
      const res = await api.post('/products/bulk-opening-stock', { items: itemsList });
      showToast(res.data?.message || 'Bulk opening stock updated successfully!', 'success');
      setShowOpeningStockModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save bulk opening stock', 'error');
    } finally {
      setSavingStock(false);
    }
  };

  // Products filtered for the bulk entry table inside the modal
  const bulkFilteredProducts = products.filter(p => {
    if (bulkFilterCategory !== 'all' && String(p.category_id) !== String(bulkFilterCategory)) {
      return false;
    }
    if (bulkSearchTerm.trim()) {
      const term = bulkSearchTerm.toLowerCase();
      const nameMatch = (p.name || '').toLowerCase().includes(term);
      const codeMatch = (p.product_code || '').toLowerCase().includes(term);
      return nameMatch || codeMatch;
    }
    return true;
  });

  return (
    <div className="w-full space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Stock Management</h1>
            <span className="bg-red-100 text-[#b01622] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-200">
              {products.length} Total Items
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Available Stock overview (in Grams & KG), product-wise Opening Stock entries, and valuation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Opening Stock Entry Pane Trigger Button */}
          <button
            onClick={() => openOpeningStockPane()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <i className="fa-solid fa-boxes-packing text-sm"></i>
            Opening Stock Entry
          </button>

          <Link
            to="/inventory/add-new/category"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#b01622] hover:bg-[#8e101b] text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Add Stock Item
          </Link>
          
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Category Nav Tabs Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-[#b01622]"></i>
            Category Filter Navigation Tabs
          </h2>
          {selectedCategoryId !== 'all' && (
            <button
              onClick={() => { setSelectedCategoryId('all'); setCurrentPage(1); }}
              className="text-xs text-[#b01622] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i> Reset Category Filter ({products.length} Items)
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-wrap gap-2.5 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-10 w-36 bg-gray-100 rounded-xl shrink-0"></div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* All Categories Tab */}
            <button
              onClick={() => { setSelectedCategoryId('all'); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap cursor-pointer border ${
                selectedCategoryId === 'all'
                  ? 'bg-[#b01622] text-white border-[#b01622] shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <i className="fa-solid fa-boxes-stacked text-sm"></i>
              <span>All Categories</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                selectedCategoryId === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {products.length} Items ({totalAvailableWeightKG} KG)
              </span>
            </button>

            {/* Category Nav Tabs */}
            {categories.map((cat) => {
              const theme = getCategoryTheme(cat.code, cat.name);
              const metrics = getCategoryMetrics(cat.id, cat.code, cat.name);
              const isSelected = selectedCategoryId === String(cat.id);

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCardClick(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? `bg-gray-900 text-white border-gray-900 shadow-sm ring-2 ${theme.activeRing}`
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md ${isSelected ? 'bg-white text-gray-900' : `${theme.bgColor} text-white`} flex items-center justify-center text-[10px]`}>
                    <i className={theme.icon}></i>
                  </div>

                  <span>{cat.name}</span>

                  <div className="flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : theme.badgeBg
                    }`}>
                      {metrics.count} Items
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isSelected ? 'bg-amber-400 text-gray-900 font-bold' : 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                    }`}>
                      {metrics.netWeightGrams}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isSelected ? 'bg-cyan-400 text-gray-900 font-bold' : 'bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold'
                    }`}>
                      {metrics.netWeightKg}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock Items Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Title & Active Category Filter Info */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-[#b01622] rounded-lg">
              <i className="fa-solid fa-table-list text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {activeCategoryObj ? `${activeCategoryObj.name} Stock Items` : 'All Categories Stock Items'}
              </h2>
              <p className="text-xs text-gray-500">
                Showing {filteredProducts.length} items formatted with available stock (Grams & KG)
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search SKU, item name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622] focus:border-transparent"
              />
            </div>

            <select
              value={subcategoryFilter}
              onChange={(e) => { setSubcategoryFilter(e.target.value); setCurrentPage(1); }}
              className="py-1.5 px-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            >
              <option value="all">All Subcategories</option>
              {filteredSubcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="py-1.5 px-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                <th className="py-3 px-4">Item & Code</th>
                <th className="py-3 px-4">Category / Subcategory</th>
                <th className="py-3 px-4">Specifications</th>
                <th className="py-3 px-4 text-center">Available Stock (g & KG)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    <i className="fa-solid fa-spinner animate-spin text-xl text-[#b01622] mb-2"></i>
                    <p>Loading stock items...</p>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <i className="fa-solid fa-box-open text-3xl text-gray-300 mb-2"></i>
                    <p className="font-semibold text-gray-700">No stock items found</p>
                    <p className="text-xs text-gray-400 mt-1">Try clearing filters or changing category selection.</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((item) => {
                  const catName = item.category?.name || 'General';
                  const catCode = item.category?.code || 'GEN';
                  const theme = getCategoryTheme(catCode, catName);
                  const attrs = item.attributes || {};

                  // Opening stock values
                  const opQty = item.opening_stock_qty || 0;
                  const opWtGrams = parseFloat(item.opening_stock_weight || 0);
                  const opRate = parseFloat(item.opening_stock_rate || 0);

                  // Available stock values (Direct Weight in Grams & KG)
                  const totalProdWtGrams = opWtGrams > 0 ? opWtGrams : (parseFloat(attrs.net_weight) || parseFloat(attrs.weight) || 0);
                  const totalProdWtKg = (totalProdWtGrams / 1000).toFixed(3);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Item & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.thumbnail || item.image ? (
                              <img
                                src={item.thumbnail ? `/storage/${item.thumbnail}` : `/storage/${item.image}`}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <i className={`${theme.icon} ${theme.textColor} text-base`}></i>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{item.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-[#b01622] bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                                {item.product_code || `SKU-${item.id}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Subcategory */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${theme.badgeBg}`}>
                            {catName}
                          </span>
                          {item.subcategory && (
                            <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              {item.subcategory.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Key Attributes & Specs */}
                      <td className="py-3.5 px-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                          {attrs.purity && (
                            <div>
                              <span className="text-gray-400">Purity: </span>
                              <span className="font-semibold text-gray-800">{attrs.purity}</span>
                            </div>
                          )}
                          {(attrs.net_weight || attrs.weight) && (
                            <div>
                              <span className="text-gray-400">Net Wt: </span>
                              <span className="font-bold text-emerald-700">{attrs.net_weight || attrs.weight} g</span>
                            </div>
                          )}
                          {attrs.gross_weight && (
                            <div>
                              <span className="text-gray-400">Gross Wt: </span>
                              <span className="font-semibold text-gray-800">{attrs.gross_weight} g</span>
                            </div>
                          )}
                          {attrs.making_charge && (
                            <div>
                              <span className="text-gray-400">Making: </span>
                              <span className="font-semibold text-gray-800">₹{attrs.making_charge}</span>
                            </div>
                          )}
                          {Object.keys(attrs).length === 0 && (
                            <span className="text-gray-400 italic">No custom specs</span>
                          )}
                        </div>
                      </td>

                      {/* AVAILABLE STOCK COLUMN (Grams & KG) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center bg-emerald-50/70 border border-emerald-200 px-3.5 py-1.5 rounded-xl">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {totalProdWtGrams.toFixed(2)} g
                          </span>
                          <span className="text-[11px] font-bold text-cyan-800 mt-1">
                            {totalProdWtKg} KG
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {item.status === 'active' ? 'In Stock' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openOpeningStockPane(item)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Opening Stock Entry"
                          >
                            <i className="fa-solid fa-boxes-packing text-sm"></i>
                          </button>
                          
                          <button
                            onClick={() => setSpecModalProduct(item)}
                            className="p-1.5 text-gray-600 hover:text-[#b01622] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="View Full Specifications"
                          >
                            <i className="fa-regular fa-eye"></i>
                          </button>
                          
                          <Link
                            to={`/inventory/products/${item.id}/edit`}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit Item"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </Link>
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
        {filteredProducts.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
              totalItems={filteredProducts.length}
            />
          </div>
        )}
      </div>

      {/* OPENING STOCK ENTRY PANE / MODAL */}
      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-boxes-packing"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-serif">Opening Stock Entry Pane</h3>
                  <p className="text-xs text-gray-300">Set initial quantity, net weight, rate, and valuation for products</p>
                </div>
              </div>
              <button
                onClick={() => setShowOpeningStockModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-5 pt-3 gap-4">
              <button
                onClick={() => setOpeningStockMode('bulk')}
                className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  openingStockMode === 'bulk'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className="fa-solid fa-table"></i>
                Bulk Product Entry (Batch Table)
              </button>

              <button
                onClick={() => setOpeningStockMode('single')}
                className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  openingStockMode === 'single'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className="fa-solid fa-box"></i>
                Single Product Entry
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* MODE 1: BULK PRODUCT ENTRY */}
              {openingStockMode === 'bulk' && (
                <div className="space-y-4">
                  {/* Controls: Search, Filter, Batch Date */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                      <div className="relative flex-1">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input
                          type="text"
                          placeholder="Search SKU or name..."
                          value={bulkSearchTerm}
                          onChange={(e) => setBulkSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <select
                        value={bulkFilterCategory}
                        onChange={(e) => setBulkFilterCategory(e.target.value)}
                        className="py-1.5 px-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                      <span className="text-xs font-semibold text-gray-600">Batch Date:</span>
                      <input
                        type="date"
                        value={batchDate}
                        onChange={(e) => setBatchDate(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-300 rounded px-2 py-0.5"
                      />
                      <button
                        type="button"
                        onClick={applyBatchDateToAll}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2 py-1 rounded cursor-pointer transition-colors"
                        title="Apply this date to all rows"
                      >
                        Apply All
                      </button>
                    </div>
                  </div>

                  {/* Bulk Table */}
                  <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-gray-100 z-10 text-[11px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3">Product Name & Code</th>
                          <th className="py-2.5 px-3">Gross Wt (g)</th>
                          <th className="py-2.5 px-3">Touch (%)</th>
                          <th className="py-2.5 px-3">Fine Gold Wt (g / KG)</th>
                          <th className="py-2.5 px-3">Opening Rate (₹)</th>
                          <th className="py-2.5 px-3">Valuation (₹)</th>
                          <th className="py-2.5 px-3">Opening Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-xs">
                        {bulkFilteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-gray-500">
                              No matching products found.
                            </td>
                          </tr>
                        ) : (
                          bulkFilteredProducts.map((p) => {
                            const stockItem = bulkStockData[p.id] || {
                              opening_stock_qty: 0,
                              opening_stock_weight: '',
                              opening_touch: 100,
                              opening_fine_weight: '',
                              opening_stock_rate: '',
                              opening_stock_date: new Date().toISOString().split('T')[0]
                            };

                            const qty = parseFloat(stockItem.opening_stock_qty || 0);
                            const grossWtGrams = parseFloat(stockItem.opening_stock_weight || 0);
                            const touch = parseFloat(stockItem.opening_touch ?? 100);
                            const fineWtGrams = grossWtGrams > 0 ? (grossWtGrams * (touch / 100)) : 0;
                            const fineWtKg = (fineWtGrams / 1000).toFixed(3);
                            const rate = parseFloat(stockItem.opening_stock_rate || 0);
                            const valuation = fineWtGrams > 0 && rate > 0 ? (fineWtGrams * rate) : (grossWtGrams > 0 && rate > 0 ? grossWtGrams * rate : qty * rate);

                            return (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="py-2 px-3">
                                  <div className="font-bold text-gray-900">{p.name}</div>
                                  <div className="text-[10px] font-mono text-[#b01622]">{p.product_code || `SKU-${p.id}`}</div>
                                </td>
                                
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={stockItem.opening_stock_qty}
                                    onChange={(e) => handleBulkChange(p.id, 'opening_stock_qty', e.target.value)}
                                    placeholder="0"
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>

                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={stockItem.opening_stock_weight}
                                    onChange={(e) => handleBulkChange(p.id, 'opening_stock_weight', e.target.value)}
                                    placeholder="0.000"
                                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 font-bold text-amber-700"
                                  />
                                </td>

                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={stockItem.opening_touch ?? 100}
                                    onChange={(e) => handleBulkChange(p.id, 'opening_touch', e.target.value)}
                                    placeholder="100.00"
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 font-bold text-emerald-700"
                                  />
                                </td>

                                <td className="py-2 px-3">
                                  <div className="font-bold text-cyan-800 text-[11px]">
                                    {fineWtGrams.toFixed(2)} g
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    {fineWtKg} KG
                                  </div>
                                </td>

                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={stockItem.opening_stock_rate}
                                    onChange={(e) => handleBulkChange(p.id, 'opening_stock_rate', e.target.value)}
                                    placeholder="0.00"
                                    className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>

                                <td className="py-2 px-3 font-semibold text-emerald-700">
                                  ₹{valuation > 0 ? valuation.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}
                                </td>

                                <td className="py-2 px-3">
                                  <input
                                    type="date"
                                    value={stockItem.opening_stock_date || ''}
                                    onChange={(e) => handleBulkChange(p.id, 'opening_stock_date', e.target.value)}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE 2: SINGLE PRODUCT ENTRY */}
              {openingStockMode === 'single' && (
                <form onSubmit={handleSingleStockSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Select Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSingleProductId}
                      onChange={handleSingleProductSelectChange}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.product_code || `SKU-${p.id}`}) - [{p.category?.name || 'General'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSingleProductId && (
                    <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {products.find(p => String(p.id) === String(selectedSingleProductId))?.name}
                        </div>
                        <div className="text-emerald-800 font-mono font-semibold">
                          SKU: {products.find(p => String(p.id) === String(selectedSingleProductId))?.product_code}
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold">
                        Category: {products.find(p => String(p.id) === String(selectedSingleProductId))?.category?.name || 'General'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Opening Stock Quantity (Pcs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={singleStockForm.opening_stock_qty}
                        onChange={(e) => setSingleStockForm(prev => ({ ...prev, opening_stock_qty: e.target.value }))}
                        placeholder="0"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Gross Net Weight (grams)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={singleStockForm.opening_stock_weight}
                        onChange={(e) => {
                          const grossWt = e.target.value;
                          const touch = singleStockForm.opening_touch ?? 100;
                          const fineWt = parseFloat(grossWt || 0) * (parseFloat(touch || 100) / 100);
                          setSingleStockForm(prev => ({
                            ...prev,
                            opening_stock_weight: grossWt,
                            opening_fine_weight: fineWt.toFixed(3)
                          }));
                        }}
                        placeholder="0.000"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-amber-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Touch % Field with Preset Quick Buttons */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-gray-700">
                          Touch (%) <span className="text-emerald-700 font-semibold">(Purity)</span>
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono">Presets:</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={singleStockForm.opening_touch ?? 100}
                        onChange={(e) => {
                          const touchVal = e.target.value;
                          const grossWt = singleStockForm.opening_stock_weight || 0;
                          const fineWt = parseFloat(grossWt) * (parseFloat(touchVal || 100) / 100);
                          setSingleStockForm(prev => ({
                            ...prev,
                            opening_touch: touchVal,
                            opening_fine_weight: fineWt.toFixed(3)
                          }));
                        }}
                        placeholder="100.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                      />
                      {/* Touch Preset Buttons */}
                      <div className="flex gap-1.5 mt-2">
                        {[
                          { label: '77% (18K)', val: 77 },
                          { label: '82% (20K)', val: 82 },
                          { label: '91.6% (22K)', val: 91.6 },
                          { label: '99.9% (24K)', val: 99.9 }
                        ].map(preset => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => {
                              const touchVal = preset.val;
                              const grossWt = singleStockForm.opening_stock_weight || 0;
                              const fineWt = parseFloat(grossWt) * (touchVal / 100);
                              setSingleStockForm(prev => ({
                                ...prev,
                                opening_touch: touchVal,
                                opening_fine_weight: fineWt.toFixed(3)
                              }));
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              parseFloat(singleStockForm.opening_touch) === preset.val
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculated Fine Gold Weight */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Calculated Fine Gold Weight (g & KG)
                      </label>
                      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-semibold">Fine Wt (g):</span>
                          <span className="text-sm font-black text-cyan-900">
                            {(parseFloat(singleStockForm.opening_stock_weight || 0) * (parseFloat(singleStockForm.opening_touch || 100) / 100)).toFixed(3)} g
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] border-t border-cyan-200/60 pt-1">
                          <span className="text-gray-500">Fine Wt (KG):</span>
                          <span className="font-bold text-cyan-700 font-mono">
                            {((parseFloat(singleStockForm.opening_stock_weight || 0) * (parseFloat(singleStockForm.opening_touch || 100) / 100)) / 1000).toFixed(3)} KG
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Opening Rate (₹ per unit/gram)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={singleStockForm.opening_stock_rate}
                        onChange={(e) => setSingleStockForm(prev => ({ ...prev, opening_stock_rate: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Opening Stock Entry Date
                      </label>
                      <input
                        type="date"
                        value={singleStockForm.opening_stock_date}
                        onChange={(e) => setSingleStockForm(prev => ({ ...prev, opening_stock_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Calculated Total Opening Valuation:</span>
                    <span className="text-base font-bold text-emerald-700">
                      ₹{(
                        (parseFloat(singleStockForm.opening_stock_weight || 0) > 0 && parseFloat(singleStockForm.opening_stock_rate || 0) > 0)
                          ? (parseFloat(singleStockForm.opening_stock_weight) * (parseFloat(singleStockForm.opening_touch || 100) / 100) * parseFloat(singleStockForm.opening_stock_rate))
                          : (parseFloat(singleStockForm.opening_stock_qty || 0) * parseFloat(singleStockForm.opening_stock_rate || 0))
                      ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingStock}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {savingStock ? (
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                      ) : (
                        <>
                          <i className="fa-solid fa-check"></i> Save Opening Stock
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {openingStockMode === 'bulk' ? `Editing ${bulkFilteredProducts.length} items in bulk view` : 'Single product stock editor'}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowOpeningStockModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Close / Cancel
                </button>

                {openingStockMode === 'bulk' && (
                  <button
                    type="button"
                    onClick={handleBulkStockSubmit}
                    disabled={savingStock}
                    className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {savingStock ? (
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk text-white"></i> Save All Opening Stock
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Specifications Details Modal */}
      {specModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-[#b01622]"></i>
                <h3 className="font-bold text-gray-900">Stock Item Details & Specs</h3>
              </div>
              <button
                onClick={() => setSpecModalProduct(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-4 bg-red-50/40 p-3 rounded-lg border border-red-100">
                <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {specModalProduct.thumbnail || specModalProduct.image ? (
                    <img
                      src={specModalProduct.thumbnail ? `/storage/${specModalProduct.thumbnail}` : `/storage/${specModalProduct.image}`}
                      alt={specModalProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <i className="fa-solid fa-gem text-xl text-[#b01622]"></i>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{specModalProduct.name}</h4>
                  <div className="text-xs text-[#b01622] font-mono font-semibold">
                    SKU: {specModalProduct.product_code || `SKU-${specModalProduct.id}`}
                  </div>
                </div>
              </div>

              {/* Opening Stock Details in Modal */}
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 space-y-1">
                <h5 className="font-bold text-xs uppercase text-emerald-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-boxes-packing"></i> Opening Stock Details
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-gray-500">Stock Weight:</span>{' '}
                    <span className="font-bold text-amber-700">{specModalProduct.opening_stock_weight || 0} g</span>{' '}
                    <span className="text-[10px] text-cyan-800 font-semibold">({((specModalProduct.opening_stock_weight || 0) / 1000).toFixed(3)} KG)</span>
                  </div>
                  <div><span className="text-gray-500">Opening Touch:</span> <span className="font-bold text-emerald-700">{specModalProduct.opening_touch || 100}%</span></div>
                  <div><span className="text-gray-500">Opening Rate:</span> <span className="font-bold text-gray-900">₹{specModalProduct.opening_stock_rate || 0}</span></div>
                  <div><span className="text-gray-500">Entry Date:</span> <span className="font-mono text-gray-700">{specModalProduct.opening_stock_date || 'N/A'}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block">Category:</span>
                  <span className="font-bold text-gray-900">{specModalProduct.category?.name || 'General'}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block">Subcategory:</span>
                  <span className="font-bold text-gray-900">{specModalProduct.subcategory?.name || 'None'}</span>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">Technical Attributes</h5>
                {specModalProduct.attributes && Object.keys(specModalProduct.attributes).length > 0 ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                    {Object.entries(specModalProduct.attributes).map(([key, val]) => (
                      <div key={key} className="p-2.5 flex justify-between items-center text-xs">
                        <span className="capitalize text-gray-600">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-semibold text-gray-900">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No additional attributes saved.</p>
                )}
              </div>

              {specModalProduct.description && (
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">Description</h5>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    {specModalProduct.description}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSpecModalProduct(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
