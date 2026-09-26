import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal } from '../../utils/numberInputUtils';

export default function PurchaseEntry({ initialTab }) {
  const { showToast, showConfirm } = useToast();
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
  const [categories, setCategories] = useState([]);
  const [purchaseEntries, setPurchaseEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingNo, setGeneratingNo] = useState(false);

  // Search & Pagination for Purchase History Table
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Finished Jewellery Purchase Mode: 'existing' | 'new_item'
  const [jewelMode, setJewelMode] = useState('new_item');

  // Image File & Preview State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Single Product / Raw Material Purchase Form State
  const initialFormState = {
    purchase_no: '',
    supplier_id: '',
    purchase_type: 'raw_material', // 'raw_material' | 'finished_product'
    product_id: '',
    category_id: '',
    item_name: '',
    product_code: '',
    metal_type: 'gold',
    purity: '22K (916)',
    qty: 1,
    weight: '', // Gross Wt
    less_weight: '', // Less Wt / Stone Wt / Wastage
    net_weight: '', // Net Wt
    touch: 91.6,
    fine_weight: '',
    making_charge: '',
    stone_weight: '',
    stone_cost: '',
    rate: '',
    total_amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
    image: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch initial data (Suppliers, Products, Categories, Purchase Entries)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [supRes, prodRes, catRes, entryRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/purchase-entries')
      ]);

      const rawSuppliers = Array.isArray(supRes.data?.data) ? supRes.data.data : (Array.isArray(supRes.data) ? supRes.data : []);
      const activeSuppliers = rawSuppliers.filter(s => !s.status || s.status === 'active');

      const rawProducts = Array.isArray(prodRes.data?.data) ? prodRes.data.data : (Array.isArray(prodRes.data) ? prodRes.data : []);
      const activeProducts = rawProducts.filter(p => !p.status || p.status === 'active');

      const rawCategories = Array.isArray(catRes.data?.data) ? catRes.data.data : (Array.isArray(catRes.data) ? catRes.data : []);
      const rawEntries = Array.isArray(entryRes.data?.data) ? entryRes.data.data : (Array.isArray(entryRes.data) ? entryRes.data : []);

      setSuppliers(activeSuppliers);
      setProducts(activeProducts);
      setCategories(rawCategories);
      setPurchaseEntries(rawEntries);

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
  const isDiamondProduct = formData.metal_type === 'diamond' || selectedCategoryCode === 'DIAMOND' || selectedCategoryName.includes('diamond');

  // Dynamic Weight Math
  const grossWtVal = parseFloat(formData.weight) || 0;
  const lessWtVal = parseFloat(formData.less_weight) || 0;
  const computedNetWt = Math.max(0, grossWtVal - lessWtVal).toFixed(3);
  const netWtVal = parseFloat(formData.net_weight) > 0 ? parseFloat(formData.net_weight) : parseFloat(computedNetWt);

  const touchVal = isDiamondProduct ? 100 : (parseFloat(formData.touch) || 0);
  const computedFineWt = isDiamondProduct
    ? (grossWtVal * 0.2).toFixed(3)
    : (netWtVal * (touchVal / 100)).toFixed(3);
  const computedFineWtKg = (computedFineWt / 1000).toFixed(3);

  const rateVal = parseFloat(formData.rate) || 0;
  const qtyVal = parseInt(formData.qty) || 1;
  const makingChargeVal = parseFloat(formData.making_charge) || 0;
  const stoneCostVal = parseFloat(formData.stone_cost) || 0;

  const baseCost = netWtVal > 0 && rateVal > 0
    ? (netWtVal * rateVal)
    : (qtyVal > 0 && rateVal > 0 ? (qtyVal * rateVal) : 0);

  const computedTotal = (baseCost + makingChargeVal + stoneCostVal).toFixed(2);

  // Preset options for Touch (%)
  const TOUCH_OPTIONS = [
    { label: '100% (24K Pure Gold)', value: 100 },
    { label: '99.9% (999 Fine Bullion)', value: 99.9 },
    { label: '99.5% (995 Fine Gold)', value: 99.5 },
    { label: '92.0% (92 Touch)', value: 92 },
    { label: '91.6% (22K / 916 Hallmark)', value: 91.6 },
    { label: '90.0% (90 Touch)', value: 90 },
    { label: '85.0% (85 Touch)', value: 85 },
    { label: '75.0% (18K / 750)', value: 75 },
    { label: '58.5% (14K / 585)', value: 58.5 },
  ];

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    const prod = products.find(p => String(p.id) === String(prodId));
    if (prod) {
      setFormData(prev => ({
        ...prev,
        product_id: prodId,
        category_id: prod.category_id || prev.category_id,
        item_name: prod.name,
        product_code: prod.product_code,
        weight: prod.opening_stock_weight || prev.weight,
        touch: prod.opening_touch || prev.touch || 91.6,
        rate: prod.opening_stock_rate || prev.rate,
        image: prod.image_url || prod.image || prev.image
      }));
      if (prod.image_url || prod.image) {
        setImagePreview(prod.image_url || prod.image);
      }
    } else {
      setFormData(prev => ({ ...prev, product_id: '' }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Image Upload Handlers
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setImageFile(null);
    setImagePreview(url);
    setFormData(prev => ({ ...prev, image: url }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      showToast('Please select a Supplier Name', 'error', 'Validation Error');
      return;
    }
    if (formData.purchase_type === 'finished_product') {
      if (jewelMode === 'existing' && !formData.product_id) {
        showToast('Please select an existing Product from catalog', 'error', 'Validation Error');
        return;
      }
      if (jewelMode === 'new_item' && !formData.item_name) {
        showToast('Please enter the Jewellery Item Name', 'error', 'Validation Error');
        return;
      }
    }
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      showToast('Gross Weight (g) is required and must be greater than 0', 'error', 'Validation Error');
      return;
    }

    setSaving(true);
    try {
      let payload;
      const isNewProduct = formData.purchase_type === 'finished_product' && jewelMode === 'new_item';

      if (imageFile) {
        payload = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null && formData[key] !== undefined) {
            payload.append(key, formData[key]);
          }
        });
        payload.append('is_new_product', isNewProduct ? '1' : '0');
        payload.append('image', imageFile);
        payload.append('net_weight', computedNetWt);
        payload.append('fine_weight', computedFineWt);
        payload.append('total_amount', formData.total_amount || computedTotal);
      } else {
        payload = {
          ...formData,
          is_new_product: isNewProduct,
          net_weight: computedNetWt,
          fine_weight: computedFineWt,
          total_amount: formData.total_amount || computedTotal
        };
      }

      const res = await api.post('/purchase-entries', payload);
      showToast(res.data?.message || 'Purchase entry recorded & stock updated successfully!', 'success');

      // Dispatch global events for live inventory sync across pages
      window.dispatchEvent(new CustomEvent('rudhra_inventory_updated'));
      window.dispatchEvent(new CustomEvent('rudhra_purchase_updated'));

      // Reset form (keep supplier, refresh purchase no)
      setImageFile(null);
      setImagePreview('');
      setFormData({
        ...initialFormState,
        supplier_id: formData.supplier_id,
        purchase_type: formData.purchase_type,
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
    const confirmed = await showConfirm({
      title: 'Delete Purchase Entry',
      message: `Are you sure you want to delete purchase entry "${purchaseNo}"? Product/Vault stock will be reversed automatically.`,
      icon: 'fa-solid fa-trash-can',
      confirmText: 'Delete Entry'
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/purchase-entries/${entryId}`);
      showToast(res.data?.message || 'Purchase entry deleted successfully', 'success');

      window.dispatchEvent(new CustomEvent('rudhra_inventory_updated'));
      window.dispatchEvent(new CustomEvent('rudhra_purchase_updated'));
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
    const prodMatch = (entry.product?.name || entry.item_name || '').toLowerCase().includes(term);
    const skuMatch = (entry.product?.product_code || entry.metal_type || '').toLowerCase().includes(term);
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
            Purchase Entry & Inventory Integration
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Record raw material vault purchases or finished jewellery catalogue purchases with image uploads. Stock updates <strong className="text-gray-800">directly to Inventory</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="px-4 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-layer-group text-xs"></i>
            View Stock Inventory
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

      {/* PURCHASE STOCK ENTRY FORM CARD */}
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
              <i className="fa-solid fa-bolt text-amber-600 mr-1.5"></i> Direct Stock Inventory Update
            </span>
          </div>

          {/* PURCHASE TYPE SELECTION (RAW MATERIAL VAULT vs FINISHED JEWELLERY CATALOG) */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-[#b01622]"></i>
              Select Purchase Inventory Type:
            </span>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, purchase_type: 'raw_material', product_id: '' }))}
                className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${formData.purchase_type === 'raw_material'
                  ? 'bg-[#b01622] text-white border-[#b01622] shadow-sm ring-2 ring-red-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                <i className="fa-solid fa-cubes"></i>
                Raw Material Purchase (Vault Inventory)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, purchase_type: 'finished_product' }))}
                className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${formData.purchase_type === 'finished_product'
                  ? 'bg-[#b01622] text-white border-[#b01622] shadow-sm ring-2 ring-red-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                <i className="fa-solid fa-gem"></i>
                Finished Jewellery Purchase (Product Catalog)
              </button>
            </div>
          </div>

          {/* SUPPLIER & ITEM DETAILS SECTION */}
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
                  <span>City: <strong className="text-gray-800">{selectedSupplier.city || 'N/A'}</strong></span>
                </div>
              )}
            </div>

            {/* DYNAMIC ITEM SPECIFICATION BASED ON PURCHASE TYPE */}
            {formData.purchase_type === 'raw_material' ? (
              /* RAW MATERIAL VAULT FIELDS */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Material Type / Metal <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="metal_type"
                      value={formData.metal_type}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#b01622]"
                    >
                      <option value="gold">Gold (24K / 22K Bullion/Scrap)</option>
                      <option value="silver">Silver (999 Fine / 925 Sterling)</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Raw Loose Diamonds / Cents</option>
                      <option value="gemstone">Loose Gemstones / Pearls</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Purity Grade
                    </label>
                    <select
                      name="purity"
                      value={formData.purity}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#b01622]"
                    >
                      <option value="24K (999)">24K (999 Pure Fine)</option>
                      <option value="22K (916)">22K (916 Casting/Scrap)</option>
                      <option value="18K (750)">18K (750)</option>
                      <option value="14K (585)">14K (585)</option>
                      <option value="999 Silver">999 Fine Silver</option>
                      <option value="925 Silver">925 Sterling Silver</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Raw Material Description / Lot Name
                  </label>
                  <input
                    type="text"
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleInputChange}
                    placeholder="e.g. 24K Fine Gold Cast Bullion Bar #Lot401"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>
            ) : (
              /* FINISHED JEWELLERY CATALOG FIELDS */
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-amber-50/70 p-2 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jewelMode"
                      checked={jewelMode === 'new_item'}
                      onChange={() => setJewelMode('new_item')}
                      className="text-[#b01622] focus:ring-[#b01622]"
                    />
                    <span>Create & Add New Jewellery Product</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jewelMode"
                      checked={jewelMode === 'existing'}
                      onChange={() => setJewelMode('existing')}
                      className="text-[#b01622] focus:ring-[#b01622]"
                    />
                    <span>Select Existing Catalog Product</span>
                  </label>
                </div>

                {jewelMode === 'existing' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Select Product from Catalog <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="product_id"
                      value={formData.product_id}
                      onChange={handleProductChange}
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} [{prod.product_code || `SKU-${prod.id}`}] - {prod.category?.name || 'General'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Jewellery Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleInputChange}
                        placeholder="e.g. Antique Temple Gold Necklace"
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ITEM / JEWELRY IMAGE UPLOAD CARD WITH LIVE PREVIEW */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-2">
                <i className="fa-solid fa-camera text-[#b01622]"></i>
                Purchase Item Photo / Image Field
                <span className="text-gray-400 font-normal">(Upload File or Paste Image URL)</span>
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => { setImagePreview(''); setImageFile(null); setFormData(prev => ({ ...prev, image: '' })); }}
                  className="text-[11px] text-red-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-trash-can"></i> Remove Photo
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
              {/* Live Image Thumbnail Card */}
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-300 shadow-xs bg-gray-100 flex-shrink-0 group">
                  <img src={imagePreview} alt="Item Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a href={imagePreview} target="_blank" rel="noreferrer" className="text-white text-[10px] font-bold bg-black/70 px-2 py-1 rounded">
                      <i className="fa-solid fa-expand mr-1"></i> View
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                  <i className="fa-solid fa-image text-2xl text-gray-300 mb-1"></i>
                  <span className="text-[10px] font-medium">No Image</span>
                </div>
              )}

              {/* Input Options: File Upload or Image URL */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-[#b01622] text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-2xs">
                    <i className="fa-solid fa-cloud-arrow-up"></i> Upload Item Image File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                  <span className="text-xs text-gray-400 font-bold uppercase">OR</span>
                </div>

                <input
                  type="text"
                  name="image_url"
                  value={typeof formData.image === 'string' ? formData.image : ''}
                  onChange={handleImageUrlChange}
                  placeholder="Paste Image URL (e.g. https://... or /storage/products/images/...)"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
            </div>
          </div>

          {/* PURCHASE WEIGHT, TOUCH, RATE & VALUATION FIELDS */}
          <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-200 gap-2">
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <i className="fa-solid fa-boxes-packing text-[#b01622]"></i>
                Purchase Stock Details (Weight, Touch, Rate & Costing)
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

              {/* 1. Qty Pcs */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Quantity (Pcs) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  onKeyDown={handleIntegerKeyDown}
                  name="qty"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: sanitizeInteger(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* 2. Gross Weight (g / ct) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Gross Weight ({isDiamondProduct ? 'ct' : 'g'}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="weight"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: sanitizeDecimal(e.target.value) })}
                  required
                  placeholder="0.000"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* 3. Less Wt / Stone Wt (g) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Less Wt / Stone Wt (g)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="less_weight"
                  value={formData.less_weight}
                  onChange={(e) => setFormData({ ...formData, less_weight: sanitizeDecimal(e.target.value) })}
                  placeholder="0.000"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* 4. Touch (%) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Touch (%) / Purity
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="touch"
                  value={formData.touch}
                  onChange={(e) => setFormData({ ...formData, touch: sanitizeDecimal(e.target.value) })}
                  placeholder="91.60"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              {/* 5. Fine Weight (g / KG) - Computed */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Fine Weight (g / KG)
                </label>
                <div className="w-full px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-xl text-xs font-bold text-cyan-900 flex flex-col justify-center h-[42px]">
                  <span>{computedFineWt} g</span>
                  <span className="text-[10px] text-cyan-700 font-mono">({computedFineWtKg} KG)</span>
                </div>
              </div>

              {/* 6. Purchase Rate (₹/g or ₹/ct) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Purchase Rate (₹/{isDiamondProduct ? 'ct' : 'g'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="rate"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: sanitizeDecimal(e.target.value) })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

            </div>

            {/* ADDITIONAL MAKING CHARGE & TOTAL PURCHASE AMOUNT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Making Charges / Labour (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="making_charge"
                  value={formData.making_charge}
                  onChange={(e) => setFormData({ ...formData, making_charge: sanitizeDecimal(e.target.value) })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Stone / Diamond Value (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="stone_cost"
                  value={formData.stone_cost}
                  onChange={(e) => setFormData({ ...formData, stone_cost: sanitizeDecimal(e.target.value) })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Total Purchase Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  onKeyDown={handleDecimalKeyDown}
                  name="total_amount"
                  value={formData.total_amount || computedTotal}
                  onChange={(e) => setFormData({ ...formData, total_amount: sanitizeDecimal(e.target.value) })}
                  placeholder={computedTotal}
                  className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>
            </div>
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
                  <i className={`fa-solid fa-arrows-rotate ${generatingNo ? 'fa-spin' : ''}`}></i> Refresh
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
                {formData.purchase_type === 'raw_material'
                  ? `${netWtVal} g raw ${formData.metal_type} (${computedFineWt} g fine wt)`
                  : `${netWtVal} g / ${formData.qty} Pcs finished jewellery`
                }
              </strong>{' '}
              directly to Inventory.
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

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
              {/* Link to Inventory */}
              <Link
                to="/inventory"
                className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <i className="fa-solid fa-layer-group text-[10px]"></i> View Stock Inventory
              </Link>

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
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b01622]"
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
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="py-3 px-4">Ref No & Date</th>
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Type & Item</th>
                  <th className="py-3 px-4 text-center">Weight & Touch</th>
                  <th className="py-3 px-4 text-center">Fine Wt (g)</th>
                  <th className="py-3 px-4 text-right">Rate & Total</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-gray-500">
                      <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2"></i>
                      <p className="font-semibold text-gray-700">No purchase entries recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Use the form above to record raw material or finished jewellery purchases.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((item) => {
                    const fineWtGrams = parseFloat(item.fine_weight || 0);
                    const fineWtKg = (fineWtGrams / 1000).toFixed(3);
                    const isRaw = item.purchase_type === 'raw_material';
                    const itemImg = item.image || item.product?.image_url || item.product?.image;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">

                        {/* Ref No & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-[#b01622]">{item.purchase_no}</div>
                          <div className="text-[11px] text-gray-500 font-sans">{item.purchase_date}</div>
                        </td>

                        {/* Photo Thumbnail */}
                        <td className="py-3.5 px-4">
                          {itemImg ? (
                            <img src={itemImg} alt="Item" className="w-10 h-10 object-cover rounded-lg border border-gray-200 shadow-2xs" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              <i className="fa-solid fa-gem"></i>
                            </div>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.supplier?.name || 'N/A'}</div>
                          <div className="text-[11px] text-gray-500">{item.supplier?.company_name || item.supplier?.supplier_code}</div>
                        </td>

                        {/* Type & Item */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${isRaw ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}>
                            {isRaw ? 'Vault Raw Material' : 'Finished Jewellery'}
                          </span>
                          <div className="font-bold text-gray-900">
                            {item.product?.name || item.item_name || (isRaw ? `${item.metal_type?.toUpperCase()} Vault Stock` : 'Jewellery Product')}
                          </div>
                        </td>

                        {/* Weight & Touch */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-amber-700">{item.weight} g</div>
                          <div className="text-[11px] text-emerald-700">Touch: {item.touch}%</div>
                        </td>

                        {/* Fine Wt */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <div className="font-bold text-cyan-900">{fineWtGrams.toFixed(2)} g</div>
                          <div className="text-[10px] text-cyan-700">({fineWtKg} KG)</div>
                        </td>

                        {/* Rate & Total */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-gray-900">₹{Number(item.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          {item.rate > 0 && (
                            <div className="text-[11px] text-gray-500">Rate: ₹{item.rate}/g</div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteEntry(item.id, item.purchase_no)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete entry & reverse stock"
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
