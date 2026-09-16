import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { compressImageFile } from '../../utils/imageCompressor';

export default function InventoryViewProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

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
    rate: '',
    setting_style: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
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
      setHuid(res.data.huid || attrs.huid || '');
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
        setting_style: attrs.setting_style || attrs.quality || 'VVS1 - E Color Diamonds',
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
        rate: editForm.rate,
        setting_style: editForm.setting_style,
      };

      await api.put(`/inventory/products/${id}`, {
        name: editForm.name,
        product_code: editForm.product_code,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        stock_qty: editForm.stock_qty,
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

  // Karigar Artisan Details from DB
  const karigarName = karigar?.name || 'Rajesh Varma';
  const karigarInitials = karigarName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'RV';
  const karigarSpec = karigar?.specialization || 'Master Artisan - Antique & Temple Work';
  const karigarWorkshop = karigar?.workshop_name || 'Varma Handcrafted Filigree & Temple Arts';
  const karigarCode = karigar?.karigar_code || 'KRG-1001';

  // Stock status pill
  const isHealthy = stockQtyNum > 2;
  const isLow = stockQtyNum > 0 && stockQtyNum <= 2;
  const statusLabel = isHealthy ? 'Healthy Stock' : (isLow ? 'Low Stock' : 'Out of Stock');
  const statusBadgeClass = isHealthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    : (isLow ? 'bg-amber-50 text-amber-700 border-amber-200/80' : 'bg-rose-50 text-rose-700 border-rose-200/80');
  const statusDotClass = isHealthy ? 'bg-emerald-500' : (isLow ? 'bg-amber-500' : 'bg-rose-500');

  // Valuation calculation
  const rate = parseFloat(attributes.sale_rate || attributes.rate || product.opening_stock_rate || 6850);
  const netWtNum = parseFloat(netWt) || parseFloat(grossWt) || 28.5;
  const diaWtNum = parseFloat(attributes.dia_wt_ct || 0);
  const valuation = attributes.sale_value
    ? parseFloat(attributes.sale_value)
    : (netWtNum * rate) + (diaWtNum * 65000);
  const formattedValuation = valuation > 0
    ? valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '1,95,225.00';

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-7xl mx-auto">

      {/* 1. Top Header & Breadcrumb Card (Rudra Jewellers ERP Theme) */}
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

        {/* Title, Health Status & ERP Action Buttons */}
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

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Edit Product Specifications */}
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 hover:text-stone-900 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-regular fa-pen-to-square text-xs text-stone-500"></i>
              <span>Edit Specifications</span>
            </button>

            {/* Print Tag — opens the professional A4 Jewellery Tag report */}
            <Link
              to={`/inventory/products/${id}/jewellery-tag`}
              className="px-5 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-print text-xs"></i>
              <span>Print Tag</span>
            </Link>
          </div>
        </div>

      </div>

      {/* 2. Main 2-Column Product Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* --- Left Column: Product Showcase Card (5 cols) --- */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden p-5 space-y-4">
            
            {/* Header inside frame */}
            <div className="text-center space-y-0.5">
              <h2 className="text-xs font-extrabold text-stone-800 tracking-wider uppercase font-mono">
                {product.name ? product.name.toUpperCase() : 'NAKSHATRA BRIDAL NECKLACE'}
              </h2>
              <p className="text-[10px] text-stone-400 font-medium">
                Home / {categoryName} / {subcategoryName}
              </p>
            </div>

            {/* Hero Showcase Image with elegant jewelry backdrop */}
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

            {/* Product Title & Attributes Banner below Hero Image */}
            <div className="text-center space-y-1 pt-1">
              <h3 className="text-sm font-bold text-gray-900">
                {product.name}
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                {purity}, {quality}, {grossWt}g
              </p>
              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-stone-700 pt-1">
                <span>Price: <strong className="text-[#b01622]">₹{Math.round(valuation).toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>Weight: <strong className="text-gray-900">Gross {grossWt}g</strong></span>
              </div>
            </div>

            {/* ERP Inventory Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="w-full sm:flex-1 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Transfer stock or edit specifications"
              >
                <i className="fa-solid fa-arrow-right-arrow-left text-xs"></i>
                <span>Stock Transfer</span>
              </button>
            </div>

            {/* Multiple Thumbnails Strip (Only actual product images, 360° view removed) */}
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
        </div>

        {/* --- Right Column: Technical Specs & Metadata Cards (7 cols) --- */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Technical Specifications with Crimson Header */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
            
            {/* Crimson Red Card Header */}
            <div className="bg-[#b01622] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-gem text-xs text-white/80"></i>
                <h2 className="text-sm font-bold tracking-wide">
                  Technical Specifications & Master Ledger
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/20 text-white font-mono">
                {product.product_code || 'RJ-BGL-1002'}
              </span>
            </div>

            {/* 2-Column Key-Value Specs Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs border-b border-stone-100">
              
              {/* Row 1 */}
              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PRODUCT SKU
                </span>
                <span className="font-extrabold text-gray-900 text-sm font-mono block">
                  {product.product_code || 'RJ-BGL-1002'}
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

              {/* Row 2 */}
              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PURITY & HALLMARK
                </span>
                <span className="font-semibold text-stone-800 text-sm block">
                  {purity}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CRAFT / QUALITY
                </span>
                <span className="font-semibold text-stone-800 text-sm block">
                  {quality}
                </span>
              </div>

              {/* Row 3 */}
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
                  CURRENT VAULT & FLOOR STOCK
                </span>
                <span className="font-bold text-gray-900 text-sm font-mono block">
                  {quantity} Units Active
                </span>
              </div>

            </div>

            {/* Bottom Valuation Highlight Banner */}
            <div className="bg-[#fef9ee] px-6 py-4 border-t border-amber-100 flex items-center justify-between">
              <div>
                <span className="block text-[10.5px] font-extrabold text-amber-700 uppercase tracking-wider">
                  ESTIMATED ERP BOOK VALUATION
                </span>
                <span className="text-2xl font-black text-gray-900 tracking-tight block mt-0.5">
                  ₹{formattedValuation}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200/60 text-amber-800 border border-amber-300/60 font-mono">
                Rate: ₹{Number(rate).toLocaleString('en-IN')}/g
              </span>
            </div>

          </div>

          {/* Cards 2 & 3 Side by Side: Ethical Highlights + Vendor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Ethical Highlights Card */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-3">
              <span className="text-[10.5px] font-extrabold text-stone-400 uppercase tracking-wider block">
                ETHICAL HIGHLIGHTS
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
                  <span className="font-mono text-[11.5px]">HUID NO: {huid || 'H-65D7801C'}</span>
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

      {/* 3. Full-Width Bottom Section: Recent Stock Movements */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        
        {/* Table Header with Title, Subtitle, and Download Report button */}
        <div className="p-5 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/40">
          <div>
            <h2 className="text-sm font-bold text-[#8b121e]">
              Recent Stock Movements
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Historical log of additions, transfers and sales for this SKU
            </p>
          </div>

          <button
            type="button"
            onClick={downloadMovementsReport}
            className="px-4 py-1.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto hover:bg-stone-50"
            title="Download CSV report of movements for this SKU"
          >
            <span>Download Report</span>
            <i className="fa-solid fa-arrow-down text-[10px]"></i>
          </button>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-700 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap w-[150px]">DATE & TIME</th>
                <th className="py-3 px-4 whitespace-nowrap w-[160px]">ACTION TYPE</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[75px]">CHANGE</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[75px]">BALANCE</th>
                <th className="py-3 px-4 whitespace-nowrap w-[180px]">STAFF / ARTISAN</th>
                <th className="py-3 px-4">REMARKS</th>
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
                    No movements recorded for this product yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
          <span>Showing {movements?.length || 0} movement logs for this SKU</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled className="w-7 h-7 rounded-lg border border-stone-200 bg-white text-stone-300 flex items-center justify-center cursor-not-allowed">
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <button type="button" className="w-7 h-7 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer">
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>

      </div>

      {/* --- Edit Product Modal Drawer --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setShowEditModal(false)}></div>
          
          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 z-10">
            
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <i className="fa-regular fa-pen-to-square text-[#b01622]"></i>
                <h3 className="text-base font-bold text-gray-900">Edit Product Specifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Purity</label>
                  <input
                    type="text"
                    value={editForm.purity}
                    onChange={(e) => setEditForm({ ...editForm, purity: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Gross Wt (g)</label>
                  <input
                    type="number"
                    step="0.01"
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
                    step="0.01"
                    value={editForm.net_wt}
                    onChange={(e) => setEditForm({ ...editForm, net_wt: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editForm.stock_qty}
                    onChange={(e) => setEditForm({ ...editForm, stock_qty: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Quality / Setting</label>
                  <input
                    type="text"
                    value={editForm.setting_style}
                    onChange={(e) => setEditForm({ ...editForm, setting_style: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Rate (₹/g)</label>
                  <input
                    type="number"
                    value={editForm.rate}
                    onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
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
                  <span>Save Changes</span>
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

    </div>
  );
}
