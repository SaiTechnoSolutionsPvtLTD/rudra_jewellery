import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { STAMP_OPTIONS, GOLD_STAMP_OPTIONS, DIAMOND_STAMP_OPTIONS, STONE_SIZE_OPTIONS, STONE_COLOR_OPTIONS } from '../../constants/productOptions';
import { cleanProductName } from '../../utils/formatters';
import Pagination from '../../components/Pagination';

export default function InventoryViewProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [settingStyles, setSettingStyles] = useState([]);
  const [showStylesModal, setShowStylesModal] = useState(false);
  const [stampsList, setStampsList] = useState([]);

  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [karigar, setKarigar] = useState(null);
  const [huid, setHuid] = useState('');
  const [movements, setMovements] = useState([]);
  const [pieceTags, setPieceTags] = useState([]);
  const [tagsPage, setTagsPage] = useState(1);
  const [tagsPerPage, setTagsPerPage] = useState(5);

  // Pagination for stock movements
  const [currentPage, setCurrentPage] = useState(1);
  const movementsPerPage = 4;

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    product_code: '',
    design_no: '',
    purity: '22K Hallmark Gold',
    gross_wt: '',
    net_wt: '',
    stock_qty: '1',
    setting_style: '',
    quality: '',
    vendor: '',
    wastage_percent: '3.50',
    making_charge: '650',
    dia_wt_ct: '',
    dia_count: '',
    stamp: '916',
    diamond_stamp: '+0',
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

  const fetchStamps = async () => {
    try {
      const res = await api.get('/stamps');
      setStampsList(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      console.error('Failed to fetch stamps master:', err);
    }
  };

  useEffect(() => {
    fetchSettingStyles();
    fetchStamps();
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/products/${id}`);
      const tagsRes = await api.get(`/inventory/products/${id}/tags`).catch(() => ({ data: { data: [] } }));
      const p = res.data.product;
      const attrs = res.data.attributes || {};
      setProduct(p);
      setAttributes(attrs);
      setKarigar(res.data.karigar || null);
      const effectiveHuid = res.data.huid || attrs.huid || ('H-' + String(p.id).padStart(6, '0'));
      setHuid(effectiveHuid);
      setMovements(res.data.movements || []);
      setPieceTags((tagsRes.data?.data || []).filter((piece) => Boolean(piece.tag_number)));
      setTagsPage(1);

      const rawImgs = res.data.images || [];
      const cleanImgs = rawImgs.filter(
        (img) => img && typeof img === 'string' && img !== '/placeholder-jewelry.png' && !img.includes('/storage/data:image') && img.trim() !== '1' && img.length > 5
      );
      setImages(cleanImgs.length > 0 ? cleanImgs : [p.image || p.image_url || '/placeholder-jewelry.png']);

      // Preload diamond details from attributes or components
      const diaComp = Array.isArray(attrs.components) ? attrs.components.find((c) => {
        const n = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
        return c.is_diamond || n.includes('diamond') || n.includes('dia');
      }) : null;
      const initialDiaStamp = attrs.diamond_stamp || diaComp?.stamp || '';
      const initialGoldStamp = attrs.stamp || attrs.gold_stamp || attrs.hallmark || (attrs.purity?.includes('22') ? '916' : '750');
      const initialDiaWt = attrs.dia_wt_ct || attrs.diamond_wt || (diaComp ? (diaComp.stone_weight || diaComp.gross_wt) : '');
      const initialDiaCount = attrs.diamond_count || attrs.dia_count || (diaComp ? diaComp.no_of_pieces : '');

      // Preload edit form
      setEditForm({
        name: p.name || '',
        product_code: p.product_code || '',
        design_no: p.design_no || attrs.design_no || '',
        purity: attrs.purity || attrs.gold_type || '22K Gold',
        gross_wt: attrs.gross_wt || p.opening_stock_weight || '',
        net_wt: attrs.net_wt || p.opening_fine_weight || '',
        stock_qty: p.current_stock_qty ?? p.opening_stock_qty ?? 1,
        setting_style: attrs.setting_style || attrs.quality || '',
        quality: attrs.quality || attrs.setting_style || '',
        vendor: attrs.vendor || attrs.vendor_name || '',
        wastage_percent: attrs.wastage_percent || attrs.wastage || '0.00',
        making_charge: attrs.making_charge || '0',
        dia_wt_ct: initialDiaWt || '',
        dia_count: initialDiaCount || '',
        stamp: initialGoldStamp,
        diamond_stamp: initialDiaStamp,
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
        design_no: editForm.design_no,
        gross_wt: editForm.gross_wt,
        net_wt: editForm.net_wt,
        purity: editForm.purity,
        gold_type: editForm.purity,
        setting_style: editForm.setting_style,
        quality: editForm.quality || editForm.setting_style,
        vendor: editForm.vendor,
        vendor_name: editForm.vendor,
        wastage_percent: editForm.wastage_percent,
        making_charge: editForm.making_charge,
        dia_wt_ct: editForm.dia_wt_ct,
        diamond_weight: editForm.dia_wt_ct,
        dia_count: editForm.dia_count,
        diamond_count: editForm.dia_count,
        stamp: editForm.stamp,
        gold_stamp: editForm.stamp,
        diamond_stamp: editForm.diamond_stamp,
        huid: editForm.huid,
        size: editForm.size,
        stone_size: editForm.stone_size,
        stone_color: editForm.stone_color,
        open_close_type: editForm.open_close_type,
      };

      await api.put(`/inventory/products/${id}`, {
        name: editForm.name,
        product_code: editForm.product_code,
        design_no: editForm.design_no,
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
    const headers = ['Date & Time', 'Action Type', 'Change', 'Balance', 'Staff / Admin', 'Remarks'];
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
  const stockQtyNum = Number(product.current_stock_qty ?? product.opening_stock_qty ?? 1);
  const quantity = String(stockQtyNum).padStart(2, '0');

  // Distinguish single product (per-piece) weights from total stock weight
  const rawGross = parseFloat(attributes.gross_wt ?? product.opening_stock_weight ?? 0);
  const rawNet = parseFloat(attributes.net_wt ?? product.opening_fine_weight ?? rawGross);
  const totalStockWt = parseFloat(attributes.total_stock_weight ?? product.opening_stock_weight ?? (rawGross * stockQtyNum));

  // Determine single product unit weight (if raw attributes was stored as aggregated sum across units, derive per-product weight)
  const singleGrossWt = attributes.unit_gross_wt
    ? parseFloat(attributes.unit_gross_wt)
    : (stockQtyNum > 1 && Math.abs(rawGross - totalStockWt) < 0.1
        ? Number((rawGross / stockQtyNum).toFixed(3))
        : rawGross);

  const singleNetWt = attributes.unit_net_wt
    ? parseFloat(attributes.unit_net_wt)
    : (stockQtyNum > 1 && rawNet > singleGrossWt
        ? Number((rawNet / stockQtyNum).toFixed(3))
        : rawNet);

  const purity = attributes.purity || attributes.gold_type || attributes.karat || attributes.stamp || '22K Gold';
  const quality = attributes.quality || attributes.setting_style || attributes.stamp || 'Standard';
  const vendorName = attributes.vendor || attributes.vendor_name || (karigar ? karigar.name : (product.vendor || 'Direct Vendor'));
  const vendorInitials = vendorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'VN';
  const categoryName = product.category?.name || attributes.category_name || 'Jewels';
  const subcategoryName = product.subcategory?.name || attributes.subcategory_name || 'General';

  const isHealthy = stockQtyNum > 5;
  const isLow = stockQtyNum >= 1 && stockQtyNum <= 5;
  const statusLabel = isHealthy ? 'Healthy' : (isLow ? 'Low Stock' : 'Out of Stock');
  const statusBadgeClass = isHealthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    : (isLow ? 'bg-amber-50 text-amber-700 border-amber-200/80' : 'bg-rose-50 text-rose-700 border-rose-200/80');
  const statusDotClass = isHealthy ? 'bg-emerald-500' : (isLow ? 'bg-amber-500' : 'bg-rose-500');


  const karigarName = vendorName;
  const karigarInitials = vendorInitials;
  const karigarWorkshop = attributes.vendor_company || karigar?.workshop_name || 'Registered Vendor';

  const createdDateFormatted = product.created_at
    ? new Date(product.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // Stock movements pagination calculations
  const totalMovements = movements.length;
  const totalPages = Math.ceil(totalMovements / movementsPerPage) || 1;
  const currentMovements = movements.slice((currentPage - 1) * movementsPerPage, currentPage * movementsPerPage);

  // Physical piece tags pagination calculations
  const tagsTotal = pieceTags.length;
  const tagsTotalPages = Math.max(1, Math.ceil(tagsTotal / tagsPerPage));
  const currentTagsPage = Math.min(tagsPage, tagsTotalPages);
  const paginatedPieceTags = pieceTags.slice((currentTagsPage - 1) * tagsPerPage, currentTagsPage * tagsPerPage);

  const getActionBadgeStyle = (actionType = '') => {
    const typeLower = actionType.toLowerCase();
    if (typeLower.includes('new arrival') || typeLower.includes('inward') || typeLower.includes('added')) {
      return 'bg-emerald-100/90 text-emerald-800 border-emerald-200';
    }
    if (typeLower.includes('transfer') || typeLower.includes('showroom')) {
      return 'bg-blue-100/90 text-blue-800 border-blue-200';
    }
    if (typeLower.includes('sale') || typeLower.includes('outward') || typeLower.includes('inv-')) {
      return 'bg-amber-100/90 text-amber-800 border-amber-200';
    }
    if (typeLower.includes('qc') || typeLower.includes('inspection') || typeLower.includes('audit')) {
      return 'bg-purple-100/90 text-purple-800 border-purple-200';
    }
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  const getChangeTextStyle = (changeVal = '') => {
    const str = String(changeVal).trim();
    if (str.startsWith('+')) return 'text-emerald-600 font-bold';
    if (str.startsWith('-')) return 'text-rose-600 font-bold';
    return 'text-stone-800 font-bold';
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-7xl mx-auto px-2 sm:px-4">

      {/* 1. Top Header Bar (Matching Image 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {product.name}
          </h1>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 shrink-0 ${statusBadgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></span>
            <span>{statusLabel}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/job-order/new?design_no=${encodeURIComponent(product.design_no || product.product_code || '')}`}
            className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-hammer text-xs"></i>
            <span>Create Job Order</span>
          </Link>

          <Link
            to={`/inventory/products/${id}/edit`}
            className="px-4 py-2 bg-white hover:bg-red-50/40 border-2 border-[#b01622] text-[#b01622] text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-regular fa-pen-to-square text-xs text-[#b01622]"></i>
            <span>Edit Product</span>
          </Link>

          <Link
            to={`/inventory/products/${id}/jewellery-tag`}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-print text-xs"></i>
            <span>Print Tag</span>
          </Link>
        </div>
      </div>

      {/* 2. Main 2-Column Grid (Showcase & Technical Specifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* --- Left Column: Showcase & Thumbnails (5 cols) --- */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden p-5 space-y-4">
            
            {/* Header / Breadcrumb inside showcase */}
            <div className="text-center space-y-0.5">
              <h2 className="text-xs font-extrabold text-stone-800 tracking-wider uppercase font-mono">
                {product.name ? product.name.toUpperCase() : ''}
              </h2>
              <p className="text-[10px] text-stone-400 font-medium">
                Home &gt; {categoryName} &gt; {subcategoryName}
              </p>
            </div>

            {/* Main Product Showcase Box */}
            <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-[#faf7f7] flex flex-col justify-between p-3 group border border-stone-200/90 shadow-2xs">
              <img
                key={currentImage}
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-contain transition-all duration-300 group-hover:scale-105"
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
                className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs text-stone-800 flex items-center justify-center text-xs shadow-sm cursor-pointer hover:bg-white hover:text-[#b01622] transition-colors z-10"
                title="Click to view high-resolution image"
              >
                <i className="fa-solid fa-magnifying-glass text-[11px] text-[#b01622]"></i>
              </button>
            </div>



            {/* Thumbnail Strip (4 items) */}
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              {images.slice(0, 3).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#b01622] ring-2 ring-red-100 shadow-2xs scale-102'
                      : 'border-stone-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-jewelry.png';
                    }}
                  />
                </button>
              ))}

              {/* 4th Thumbnail slot (Video/Angle icon) */}
              <button
                type="button"
                onClick={() => setShowImageZoom(true)}
                className="w-full aspect-square rounded-xl bg-stone-100 border-2 border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:border-stone-300 transition-all cursor-pointer"
                title="Play video / 360 preview"
              >
                <i className="fa-regular fa-circle-play text-lg"></i>
              </button>
            </div>

          </div>
        </div>

        {/* --- Right Column: Technical Specifications & Highlights (7 cols) --- */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Technical Specifications */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            
            {/* Dark Red Header Bar */}
            <div className="bg-[#b01622] text-white px-6 py-3.5">
              <h2 className="text-sm font-bold tracking-wide">
                Technical Specifications
              </h2>
            </div>

            {/* 2-Column Key-Value Specs Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
              
              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PRODUCT SKU
                </span>
                <span className="font-extrabold text-gray-900 text-sm font-mono block">
                  {product.product_code || product.sku || (`SKU-${String(product.id).padStart(5, '0')}`)}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  DESIGN NO.
                </span>
                <span className="font-extrabold text-[#b01622] text-sm font-mono block">
                  {product.design_no || attributes.design_no || '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CATEGORY
                </span>
                <span className="font-bold text-gray-900 text-sm block">
                  {categoryName} / {subcategoryName}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  PURITY
                </span>
                <span className="font-bold text-stone-900 text-sm block">
                  {purity}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  QUALITY
                </span>
                <span className="font-semibold text-stone-800 text-sm block">
                  {quality}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  TOTAL WEIGHT
                </span>
                <span className="font-bold text-gray-900 text-sm font-mono block">
                  {singleGrossWt}g
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  CURRENT QUANTITY
                </span>
                <span className="font-bold text-gray-900 text-sm font-mono block">
                  {quantity} Units
                </span>
              </div>

            </div>

            {/* Stock Weight & Available Units Banner */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="block text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                  NET WEIGHT / PURITY
                </span>
                <span className="text-xl font-black text-stone-900 tracking-tight block mt-0.5 font-mono">
                  {singleNetWt}g &bull; {purity}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                  STOCK QUANTITY
                </span>
                <span className="text-xl font-black text-[#b01622] tracking-tight block mt-0.5 font-mono">
                  {quantity} Units
                </span>
                <span className="text-[11px] font-medium text-stone-500 block">
                  Total Stock: {totalStockWt}g
                </span>
              </div>
            </div>

          </div>

          {/* Cards 2 & 3 Side-by-Side: Stock Highlights & Vendor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Stock Highlights Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs space-y-3">
              <span className="text-[10.5px] font-extrabold text-stone-400 uppercase tracking-wider block">
                STOCK HIGHLIGHTS
              </span>
              
              <div className="space-y-3 text-xs">
                {(attributes.certification_no || product?.certification_no) ? (
                  <div className="flex items-center gap-2.5 text-blue-700 font-bold bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <i className="fa-solid fa-award text-blue-600 text-sm shrink-0"></i>
                    <span>Cert: {attributes.certification_no || product?.certification_no} ({attributes.certification_agency || 'Certified'})</span>
                  </div>
                ) : null}

                {(attributes.huid || huid || product?.huid) ? (
                  <div className="flex items-center gap-2.5 text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <i className="fa-solid fa-[#15803D] fa-shield-halved text-emerald-600 text-sm shrink-0"></i>
                    <span>HUID: {attributes.huid || huid || product?.huid} ({attributes.hallmark_center || 'BIS Hallmarked'})</span>
                  </div>
                ) : null}

                {!attributes.certification_no && !attributes.huid && (
                  <div className="flex items-center gap-2.5 text-stone-800 font-semibold">
                    <i className="fa-regular fa-circle-check text-rose-700 text-sm shrink-0"></i>
                    <span>Certified by BIS India</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5 text-stone-800 font-semibold">
                  <i className="fa-regular fa-calendar-check text-stone-500 text-sm shrink-0"></i>
                  <span>Added: {createdDateFormatted}</span>
                </div>

                <div className="flex items-center gap-2.5 text-emerald-600 font-bold">
                  <i className="fa-solid fa-arrow-trend-up text-emerald-500 text-sm shrink-0"></i>
                  <span>High turnover rate (A+)</span>
                </div>
              </div>
            </div>

            {/* Vendor Details Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10.5px] font-extrabold text-stone-400 uppercase tracking-wider block mb-2.5">
                  VENDOR DETAILS
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] font-black text-xs flex items-center justify-center border border-red-200/80 shadow-2xs shrink-0 font-mono">
                    {karigarInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-xs truncate">{karigarName}</div>
                    <div className="text-[11px] text-stone-500 font-medium truncate">{karigarWorkshop}</div>
                  </div>
                </div>
              </div>

              <Link
                to="/suppliers"
                className="w-full py-2 bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center block"
              >
                Supplier Management
              </Link>
            </div>

          </div>

        </div>

      </div>


      {/* Product Components & Breakdown Section */}
      {Array.isArray(attributes?.components) && attributes.components.length > 0 && (
        <section className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#b01622]"></div>
                <h2 className="text-sm sm:text-base font-bold text-stone-900">
                  Product Components &amp; Breakdown
                </h2>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Detailed specifications for individual diamonds, gemstones, and paired component entries.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200">
                <i className="fa-solid fa-layer-group mr-1.5 text-stone-500"></i>
                {attributes.components.length} Component{attributes.components.length > 1 ? 's' : ''}
              </span>
              {(() => {
                const diaPcs = attributes.components.filter(c => c.is_diamond || (c.component_type && c.component_type.toLowerCase().includes('diamond')) || (c.category_name && c.category_name.toLowerCase().includes('diamond'))).reduce((sum, c) => sum + (parseInt(c.no_of_pieces) || 0), 0);
                const diaWt = attributes.components.filter(c => c.is_diamond || (c.component_type && c.component_type.toLowerCase().includes('diamond')) || (c.category_name && c.category_name.toLowerCase().includes('diamond'))).reduce((sum, c) => sum + (parseFloat(c.stone_weight || c.weight) || 0), 0);
                return diaPcs > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[#b01622] text-xs font-semibold border border-red-200">
                    <i className="fa-regular fa-gem mr-1.5"></i>
                    {diaPcs} Diamonds ({diaWt.toFixed(3)} ct)
                  </span>
                ) : null;
              })()}
              {(() => {
                const stonePcs = attributes.components.filter(c => c.is_stone || (c.component_type && (c.component_type.toLowerCase().includes('stone') || c.component_type.toLowerCase().includes('colour'))) && !(c.component_type && c.component_type.toLowerCase().includes('diamond'))).reduce((sum, c) => sum + (parseInt(c.no_of_pieces) || 0), 0);
                const stoneWt = attributes.components.filter(c => c.is_stone || (c.component_type && (c.component_type.toLowerCase().includes('stone') || c.component_type.toLowerCase().includes('colour'))) && !(c.component_type && c.component_type.toLowerCase().includes('diamond'))).reduce((sum, c) => sum + (parseFloat(c.stone_weight || c.weight) || 0), 0);
                return stonePcs > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    <i className="fa-solid fa-shapes mr-1.5"></i>
                    {stonePcs} Colour Stones ({stoneWt.toFixed(3)}g)
                  </span>
                ) : null;
              })()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">S.No</th>
                  <th className="py-3 px-4">Component / Stone</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Stamp / Sieve Size</th>
                  <th className="py-3 px-4 text-center">Pieces</th>
                  <th className="py-3 px-4 text-right">Weight</th>
                  <th className="py-3 px-4 text-center">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {attributes.components.map((comp, idx) => {
                  const isDia = comp.is_diamond || (comp.component_type && comp.component_type.toLowerCase().includes('diamond')) || (comp.category_name && comp.category_name.toLowerCase().includes('diamond'));
                  const isStone = comp.is_stone || (comp.component_type && comp.component_type.toLowerCase().includes('stone')) || (comp.component_type && comp.component_type.toLowerCase().includes('colour'));
                  return (
                    <tr key={comp.id_temp || idx} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 text-center text-stone-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">
                          {comp.item_name || comp.stone_type || comp.category_name || `Component ${idx + 1}`}
                        </div>
                        {comp.item_code && (
                          <div className="text-[10px] font-mono text-stone-400">
                            {comp.item_code}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isDia
                            ? 'bg-red-50 text-[#b01622] border-red-200'
                            : isStone
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {comp.component_type || (isDia ? 'Diamond' : (isStone ? 'Colour Stone' : 'Metal'))}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {comp.stamp || comp.size || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">
                        {comp.no_of_pieces || 1}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {Number(comp.stone_weight || comp.gross_wt || comp.weight || 0).toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-600">
                        {comp.unit || (isDia ? 'ct' : 'g')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#b01622]">Physical Piece Tags</h2>
            <p className="text-xs text-stone-400 mt-0.5">Tags are issued to individual received pieces linked to this product master.</p>
          </div>
          <Link
            to={`/inventory/products/${id}/jewellery-tag`}
            className="px-3.5 py-1.5 bg-white border border-stone-300 text-[#b01622] text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <i className="fa-solid fa-barcode"></i>
            Master Label ({product.product_code || product.sku || `SKU-${product.id}`})
          </Link>
        </div>
        {pieceTags.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-stone-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-5">Physical Tag</th>
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Piece</th>
                  <th className="py-3 px-4 text-right">Gross Wt</th>
                  <th className="py-3 px-4 text-right">Net Gold Wt</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedPieceTags.map((piece) => (
                  <tr key={piece.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-5 font-mono font-bold text-stone-900">{piece.tag_number}</td>
                    <td className="py-3 px-4 font-mono text-[#b01622]">{piece.work_order?.work_order_number || `WO-${piece.work_order_id}`}</td>
                    <td className="py-3 px-4">#{piece.piece_number}</td>
                    <td className="py-3 px-4 text-right font-mono">{piece.gross_weight != null ? `${Number(piece.gross_weight).toFixed(3)}g` : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{piece.net_gold_weight != null ? `${Number(piece.net_gold_weight).toFixed(3)}g` : '—'}</td>
                    <td className="py-3 px-5 text-right">
                      <Link
                        to={`/job-order/tag-printing?tag=${encodeURIComponent(piece.tag_number)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg"
                        title={`Print ${cleanProductName(piece.product_name, piece.design_no)} tag`}
                      >
                        <i className="fa-solid fa-print"></i>
                        <span>Print</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-xs text-stone-500">No received physical-piece tags are linked to this product yet. The master label uses the product SKU above.</p>
        )}

        {pieceTags.length > 0 && (
          <Pagination
            currentPage={currentTagsPage}
            totalPages={tagsTotalPages}
            totalItems={tagsTotal}
            itemsPerPage={tagsPerPage}
            onPageChange={(p) => setTagsPage(p)}
            onItemsPerPageChange={(val) => {
              setTagsPerPage(val);
              setTagsPage(1);
            }}
          />
        )}
      </section>

      {/* 3. Bottom Full-Width Section: Recent Stock Movements (Matching Image 4 & 5) */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        
        {/* Table Header */}
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#b01622]">
              Recent Stock Movements
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Historical log of additions, transfers, and sales for this SKU.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={downloadMovementsReport}
              className="px-3.5 py-1.5 bg-white border border-stone-300 hover:border-stone-400 text-[#b01622] text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-stone-50"
            >
              <span>Download Report</span>
              <i className="fa-solid fa-arrow-down text-[10px]"></i>
            </button>
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60 text-stone-500 font-bold text-[10.5px] uppercase tracking-wider">
                <th className="py-3 px-5 whitespace-nowrap">DATE & TIME</th>
                <th className="py-3 px-4 whitespace-nowrap">ACTION TYPE</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">CHANGE</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">BALANCE</th>
                <th className="py-3 px-4 whitespace-nowrap">STAFF / ADMIN</th>
                <th className="py-3 px-5">REMARKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {currentMovements && currentMovements.length > 0 ? (
                currentMovements.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-stone-700 whitespace-nowrap text-xs">
                      {m.date_time || '22 Jul 2024, 02:30 PM'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border shrink-0 ${getActionBadgeStyle(m.action_type)}`}>
                        {m.action_type || 'New Arrival'}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 text-center font-bold font-mono whitespace-nowrap text-xs ${getChangeTextStyle(m.change)}`}>
                      {m.change || '+02'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-stone-900 font-mono whitespace-nowrap text-xs">
                      {String(m.balance || '08').padStart(2, '0')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-stone-800 whitespace-nowrap text-xs">
                      {m.staff || 'Arvind (Admin)'}
                    </td>
                    <td className="py-3.5 px-5 text-stone-600 text-xs leading-relaxed">
                      {m.remarks || 'Restock from Mumbai hub'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-stone-400 font-medium">
                    No stock movements recorded for this product SKU yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar (Matching Image 5) */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/40 flex items-center justify-between text-xs text-stone-500">
          <span>Showing last {totalMovements > 0 ? currentMovements.length : 0} movements</span>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalMovements === 0}
              className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>

      </div>

      {/* --- Edit Specifications Modal --- */}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Design No.</label>
                  <input
                    type="text"
                    value={editForm.design_no || ''}
                    onChange={(e) => setEditForm({ ...editForm, design_no: e.target.value })}
                    placeholder="e.g. RJ-DES-001"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Vendor</label>
                  <input
                    type="text"
                    value={editForm.vendor || ''}
                    onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                    placeholder="Vendor Name"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Purity & Standard</label>
                  <input
                    type="text"
                    value={editForm.purity}
                    onChange={(e) => setEditForm({ ...editForm, purity: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Quality / Setting</label>
                  <input
                    type="text"
                    value={editForm.quality || editForm.setting_style}
                    onChange={(e) => setEditForm({ ...editForm, quality: e.target.value, setting_style: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Gold Hallmark / Stamp</label>
                  <select
                    value={editForm.stamp}
                    onChange={(e) => setEditForm({ ...editForm, stamp: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="">-- Select Gold Stamp --</option>
                    {(stampsList.filter((s) => !s.applicable_for || s.applicable_for.toLowerCase().includes('gold') || s.applicable_for.toLowerCase().includes('all')).length > 0
                      ? stampsList.filter((s) => !s.applicable_for || s.applicable_for.toLowerCase().includes('gold') || s.applicable_for.toLowerCase().includes('all')).map((s) => s.name)
                      : GOLD_STAMP_OPTIONS
                    ).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diamond Specifications Row (strictly diamond sieve stamps like +7, +8, +0, not gold 916/22K) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-stone-50/70 border border-stone-200/80 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Diamond Wt (Ct)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.dia_wt_ct}
                    onChange={(e) => setEditForm({ ...editForm, dia_wt_ct: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Diamond Stamp / Sieve (e.g. +7, +8)</label>
                  <select
                    value={editForm.diamond_stamp}
                    onChange={(e) => setEditForm({ ...editForm, diamond_stamp: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="">-- Select Diamond Stamp --</option>
                    {(stampsList.filter((s) => !s.applicable_for || s.applicable_for.toLowerCase().includes('diamond') || s.applicable_for.toLowerCase().includes('all')).length > 0
                      ? stampsList.filter((s) => !s.applicable_for || s.applicable_for.toLowerCase().includes('diamond') || s.applicable_for.toLowerCase().includes('all')).map((s) => s.name)
                      : DIAMOND_STAMP_OPTIONS
                    ).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Diamond Count (Pcs)</label>
                  <input
                    type="number"
                    step="1"
                    value={editForm.dia_count}
                    onChange={(e) => setEditForm({ ...editForm, dia_count: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

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
                  <option value="New Arrival">New Arrival</option>
                  <option value="Showroom Transfer">Showroom Transfer</option>
                  <option value="QC Inspection">QC Inspection</option>
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
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Staff / Admin</label>
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
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Remarks</label>
                <textarea
                  rows="3"
                  value={addStockForm.remarks}
                  onChange={(e) => setAddStockForm({ ...addStockForm, remarks: e.target.value })}
                  placeholder="e.g. Restock from Mumbai hub..."
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
          </div>
        </div>
      )}

      {/* Quick Dropdown CRUD Modal */}
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
