import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { STAMP_OPTIONS, GOLD_STAMP_OPTIONS, DIAMOND_STAMP_OPTIONS, STONE_SIZE_OPTIONS, STONE_COLOR_OPTIONS } from '../../constants/productOptions';
import { cleanProductName } from '../../utils/formatters';
import Pagination from '../../components/Pagination';
import { isDiamondComponent } from '../../components/JewelleryTagCard';

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
  const [childPiecesSummary, setChildPiecesSummary] = useState(null);
  const [tagFilterStatus, setTagFilterStatus] = useState('available'); // 'available', 'sold', 'all'
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [selectedPieceModal, setSelectedPieceModal] = useState(null);
  const [tagsPage, setTagsPage] = useState(1);
  const [tagsPerPage, setTagsPerPage] = useState(10);

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
      const tagsRes = await api.get(`/inventory/products/${id}/tags?status=all`).catch(() => ({ data: { data: [], summary: {} } }));
      const p = res.data.product;
      const attrs = res.data.attributes || {};
      setProduct(p);
      setAttributes(attrs);
      setKarigar(res.data.karigar || null);
      const effectiveHuid = res.data.huid || attrs.huid || ('H-' + String(p.id).padStart(6, '0'));
      setHuid(effectiveHuid);
      const rawTags = tagsRes.data?.data || [];
      setPieceTags(rawTags);
      setChildPiecesSummary(tagsRes.data?.summary || res.data?.child_pieces_summary || null);
      setMovements(Array.isArray(res.data.movements) ? res.data.movements : []);
      setTagsPage(1);

      const rawImgs = res.data.images || [];
      const cleanImgs = rawImgs.filter(
        (img) => img && typeof img === 'string' && img !== '/placeholder-jewelry.png' && !img.includes('/storage/data:image') && img.trim() !== '1' && img.length > 5
      );
      setImages(cleanImgs.length > 0 ? cleanImgs : [p.image || p.image_url || '/placeholder-jewelry.png']);

      // Preload diamond details from attributes or components
      const diaComp = Array.isArray(attrs.components) ? attrs.components.find(isDiamondComponent) : null;
      const isCaratUnit = diaComp && (diaComp.unit === 'ct' || diaComp.unit === 'Carats' || diaComp.unit === 'carat');
      const initialDiaStamp = attrs.diamond_stamp || diaComp?.stamp || '';
      const initialGoldStamp = attrs.stamp || attrs.gold_stamp || attrs.hallmark || (attrs.purity?.includes('22') ? '916' : '750');
      const initialDiaWt = attrs.dia_wt_ct || attrs.diamond_wt || (diaComp ? (diaComp.stone_weight || (isCaratUnit ? diaComp.gross_wt : '')) : '');
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

  // Extract diamonds and colour stones components first to derive non-metal weights
  const rawProductComps = Array.isArray(attributes?.components) ? attributes.components : [];
  // Deduplicate identical component entries if any were inadvertently saved
  const productComps = rawProductComps.filter((c, index, arr) => {
    return arr.findIndex((other) => {
      const typeA = (c.component_type || c.category_name || '').toLowerCase();
      const typeB = (other.component_type || other.category_name || '').toLowerCase();
      const stampA = c.stamp || c.diamond_stamp || c.size || '';
      const stampB = other.stamp || other.diamond_stamp || other.size || '';
      const wtA = Number(c.stone_weight ?? c.weight ?? c.gross_wt ?? 0);
      const wtB = Number(other.stone_weight ?? other.weight ?? other.gross_wt ?? 0);
      const pcsA = Number(c.no_of_pieces ?? c.quantity ?? 1);
      const pcsB = Number(other.no_of_pieces ?? other.quantity ?? 1);
      return typeA === typeB && stampA === stampB && Math.abs(wtA - wtB) < 0.001 && pcsA === pcsB;
    }) === index;
  });
  const diaComps = productComps.filter(c => c.is_diamond || (c.component_type && c.component_type.toLowerCase().includes('diamond')) || (c.category_name && c.category_name.toLowerCase().includes('diamond')) || (c.item_name && c.item_name.toLowerCase().includes('diamond')));
  const diaWtFromComps = diaComps.reduce((sum, c) => sum + (parseFloat(c.stone_weight ?? c.gross_wt ?? c.weight ?? 0) || 0), 0);
  const diaPcsFromComps = diaComps.reduce((sum, c) => sum + (parseInt(c.no_of_pieces ?? c.quantity ?? 1, 10) || 0), 0);
  const diamondWeight = diaWtFromComps > 0 ? diaWtFromComps : parseFloat(attributes.dia_wt_ct ?? attributes.diamond_weight ?? product.diamond_weight ?? 0);
  const diamondCount = diaPcsFromComps > 0 ? diaPcsFromComps : parseInt(attributes.diamond_count ?? attributes.dia_count ?? product.diamond_count ?? 0, 10);
  const diamondStamp = attributes.diamond_stamp || product.diamond_stamp || (diaComps[0]?.stamp && diaComps[0]?.stamp !== '0.00' ? diaComps[0]?.stamp : null);
  const diamondPurchaseRate = parseFloat(attributes.diamond_purchase_rate ?? diaComps[0]?.purchase_rate ?? 0);
  const diamondPurchaseValue = parseFloat(attributes.diamond_purchase_value ?? diaComps[0]?.purchase_value ?? (diamondPurchaseRate > 0 && diamondWeight > 0 ? diamondWeight * diamondPurchaseRate : 0));

  const stoneComps = productComps.filter(c => (c.is_stone || (c.component_type && (c.component_type.toLowerCase().includes('stone') || c.component_type.toLowerCase().includes('colour') || c.component_type.toLowerCase().includes('gem'))) || (c.category_name && (c.category_name.toLowerCase().includes('stone') || c.category_name.toLowerCase().includes('colour') || c.category_name.toLowerCase().includes('gem')))) && !c.is_diamond && !(c.component_type && c.component_type.toLowerCase().includes('diamond')) && !(c.category_name && c.category_name.toLowerCase().includes('diamond')));
  const stoneWtFromComps = stoneComps.reduce((sum, c) => sum + (parseFloat(c.stone_weight ?? c.gross_wt ?? c.weight ?? 0) || 0), 0);
  const stonePcsFromComps = stoneComps.reduce((sum, c) => sum + (parseInt(c.no_of_pieces ?? c.quantity ?? 1, 10) || 0), 0);
  const stoneWeight = stoneWtFromComps > 0 ? stoneWtFromComps : parseFloat(attributes.stone_weight ?? 0);
  const stoneCount = stonePcsFromComps > 0 ? stonePcsFromComps : parseInt(attributes.stone_count ?? attributes.stone_pieces ?? 0, 10);
  const stoneStamp = attributes.stone_stamp || (stoneComps[0]?.stamp && stoneComps[0]?.stamp !== '0.00' ? stoneComps[0]?.stamp : null);
  const stonePurchaseRate = parseFloat(attributes.stone_purchase_rate ?? stoneComps[0]?.purchase_rate ?? 0);
  const stonePurchaseValue = parseFloat(attributes.stone_purchase_value ?? stoneComps[0]?.purchase_value ?? (stonePurchaseRate > 0 && stoneWeight > 0 ? stoneWeight * stonePurchaseRate : 0));

  // Convert diamond and stone carats into grams (Standard: 1 ct = 0.200 g)
  const diamondGrams = Number((diamondWeight * 0.2).toFixed(3));
  const isStoneInGrams = (stoneComps[0]?.unit || attributes.stone_unit || '').toLowerCase() === 'g';
  const stoneGrams = Number((isStoneInGrams ? stoneWeight : (stoneWeight * 0.2)).toFixed(3));
  const totalNonMetalGrams = Number((diamondGrams + stoneGrams).toFixed(3));

  // Distinguish single product (per-piece) weights from total stock weight
  const rawGross = parseFloat(attributes.gross_wt ?? product.opening_stock_weight ?? 0);
  const totalStockWt = parseFloat(attributes.total_stock_weight ?? product.opening_stock_weight ?? (rawGross * stockQtyNum));

  // Determine single product gross weight (total finished weight including all components)
  const singleGrossWt = attributes.unit_gross_wt
    ? parseFloat(attributes.unit_gross_wt)
    : (stockQtyNum > 1 && Math.abs(rawGross - totalStockWt) < 0.1
        ? Number((rawGross / stockQtyNum).toFixed(3))
        : rawGross);

  // Flow: Total Gross Weight contains all components.
  // Net Gold Wt = Gross Wt - (Diamond converted to g + Stone converted to g).
  // Net Wt (e.g. 44.6g) + Diamond in g (0.4g) = Gross Wt (45g)
  let calculatedNetWt = singleGrossWt;
  if (totalNonMetalGrams > 0 && singleGrossWt > totalNonMetalGrams) {
    const rawNetCandidate = parseFloat(attributes.net_wt ?? product.opening_fine_weight ?? 0);
    if (rawNetCandidate > 0 && rawNetCandidate < singleGrossWt && Math.abs(rawNetCandidate - (singleGrossWt - totalNonMetalGrams)) < 0.05) {
      calculatedNetWt = rawNetCandidate;
    } else {
      calculatedNetWt = Number((singleGrossWt - totalNonMetalGrams).toFixed(3));
    }
  } else if (parseFloat(attributes.net_wt ?? product.opening_fine_weight ?? 0) > 0) {
    calculatedNetWt = parseFloat(attributes.net_wt ?? product.opening_fine_weight);
  }
  const singleNetWt = calculatedNetWt;

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

  // Valuation & Financial Calculations
  const goldPurchaseRate = parseFloat(attributes.purchase_rate ?? attributes.gold_purchase_rate ?? product.purchase_rate ?? 0);
  const goldPurchaseValue = parseFloat(attributes.gold_purchase_value ?? (goldPurchaseRate > 0 && singleNetWt > 0 ? (singleNetWt * goldPurchaseRate) : 0));

  const parsePurityPercent = (purityStr) => {
    if (!purityStr) return 91.6;
    const str = String(purityStr).toLowerCase();
    if (str.includes('24') || str.includes('999')) return 99.9;
    if (str.includes('22') || str.includes('916')) return 91.6;
    if (str.includes('18') || str.includes('750')) return 75.0;
    if (str.includes('14') || str.includes('585')) return 58.5;
    if (str.includes('10')) return 41.7;
    const m = str.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return parseFloat(m[1]);
    const num = parseFloat(str);
    if (!isNaN(num) && num > 0 && num <= 100) return num;
    return 91.6;
  };
  const purityPercentage = parsePurityPercent(purity);
  const fineGoldWeight = Number((singleNetWt * (purityPercentage / 100)).toFixed(3));

  let totalComponentPieces = 0;
  if (Array.isArray(productComps)) {
    productComps.forEach((c) => {
      const cPcs = parseInt(c.no_of_pieces ?? c.quantity ?? 1, 10);
      totalComponentPieces += cPcs;
    });
  }

  const overallPurchaseValue = Number((goldPurchaseValue + diamondPurchaseValue + stonePurchaseValue).toFixed(2));

  // Unified helper: checks if a piece is sold, invoiced, or delivered
  const isPieceSold = (piece) => {
    if (!piece) return false;
    if (piece.status === 'sold' || Boolean(piece.invoice_id) || Boolean(piece.invoice_no)) return true;
    const woStatus = (piece.work_order?.status || piece.work_order_status || '').toLowerCase();
    const woStage = (piece.work_order?.current_stage || '').toLowerCase();
    if (woStatus === 'delivered' || woStage === 'delivered' || Boolean(piece.is_delivered)) return true;
    return false;
  };

  // Child Pieces & Physical Tags Calculations
  const hasPieces = pieceTags.length > 0;
  const availablePiecesList = pieceTags.filter((p) => p.tag_number && !isPieceSold(p));
  const soldPiecesList = pieceTags.filter((p) => p.tag_number && isPieceSold(p));

  const totalPiecesCount = childPiecesSummary?.total_pieces ?? pieceTags.length;
  const availablePiecesCount = childPiecesSummary?.available_count ?? availablePiecesList.length;
  const soldPiecesCount = childPiecesSummary?.sold_count ?? soldPiecesList.length;

  const availableGrossWeight = childPiecesSummary?.available_gross_weight ?? availablePiecesList.reduce((sum, p) => sum + Number(p.gross_weight || 0), 0);
  const availableNetWeight = childPiecesSummary?.available_net_weight ?? availablePiecesList.reduce((sum, p) => sum + Number(p.net_gold_weight || 0), 0);
  const availableFineWeight = childPiecesSummary?.available_fine_weight ?? availablePiecesList.reduce((sum, p) => sum + Number(p.pure_24k_weight || 0), 0);
  const availableDiamondWeight = childPiecesSummary?.available_diamond_weight ?? availablePiecesList.reduce((sum, p) => sum + Number(p.diamond_weight || 0), 0);
  const availableStoneWeight = childPiecesSummary?.available_stone_weight ?? availablePiecesList.reduce((sum, p) => sum + Number(p.color_stone_weight || 0), 0);
  const availablePurchaseVal = childPiecesSummary?.available_purchase_value ?? availablePiecesList.reduce((sum, p) => sum + Number(p.purchase_value || 0), 0);

  const effectiveStockQty = hasPieces ? availablePiecesCount : stockQtyNum;
  const effectiveTotalStockWt = hasPieces && availableGrossWeight > 0 ? Number(availableGrossWeight.toFixed(3)) : totalStockWt;
  const effectiveNetWt = hasPieces && availableNetWeight > 0 ? Number(availableNetWeight.toFixed(3)) : singleNetWt;
  const effectiveFineWt = hasPieces && availableFineWeight > 0 ? Number(availableFineWeight.toFixed(3)) : fineGoldWeight;
  const effectivePurchaseVal = hasPieces && availablePurchaseVal > 0 ? availablePurchaseVal : overallPurchaseValue;

  // Filtered physical pieces for table: automatically removes sold pieces from 'available' view
  const filteredPieceTags = pieceTags.filter((piece) => {
    if (!piece.tag_number) return false;
    const isSold = isPieceSold(piece);
    if (tagFilterStatus === 'available' && isSold) return false;
    if (tagFilterStatus === 'sold' && !isSold) return false;

    if (tagSearchQuery.trim()) {
      const q = tagSearchQuery.toLowerCase().trim();
      const tagMatch = String(piece.tag_number || '').toLowerCase().includes(q);
      const rwoMatch = String(piece.receive_order_number || '').toLowerCase().includes(q);
      const woMatch = String(piece.work_order_number || piece.work_order?.work_order_number || '').toLowerCase().includes(q);
      const statusMatch = String(piece.status || '').toLowerCase().includes(q);
      const karigarMatch = String(piece.karigar_name || piece.karigar?.name || '').toLowerCase().includes(q);
      if (!tagMatch && !rwoMatch && !woMatch && !statusMatch && !karigarMatch) return false;
    }
    return true;
  });

  // Sort newest first by default
  const sortedPieceTags = [...filteredPieceTags].sort((a, b) => {
    const timeA = new Date(a.received_at || a.created_at || 0).getTime();
    const timeB = new Date(b.received_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  // Stock movements pagination calculations
  const totalMovements = movements.length;
  const totalPages = Math.ceil(totalMovements / movementsPerPage) || 1;
  const currentMovements = movements.slice((currentPage - 1) * movementsPerPage, currentPage * movementsPerPage);

  // Physical piece tags pagination calculations
  const tagsTotal = sortedPieceTags.length;
  const tagsTotalPages = Math.max(1, Math.ceil(tagsTotal / tagsPerPage));
  const currentTagsPage = Math.min(tagsPage, tagsTotalPages);
  const paginatedPieceTags = sortedPieceTags.slice((currentTagsPage - 1) * tagsPerPage, currentTagsPage * tagsPerPage);

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

  const calculateDaysSince = (dateStr) => {
    if (!dateStr) return 0;
    const created = new Date(dateStr);
    if (isNaN(created.getTime())) return 0;
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - created.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
                <span className="block text-[10.5px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                  NET GOLD WEIGHT
                </span>
                <span className="font-bold text-amber-900 text-sm font-mono block">
                  {singleNetWt.toFixed(3)}g
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

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  FINE GOLD WEIGHT
                </span>
                <span className="font-bold text-amber-700 text-sm font-mono block">
                  {fineGoldWeight.toFixed(3)}g ({purityPercentage}%)
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                  TOTAL DIAMOND WEIGHT
                </span>
                <span className="font-bold text-blue-900 text-sm font-mono block">
                  {diamondWeight > 0 ? `${diamondWeight.toFixed(3)} ct ${diamondCount > 0 ? `(${diamondCount} Pcs)` : ''} (${diamondGrams.toFixed(3)}g)` : '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  TOTAL COLOUR STONE WEIGHT
                </span>
                <span className="font-bold text-emerald-900 text-sm font-mono block">
                  {stoneWeight > 0 ? `${stoneWeight.toFixed(3)} ct ${stoneCount > 0 ? `(${stoneCount} Pcs)` : ''} (${stoneGrams.toFixed(3)}g)` : '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  GOLD PURCHASE RATE
                </span>
                <span className="font-bold text-stone-900 text-sm font-mono block">
                  {goldPurchaseRate > 0 ? `₹${goldPurchaseRate.toLocaleString('en-IN')}/g` : '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  GOLD PURCHASE VALUE
                </span>
                <span className="font-extrabold text-[#b01622] text-sm font-mono block">
                  {goldPurchaseValue > 0 ? `₹${goldPurchaseValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                  OVERALL PURCHASE VALUE
                </span>
                <span className="font-black text-emerald-800 text-sm font-mono block">
                  {overallPurchaseValue > 0 ? `₹${overallPurchaseValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>

            </div>

            {/* Stock Weight & Available Units Banner */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                  {hasPieces ? 'AVAILABLE NET WT / PURITY / FINE WT' : 'NET WEIGHT / PURITY / FINE WT'}
                </span>
                <span className="text-xl font-black text-stone-900 tracking-tight block mt-0.5 font-mono">
                  {effectiveNetWt}g &bull; {purity} <span className="text-sm font-semibold text-amber-800 font-mono">({effectiveFineWt.toFixed(3)}g Pure)</span>
                  {diamondWeight > 0 && (
                    <span className="text-xs font-bold text-blue-700 font-mono ml-2">({diamondWeight.toFixed(3)}ct Dia{diamondCount > 0 ? ` - ${diamondCount} Pcs` : ''} = {diamondGrams.toFixed(3)}g)</span>
                  )}
                  {stoneWeight > 0 && (
                    <span className="text-xs font-bold text-emerald-700 font-mono ml-2">({stoneWeight.toFixed(3)}ct Stone{stoneCount > 0 ? ` - ${stoneCount} Pcs` : ''} = {stoneGrams.toFixed(3)}g)</span>
                  )}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="block text-[10.5px] font-bold text-stone-500 uppercase tracking-wider">
                  {hasPieces ? 'AVAILABLE PIECES & PURCHASE VALUATION' : 'STOCK QUANTITY & VALUATION'}
                </span>
                <span className="text-xl font-black text-[#b01622] tracking-tight block mt-0.5 font-mono">
                  {effectiveStockQty} Available {effectivePurchaseVal > 0 && <span className="text-sm font-bold text-emerald-700 ml-1 font-mono">(&#8377;{effectivePurchaseVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })})</span>}
                </span>
                <span className="text-[11px] font-medium text-stone-500 block">
                  {hasPieces ? `Total Gross Wt: ${effectiveTotalStockWt}g (${totalPiecesCount} pieces received)` : `Total Stock: ${totalStockWt}g`}
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
      {Array.isArray(productComps) && productComps.length > 0 && (
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
                {productComps.length} Component{productComps.length > 1 ? 's' : ''}
              </span>
              {(() => {
                const diaPcs = diamondCount;
                const diaWt = diamondWeight;
                return diaPcs > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                    <i className="fa-regular fa-gem mr-1.5"></i>
                    {diaPcs} Diamonds ({diaWt.toFixed(3)} ct)
                  </span>
                ) : null;
              })()}
              {(() => {
                const stonePcs = stoneCount;
                const stoneWt = stoneWeight;
                return stonePcs > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                    <i className="fa-solid fa-shapes mr-1.5"></i>
                    {stonePcs} Colour Stones ({stoneWt.toFixed(3)} ct)
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
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Purchase Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {productComps.map((comp, idx) => {
                  const isDia = comp.is_diamond || (comp.component_type && comp.component_type.toLowerCase().includes('diamond')) || (comp.category_name && comp.category_name.toLowerCase().includes('diamond')) || (comp.item_name && comp.item_name.toLowerCase().includes('diamond'));
                  const isStone = comp.is_stone || (comp.component_type && (comp.component_type.toLowerCase().includes('stone') || comp.component_type.toLowerCase().includes('colour') || comp.component_type.toLowerCase().includes('gem'))) || (comp.category_name && (comp.category_name.toLowerCase().includes('stone') || comp.category_name.toLowerCase().includes('colour') || comp.category_name.toLowerCase().includes('gem')));
                  const isPrimaryMetal = !isDia && !isStone;

                  // Weight resolution:
                  // Primary metal weight is the net gold weight (e.g. 44.600g).
                  // Diamond weight is individual diamond component weight in carats (2.000 ct).
                  // Stone weight is colour stone weight (in ct or g).
                  const cWt = isPrimaryMetal
                    ? (parseFloat(comp.weight ?? comp.net_wt ?? 0) || singleNetWt)
                    : (parseFloat(comp.stone_weight ?? comp.weight ?? comp.gross_wt ?? 0) || (isDia ? (diamondWeight / (diaComps.length || 1)) : (isStone ? (stoneWeight / (stoneComps.length || 1)) : 0)));

                  const cRate = (parseFloat(comp.purchase_rate ?? 0) > 0)
                    ? parseFloat(comp.purchase_rate)
                    : (isPrimaryMetal ? goldPurchaseRate : (isDia ? diamondPurchaseRate : stonePurchaseRate));

                  const cVal = (comp.purchase_value !== undefined && comp.purchase_value !== null && comp.purchase_value !== '' && parseFloat(comp.purchase_value) > 0)
                    ? parseFloat(comp.purchase_value)
                    : (cRate > 0 && cWt > 0 ? cWt * cRate : 0);

                  const unitLabel = isPrimaryMetal ? 'g' : (comp.unit || (isDia || isStone ? 'ct' : 'g'));

                  // Type resolution: with respect to the product category (Gold/Silver/Platinum) for primary metal, and Diamond/Stone for others
                  let displayType = comp.component_type;
                  if (isDia) {
                    displayType = 'Diamond';
                  } else if (isStone) {
                    displayType = 'Stone';
                  } else {
                    const cat = (comp.category_name || categoryName || '').toLowerCase();
                    if (cat.includes('gold')) {
                      displayType = 'Gold';
                    } else if (cat.includes('silver')) {
                      displayType = 'Silver';
                    } else if (cat.includes('platinum')) {
                      displayType = 'Platinum';
                    } else if (displayType === 'Metal' || !displayType) {
                      displayType = categoryName || 'Gold';
                    }
                  }

                  // Stamp resolution: For diamond and stone, display stamp (or diamond_stamp / stone_stamp / sieve_size)
                  const compStamp = comp.stamp && comp.stamp !== '0.00' && comp.stamp !== '0'
                    ? comp.stamp
                    : (isDia
                        ? (comp.diamond_stamp || attributes.diamond_stamp || diamondStamp || comp.sieve_size || '—')
                        : (isStone
                            ? (comp.stone_stamp || attributes.stone_stamp || stoneStamp || comp.sieve_size || '—')
                            : (comp.stamp && comp.stamp !== '0.00' ? comp.stamp : (attributes.stamp || attributes.gold_stamp || '916'))
                          )
                      );

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
                          displayType === 'Diamond'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : displayType === 'Stone' || displayType === 'Colour Stone'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : displayType === 'Gold'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : displayType === 'Silver'
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {displayType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {compStamp}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">
                        {comp.no_of_pieces || comp.quantity || 1}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {cWt.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-600">
                        {unitLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-stone-700">
                        {cRate > 0 ? `₹${cRate.toLocaleString('en-IN')}/${unitLabel}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#b01622]">
                        {cVal > 0 ? `₹${cVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t-2 border-stone-200 text-stone-800 font-bold">
                  <td colSpan="4" className="py-3 px-4 uppercase text-[10px] tracking-wider text-stone-600">
                    Total Components ({productComps.length})
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">
                    {totalComponentPieces}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {singleGrossWt.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-stone-600">g</td>
                  <td className="py-3 px-4 text-right font-mono text-stone-400">—</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-[#b01622]">
                    {overallPurchaseValue > 0 ? `₹${overallPurchaseValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[#b01622] flex items-center gap-2">
                <i className="fa-solid fa-tags text-sm"></i>
                <span>Received Pieces / Available Tags</span>
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {availablePiecesCount} Available
              </span>
              {soldPiecesCount > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  {soldPiecesCount} Sold
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Every manufactured child piece received from Karigars, linked to this parent design with actual measured weights.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Link
              to={`/inventory/products/${id}/jewellery-tag`}
              className="px-3.5 py-1.5 bg-white border border-stone-300 hover:border-stone-400 text-[#b01622] text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs transition-colors"
            >
              <i className="fa-solid fa-barcode"></i>
              Master Label ({product.product_code || product.sku || `SKU-${product.id}`})
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-stone-50/70 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs font-bold text-stone-500 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => { setTagFilterStatus('available'); setTagsPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tagFilterStatus === 'available'
                  ? 'bg-[#b01622] text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Available ({availablePiecesCount})
            </button>
            <button
              type="button"
              onClick={() => { setTagFilterStatus('sold'); setTagsPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tagFilterStatus === 'sold'
                  ? 'bg-[#b01622] text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Sold ({soldPiecesCount})
            </button>
            <button
              type="button"
              onClick={() => { setTagFilterStatus('all'); setTagsPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tagFilterStatus === 'all'
                  ? 'bg-[#b01622] text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              All Pieces ({totalPiecesCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={tagSearchQuery}
              onChange={(e) => { setTagSearchQuery(e.target.value); setTagsPage(1); }}
              placeholder="Search Tag, RWO #, WO #..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-xs text-stone-400"></i>
          </div>
        </div>

        {/* Pieces Table */}
        {sortedPieceTags.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">Tag Number</th>
                  <th className="py-3 px-4">Receive WO</th>
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Age (Days)</th>
                  <th className="py-3 px-3 text-right">Gross Wt</th>
                  <th className="py-3 px-3 text-right">Net Gold</th>
                  <th className="py-3 px-3 text-right">Fine (24K)</th>
                  <th className="py-3 px-3 text-center">Purity</th>
                  <th className="py-3 px-3 text-right">Dia (ct)</th>
                  <th className="py-3 px-3 text-right">Stone (ct)</th>
                  <th className="py-3 px-3 text-right">Silver</th>
                  <th className="py-3 px-4 text-right">Purchase Val</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Received Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedPieceTags.map((piece, idx) => {
                  const rowNum = (currentTagsPage - 1) * tagsPerPage + idx + 1;
                  const isSold = isPieceSold(piece);
                  const daysOld = piece.days_since_received != null
                    ? piece.days_since_received
                    : calculateDaysSince(piece.received_at || piece.created_at);
                  const receivedDateText = piece.received_at
                    ? new Date(piece.received_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : (piece.created_at ? new Date(piece.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
                  const pVal = Number(piece.purchase_value || 0);

                  return (
                    <tr
                      key={piece.id}
                      onClick={() => setSelectedPieceModal(piece)}
                      className={`hover:bg-red-50/30 transition-colors cursor-pointer select-none ${
                        isSold ? 'bg-stone-50/40 text-stone-400' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-stone-400 font-medium">{rowNum}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                        <span className="bg-red-50 text-[#b01622] border border-red-200/80 px-2 py-0.5 rounded-md">
                          {piece.tag_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-700 whitespace-nowrap">
                        {piece.receive_order_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600 whitespace-nowrap">
                        {piece.work_order_number || piece.work_order?.work_order_number || `WO-${piece.work_order_id || '—'}`}
                      </td>
                      <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-xs font-bold font-mono border shadow-2xs ${
                            daysOld > 60
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : daysOld > 30
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                          title={`${daysOld} day${daysOld === 1 ? '' : 's'} since received into stock`}
                        >
                          {daysOld}d
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-stone-800 whitespace-nowrap">
                        {piece.gross_weight != null ? `${Number(piece.gross_weight).toFixed(3)}g` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#b01622] whitespace-nowrap">
                        {piece.net_gold_weight != null ? `${Number(piece.net_gold_weight).toFixed(3)}g` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-800 whitespace-nowrap">
                        {piece.pure_24k_weight != null ? `${Number(piece.pure_24k_weight).toFixed(3)}g` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-medium whitespace-nowrap">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono">
                          {piece.purity || '22K'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {piece.diamond_weight > 0 ? (
                          <span className="text-sky-700 font-semibold">{Number(piece.diamond_weight).toFixed(3)}</span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {piece.color_stone_weight > 0 ? (
                          <span className="text-purple-700 font-semibold">{Number(piece.color_stone_weight).toFixed(3)}</span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {piece.silver_weight > 0 ? `${Number(piece.silver_weight).toFixed(3)}g` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-800 whitespace-nowrap">
                        {pVal > 0 ? `₹${pVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isSold ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                            Sold
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-stone-600 font-mono text-[11px]">
                        {receivedDateText}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPieceModal(piece)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-[#b01622] hover:text-white text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            title="View Piece Details"
                          >
                            <i className="fa-solid fa-eye text-[10px]"></i>
                            <span>View</span>
                          </button>
                          <Link
                            to={`/job-order/tag-printing?tag=${encodeURIComponent(piece.tag_number)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors"
                            title={`Print tag ${piece.tag_number}`}
                          >
                            <i className="fa-solid fa-print text-[10px]"></i>
                            <span>Print</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-xs text-stone-500">
            <i className="fa-solid fa-box-open text-3xl text-stone-300 mb-2 block"></i>
            {pieceTags.length === 0 ? (
              <p>No manufactured pieces have been received for this product design yet. The master label uses the product SKU.</p>
            ) : tagFilterStatus === 'available' && soldPiecesCount > 0 ? (
              <div className="max-w-md mx-auto space-y-2">
                <p className="font-semibold text-stone-700 text-sm">All received pieces for this design have been sold.</p>
                <p className="text-stone-400">Sold child products and their tag rows are automatically removed from this available view.</p>
                <button
                  type="button"
                  onClick={() => { setTagFilterStatus('sold'); setTagsPage(1); }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-receipt text-stone-500"></i>
                  <span>View {soldPiecesCount} Sold Pieces</span>
                </button>
              </div>
            ) : (
              <p>No child pieces match the selected status or search filter.</p>
            )}
          </div>
        )}

        {sortedPieceTags.length > 0 && (
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
                <th className="py-3 px-4 w-12 text-center whitespace-nowrap">S.No</th>
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
                    <td className="py-3.5 px-4 text-center font-mono text-stone-400 font-medium text-xs">
                      {idx + 1}
                    </td>
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
                  <td colSpan="7" className="py-10 text-center text-stone-400 font-medium">
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

      {/* Child Piece Detail View Modal */}
      {selectedPieceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setSelectedPieceModal(null)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 my-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-sm border border-red-200">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 font-mono">
                      Tag: {selectedPieceModal.tag_number}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        selectedPieceModal.status === 'sold' || selectedPieceModal.invoice_no
                          ? 'bg-stone-200 text-stone-700'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {selectedPieceModal.status === 'sold' || selectedPieceModal.invoice_no ? 'Sold' : 'Available / In Stock'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Individual manufactured child piece linked to parent design {product.name} ({product.product_code || product.design_no})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/job-order/tag-printing?tag=${encodeURIComponent(selectedPieceModal.tag_number)}`}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  title="Print Jewellery Tag"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>Print Tag</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedPieceModal(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            <div className="space-y-6 pt-5 max-h-[75vh] overflow-y-auto pr-1">
              {/* 1. Identification Grid */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-id-card text-stone-400"></i>
                  <span>Piece Identification &amp; Traceability</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Parent Design</span>
                    <strong className="text-stone-900 font-medium block truncate" title={product.name}>{product.name}</strong>
                    <span className="text-stone-500 font-mono text-[11px]">{product.product_code || product.design_no || '—'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Piece / Tag #</span>
                    <strong className="text-[#b01622] font-mono font-bold block">{selectedPieceModal.tag_number}</strong>
                    <span className="text-stone-500 text-[11px]">Piece #{selectedPieceModal.piece_number || 1}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Receive WO #</span>
                    <strong className="text-stone-800 font-mono font-semibold block">{selectedPieceModal.receive_order_number || '—'}</strong>
                    <span className="text-stone-500 text-[11px]">WO: {selectedPieceModal.work_order_number || `WO-${selectedPieceModal.work_order_id || '—'}`}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Received Date</span>
                    <strong className="text-stone-800 font-mono block">
                      {selectedPieceModal.received_at
                        ? new Date(selectedPieceModal.received_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </strong>
                    <span className="text-amber-800 font-bold text-[10.5px] block mt-0.5">
                      {(selectedPieceModal.days_since_received != null
                        ? selectedPieceModal.days_since_received
                        : calculateDaysSince(selectedPieceModal.received_at || selectedPieceModal.created_at))} days since received
                    </span>
                    {selectedPieceModal.invoice_no && (
                      <span className="text-rose-700 font-bold text-[10px] block mt-0.5">Inv: #{selectedPieceModal.invoice_no}</span>
                    )}
                  </div>
                  {(selectedPieceModal.huid || selectedPieceModal.certificate_no) && (
                    <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-3 pt-2 border-t border-stone-200/60">
                      {selectedPieceModal.huid && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-[11px]">
                          <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                          HUID: {selectedPieceModal.huid}
                        </span>
                      )}
                      {selectedPieceModal.certificate_no && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold text-[11px]">
                          <i className="fa-solid fa-award text-blue-600"></i>
                          Cert: {selectedPieceModal.certificate_no}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Gold Details */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-coins text-amber-500"></i>
                  <span>Actual Gold Measurements</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Purity / Karat</span>
                    <strong className="text-stone-900 font-bold block">{selectedPieceModal.purity || '22K'}</strong>
                    <span className="text-amber-800 font-medium text-[10px]">{selectedPieceModal.gold_karat ? `${selectedPieceModal.gold_karat}K Gold` : 'Hallmark'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Gross Weight</span>
                    <strong className="text-stone-900 font-mono text-sm block">
                      {selectedPieceModal.gross_weight != null ? `${Number(selectedPieceModal.gross_weight).toFixed(3)}g` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Net Gold Weight</span>
                    <strong className="text-[#b01622] font-mono text-sm block">
                      {selectedPieceModal.net_gold_weight != null ? `${Number(selectedPieceModal.net_gold_weight).toFixed(3)}g` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Fine Gold (24K)</span>
                    <strong className="text-amber-900 font-mono text-sm block">
                      {selectedPieceModal.pure_24k_weight != null ? `${Number(selectedPieceModal.pure_24k_weight).toFixed(3)}g` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Making Charge</span>
                    <strong className="text-stone-800 font-mono block">
                      {selectedPieceModal.total_making_charge > 0 ? `₹${Number(selectedPieceModal.total_making_charge).toLocaleString('en-IN')}` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Purchase Value</span>
                    <strong className="text-emerald-700 font-mono font-bold block">
                      {selectedPieceModal.purchase_value > 0 ? `₹${Number(selectedPieceModal.purchase_value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Diamond Details Breakdown */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-gem text-sky-500"></i>
                    <span>Diamond Breakdown ({selectedPieceModal.diamond_count || 0} pcs &bull; {Number(selectedPieceModal.diamond_weight || 0).toFixed(3)} ct)</span>
                  </span>
                </h4>
                {Array.isArray(selectedPieceModal.diamond_sieves) && selectedPieceModal.diamond_sieves.length > 0 ? (
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Diamond Sieve / Stamp</th>
                          <th className="py-2.5 px-3 text-center">Pieces</th>
                          <th className="py-2.5 px-3 text-right">Carats (ct)</th>
                          <th className="py-2.5 px-3 text-right">Purchase Rate</th>
                          <th className="py-2.5 px-3 text-right">Purchase Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedPieceModal.diamond_sieves.map((sieve, sIdx) => {
                          const sPcs = Number(sieve.pieces ?? sieve.count ?? sieve.no_of_pieces ?? 0);
                          const sCarats = Number(sieve.carat_weight ?? sieve.weight ?? sieve.carats ?? 0);
                          const sRate = Number(sieve.purchase_rate ?? sieve.rate ?? 0);
                          const sVal = Number(sieve.purchase_value ?? sieve.value ?? (sRate > 0 && sCarats > 0 ? sRate * sCarats : 0));
                          const sName = sieve.sieve_size || sieve.stamp || sieve.sieve || sieve.diamond_type || `Sieve #${sIdx + 1}`;

                          return (
                            <tr key={sIdx} className="hover:bg-stone-50">
                              <td className="py-2.5 px-3 font-semibold text-stone-800">{sName}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-medium">{sPcs > 0 ? sPcs : '—'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-700">{sCarats.toFixed(3)} ct</td>
                              <td className="py-2.5 px-3 text-right font-mono text-stone-600">{sRate > 0 ? `₹${sRate.toLocaleString('en-IN')}/ct` : '—'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">{sVal > 0 ? `₹${sVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs flex items-center justify-between">
                    <span className="text-stone-500">
                      Total Diamond Weight: <strong className="text-stone-800 font-mono">{Number(selectedPieceModal.diamond_weight || 0).toFixed(3)} ct</strong>
                    </span>
                    <span className="text-stone-500">
                      Diamond Pieces: <strong className="text-stone-800 font-mono">{selectedPieceModal.diamond_count || 0}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Stone and Other Component Details */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-shapes text-purple-500"></i>
                  <span>Stone &amp; Other Material Components</span>
                </h4>
                {Array.isArray(selectedPieceModal.components) && selectedPieceModal.components.length > 0 ? (
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Component Type</th>
                          <th className="py-2.5 px-3">Stamp / Size</th>
                          <th className="py-2.5 px-3 text-center">Quantity</th>
                          <th className="py-2.5 px-3 text-right">Weight</th>
                          <th className="py-2.5 px-3 text-right">Rate</th>
                          <th className="py-2.5 px-3 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedPieceModal.components.map((comp, cIdx) => {
                          const cQty = Number(comp.quantity ?? comp.no_of_pieces ?? comp.pieces ?? 1);
                          const cWt = Number(comp.weight ?? comp.stone_weight ?? comp.gross_wt ?? 0);
                          const cUnit = comp.unit || 'g';
                          const cRate = Number(comp.purchase_rate ?? comp.rate ?? 0);
                          const cVal = Number(comp.purchase_value ?? comp.value ?? (cRate > 0 && cWt > 0 ? cRate * cWt : 0));
                          const cType = comp.type || comp.name || comp.component_type || 'Component';

                          return (
                            <tr key={cIdx} className="hover:bg-stone-50">
                              <td className="py-2.5 px-3 font-semibold text-stone-800">{cType}</td>
                              <td className="py-2.5 px-3 text-stone-600 font-mono">{comp.stamp || comp.size || '—'}</td>
                              <td className="py-2.5 px-3 text-center font-mono">{cQty}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">{cWt.toFixed(3)} {cUnit}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-stone-600">{cRate > 0 ? `₹${cRate.toLocaleString('en-IN')}` : '—'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">{cVal > 0 ? `₹${cVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs flex flex-wrap items-center gap-4">
                    <span className="text-stone-500">
                      Color Stone Wt: <strong className="text-stone-800 font-mono">{Number(selectedPieceModal.color_stone_weight || 0).toFixed(3)} ct</strong>
                      {selectedPieceModal.color_stone_count > 0 && ` (${selectedPieceModal.color_stone_count} pcs)`}
                    </span>
                    {selectedPieceModal.silver_weight > 0 && (
                      <span className="text-stone-500">
                        Silver Wt: <strong className="text-stone-800 font-mono">{Number(selectedPieceModal.silver_weight).toFixed(3)}g</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Manufacturing & Audit Details */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-industry text-stone-400"></i>
                  <span>Manufacturing &amp; Audit Reference</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Karigar / Vendor</span>
                    <strong className="text-stone-800 block">{selectedPieceModal.karigar_name || 'In-House Karigar'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Received By Staff</span>
                    <strong className="text-stone-800 block">{selectedPieceModal.receiver_name || 'Staff Admin'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Work Order Reference</span>
                    <strong className="text-stone-800 font-mono block">
                      {selectedPieceModal.work_order_number || `WO-${selectedPieceModal.work_order_id || '—'}`}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-stone-100 flex items-center justify-end mt-4">
              <button
                type="button"
                onClick={() => setSelectedPieceModal(null)}
                className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
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
