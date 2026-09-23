import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { STAMP_OPTIONS, STONE_SIZE_OPTIONS, STONE_COLOR_OPTIONS } from '../../constants/productOptions';

export default function InventoryViewProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [settingStyles, setSettingStyles] = useState([]);
  const [showStylesModal, setShowStylesModal] = useState(false);

  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [karigar, setKarigar] = useState(null);
  const [huid, setHuid] = useState('');
  const [movements, setMovements] = useState([]);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    product_code: '',
    purity: '22K Hallmark Gold',
    gross_wt: '',
    net_wt: '',
    stock_qty: '1',
    rate: '6850',
    setting_style: '',
    wastage_percent: '3.50',
    making_charge: '650',
    dia_wt_ct: '',
    stamp: '+0',
    huid: '',
    size: '',
    stone_size: '',
    stone_color: '',
    open_close_type: 'Close',
    description: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Stock Movement Modal State
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockForm, setAddStockForm] = useState({
    action_type: 'Stock Inward (Added)',
    change_qty: 1,
    staff: 'Arvind (Admin)',
    remarks: '',
  });
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const handleAddStockMovement = async (e) => {
    e.preventDefault();
    try {
      setSubmittingMovement(true);
      const res = await api.post(`/inventory/products/${id}/movements`, addStockForm);
      showToast(res.data.message || 'Stock movement logged successfully!', 'success');
      setShowAddStockModal(false);
      setAddStockForm({
        action_type: 'Stock Inward (Added)',
        change_qty: 1,
        staff: 'Arvind (Admin)',
        remarks: '',
      });
      fetchProductDetails();
    } catch (err) {
      console.error('Failed to log stock movement:', err);
      showToast(err.response?.data?.message || 'Failed to log stock movement', 'error');
    } finally {
      setSubmittingMovement(false);
    }
  };

  const fetchSettingStyles = async () => {
    try {
      const res = await api.get('/styles');
      setSettingStyles(res.data || []);
    } catch (err) {
      console.error('Failed to fetch setting styles:', err);
    }
  };

  useEffect(() => {
    fetchSettingStyles();
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/products/${id}`);
      const p = res.data.product;
      const attrs = res.data.attributes || {};
      setProduct(p);
      setAttributes(attrs);
      setKarigar(res.data.karigar || null);
      const effectiveHuid = res.data.huid || attrs.huid || ('H-' + String(p.id).padStart(6, '0'));
      setHuid(effectiveHuid);
      setMovements(res.data.movements || []);

      const rawImgs = res.data.images || [];
      const cleanImgs = rawImgs.filter(
        (img) => img && typeof img === 'string' && img !== '/placeholder-jewelry.png' && !img.includes('/storage/data:image') && img.trim() !== '1' && img.length > 5
      );
      setImages(cleanImgs.length > 0 ? cleanImgs : [p.image || p.image_url || '/placeholder-jewelry.png']);

      // Preload edit form
      setEditForm({
        name: p.name || '',
        product_code: p.product_code || '',
        purity: attrs.purity || attrs.gold_type || '22K Hallmark Gold',
        gross_wt: attrs.gross_wt || p.opening_stock_weight || '',
        net_wt: attrs.net_wt || p.opening_fine_weight || '',
        stock_qty: p.current_stock_qty ?? p.opening_stock_qty ?? 1,
        rate: attrs.sale_rate || attrs.rate || p.opening_stock_rate || '6850',
        setting_style: attrs.setting_style || attrs.quality || 'Antique Temple Heritage',
        wastage_percent: attrs.wastage_percent || attrs.wastage || '3.50',
        making_charge: attrs.making_charge || '650',
        dia_wt_ct: attrs.dia_wt_ct || attrs.diamond_wt || '',
        stamp: attrs.stamp || attrs.hallmark || '+0',
        huid: effectiveHuid,
        size: attrs.size || attrs.ring_size || attrs.bangle_size || '',
        stone_size: attrs.stone_size || '',
        stone_color: attrs.stone_color || '',
        open_close_type: attrs.open_close_type || attrs.open_close_details || 'Close',
        description: p.description || '',
      });
    } catch (err) {
      console.error('Failed to load product details:', err);
      showToast('Failed to load product specifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const updatedAttrs = {
        ...attributes,
        gross_wt: editForm.gross_wt,
        net_wt: editForm.net_wt,
        purity: editForm.purity,
        gold_type: editForm.purity,
        rate: editForm.rate,
        sale_rate: editForm.rate,
        setting_style: editForm.setting_style,
        wastage_percent: editForm.wastage_percent,
        making_charge: editForm.making_charge,
        dia_wt_ct: editForm.dia_wt_ct,
        stamp: editForm.stamp,
        huid: editForm.huid,
        size: editForm.size,
        stone_size: editForm.stone_size,
        stone_color: editForm.stone_color,
        open_close_type: editForm.open_close_type,
      };

      await api.put(`/inventory/products/${id}`, {
        name: editForm.name,
        product_code: editForm.product_code,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        stock_qty: editForm.stock_qty,
        description: editForm.description,
        attributes: updatedAttrs,
      });

      showToast('Product specifications updated successfully!', 'success');
      setShowEditModal(false);
      fetchProductDetails();
    } catch (err) {
      console.error('Failed to update product', err);
      showToast(err.response?.data?.message || 'Failed to update product', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const downloadMovementsReport = () => {
    if (!movements || movements.length === 0) return;
    const headers = ['Date & Time', 'Action Type', 'Change', 'Balance', 'Staff / Artisan', 'Remarks'];
    const rows = movements.map((m) => [
      `"${m.date_time || ''}"`,
      `"${m.action_type || ''}"`,
      `"${m.change || ''}"`,
      `"${m.balance || ''}"`,
      `"${m.staff || ''}"`,
      `"${(m.remarks || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Movements_${product?.product_code || 'SKU'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !product) {
    return (
      <div className="flex items-center justify-center h-80 text-stone-400">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
        <span className="text-sm font-semibold">Loading product specifications...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
        <p className="text-stone-500 font-semibold mb-4">Product record not found.</p>
        <Link
          to="/inventory"
          className="px-5 py-2.5 bg-[#b01622] text-white rounded-xl text-xs font-bold"
        >
          Back to Inventory
        </Link>
      </div>
    );
  }

  const currentImage = images[selectedImageIndex] || product.image_url || product.image || '/placeholder-jewelry.png';
  const grossWt = attributes.gross_wt || product.opening_stock_weight || '28.50';
  const netWt = attributes.net_wt || product.opening_fine_weight || grossWt;
  const purity = attributes.purity || attributes.gold_type || '22K Hallmark Gold';
  const quality = attributes.quality || attributes.setting_style || 'Antique Temple Heritage';
  const categoryName = product.category?.name || 'Jewels';
  const subcategoryName = product.subcategory?.name || 'Traditional Collection';
  const stockQtyNum = Number(product.current_stock_qty ?? product.opening_stock_qty ?? 1);
  const quantity = String(stockQtyNum).padStart(2, '0');

  // Fine weight calculation & Touch %
  const touchPercent = product.opening_touch
    ? parseFloat(product.opening_touch).toFixed(2)
    : (purity.includes('24K') ? '99.90' : purity.includes('22K') || purity.includes('91.6') ? '91.60' : purity.includes('18K') || purity.includes('750') ? '75.00' : '91.60');
  const netWtNum = parseFloat(netWt) || parseFloat(grossWt) || 28.5;
  const fineWtNum = (netWtNum * (parseFloat(touchPercent) / 100)).toFixed(3);

  // Financials & Wastage & Making Charges
  const rate = parseFloat(attributes.sale_rate || attributes.rate || product.opening_stock_rate || 6850);
  const wastagePercent = attributes.wastage_percent || attributes.wastage || '3.50';
  const makingCharge = attributes.making_charge ? (attributes.making_charge_type === 'flat' ? `₹${attributes.making_charge} (Flat)` : `₹${attributes.making_charge}/g`) : '₹650/g';
  const diaWtNum = parseFloat(attributes.dia_wt_ct || attributes.diamond_wt || 0);
  
  const valuation = attributes.sale_value
    ? parseFloat(attributes.sale_value)
    : (netWtNum * rate) + (diaWtNum * 65000);
  const formattedValuation = valuation > 0
    ? valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Dimensional & structural
  const prodSize = attributes.size || attributes.ring_size || attributes.bangle_size || '-';
  const openCloseMechanism = attributes.open_close_type || attributes.open_close_details || '-';
  const stampNo = attributes.stamp || attributes.hallmark || '-';

  // Karigar Artisan Details
  const karigarName = karigar?.name || '-';
  const karigarInitials = karigarName !== '-' ? karigarName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '-';
  const karigarSpec = karigar?.specialization || '-';
  const karigarWorkshop = karigar?.workshop_name || '-';
  const karigarCode = karigar?.karigar_code || '-';

  // Stock status pill
  const isHealthy = stockQtyNum > 2;
  const isLow = stockQtyNum > 0 && stockQtyNum <= 2;
  const statusLabel = isHealthy ? 'Healthy Stock' : (isLow ? 'Low Stock' : 'Out of Stock');
  const statusBadgeClass = isHealthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    : (isLow ? 'bg-amber-50 text-amber-700 border-amber-200/80' : 'bg-rose-50 text-rose-700 border-rose-200/80');
  const statusDotClass = isHealthy ? 'bg-emerald-500' : (isLow ? 'bg-amber-500' : 'bg-rose-500');

  // Dynamic inspector key-value filter
  const systemKeys = [
    'images', 'child_images', 'thumb_image', 'variants', 'source', 'is_inventory',
    'gross_wt', 'net_wt', 'purity', 'gold_type', 'setting_style', 'quality',
    'rate', 'sale_rate', 'sale_value', 'wastage_percent', 'wastage', 'making_charge',
    'making_charge_type', 'stamp', 'hallmark', 'huid', 'dia_wt_ct', 'diamond_wt',
    'stone_size', 'stone_color', 'size', 'ring_size', 'bangle_size', 'open_close_type', 'open_close_details'
  ];
  const customAttributes = Object.entries(attributes).filter(
    ([key, val]) => !systemKeys.includes(key) && val !== null && val !== undefined && String(val).trim() !== ''
  );

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-7xl mx-auto">

      {/* 1. Top Header & Navigation Bar */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-3">
        
        {/* Navigation Breadcrumb & SKU Badge */}
        <div className="flex items-center justify-between">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#b01622] transition-colors group"
          >
            <i className="fa-solid fa-arrow-left text-[11px] transition-transform group-hover:-translate-x-0.5"></i>
            <span>Back to Inventory Master</span>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 font-medium">SKU:</span>
            <span className="font-mono font-bold text-[#b01622] bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200/80 text-[11px]">
              {product.product_code || 'RJ-BGL-1002'}
            </span>
          </div>
        </div>

        {/* Title, Health Status & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {product.name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 shrink-0 ${statusBadgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></span>
              <span>{statusLabel}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Edit Product Specifications */}
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 hover:text-stone-900 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-regular fa-pen-to-square text-xs text-[#b01622]"></i>
              <span>Edit Specifications</span>
            </button>

            {/* Print Tag — opens the A4 Jewellery Tag */}
            <Link
              to={`/inventory/products/${id}/jewellery-tag`}
              className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-print text-xs"></i>
              <span>Jewellery Tag</span>
            </Link>

            {/* Print Barcode */}
            <Link
              to={`/inventory/products/${id}/barcode-tag`}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-barcode text-xs text-[#b01622]"></i>
              <span>Barcode Tag</span>
            </Link>
          </div>
        </div>

      </div>

      {/* 2. Main 2-Column Specifications Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* --- Left Column: Product Showcase Frame (5 cols) --- */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden p-5 space-y-4">
            
            {/* Category Breadcrumb header */}
            <div className="text-center space-y-0.5">
              <h2 className="text-xs font-extrabold text-stone-800 tracking-wider uppercase font-mono">
                {product.name ? product.name.toUpperCase() : 'JEWELLERY SPECIFICATION MASTER'}
              </h2>
              <p className="text-[10px] text-stone-400 font-medium">
                Inventory / {categoryName} / {subcategoryName}
              </p>
            </div>

            {/* Hero Showcase Image */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-stone-50 flex items-center justify-center border border-stone-200/80 shadow-inner group">
              <img
                key={currentImage}
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-contain p-2 transition-all duration-300 group-hover:scale-105"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-jewelry.png';
                }}
              />
              <button
                type="button"
                onClick={() => setShowImageZoom(true)}
                className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs text-stone-700 flex items-center justify-center text-xs shadow-sm cursor-pointer hover:bg-white hover:text-[#b01622] transition-colors"
                title="Click to view high-resolution image"
              >
                <i className="fa-solid fa-magnifying-glass-plus text-[11px]"></i>
              </button>
            </div>

            {/* Product Title & Key Attributes Banner */}
            <div className="text-center space-y-1 pt-1">
              <h3 className="text-sm font-bold text-gray-900">
                {product.name}
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                {purity}, {quality}, Gross {grossWt}g
              </p>
              <div className="flex items-center justify-center gap-3 text-xs font-semibold text-stone-700 pt-1 flex-wrap">
                <span>ERP Book Valuation: <strong className="text-[#b01622]">₹{formattedValuation}</strong></span>
                <span>•</span>
                <span>Net Wt: <strong className="text-gray-900">{netWt}g</strong></span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAddStockModal(true)}
                className="w-full py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-boxes-packing text-xs"></i>
                <span>Log Stock Addition / Movement</span>
              </button>
            </div>

            {/* Multiple Thumbnails Strip */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5 pt-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-[#b01622] ring-2 ring-red-100 shadow-2xs scale-102'
                        : 'border-stone-200 opacity-75 hover:opacity-100 hover:border-stone-300'
                    }`}
                    title={`View angle ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Product Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-jewelry.png';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Quick Specifications Highlights Pill Grid (Rudra Red Light Theme) */}
          <div className="bg-red-50/50 rounded-2xl p-4 border border-red-200/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-red-200/60 pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#b01622]">
                ERP SPECIFICATION METRICS
              </span>
              <span className="text-[10px] font-mono font-bold text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                HUID: {huid}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block uppercase">FINE METAL WEIGHT</span>
                <span className="font-mono font-extrabold text-stone-900 text-sm block">{fineWtNum}g</span>
                <span className="text-[9.5px] text-stone-500 block font-mono">Touch: {touchPercent}%</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block uppercase">BASE METAL RATE</span>
                <span className="font-mono font-extrabold text-[#b01622] text-sm block">₹{Number(rate).toLocaleString('en-IN')}/g</span>
                <span className="text-[9.5px] text-stone-500 block font-mono">Wastage: {wastagePercent}%</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block uppercase">MAKING CHARGE</span>
                <span className="font-bold text-stone-800 text-xs block">{makingCharge}</span>
                <span className="text-[9.5px] text-stone-500 block truncate">Craft: {quality.split(' ')[0]}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block uppercase">STAMP & MECHANISM</span>
                <span className="font-mono font-bold text-[#b01622] text-xs block">{stampNo}</span>
                <span className="text-[9.5px] text-stone-500 block truncate">{openCloseMechanism}</span>
              </div>
            </div>
          </div>

        </div>

        {/* --- Right Column: All Comprehensive Product Specifications (7 cols) --- */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Technical & Metal Master Specifications */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
            
            <div className="bg-[#b01622] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-gem text-xs text-white/80"></i>
                <h2 className="text-sm font-bold tracking-wide">
                  Technical Specifications & Metal Master
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/20 text-white font-mono">
                {product.product_code || 'RJ-SKU'}
              </span>
            </div>

            {/* 2-Column Key-Value Specs Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs border-b border-stone-100">
              
              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PRODUCT SKU & CODE
                </span>
                <span className="font-extrabold text-gray-900 text-sm font-mono block">
                  {product.product_code || 'RJ-SKU'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CATEGORY & COLLECTION
                </span>
                <span className="font-bold text-gray-900 text-sm block">
                  {categoryName} / {subcategoryName}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PURITY & HALLMARK STANDARD
                </span>
                <span className="font-bold text-stone-900 text-sm block">
                  {purity}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CRAFT / QUALITY / SETTING STYLE
                </span>
                <span className="font-semibold text-stone-800 text-sm block">
                  {quality}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  GROSS & NET WEIGHT
                </span>
                <span className="font-bold text-gray-900 text-sm font-mono block">
                  Gross: {grossWt}g <span className="text-stone-400 font-normal">| Net: {netWt}g</span>
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CALCULATED FINE METAL WEIGHT
                </span>
                <span className="font-extrabold text-[#b01622] text-sm font-mono block">
                  {fineWtNum}g <span className="text-stone-400 font-normal text-xs">(Touch {touchPercent}%)</span>
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CURRENT VAULT & FLOOR STOCK
                </span>
                <span className="font-bold text-gray-900 text-sm font-mono block">
                  {quantity} Units Active
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  STAMP NO / HALLMARK MARKINGS
                </span>
                <span className="font-extrabold text-[#b01622] text-xs px-2.5 py-0.5 bg-red-50 rounded-md border border-red-100 inline-block font-mono">
                  {stampNo}
                </span>
              </div>

              <div className="sm:col-span-2 pt-1 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider">
                  BIS HALLMARK UNIQUE IDENTIFICATION (HUID)
                </span>
                <span className="font-mono font-bold text-stone-800 text-xs bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">
                  {huid}
                </span>
              </div>

            </div>

          </div>

          {/* Card 2: Gemstone, Diamond & Structural Specifications */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
            <div className="bg-[#b01622] text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-regular fa-gem text-xs text-white/80"></i>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Gemstone, Diamond & Structural Specifications
                </h3>
              </div>
              <span className="text-[10px] text-white/80 font-mono">
                {diaWtNum > 0 ? `${diaWtNum} ct Diamond` : 'Solitaire / Gem Specs'}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  DIAMOND CARAT WEIGHT
                </span>
                <span className="font-extrabold text-gray-900 text-sm font-mono block">
                  {diaWtNum > 0 ? `${diaWtNum} ct Total Weight` : 'N/A (Plain Gold/Silver)'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  DIAMOND CLARITY / COLOR / CUT
                </span>
                <span className="font-semibold text-stone-800 text-xs block">
                  {attributes.diamond_clarity || attributes.diamond_color ? `${attributes.diamond_clarity || 'VVS1'} - ${attributes.diamond_color || 'E Color'}` : (diaWtNum > 0 ? 'VVS1 - E Color (Colorless Diamond)' : 'Standard High Grade')}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  STONE SPECIFICATIONS / SIZE
                </span>
                <span className="font-semibold text-stone-800 text-xs block">
                  {attributes.stone_size || '0.26 - 0.50 ct (4.1 - 5.0 mm)'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  STONE COLOR / GEM GRADE
                </span>
                <span className="font-semibold text-stone-800 text-xs block">
                  {attributes.stone_color || 'D-E-F (Colorless Diamond)'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PRODUCT SIZE / DIMENSIONS
                </span>
                <span className="font-bold text-stone-900 text-xs font-mono block">
                  {prodSize}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  OPEN & CLOSE MECHANISM TYPE
                </span>
                <span className="font-semibold text-stone-800 text-xs block">
                  {openCloseMechanism}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Financial & Costing Breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
            <div className="bg-[#b01622] text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-calculator text-xs text-white/80"></i>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Financial, Costing & ERP Valuation
                </h3>
              </div>
              <span className="text-[10px] text-white/80 font-mono">
                Rate: ₹{Number(rate).toLocaleString('en-IN')}/g
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-b border-stone-100">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">BASE METAL RATE</span>
                <span className="font-mono font-extrabold text-stone-900 text-base block">₹{Number(rate).toLocaleString('en-IN')}/g</span>
                <span className="text-[10.5px] text-stone-500 block">Daily ERP Rate</span>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">WASTAGE PERCENTAGE</span>
                <span className="font-mono font-extrabold text-[#b01622] text-base block">{wastagePercent}%</span>
                <span className="text-[10.5px] text-stone-500 block">Standard Melting Loss</span>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">MAKING CHARGES</span>
                <span className="font-mono font-extrabold text-stone-900 text-base block">{makingCharge}</span>
                <span className="text-[10.5px] text-stone-500 block">Artisan Craft Fee</span>
              </div>
            </div>

            {/* Valuation Banner */}
            <div className="bg-[#fef9ee] px-6 py-4 border-t border-amber-100 flex items-center justify-between">
              <div>
                <span className="block text-[10.5px] font-extrabold text-amber-800 uppercase tracking-wider">
                  ESTIMATED ERP BOOK VALUATION
                </span>
                <span className="text-2xl font-black text-gray-900 tracking-tight block mt-0.5">
                  ₹{formattedValuation}
                </span>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/60 font-mono">
                Calculated Valuation
              </span>
            </div>
          </div>

          {/* Card 4: Dynamic Technical Attributes Inspector (All JSON attributes) */}
          {customAttributes.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
              <div className="bg-red-50 text-[#b01622] px-6 py-3 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-xs text-[#b01622]"></i>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Additional Dynamic Attributes Inspector ({customAttributes.length})
                  </h3>
                </div>
                <span className="text-[10px] text-stone-500 font-medium">Custom JSON Key-Values</span>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {customAttributes.map(([key, val]) => (
                  <div key={key} className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 flex items-center justify-between">
                    <span className="font-semibold text-stone-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-gray-900 font-mono">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 5: Product Description (If present) */}
          {product.description && (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-2">
              <span className="text-[10.5px] font-extrabold text-stone-400 uppercase tracking-wider block">
                PRODUCT DESCRIPTION & HANDCRAFTED NOTES
              </span>
              <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                {product.description}
              </p>
            </div>
          )}

          {/* Card 6: Product Model Variants Table (If variants exist) */}
          {(() => {
            const varsList = typeof attributes.variants === 'string'
              ? JSON.parse(attributes.variants || '[]')
              : (Array.isArray(attributes.variants) ? attributes.variants : []);
            if (!varsList || varsList.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
                <div className="bg-[#b01622] text-white px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-xs text-white/80"></i>
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      Product Model Variants ({varsList.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-white/80 font-medium">
                    Different sizes, metal colors & weight overrides
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[9.5px] tracking-wider">
                        <th className="py-2.5 px-4">Variant SKU</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Color / Finish</th>
                        <th className="py-2.5 px-3">Net Wt</th>
                        <th className="py-2.5 px-3">Stock Qty</th>
                        <th className="py-2.5 px-4 text-right">Price Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {varsList.map((v, idx) => (
                        <tr key={v.id || idx} className="hover:bg-stone-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-stone-700">{v.sku || `V-${idx+1}`}</td>
                          <td className="py-2.5 px-3 font-semibold text-stone-800">{v.size || '-'}</td>
                          <td className="py-2.5 px-3 font-semibold text-stone-800">{v.color || '-'}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-stone-700">{v.net_wt ? `${v.net_wt} g` : '-'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{v.stock_qty ?? 1}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-extrabold text-stone-900">
                            {v.price ? `₹${Number(v.price).toLocaleString('en-IN')}` : 'Standard Rate'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Cards 7 & 8 Side by Side: Ethical Highlights + Vendor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Ethical Highlights Card */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-3">
              <span className="text-[10.5px] font-extrabold text-stone-400 uppercase tracking-wider block">
                ETHICAL HIGHLIGHTS & COMPLIANCE
              </span>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5 text-stone-700 font-medium">
                  <div className="w-6 h-6 rounded-md bg-rose-50 text-[#b01622] flex items-center justify-center text-xs shrink-0 border border-rose-100">
                    <i className="fa-solid fa-award"></i>
                  </div>
                  <span>Certified by BIS India (100% Hallmarked)</span>
                </div>

                <div className="flex items-center gap-2.5 text-stone-700 font-medium">
                  <div className="w-6 h-6 rounded-md bg-stone-100 text-stone-600 flex items-center justify-center text-xs shrink-0 border border-stone-200">
                    <i className="fa-solid fa-barcode"></i>
                  </div>
                  <span className="font-mono text-[11.5px]">HUID NO: {huid}</span>
                </div>

                <div className="flex items-center gap-2.5 text-emerald-700 font-semibold">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 border border-emerald-100">
                    <i className="fa-solid fa-arrow-trend-up"></i>
                  </div>
                  <span>Verified Vault Stock ({quantity} Units Active)</span>
                </div>
              </div>
            </div>

            {/* Vendor Details Card */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10.5px] font-extrabold text-stone-400 uppercase tracking-wider block mb-2.5">
                  VENDOR / ARTISAN DETAILS
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] font-black text-xs flex items-center justify-center border border-red-200/80 shadow-2xs shrink-0 font-mono">
                    {karigarInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-xs truncate">{karigarName}</div>
                    <div className="text-[11px] text-stone-500 font-medium truncate">{karigarSpec}</div>
                    <div className="text-[10px] text-stone-400 truncate">{karigarWorkshop} • <span className="font-mono text-stone-600 font-bold">{karigarCode}</span></div>
                  </div>
                </div>
              </div>

              <Link
                to="/karigars"
                className="w-full py-2 bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center block"
              >
                View Karigar Master Profile
              </Link>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Full-Width Bottom Section: Recent Stock Movements & Product Stock Log */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        
        {/* Table Header with Title, Subtitle, Add Stock and Download Report buttons */}
        <div className="p-5 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/40">
          <div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-boxes-stacked text-[#8b121e]"></i>
              <h2 className="text-sm font-bold text-[#8b121e]">
                Recent Stock Movements & Inward Log
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Complete historical record of stock added, vault inward, QC audits, showcase floor transfers and sales for SKU: <span className="font-mono font-bold text-stone-600">{product.product_code || 'RJ-SKU'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAddStockModal(true)}
              className="px-3.5 py-1.5 bg-[#b01622] hover:bg-[#8b121e] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Add new stock inward entry for this product SKU"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>Log Stock Addition</span>
            </button>

            <button
              type="button"
              onClick={downloadMovementsReport}
              className="px-4 py-1.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-stone-50"
              title="Download CSV report of movements for this SKU"
            >
              <span>Download Report</span>
              <i className="fa-solid fa-arrow-down text-[10px]"></i>
            </button>
          </div>
        </div>

        {/* Summary Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-stone-100 border-b border-stone-200/60 bg-stone-50/20 text-xs">
          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">TOTAL INWARD STOCK ADDED</span>
            <div className="font-mono font-bold text-emerald-600 text-sm flex items-center gap-1.5">
              <i className="fa-solid fa-circle-arrow-down text-emerald-500 text-xs"></i>
              <span>+{quantity} Units</span>
            </div>
            <span className="text-[10.5px] text-stone-500 block truncate">Gross: {grossWt}g • Net: {netWt}g</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">CURRENT VAULT BALANCE</span>
            <div className="font-mono font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusDotClass}`}></span>
              <span>{quantity} Units</span>
            </div>
            <span className="text-[10.5px] text-stone-500 block truncate">{statusLabel}</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">PURITY & HALLMARK</span>
            <div className="font-bold text-stone-800 text-xs truncate">
              {purity}
            </div>
            <span className="text-[10.5px] text-stone-500 font-mono block truncate">HUID: {huid}</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">ORIGIN & ARTISAN</span>
            <div className="font-bold text-stone-800 text-xs truncate">
              {karigarName}
            </div>
            <span className="text-[10.5px] text-stone-500 block truncate">{karigarWorkshop}</span>
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-700 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap w-[150px]">DATE & TIME</th>
                <th className="py-3 px-4 whitespace-nowrap w-[170px]">ACTION TYPE</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[80px]">STOCK ADDED / CHANGE</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[80px]">BALANCE</th>
                <th className="py-3 px-4 whitespace-nowrap w-[180px]">STAFF / ARTISAN</th>
                <th className="py-3 px-4">PRODUCT SPECIFICATIONS & REMARKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movements && movements.length > 0 ? (
                movements.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-600 whitespace-nowrap text-xs">
                      {m.date_time}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap border shrink-0 ${m.badge_color || 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                        {m.action_type}
                      </span>
                    </td>
                    <td className={`py-3 px-3 text-center font-bold font-mono whitespace-nowrap text-xs ${m.change_color || 'text-stone-700'}`}>
                      {m.change}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-900 font-mono whitespace-nowrap text-xs">
                      {m.balance}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800 whitespace-nowrap text-xs">
                      {m.staff}
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-xs leading-relaxed">
                      {m.remarks}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-stone-400">
                    No stock movements recorded for this product yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with summary */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
          <span>Showing {movements?.length || 0} movement logs for this SKU</span>
        </div>

      </div>

      {/* --- Comprehensive Edit Product Specifications Drawer Modal --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setShowEditModal(false)}></div>
          
          <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 z-10 max-h-[90vh] overflow-y-auto my-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <i className="fa-regular fa-pen-to-square text-[#b01622]"></i>
                <h3 className="text-base font-bold text-gray-900">Edit Product Specifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4 text-xs">
              
              {/* Product Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Product SKU</label>
                  <input
                    type="text"
                    value={editForm.product_code}
                    onChange={(e) => setEditForm({ ...editForm, product_code: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
              </div>

              {/* Metal Purity, Quality & Stamp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Purity & Standard</label>
                  <input
                    type="text"
                    value={editForm.purity}
                    onChange={(e) => setEditForm({ ...editForm, purity: e.target.value })}
                    placeholder="e.g. 22K (91.6% Standard)"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-stone-600 uppercase">Quality / Setting</label>
                    <button
                      type="button"
                      onClick={() => setShowStylesModal(true)}
                      className="text-[10px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-[8px]"></i>
                      <span>Manage</span>
                    </button>
                  </div>
                  <select
                    value={editForm.setting_style}
                    onChange={(e) => setEditForm({ ...editForm, setting_style: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  >
                    {settingStyles.length > 0 ? (
                      settingStyles.map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Antique Temple Heritage">Antique Temple Heritage</option>
                        <option value="Prong Setting">Prong Setting</option>
                        <option value="Bezel Setting">Bezel Setting</option>
                        <option value="Channel Setting">Channel Setting</option>
                        <option value="Pave Setting">Pave Setting</option>
                        <option value="Micro Pave">Micro Pave</option>
                        <option value="Tension Setting">Tension Setting</option>
                        <option value="Antique Cast / Temple Work">Antique Cast / Temple Work</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Stamp / Hallmark</label>
                  <select
                    value={editForm.stamp}
                    onChange={(e) => setEditForm({ ...editForm, stamp: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  >
                    {STAMP_OPTIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weights & Stock Quantity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Gross Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editForm.gross_wt}
                    onChange={(e) => setEditForm({ ...editForm, gross_wt: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Net Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editForm.net_wt}
                    onChange={(e) => setEditForm({ ...editForm, net_wt: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={editForm.stock_qty}
                    onChange={(e) => setEditForm({ ...editForm, stock_qty: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
              </div>

              {/* Financials: Rate, Wastage & Making Charges */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Rate (₹/g)</label>
                  <input
                    type="number"
                    value={editForm.rate}
                    onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Wastage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.wastage_percent}
                    onChange={(e) => setEditForm({ ...editForm, wastage_percent: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Making Charge (₹/g)</label>
                  <input
                    type="number"
                    value={editForm.making_charge}
                    onChange={(e) => setEditForm({ ...editForm, making_charge: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Stone & Diamond Specs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Diamond Wt (ct)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.dia_wt_ct}
                    onChange={(e) => setEditForm({ ...editForm, dia_wt_ct: e.target.value })}
                    placeholder="e.g. 0.35"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Stone Size</label>
                  <select
                    value={editForm.stone_size}
                    onChange={(e) => setEditForm({ ...editForm, stone_size: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="">Select Stone Size...</option>
                    {STONE_SIZE_OPTIONS.map((ss) => (
                      <option key={ss} value={ss}>{ss}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Stone Color / Grade</label>
                  <select
                    value={editForm.stone_color}
                    onChange={(e) => setEditForm({ ...editForm, stone_color: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="">Select Stone Color...</option>
                    {STONE_COLOR_OPTIONS.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* HUID, Size & Open/Close Mechanism */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">BIS HUID Code</label>
                  <input
                    type="text"
                    value={editForm.huid}
                    onChange={(e) => setEditForm({ ...editForm, huid: e.target.value })}
                    placeholder="e.g. H-65D7801C"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono uppercase focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Product Size</label>
                  <input
                    type="text"
                    value={editForm.size}
                    onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                    placeholder="e.g. 16 / 2-4 / 18 inches"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Open/Close Mechanism</label>
                  <select
                    value={editForm.open_close_type}
                    onChange={(e) => setEditForm({ ...editForm, open_close_type: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Close">Close</option>
                    <option value="Screw Mechanism">Screw Mechanism</option>
                    <option value="S-Hook Clasp">S-Hook Clasp</option>
                    <option value="Press Lock">Press Lock</option>
                    <option value="Openable">Openable</option>
                  </select>
                </div>
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Product Description</label>
                <textarea
                  rows="3"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Enter detailed description or handcrafted notes..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit && <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>}
                  <span>Save Specifications</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- Log Stock Addition Modal --- */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setShowAddStockModal(false)}></div>
          
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 z-10">
            
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-boxes-packing text-[#b01622]"></i>
                <h3 className="text-base font-bold text-gray-900">Log Stock Addition / Movement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStockModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddStockMovement} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Action Type</label>
                <select
                  value={addStockForm.action_type}
                  onChange={(e) => setAddStockForm({ ...addStockForm, action_type: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  required
                >
                  <option value="Stock Inward (Added)">Stock Inward (Added)</option>
                  <option value="Artisan Inward">Artisan Inward</option>
                  <option value="Purchase Inward">Purchase Inward</option>
                  <option value="QC Stock Addition">QC Stock Addition</option>
                  <option value="Stock Adjustment">Stock Adjustment (+/-)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Quantity Change (+ / -)</label>
                  <input
                    type="number"
                    step="1"
                    value={addStockForm.change_qty}
                    onChange={(e) => setAddStockForm({ ...addStockForm, change_qty: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Staff / Artisan Name</label>
                  <input
                    type="text"
                    value={addStockForm.staff}
                    onChange={(e) => setAddStockForm({ ...addStockForm, staff: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Remarks & Inward Details</label>
                <textarea
                  rows="3"
                  value={addStockForm.remarks}
                  onChange={(e) => setAddStockForm({ ...addStockForm, remarks: e.target.value })}
                  placeholder="e.g. Consignment received into Master Vault from Artisan..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMovement}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#8b121e] text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingMovement ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus text-xs"></i>
                      <span>Confirm & Log Stock</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Resolution Image Zoom Modal */}
      {showImageZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setShowImageZoom(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowImageZoom(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer z-10"
              title="Close zoom preview"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
            <div className="w-full flex items-center justify-center overflow-hidden max-h-[78vh]">
              <img
                src={currentImage}
                alt={product.name}
                className="max-w-full max-h-[78vh] object-contain rounded-xl"
              />
            </div>
            <div className="mt-3 text-xs font-semibold text-stone-600 flex items-center gap-2">
              <span>{product.name}</span>
              <span>•</span>
              <span>Angle {selectedImageIndex + 1} of {images.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Dropdown CRUD Modal for Setting Styles */}
      <QuickDropdownCrudModal
        isOpen={showStylesModal}
        onClose={() => setShowStylesModal(false)}
        type="setting_style"
        onItemSelect={(newStyleName) => {
          setEditForm((prev) => ({ ...prev, setting_style: newStyleName }));
          fetchSettingStyles();
        }}
        onRefresh={fetchSettingStyles}
      />

    </div>
  );
}
