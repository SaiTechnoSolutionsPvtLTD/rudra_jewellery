import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

export default function PurchaseEntry({ initialTab }) {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const isDetailsRoute = location.pathname === '/purchase/details';
  const [activeTab, setActiveTab] = useState(initialTab || (isDetailsRoute ? 'details' : 'new'));

  useEffect(() => {
    if (location.pathname === '/purchase/details') {
      setActiveTab('details');
    } else if (location.pathname === '/purchase/new' || location.pathname === '/purchase/entry') {
      setActiveTab('new');
    }
  }, [location.pathname]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseEntries, setPurchaseEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingNo, setGeneratingNo] = useState(false);

  // Search & Pagination for Purchase History Table
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Single Product Purchase Form State
  const initialFormState = {
    purchase_no: '',
    supplier_id: '',
    product_id: '',
    qty: 0,
    weight: 0,
    touch: 0,
    fine_weight: 0,
    rate: 0,
    total_amount: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch initial data (Suppliers, Products, Purchase Entries)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [supRes, prodRes, entryRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
        api.get('/purchase-entries')
      ]);

      const activeSuppliers = (supRes.data?.data || []).filter(s => s.status === 'active');
      const activeProducts = (prodRes.data || []).filter(p => p.status === 'active');

      setSuppliers(activeSuppliers);
      setProducts(activeProducts);
      setPurchaseEntries(entryRes.data || []);

      // Auto-fetch fresh Purchase Ref Number
      fetchPurchaseNo();

    } catch (err) {
      console.error('Error fetching purchase entry data:', err);
      showToast('Failed to load form data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseNo = async () => {
    try {
      setGeneratingNo(true);
      const res = await api.get('/purchase-entries/generate-no');
      if (res.data && res.data.purchase_no) {
        setFormData(prev => ({ ...prev, purchase_no: res.data.purchase_no }));
      }
    } catch (err) {
      console.error('Error generating purchase no:', err);
    } finally {
      setGeneratingNo(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selected product details for live display card
  const selectedProduct = products.find(p => String(p.id) === String(formData.product_id));
  const selectedSupplier = suppliers.find(s => String(s.id) === String(formData.supplier_id));

  const selectedCategoryCode = selectedProduct?.category?.code?.toUpperCase() || '';
  const selectedCategoryName = selectedProduct?.category?.name?.toLowerCase() || '';
  const isDiamondProduct = selectedCategoryCode === 'DIAMOND' || selectedCategoryName.includes('diamond');

  // Compute fine weight and total amount dynamically
  const weightVal = parseFloat(formData.weight) || 0;
  const touchVal = isDiamondProduct ? 100 : (parseFloat(formData.touch) || 0);
  const computedFineWt = isDiamondProduct
    ? (weightVal * 0.2).toFixed(3)
    : (weightVal * (touchVal / 100)).toFixed(3);
  const computedFineWtKg = (computedFineWt / 1000).toFixed(3);

  const rateVal = parseFloat(formData.rate) || 0;
  const qtyVal = parseInt(formData.qty) || 0;
  const computedTotal = weightVal > 0 && rateVal > 0
    ? (weightVal * rateVal).toFixed(2)
    : (qtyVal > 0 && rateVal > 0 ? (qtyVal * rateVal).toFixed(2) : '0.00');

  // Preset options for Touch (%)
  const TOUCH_OPTIONS = [
    { label: '100% (24K Pure)', value: 100 },
    { label: '99.9% (999 Fine Gold)', value: 99.9 },
    { label: '99.5% (995 Fine Gold)', value: 99.5 },
    { label: '92.0% (92 Touch)', value: 92 },
    { label: '91.6% (22K / 916 Hallmark)', value: 91.6 },
    { label: '90.0% (90 Touch)', value: 90 },
    { label: '85.0% (85 Touch)', value: 85 },
    { label: '83.3% (20K / 833)', value: 83.3 },
    { label: '80.0% (80 Touch)', value: 80 },
    { label: '75.0% (18K / 750)', value: 75 },
    { label: '70.0% (70 Touch)', value: 70 },
    { label: '58.5% (14K / 585)', value: 58.5 },
    { label: '50.0% (50 Touch)', value: 50 },
    { label: '37.5% (9K / 375)', value: 37.5 },
  ];

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    const prod = products.find(p => String(p.id) === String(prodId));
    const catCode = prod?.category?.code?.toUpperCase() || '';
    const catName = prod?.category?.name?.toLowerCase() || '';
    const isDiamond = catCode === 'DIAMOND' || catName.includes('diamond');

    setFormData(prev => ({
      ...prev,
      product_id: prodId,
      qty: prev.qty && parseInt(prev.qty) > 0 ? prev.qty : 1,
      touch: isDiamond ? 100 : (prod && prod.opening_touch !== undefined && prod.opening_touch !== null ? prod.opening_touch : (prev.touch || 100))
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      showToast('Please select a Supplier Name', 'error', 'Validation Error');
      return;
    }
    if (!formData.product_id) {
      showToast('Please select a Product', 'error', 'Validation Error');
      return;
    }
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      showToast('Gross Net Weight (g) is required and must be greater than 0', 'error', 'Validation Error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        fine_weight: computedFineWt,
        total_amount: formData.total_amount || computedTotal
      };

      const res = await api.post('/purchase-entries', payload);
      showToast(res.data?.message || 'Purchase entry recorded & stock updated successfully!', 'success');

      // Reset form (keep supplier, refresh purchase no)
      setFormData({
        ...initialFormState,
        supplier_id: formData.supplier_id,
        purchase_date: new Date().toISOString().split('T')[0]
      });

      // Reload purchase entries & updated products
      fetchData();

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save purchase entry';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId, purchaseNo) => {
    if (!window.confirm(`Are you sure you want to delete purchase entry "${purchaseNo}"? Product stock will be adjusted.`)) {
      return;
    }

    try {
      const res = await api.delete(`/purchase-entries/${entryId}`);
      showToast(res.data?.message || 'Purchase entry deleted successfully', 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete purchase entry', 'error');
    }
  };

  // Filter Purchase History
  const filteredEntries = purchaseEntries.filter(entry => {
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    const noMatch = (entry.purchase_no || '').toLowerCase().includes(term);
    const supMatch = (entry.supplier?.name || '').toLowerCase().includes(term);
    const prodMatch = (entry.product?.name || '').toLowerCase().includes(term);
    const skuMatch = (entry.product?.product_code || '').toLowerCase().includes(term);
    return noMatch || supMatch || prodMatch || skuMatch;
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-gray-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mb-3"></i>
        <p className="text-sm font-semibold">Loading Purchase Entry system...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-16 font-sans">

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            PURCHASE <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-600">PURCHASE ENTRY</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif flex items-center gap-2">
            <i className="fa-solid fa-cart-flatbed text-[#b01622]"></i>
            Purchase Entry
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Purchase Stock Entry. Select supplier & product to record purchase stock which automatically updates <strong className="text-gray-800">Stock Management</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/stock-management"
            className="px-4 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-layer-group text-xs"></i>
            View Stock Management
          </Link>

          <button
            onClick={fetchData}
            className="p-2.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* SINGLE PRODUCT PURCHASE ENTRY FORM CARD */}
      {(activeTab === 'new' || activeTab === 'all') && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 space-y-6">

        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-sm">
              <i className="fa-solid fa-file-invoice"></i>
            </div>
            <span>New Purchase Stock Entry</span>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-semibold">
            <i className="fa-solid fa-bolt text-amber-600 mr-1.5"></i> Direct Stock Integration
          </span>
        </div>

        {/* SECTION 1: Supplier & Product Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Supplier Name Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-800">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <Link
                to="/stock-management/suppliers"
                className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-[10px]"></i> Add Supplier
              </Link>
            </div>

            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} {sup.supplier_code ? `(${sup.supplier_code})` : ''} {sup.company_name ? `- ${sup.company_name}` : ''}
                </option>
              ))}
            </select>

            {selectedSupplier && (
              <div className="mt-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-center justify-between text-gray-600">
                <span>Category: <strong className="text-gray-800 uppercase">{selectedSupplier.supplier_type}</strong></span>
                <span>GSTIN: <strong className="font-mono text-gray-800">{selectedSupplier.gstin || 'N/A'}</strong></span>
                <span>Location: <strong className="text-gray-800">{selectedSupplier.city || 'N/A'}</strong></span>
              </div>
            )}
          </div>

          {/* Product Select (Single Product Entry) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-800">
                Select Product <span className="text-red-500">*</span>
              </label>
              <Link
                to="/inventory/add-new/category"
                className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-[10px]"></i> Create New Product
              </Link>
            </div>

            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleProductChange}
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
            >
              <option value="">-- Select Product --</option>
              {products.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} [{prod.product_code || `SKU-${prod.id}`}] - {prod.category?.name || 'General'}
                </option>
              ))}
            </select>

            {selectedProduct && (
              <div className="mt-2 text-xs bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between text-emerald-900">
                <span>SKU: <strong className="font-mono">{selectedProduct.product_code}</strong></span>
                <span>Category: <strong>{selectedProduct.category?.name}</strong></span>
                <span>
                  Current Stock: <strong className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">
                    {isDiamondProduct ? (
                      <>{selectedProduct.opening_stock_weight || 0} ct (~{((selectedProduct.opening_stock_weight || 0) * 0.2).toFixed(3)} g)</>
                    ) : (
                      <>{selectedProduct.opening_stock_weight || 0} g ({((selectedProduct.opening_stock_weight || 0) / 1000).toFixed(3)} KG)</>
                    )}
                  </strong>
                </span>
              </div>
            )}
          </div>

        </div>

        {/* SECTION 2: Opening Stock Entry Fields for Purchase */}
        <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-200 gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <i className="fa-solid fa-boxes-packing text-[#b01622]"></i>
              Purchase Stock Details (Opening Stock Fields)
            </span>
            {isDiamondProduct ? (
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/60 flex items-center gap-1.5 self-start sm:self-auto">
                <i className="fa-regular fa-gem text-blue-600"></i> Diamond Purchase Mode (Carat, Pcs & Cents)
              </span>
            ) : (
              <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1.5 self-start sm:self-auto">
                <i className="fa-solid fa-coins text-amber-600"></i> Metal / Gold Purchase Mode (Weight & Touch)
              </span>
            )}
          </div>

          {isDiamondProduct ? (
            /* DIAMOND PURCHASE FIELDS */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* 1. Piece Count / Qty */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Piece Count (Pcs) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="qty"
                  value={formData.qty}
                  onChange={handleInputChange}
                  placeholder="e.g. 10"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
                <p className="text-[10px] text-gray-400 mt-1">Total diamond pieces</p>
              </div>

              {/* 2. Total Carat Weight (ct) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Total Carat Weight (ct) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. 2.500"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
                <p className="text-[10px] text-blue-600 font-mono mt-1">
                  ~{(weightVal * 0.2).toFixed(3)} g (1ct = 0.2g)
                </p>
              </div>

              {/* 3. Average Cent / Pointer (ct/pc) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Average Cent / Pointer
                </label>
                <div className="w-full px-3 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col justify-center h-[42px]">
                  {qtyVal > 0 && weightVal > 0 ? (
                    <>
                      <span className="text-xs font-bold text-blue-900">
                        {(weightVal / qtyVal).toFixed(3)} ct/pc
                      </span>
                      <span className="text-[10px] text-blue-700 font-semibold">
                        ({((weightVal / qtyVal) * 100).toFixed(1)} Cts / Pointers)
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">0.00 ct/pc (0 Cts)</span>
                  )}
                </div>
              </div>

              {/* 4. Purchase Rate (₹/ct) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Purchase Rate (₹/ct)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="rate"
                  value={formData.rate}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
                <p className="text-[10px] text-gray-400 mt-1">Rate per carat</p>
              </div>

              {/* 5. Total Purchase Amount (₹) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Total Purchase Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="total_amount"
                  value={formData.total_amount || computedTotal}
                  onChange={handleInputChange}
                  placeholder={computedTotal}
                  className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
                <p className="text-[10px] text-amber-700 font-mono mt-1">Total Valuation</p>
              </div>
            </div>
          ) : (
            /* GOLD / METAL PURCHASE FIELDS */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

              {/* Gross Net Weight (grams) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Gross Net Wt (g) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                  placeholder="0.000"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* Touch (%) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Touch (%)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  name="touch"
                  value={formData.touch}
                  onChange={handleInputChange}
                  placeholder="100.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* Fine Gold Weight (g / KG) - Computed */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Fine Gold Wt (g / KG)
                </label>
                <div className="w-full px-3 py-2.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs font-bold text-cyan-900 flex flex-col justify-center h-[42px]">
                  <span>{computedFineWt} g</span>
                  <span className="text-[10px] text-cyan-700 font-mono">({computedFineWtKg} KG)</span>
                </div>
              </div>

              {/* Purchase Rate (₹/unit or ₹/g) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Purchase Rate (₹/unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="rate"
                  value={formData.rate}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* Total Amount (₹) - Computed / Custom */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Total Purchase Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="total_amount"
                  value={formData.total_amount || computedTotal}
                  onChange={handleInputChange}
                  placeholder={computedTotal}
                  className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

            </div>
          )}
        </div>

        {/* SECTION 3: Entry Reference, Date & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Purchase Ref No */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Purchase Ref / Entry No <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={fetchPurchaseNo}
                disabled={generatingNo}
                className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <i className={`fa-solid fa-arrows-rotate ${generatingNo ? 'fa-spin' : ''}`}></i> Refesh
              </button>
            </div>
            <input
              type="text"
              name="purchase_no"
              value={formData.purchase_no}
              onChange={handleInputChange}
              required
              placeholder="PUR-1001"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="purchase_date"
              value={formData.purchase_date}
              onChange={handleInputChange}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            />
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Remarks / Notes
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="e.g. Lot #402, 22K Raw Casting Gold Bar"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
            />
          </div>

        </div>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <i className="fa-solid fa-circle-info text-amber-600 mr-1"></i>
            Saving will add{' '}
            <strong className="text-gray-800">
              {isDiamondProduct
                ? `${formData.weight || 0} ct (${formData.qty || 1} Pcs)`
                : `${formData.weight || 0} g (${computedFineWt} g fine wt)`
              }
            </strong>{' '}
            to Stock Management.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <>
                <i className="fa-solid fa-check text-xs"></i>
                Save Purchase Entry & Add to Stock
              </>
            )}
          </button>
        </div>

      </form>
      )}

      {/* RECENT PURCHASE ENTRIES HISTORY TABLE CARD */}
      {(activeTab === 'details' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">

          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-list-check text-[#b01622]"></i>
              <h2 className="text-base font-bold text-gray-900">Purchase Entry Details & History Log</h2>
              <span className="bg-red-100 text-[#b01622] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {purchaseEntries.length} Total Entries
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Button to switch to New Entry Form */}
              <button
                type="button"
                onClick={() => { setActiveTab('new'); navigate('/purchase/new'); }}
                className="px-3.5 py-1.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[10px]"></i> New Purchase Entry
              </button>

              {/* Search Box */}
              <div className="relative w-48 sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search ref no, supplier, product..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="py-3 px-4">Ref No & Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4 text-center">Gross Weight & Touch</th>
                  <th className="py-3 px-4 text-center">Fine Weight (g & KG)</th>
                  <th className="py-3 px-4 text-right">Rate & Total</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2"></i>
                      <p className="font-semibold text-gray-700">No purchase entries recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Use the form to record your first purchase entry.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((item) => {
                    const fineWtGrams = parseFloat(item.fine_weight || 0);
                    const fineWtKg = (fineWtGrams / 1000).toFixed(3);
                    const itemCatCode = item.product?.category?.code?.toUpperCase() || '';
                    const itemCatName = item.product?.category?.name?.toLowerCase() || '';
                    const isItemDiamond = itemCatCode === 'DIAMOND' || itemCatName.includes('diamond');

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">

                        {/* Ref No & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-[#b01622]">{item.purchase_no}</div>
                          <div className="text-[11px] text-gray-500 font-sans">{item.purchase_date}</div>
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.supplier?.name || 'N/A'}</div>
                          <div className="text-[11px] text-gray-500">{item.supplier?.company_name || item.supplier?.supplier_code}</div>
                        </td>

                        {/* Product */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.product?.name || 'N/A'}</div>
                          <span className="inline-block font-mono text-[10px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                            {item.product?.product_code || 'N/A'}
                          </span>
                        </td>

                        {/* Weight & Touch */}
                        <td className="py-3.5 px-4 text-center">
                          {isItemDiamond ? (
                            <>
                              <div className="font-bold text-blue-700">{item.weight} ct ({item.qty || 1} Pcs)</div>
                              <div className="text-[11px] text-blue-600 font-semibold">Diamond</div>
                            </>
                          ) : (
                            <>
                              <div className="font-bold text-amber-700">{item.weight} g</div>
                              <div className="text-[11px] text-emerald-700">Touch: {item.touch}%</div>
                            </>
                          )}
                        </td>

                        {/* Fine Wt */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          {isItemDiamond ? (
                            <>
                              <div className="font-bold text-blue-900">{(parseFloat(item.weight || 0) * 0.2).toFixed(3)} g</div>
                              <div className="text-[10px] text-blue-700 font-sans">(Equiv. Grams)</div>
                            </>
                          ) : (
                            <>
                              <div className="font-bold text-cyan-900">{fineWtGrams.toFixed(2)} g</div>
                              <div className="text-[10px] text-cyan-700">({fineWtKg} KG)</div>
                            </>
                          )}
                        </td>

                        {/* Rate & Total */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-gray-900">₹{Number(item.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          {item.rate > 0 && (
                            <div className="text-[11px] text-gray-500">Rate: ₹{item.rate} {isItemDiamond ? '/ct' : '/g'}</div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteEntry(item.id, item.purchase_no)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete entry & adjust stock"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredEntries.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
                totalItems={filteredEntries.length}
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
