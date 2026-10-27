import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { WorkOrderPrintHeader, WorkOrderPrintMetadata } from '../../components/WorkOrderPrintLayout';
import { printElement } from '../../utils/printHelper';
import Pagination from '../../components/Pagination';
import { normalizeNumericInput, handleNumericFocus } from '../../utils/numberInputUtils';

export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) return trimmed;
  // If url contains host IP or localhost (e.g. from Laravel asset() or APP_URL), strip origin to make host-agnostic
  let clean = trimmed.replace(/^https?:\/\/[^\/]+/, '');
  if (!clean) clean = trimmed;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('/storage//')) return clean.replace('/storage//', '/storage/');
  if (clean.startsWith('storage//')) return '/' + clean.replace('storage//', 'storage/');
  if (clean.startsWith('storage/')) return `/${clean}`;
  if (clean.startsWith('products/')) return `/storage/${clean}`;
  if (clean.startsWith('/products/')) return `/storage${clean}`;
  if (clean.startsWith('images/')) return `/${clean}`;
  if (clean.startsWith('/')) return clean;
  return `/storage/${clean}`;
};

export const resolveItemImage = (item) => {
  const raw =
    item?.reference_image ||
    item?.image ||
    item?.image_url ||
    item?.specifications?.image ||
    item?.product?.image_url ||
    item?.product?.image;
  if (!raw || typeof raw !== 'string') return '';
  if (raw.includes('placeholder-jewelry.png') || raw.includes('/samples/')) return '';
  return normalizeImageUrl(raw);
};

export const normalizeWorkOrderItems = (rawItems = [], order = null, existingItems = []) => {
  const getNum = (...candidates) => {
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== '') {
        const n = parseFloat(c);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  };

  const getVal = (...candidates) => {
    for (const c of candidates) {
      if (c !== undefined && c !== null) {
        const s = String(c).trim();
        if (s && s !== '-' && s !== '—' && s !== 'null' && s !== 'undefined') return s;
      }
    }
    return '';
  };

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    if (existingItems && existingItems.length > 0) return existingItems;
    if (order && parseFloat(order.allotted_weight) > 0) {
      const allocWt = parseFloat(order.allotted_weight) || 0;
      return [{
        id: Date.now(),
        work_order_no: order.work_order_number || '',
        form_no: order.work_order_number || '',
        product_name: order.product_name || order.category?.name || 'Jewellery Item',
        variant: order.product_name || order.category?.name || 'Jewellery Item',
        gold_purity: order.gold_purity || order.purity || order.material_type || '22K (916)',
        setting_type: 'Prong',
        gold_weight: allocWt.toFixed(3),
        total_weight: allocWt.toFixed(3),
        allotted_weight: allocWt.toFixed(3),
        need_pcs: order.required_qty || 1,
        qty: order.required_qty || 1,
        no_of_diamonds: 0,
        diamond_weight: '',
        total_gross_wt: allocWt.toFixed(3),
        total_dia_cts: '',
        reference_image: order.image_url ? normalizeImageUrl(order.image_url) : '',
        image: order.image_url ? normalizeImageUrl(order.image_url) : '',
        design_number: order.design_code || 'DG-4587',
      }];
    }
    return [];
  }

  return rawItems.map((raw, i) => {
    const existing = (existingItems && existingItems[i]) ||
      (existingItems && existingItems.find(ex => (ex.id && ex.id === raw.id) || (ex.design_number && (ex.design_number === raw.design_no || ex.design_number === raw.design_number))));

    let pd = {};
    if (raw.pricing_details) {
      try {
        pd = typeof raw.pricing_details === 'string'
          ? JSON.parse(raw.pricing_details)
          : (raw.pricing_details || {});
      } catch (e) {
        pd = {};
      }
    }

    const item = { ...(existing || {}), ...raw, ...pd };

    const pcs = parseInt(getNum(item.need_pcs, item.required_qty, item.qty, pd.need_pcs, pd.required_qty, existing?.need_pcs, existing?.required_qty, order?.required_qty) || 1, 10);
    const gw = getNum(
      raw.gold_weight,
      pd.gold_weight,
      existing?.gold_weight,
      raw.allotted_weight,
      existing?.allotted_weight,
      item.gold_weight,
      item.total_weight,
      item.allotted_weight,
      order?.allotted_weight ? parseFloat(order.allotted_weight) / Math.max(1, rawItems.length) : 0
    );

    const rawDiaWt = getVal(raw.diamond_weight, pd.diamond_weight, existing?.diamond_weight, item.diamond_weight);
    const cleanDiaWt = (rawDiaWt && rawDiaWt !== 'VS1' && rawDiaWt !== 'VVS2') ? rawDiaWt : '';
    const diaNum = getNum(cleanDiaWt, pd.diamond_weight, existing?.diamond_weight, item.diamond_weight);

    const diaCount = parseInt(getNum(
      raw.no_of_diamonds,
      pd.no_of_diamonds,
      existing?.no_of_diamonds,
      raw.diamond_count,
      pd.diamond_count,
      existing?.diamond_count,
      item.diamond_count,
      item.stone_details?.diamond_count,
      pd.stone_details?.diamond_count
    ), 10);

    const stoneCount = parseInt(getNum(
      raw.no_of_colour_stones,
      pd.no_of_colour_stones,
      existing?.no_of_colour_stones,
      raw.color_stone_count,
      pd.color_stone_count,
      existing?.color_stone_count,
      item.color_stone_count,
      item.stone_details?.color_stone_count
    ), 10);

    const gPurity = getVal(
      raw.gold_purity,
      pd.gold_purity,
      existing?.gold_purity,
      raw.purity,
      pd.purity,
      raw.karat,
      pd.karat,
      raw.gold_priory,
      pd.gold_priory,
      item.gold_purity,
      item.purity,
      order?.gold_purity,
      order?.purity,
      order?.karat,
      order?.material_type,
      '22K (916)'
    );

    const setting = getVal(raw.setting_type, pd.setting_type, existing?.setting_type, item.setting_type, 'Prong');
    const designNo = getVal(raw.design_number, pd.design_number, existing?.design_number, raw.design_no, existing?.design_no, item.design_number, order?.design_code, `DG-${4587 + i}`);
    const prodName = getVal(raw.product_name, pd.product_name, existing?.product_name, raw.variant, pd.variant, existing?.variant, item.product_name, order?.product_name, 'Jewellery Item');

    const totDiaCts = getNum(raw.total_dia_cts, pd.total_dia_cts, existing?.total_dia_cts) > 0
      ? String(getNum(raw.total_dia_cts, pd.total_dia_cts, existing?.total_dia_cts))
      : (diaNum > 0 ? (diaNum * pcs).toFixed(3) : '');

    const totGrossWt = getNum(raw.total_gross_wt, pd.total_gross_wt, existing?.total_gross_wt) > 0
      ? String(getNum(raw.total_gross_wt, pd.total_gross_wt, existing?.total_gross_wt))
      : (gw > 0 ? (gw * pcs).toFixed(3) : '0.000');

    const refImg = getVal(raw.reference_image, pd.reference_image, existing?.reference_image, raw.image, pd.image, existing?.image, item.reference_image, raw.product?.image_url, order?.image_url, '');
    const cleanImg = (refImg && !refImg.includes('/samples/')) ? normalizeImageUrl(refImg) : '';

    const sieves = Array.isArray(raw.diamond_sieves) && raw.diamond_sieves.length > 0
      ? raw.diamond_sieves
      : (Array.isArray(pd.diamond_sieves) && pd.diamond_sieves.length > 0
        ? pd.diamond_sieves
        : (Array.isArray(existing?.diamond_sieves) && existing.diamond_sieves.length > 0
          ? existing.diamond_sieves
          : (Array.isArray(item.diamond_sieves) && item.diamond_sieves.length > 0
            ? item.diamond_sieves
            : (Array.isArray(item.stone_details) ? item.stone_details : []))));

    return {
      ...item,
      id: item.id || (existing?.id) || (Date.now() + i),
      work_order_no: item.work_order_no || item.form_no || order?.work_order_number || '',
      form_no: item.work_order_no || item.form_no || order?.work_order_number || '',
      design_number: designNo,
      product_name: prodName,
      variant: prodName,
      gold_purity: gPurity,
      gold_stamp: getVal(raw.gold_stamp, pd.gold_stamp, existing?.gold_stamp, item.gold_stamp),
      setting_type: setting,
      need_pcs: pcs,
      qty: pcs,
      gold_weight: gw > 0 ? gw.toFixed(3) : (item.gold_weight || '0.000'),
      total_weight: gw > 0 ? gw.toFixed(3) : (item.total_weight || '0.000'),
      allotted_weight: gw > 0 ? gw.toFixed(3) : (item.allotted_weight || '0.000'),
      diamond_weight: cleanDiaWt,
      diamond_count: diaCount,
      no_of_diamonds: diaCount,
      color_stone_count: stoneCount,
      no_of_colour_stones: stoneCount,
      diamond_sieves: sieves,
      diamond_stamp: getVal(raw.diamond_stamp, pd.diamond_stamp, existing?.diamond_stamp, item.diamond_stamp),
      stamp_and_no: getVal(raw.stamp_and_no, pd.stamp_and_no, existing?.stamp_and_no, item.stamp_and_no, raw.stamp_details, pd.stamp_details),
      reference_image: cleanImg,
      image: cleanImg,
      design_file: getVal(raw.design_file, pd.design_file, existing?.design_file, item.design_file),
      design_file_name: getVal(raw.design_file_name, pd.design_file_name, existing?.design_file_name, item.design_file_name),
      design_file_type: getVal(raw.design_file_type, pd.design_file_type, existing?.design_file_type, item.design_file_type),
      total_gross_wt: totGrossWt,
      total_dia_cts: totDiaCts,
      remark: getVal(raw.remark, pd.remark, existing?.remark, item.remark, '-'),
    };
  });
};

export default function NewWorkOrder({ initialMode }) {
  const toastCtx = useToast();
  const rawShowToast = toastCtx?.showToast || ((msg) => console.log(msg));
  const toast = {
    success: (msg, title) => rawShowToast(msg, 'success', title),
    error: (msg, title) => rawShowToast(msg, 'error', title),
    info: (msg, title) => rawShowToast(msg, 'info', title),
    warning: (msg, title) => rawShowToast(msg, 'warning', title),
    showToast: rawShowToast,
  };
  const [goldRate22k, setGoldRate22k] = useState(0);
  useEffect(() => {
    api.get('/metal-rates').then(res => {
      if (res.data?.raw22k) setGoldRate22k(res.data.raw22k);
    }).catch(() => { });
  }, []);
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const [expandedDiamondRows, setExpandedDiamondRows] = useState({});

  const toggleDiamondExpansion = (key, e) => {
    e?.stopPropagation();
    setExpandedDiamondRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderDiamondDetails = (r, rowIndex = 0) => {
    let sieves = [];
    const pd = typeof r.pricing_details === 'string' ? JSON.parse(r.pricing_details || '{}') : (r.pricing_details || {});

    if (Array.isArray(r.diamond_sieves) && r.diamond_sieves.length > 0) {
      sieves = r.diamond_sieves;
    } else if (Array.isArray(pd.diamond_sieves) && pd.diamond_sieves.length > 0) {
      sieves = pd.diamond_sieves;
    } else if (typeof r.stone_details === 'string' && r.stone_details.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(r.stone_details);
        if (Array.isArray(parsed) && parsed.length > 0) sieves = parsed;
      } catch (_) {}
    } else if (Array.isArray(r.stone_details) && r.stone_details.length > 0) {
      sieves = r.stone_details;
    } else if (Array.isArray(r.diamond_components) && r.diamond_components.length > 0) {
      sieves = r.diamond_components.map(c => ({
        stamp: c.stamp || c.sieve || c.component_type || '—',
        count: c.no_of_pieces || c.pieces || c.count || 0,
        weight: c.weight || c.carats || 0,
      }));
    }

    const validSieves = sieves.filter(s => s && (s.stamp || s.count || s.weight || s.carats || s.pieces));

    if (validSieves.length > 0) {
      const rowKey = r.id || `row-${rowIndex}`;
      const isExpanded = !!expandedDiamondRows[rowKey];
      const hasMany = validSieves.length > 2;
      const displaySieves = (hasMany && !isExpanded) ? validSieves.slice(0, 2) : validSieves;

      return (
        <div className="flex flex-col gap-1 items-center justify-center font-mono">
          {displaySieves.map((s, idx) => {
            const st = s.stamp || s.sieve || '—';
            const cnt = s.count ?? s.pieces ?? s.no_of_diamonds ?? 0;
            const wt = s.weight ?? s.carats ?? s.diamond_weight ?? 0;
            const wtFormatted = (!isNaN(parseFloat(wt)) && parseFloat(wt) > 0) ? `${Number(wt).toFixed(3)}ct` : (wt ? String(wt) : '—');
            return (
              <div key={idx} className="bg-purple-50 text-purple-950 px-1.5 py-0.5 rounded border border-purple-200/80 text-[7.5px] leading-tight whitespace-nowrap shadow-2xs">
                <span className="text-purple-900 font-bold">{st}</span>
                <span className="text-stone-400 mx-1">/</span>
                <span className="text-emerald-800 font-semibold">{cnt} pcs</span>
                <span className="text-stone-400 mx-1">/</span>
                <span className="text-indigo-900 font-bold">{wtFormatted}</span>
              </div>
            );
          })}

          {hasMany && (
            <button
              type="button"
              onClick={(e) => toggleDiamondExpansion(rowKey, e)}
              className="mt-0.5 text-[8px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded px-1.5 py-0.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap flex items-center gap-1"
              title={isExpanded ? 'Collapse diamond types' : `View all ${validSieves.length} diamond types`}
            >
              {isExpanded ? (
                <span>Show Less ▲</span>
              ) : (
                <span>+{validSieves.length - 2} more ({validSieves.length} types) ▼</span>
              )}
            </button>
          )}
        </div>
      );
    }

    const stamp = r.diamond_stamp || pd.diamond_stamp || r.stamp_and_no || pd.stamp_and_no || r.stamp_details || pd.stamp_details;
    const count = parseInt(r.no_of_diamonds ?? pd.no_of_diamonds ?? r.diamond_count ?? pd.diamond_count ?? 0, 10);
    const wtVal = (r.diamond_weight && r.diamond_weight !== 'VS1' && r.diamond_weight !== 'VVS2') ? r.diamond_weight : (pd.diamond_weight || '');
    const wtNum = parseFloat(wtVal) || 0;

    if (stamp || count > 0 || wtNum > 0) {
      return (
        <div className="bg-purple-50 text-purple-950 px-1.5 py-0.5 rounded border border-purple-200/80 text-[7.5px] leading-tight whitespace-nowrap font-mono inline-block">
          <span className="text-purple-900 font-bold">{stamp || '—'}</span>
          <span className="text-stone-400 mx-1">/</span>
          <span className="text-emerald-800 font-semibold">{count} pcs</span>
          <span className="text-stone-400 mx-1">/</span>
          <span className="text-indigo-900 font-bold">{wtNum > 0 ? `${wtNum.toFixed(3)}ct` : '—'}</span>
        </div>
      );
    }

    return <span className="text-stone-400">—</span>;
  };

  // Modes: 'create', 'details', 'list'
  const targetId = params.id || searchParams.get('id');
  const [viewMode, setViewMode] = useState(() => {
    if (targetId) return 'details';
    if (initialMode) return initialMode;
    return 'create';
  });

  const [orders, setOrders] = useState([]);
  const [karigars, setKarigars] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [settingStyles, setSettingStyles] = useState([]);
  const [stampsList, setStampsList] = useState([]);
  const [showStylesModal, setShowStylesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchSettingStyles = async () => {
    try {
      const res = await api.get('/styles');
      const list = res.data || [];
      setSettingStyles(list);
      if (list.length > 0) {
        setRowForm((prev) => {
          const isValid = list.some((s) => s.name === prev.setting_type);
          return isValid ? prev : { ...prev, setting_type: list[0].name };
        });
      }
    } catch (err) {
      console.error('Failed to fetch setting styles:', err);
    }
  };

  const fetchStamps = async () => {
    try {
      const res = await api.get('/stamps');
      setStampsList(res.data?.data || (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      console.error('Failed to fetch stamps:', err);
    }
  };

  useEffect(() => {
    fetchSettingStyles();
    fetchStamps();
  }, []);

  // Search & Filter for list mode and month filter
  const [search, setSearch] = useState('');
  const [karigarFilter, setKarigarFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Work Order Header info - clean initially, populated by generator
  const [orderNumber, setOrderNumber] = useState('');

  // Multi-job table items (No default rows on create)
  const [jobItems, setJobItems] = useState([]);

  // Modal for adding / editing a job row
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Dynamic Insufficient Diamond Stock Popup modal state
  const [insufficientStockData, setInsufficientStockData] = useState(null);

  // Live Previews Slider indices for Reference Image & CAD Design (Multi-Job navigation)
  const [refSliderIndex, setRefSliderIndex] = useState(0);
  const [cadSliderIndex, setCadSliderIndex] = useState(0);

  // Helper to parse diamond stamp and stones input e.g. "+7-4, +5-7" -> stamp +7 (4 pcs), stamp +5 (7 pcs), total = 11
  const parseDiamondStampAndNo = (inputStr) => {
    if (!inputStr || typeof inputStr !== 'string') return { totalStones: 0, items: [], summaryText: '' };
    const tokens = inputStr.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    let totalStones = 0;
    const items = [];
    for (const rawToken of tokens) {
      const match = rawToken.match(/^([+-]?\w+(?:\.\w+)?)\s*[-:]\s*(\d+)$/);
      if (match) {
        const stamp = match[1];
        const count = parseInt(match[2], 10);
        if (!isNaN(count)) {
          totalStones += count;
          items.push({ stamp, count, raw: rawToken });
        }
      }
    }
    const summaryText = items.map((it) => `Stamp ${it.stamp}: ${it.count} pcs`).join(', ');
    return { totalStones, items, summaryText };
  };

  const handleAddDiamondSieve = () => {
    setRowForm(prev => {
      const sieves = Array.isArray(prev.diamond_sieves) ? [...prev.diamond_sieves] : [];
      sieves.push({ stamp: '', count: '', weight: '' });
      return { ...prev, diamond_sieves: sieves };
    });
  };

  const handleUpdateDiamondSieve = (index, field, value) => {
    setRowForm(prev => {
      const sieves = Array.isArray(prev.diamond_sieves) ? [...prev.diamond_sieves] : [];
      if (!sieves[index]) sieves[index] = { stamp: '', count: '', weight: '' };
      sieves[index][field] = value;

      let totalStones = 0;
      let totalCarats = 0;
      const parts = [];

      sieves.forEach(s => {
        const c = parseInt(s.count, 10) || 0;
        const w = parseFloat(s.weight) || 0;
        totalStones += c;
        totalCarats += w;
        if (s.stamp && c > 0) {
          parts.push(`${s.stamp}-${c}${w > 0 ? ` (${w}ct)` : ''}`);
        }
      });

      const pcs = parseInt(prev.need_pcs, 10) || 1;
      const totalDiaCts = totalCarats > 0 ? (totalCarats * pcs).toFixed(3) : prev.total_dia_cts;

      return {
        ...prev,
        diamond_sieves: sieves,
        no_of_diamonds: totalStones > 0 ? totalStones : prev.no_of_diamonds,
        diamond_count: totalStones > 0 ? totalStones : prev.diamond_count,
        diamond_weight: totalCarats > 0 ? totalCarats.toFixed(3) : prev.diamond_weight,
        total_dia_cts: totalDiaCts,
        stamp_and_no: parts.length > 0 ? parts.join(', ') : prev.stamp_and_no,
        diamond_stamp: sieves[0]?.stamp || prev.diamond_stamp,
      };
    });
  };

  const handleRemoveDiamondSieve = (index) => {
    setRowForm(prev => {
      const sieves = (prev.diamond_sieves || []).filter((_, i) => i !== index);
      let totalStones = 0;
      let totalCarats = 0;
      const parts = [];

      sieves.forEach(s => {
        const c = parseInt(s.count, 10) || 0;
        const w = parseFloat(s.weight) || 0;
        totalStones += c;
        totalCarats += w;
        if (s.stamp && c > 0) {
          parts.push(`${s.stamp}-${c}${w > 0 ? ` (${w}ct)` : ''}`);
        }
      });

      const pcs = parseInt(prev.need_pcs, 10) || 1;
      const totalDiaCts = totalCarats > 0 ? (totalCarats * pcs).toFixed(3) : '';

      return {
        ...prev,
        diamond_sieves: sieves,
        no_of_diamonds: totalStones,
        diamond_count: totalStones,
        diamond_weight: totalCarats > 0 ? totalCarats.toFixed(3) : '',
        total_dia_cts: totalDiaCts,
        stamp_and_no: parts.join(', '),
      };
    });
  };

  const updateFormField = (field, val) => {
    const numericFields = [
      'need_pcs', 'diamond_count', 'color_stone_count', 'no_of_diamonds',
      'no_of_colour_stones', 'diamond_weight', 'color_stone_weight',
      'diamond_wt_from', 'diamond_wt_to', 'gold_weight', 'gold_wt_from',
      'gold_wt_to', 'total_gross_wt', 'total_gold_wt', 'total_dia_cts'
    ];
    const sanitizedVal = numericFields.includes(field)
      ? normalizeNumericInput(val, rowForm[field])
      : val;

    setRowForm((prev) => ({ ...prev, [field]: sanitizedVal }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const defaultRowForm = {
    work_order_no: '',
    form_no: '',
    product_id: null,
    design_number: '',
    product_name: '',
    reference_image: '',
    reference_image_name: '',
    reference_image_type: '',
    design_file: '',
    design_file_name: '',
    design_file_type: '',
    gold_purity: '',
    gold_karat: '',
    gold_stamp: '',
    setting_type: 'Open setting',
    diamond_weight: '',
    diamond_count: 0,
    diamond_stamp: '',
    stamp_and_no: '',
    diamond_sieves: [],
    color_stone_weight: '',
    color_stone_count: 0,
    color_stone_stamp: '',
    diamond_wt_from: '',
    diamond_wt_to: '',
    gold_weight: '',
    gold_wt_from: '',
    gold_wt_to: '',
    need_pcs: 1,
    no_of_diamonds: 0,
    no_of_colour_stones: 0,
    total_gross_wt: '',
    total_gold_wt: '',
    total_dia_cts: '',
    remark: '-',
    material_type: '',
    material_subtitle: '',
    work_name: '',
    ordered_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    image: '',
    image_name: '',
    variant: '',
    cons_cts: '-',
    from_cts: '',
    total_cts: '',
    cons_wt: '',
    from_wt: '',
    to_wt: '',
    wastage: '0.000',
    percentages: '0.00%',
    total_weight: '',
    old_weight: '0.000',
    qty: 1,
    gold_priory: '',
  };

  const [rowForm, setRowForm] = useState(defaultRowForm);

  const updateRowFormAndCalculate = (field, val) => {
    const numericFields = [
      'need_pcs', 'diamond_count', 'color_stone_count', 'no_of_diamonds',
      'no_of_colour_stones', 'diamond_weight', 'color_stone_weight',
      'diamond_wt_from', 'diamond_wt_to', 'gold_weight', 'fine_gold_weight', 'gold_wt_from',
      'gold_wt_to', 'total_gross_wt', 'total_gold_wt', 'total_dia_cts'
    ];
    const sanitizedVal = numericFields.includes(field)
      ? normalizeNumericInput(val, rowForm[field])
      : val;

    setRowForm((prev) => {
      const next = { ...prev, [field]: sanitizedVal };
      const goldWt = parseFloat(field === 'gold_weight' ? sanitizedVal : next.gold_weight) || 0;
      const diaWt = parseFloat(field === 'diamond_weight' ? sanitizedVal : next.diamond_weight) || 0;
      const pcs = parseInt(field === 'need_pcs' ? sanitizedVal : next.need_pcs, 10) || 1;

      // Keep Gold weight (g) and Diamond carats (ct) separate
      const calcGold = goldWt > 0 ? (goldWt * pcs).toFixed(3) : '';
      next.total_gold_wt = calcGold;
      next.total_gross_wt = calcGold;
      next.total_dia_cts = diaWt > 0 ? (diaWt * pcs).toFixed(3) : '';

      if (field === 'gold_weight' || field === 'gold_purity') {
        const purityStr = field === 'gold_purity' ? sanitizedVal : next.gold_purity;
        const parseRatio = (str) => {
          if (!str) return 0.916;
          const s = String(str).toLowerCase();
          if (s.includes('24') || s.includes('999')) return 0.999;
          if (s.includes('22') || s.includes('916')) return 0.916;
          if (s.includes('18') || s.includes('750')) return 0.750;
          if (s.includes('14') || s.includes('585')) return 0.585;
          const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
          if (m) return parseFloat(m[1]) / 100;
          return 0.916;
        };
        if (goldWt > 0) {
          next.fine_gold_weight = (goldWt * parseRatio(purityStr)).toFixed(3);
        } else if (goldWt === 0) {
          next.fine_gold_weight = '';
        }
      }
      return next;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const nextErr = { ...prev };
        delete nextErr[field];
        return nextErr;
      });
    }
  };

  const handleDesignNumberChange = async (val) => {
    updateRowFormAndCalculate('design_number', val);
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return;
    }

    const applyProductData = (p, fromApi = false) => {
      setRowForm((prev) => {
        const goldWt = (p.gold_weight !== undefined && p.gold_weight !== null && p.gold_weight !== '')
          ? String(p.gold_weight)
          : (p.net_gold_weight !== undefined && p.net_gold_weight !== null && p.net_gold_weight !== ''
            ? String(p.net_gold_weight)
            : (p.attributes?.net_wt !== undefined ? String(p.attributes.net_wt) : (p.opening_fine_weight ? String(p.opening_fine_weight) : '')));

        const pcs = parseInt(prev.need_pcs || 1, 10);
        const goldWtNum = parseFloat(goldWt) || 0;

        // Auto-assign product's real image (ignoring generic sample / placeholder images)
        const rawImg = p.image_url || p.image || p.thumbnail_url || p.specifications?.image || '';
        const isPlaceholder = !rawImg || rawImg.includes('placeholder-jewelry.png') || rawImg.includes('/samples/');
        const productImg = isPlaceholder ? '' : normalizeImageUrl(rawImg);
        const prodName = p.product_name || p.name || prev.product_name || '';
        const imgName = productImg ? (prodName ? `${prodName} Reference` : 'Product Image Attached') : '';

        // Extract and populate multiple diamond types / sieves (ensuring metal gross weight never leaks)
        let sieveRows = [];
        const rawComps = (Array.isArray(p.diamond_components) && p.diamond_components.length > 0)
          ? p.diamond_components
          : (Array.isArray(p.components) ? p.components : (Array.isArray(p.attributes?.components) ? p.attributes.components : []));

        if (Array.isArray(p.diamond_components) && p.diamond_components.length > 0) {
          sieveRows = p.diamond_components
            .filter((dc) => (parseFloat(dc.diamond_weight || dc.weight || 0) > 0))
            .map((dc) => ({
              stamp: dc.stamp || dc.size || '',
              count: parseInt(dc.diamond_count || dc.count || 1, 10),
              weight: parseFloat(dc.diamond_weight || dc.weight || 0),
              rate: parseFloat(dc.purchase_rate || dc.rate || 0),
            }));
        } else if (rawComps.length > 0) {
          rawComps.forEach((c) => {
            // Strictly exclude metal components or whole-product primary rows
            if (c.is_metal || c.is_primary) return;
            const matType = String(c.material_type || '').toLowerCase();
            if (['gold', 'silver', 'platinum', 'metal'].includes(matType)) return;

            const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase().trim();
            // Ignore if category/item name describes a finished jewelry article rather than a stone
            if (
              cName.includes('diamond cut') ||
              cName.includes('diamond-cut') ||
              cName.includes('ring') ||
              cName.includes('bangle') ||
              cName.includes('necklace') ||
              cName.includes('chain') ||
              cName.includes('choker') ||
              cName.includes('earring') ||
              cName.includes('pendant')
            ) {
              return;
            }

            const isDia = c.is_diamond === true ||
              c.component_type === 'diamond' ||
              cName === 'diamond' ||
              cName.startsWith('diamond ') ||
              /\bdia\b/.test(cName) ||
              cName.includes('solitaire');

            if (isDia) {
              const unit = (c.unit || '').toLowerCase();
              const isCt = unit === 'ct' || unit === 'carats' || unit === 'carat';
              const w = parseFloat(c.stone_weight ?? (isCt ? (c.weight ?? c.gross_wt) : (c.diamond_weight ?? 0)) ?? 0) || 0;
              if (w > 0) {
                sieveRows.push({
                  stamp: c.stamp || c.size || '',
                  count: parseInt(c.no_of_pieces || c.quantity || 1, 10),
                  weight: w,
                  rate: parseFloat(c.purchase_rate || 0),
                });
              }
            }
          });
        }

        let calculatedDiaWeight = '';
        let calculatedDiaCount = 0;

        if (sieveRows.length > 0) {
          const sumCarats = sieveRows.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0);
          const sumCount = sieveRows.reduce((sum, s) => sum + (parseInt(s.count, 10) || 0), 0);
          calculatedDiaWeight = sumCarats > 0 ? sumCarats.toFixed(3) : '';
          calculatedDiaCount = sumCount;
        } else {
          // If no diamond sieve rows, verify explicit diamond weight is not a duplicate/leakage of gross weight
          const grossNum = parseFloat(p.gross_weight ?? p.attributes?.gross_wt ?? p.opening_stock_weight ?? 0);
          const rawDiaWt = parseFloat(p.diamond_weight ?? p.attributes?.dia_wt_ct ?? p.attributes?.diamond_wt ?? p.attributes?.diamond_weight ?? 0);
          const rawDiaCount = parseInt(p.diamond_count ?? p.attributes?.diamond_count ?? p.attributes?.no_of_diamonds ?? 0, 10);

          const isLeakedGross = grossNum > 0 && Math.abs(rawDiaWt - grossNum) < 0.001 && rawDiaCount === 0;

          if (rawDiaWt > 0 && rawDiaCount > 0 && !isLeakedGross) {
            calculatedDiaWeight = rawDiaWt.toFixed(3);
            calculatedDiaCount = rawDiaCount;
          }
        }

        const diaWtNum = parseFloat(calculatedDiaWeight) || 0;
        const stoneCount = parseInt(p.color_stone_count ?? p.attributes?.stone_count ?? prev.no_of_colour_stones ?? 0, 10);

        const goldPurityVal = p.gold_purity || (p.attributes?.purity ? String(p.attributes.purity) : '') || (p.attributes?.gold_purity ? String(p.attributes.gold_purity) : '') || (p.attributes?.gold_type ? String(p.attributes.gold_type) : '') || (p.opening_touch ? String(p.opening_touch) : '') || (p.gold_karat ? `${p.gold_karat}K` : '') || (p.attributes?.karat ? `${p.attributes.karat}` : '') || prev.gold_purity || '22K (916)';

        const parsePurityRatio = (str) => {
          if (!str) return 0.916;
          const s = String(str).toLowerCase();
          if (s.includes('24') || s.includes('999')) return 0.999;
          if (s.includes('22') || s.includes('916')) return 0.916;
          if (s.includes('18') || s.includes('750')) return 0.750;
          if (s.includes('14') || s.includes('585')) return 0.585;
          const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
          if (m) return parseFloat(m[1]) / 100;
          return 0.916;
        };

        const fineGoldWt = p.fine_gold_weight !== undefined && p.fine_gold_weight !== null
          ? String(p.fine_gold_weight)
          : (goldWtNum > 0 ? (goldWtNum * parsePurityRatio(goldPurityVal)).toFixed(3) : '');

        return {
          ...prev,
          product_id: p.product_id || p.id || prev.product_id,
          product_name: prodName,
          variant: prodName || prev.variant || '',
          gold_purity: goldPurityVal,
          gold_karat: p.gold_karat || (p.attributes?.karat || ''),
          gold_stamp: p.gold_stamp || (p.attributes?.stamp || ''),
          setting_type: p.setting_type || (p.attributes?.setting_style || prev.setting_type || 'Prong'),
          gold_weight: goldWt || prev.gold_weight || '',
          fine_gold_weight: fineGoldWt,
          diamond_weight: calculatedDiaWeight || prev.diamond_weight || '',
          diamond_count: calculatedDiaCount,
          no_of_diamonds: calculatedDiaCount,
          diamond_stamp: p.diamond_stamp || (p.attributes?.diamond_stamp || '') || (sieveRows[0]?.stamp || ''),
          stamp_and_no: sieveRows.length > 0
            ? sieveRows.map(s => `${s.stamp}-${s.count}`).join(', ')
            : (p.diamond_stamp || (p.attributes?.diamond_stamp || '') || prev.stamp_and_no || ''),
          diamond_sieves: sieveRows.length > 0 ? sieveRows : prev.diamond_sieves,
          color_stone_weight: p.color_stone_weight || (p.attributes?.stone_weight ? String(p.attributes.stone_weight) : ''),
          color_stone_count: stoneCount,
          no_of_colour_stones: stoneCount,
          color_stone_stamp: p.color_stone_stamp || (p.attributes?.color_stone_stamp || ''),
          reference_image: productImg,
          reference_image_name: imgName,
          reference_image_type: productImg ? 'image' : '',
          image: productImg,
          total_gross_wt: goldWtNum > 0 ? (goldWtNum * pcs).toFixed(3) : prev.total_gross_wt,
          total_dia_cts: diaWtNum > 0 ? (diaWtNum * pcs).toFixed(3) : prev.total_dia_cts,
        };
      });
      if (fromApi && (p.product_name || p.name)) {
        toast.info(`Product "${p.product_name || p.name}" image and details attached.`);
      }
    };

    // 1. Instant check against inventory products in memory
    const searchLower = trimmed.toLowerCase();
    const localMatch = inventoryProducts.find((p) => {
      const dCode = String(p.design_no || '').trim().toLowerCase();
      const pCode = String(p.product_code || '').trim().toLowerCase();
      return (dCode && dCode === searchLower) || (pCode && pCode === searchLower);
    });

    if (localMatch) {
      applyProductData(localMatch, false);
    }

    // 2. Query backend lookup-design for authoritative data & attributes
    if (trimmed.length >= 2) {
      try {
        const res = await api.get('/products/lookup-design', { params: { design_number: trimmed } });
        if (res.data && res.data.found) {
          applyProductData(res.data, true);
        } else if (!localMatch) {
          setRowForm((prev) => ({
            ...prev,
            product_id: null,
          }));
        }
      } catch (err) {
        // Silently continue
      }
    }
  };

  // Document preview lightbox state
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewDoc) {
        setPreviewDoc(null);
      }
    };
    if (previewDoc) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc]);

  const handleOpenDocument = (doc) => {
    if (!doc) return;
    setPreviewDoc(doc);
  };

  // Active documents dynamically collected from job items and order details
  const activeDocuments = useMemo(() => {
    const docs = [];
    const seenUrls = new Set();
    const seenNames = new Set();

    const pushDoc = (url, name, type, source) => {
      if (!url || typeof url !== 'string' || !url.trim()) return;

      const isDataUrl = url.startsWith('data:');
      const isPdf = isDataUrl ? url.includes('data:application/pdf') : url.toLowerCase().endsWith('.pdf');
      const isImg = isDataUrl
        ? url.includes('data:image/')
        : /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

      const finalType = type || (isPdf ? 'pdf' : (isImg ? 'image' : 'file'));

      let finalName = name;
      if (!finalName) {
        if (!isDataUrl) {
          const parts = url.split('/');
          const filename = parts[parts.length - 1];
          if (filename && filename.length > 2 && !filename.startsWith('ruby_set') && !filename.startsWith('peacock_choker')) {
            finalName = filename;
          }
        }
        if (!finalName) {
          finalName = `${source || 'Attached File'}.${finalType === 'pdf' ? 'pdf' : (finalType === 'image' ? 'jpg' : 'file')}`;
        }
      }

      // Clean normalized URL and filename for robust deduplication
      const normUrl = url.replace(/^\//, '').split('?')[0].toLowerCase().trim();
      const normName = (finalName || '').toLowerCase().trim();

      if (seenUrls.has(normUrl)) return;
      if (normName && seenNames.has(normName) && !isDataUrl) return;

      seenUrls.add(normUrl);
      if (normName) seenNames.add(normName);

      docs.push({
        id: `doc-${docs.length + 1}-${normUrl.slice(-15)}`,
        name: finalName,
        type: finalType,
        url,
        source,
      });
    };

    // 1. Scan Table Items (jobItems or selectedOrder.items)
    const itemsToScan = (jobItems && jobItems.length > 0)
      ? jobItems
      : (selectedOrder?.items || []);

    itemsToScan.forEach((item, idx) => {
      const label = item.design_number ? `Design ${item.design_number}` : `Item #${idx + 1}`;
      if (item.reference_image) {
        pushDoc(item.reference_image, item.reference_image_name, item.reference_image_type || 'image', `${label} Reference`);
      }
      if (item.design_file) {
        pushDoc(item.design_file, item.design_file_name, item.design_file_type, `${label} Design`);
      }
      if (item.image && item.image !== item.design_file && item.image !== item.reference_image) {
        pushDoc(item.image, item.image_name, 'image', `${label} Photo`);
      }
    });

    // 2. Scan Standalone Documents on selectedOrder
    if (selectedOrder && Array.isArray(selectedOrder.documents)) {
      selectedOrder.documents.forEach((d) => {
        if (typeof d === 'string') pushDoc(d, null, null, 'Order Document');
        else if (d?.url) pushDoc(d.url, d.name, d.type, 'Order Document');
      });
    }

    return docs;
  }, [jobItems, selectedOrder]);

  // Formatting helpers for table
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return s;
  };

  const formatWeight = (val, fallback = '0.000') => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = parseFloat(val);
    if (isNaN(num)) return fallback;
    return num.toFixed(3);
  };

  // Worker Allocation fields - Assigned once to this worker
  const [workerId, setWorkerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [goldIssued, setGoldIssued] = useState('0.00');
  const [goldUsed, setGoldUsed] = useState('0.00');

  const assignedWorker =
    karigars.find((k) => String(k.id) === String(workerId)) ||
    (selectedOrder?.karigar || (selectedOrder?.karigar_name ? { name: selectedOrder.karigar_name } : null));

  // Timeline fields
  const [timeline, setTimeline] = useState({
    estimated_start_date: new Date().toISOString().split('T')[0],
    sent_date: new Date().toISOString().split('T')[0],
    promised_due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: 'MEDIUM',
  });

  // Crafting instructions - clean on new creation
  const [craftingInstructions, setCraftingInstructions] = useState('');

  // Attached Documents - clean on new creation
  const [documents, setDocuments] = useState([]);

  // File upload input refs for Design File and Reference Image
  const designFileInputRef = useRef(null);
  const refImageInputRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Client-side image optimizer to keep uploads lightweight (< 300KB) and prevent payload-too-large server crashes
  const readFileWithOptimization = (file) => {
    return new Promise((resolve) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = ext === 'pdf';
      const isImg = ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext) || file.type.startsWith('image/');
      const docType = isPdf ? 'pdf' : (isImg ? 'image' : 'file');

      if (!isImg) {
        const reader = new FileReader();
        reader.onload = (uploadEvt) => {
          resolve({ res: uploadEvt.target?.result || '', ext, isImg: false, docType });
        };
        reader.onerror = () => resolve({ res: '', ext, isImg: false, docType });
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const rawUrl = uploadEvt.target?.result || '';
        // If already under 400KB, use directly
        if (file.size < 400 * 1024) {
          resolve({ res: rawUrl, ext, isImg: true, docType });
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const maxDimension = 1400;
            let width = img.width;
            let height = img.height;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ res: optimized, ext: 'jpg', isImg: true, docType });
          } catch (err) {
            resolve({ res: rawUrl, ext, isImg: true, docType });
          }
        };
        img.onerror = () => resolve({ res: rawUrl, ext, isImg: true, docType });
        img.src = rawUrl;
      };
      reader.onerror = () => resolve({ res: '', ext, isImg: true, docType });
      reader.readAsDataURL(file);
    });
  };

  // Handle Design File upload (CAD / sketch / blueprint / photo)
  const handleDesignFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { res, docType, isImg } = await readFileWithOptimization(file);
      if (res) {
        setRowForm((prev) => ({
          ...prev,
          design_file: res,
          design_file_name: file.name,
          design_file_type: docType,
          image: isImg ? res : prev.image,
          image_name: isImg ? file.name : prev.image_name,
        }));
        if (toast?.success) toast.success(`Design file "${file.name}" uploaded successfully.`);
      }
    }
    if (e?.target) e.target.value = '';
  };

  // Handle Reference Image upload (client / sample picture)
  const handleReferenceImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { res, docType } = await readFileWithOptimization(file);
      if (res) {
        setRowForm((prev) => ({
          ...prev,
          reference_image: res,
          reference_image_name: file.name,
          reference_image_type: docType,
          image: res,
          image_name: file.name,
        }));
        if (toast?.success) toast.success(`Reference image "${file.name}" uploaded successfully.`);
      }
    }
    if (e?.target) e.target.value = '';
  };

  // Handle image file upload (backwards compatibility)
  const handleImageFileUpload = (e) => {
    handleDesignFileUpload(e);
  };

  // Start fresh Work Order creation (clear viewed order data)
  const handleStartNewWorkOrder = async () => {
    setSelectedOrder(null);
    setJobItems([]);
    setCustomerName('');
    setWorkerId('');
    setGoldIssued('0.00');
    setGoldUsed('0.00');
    setCraftingInstructions('');
    setDocuments([]);
    setTimeline({
      estimated_start_date: new Date().toISOString().split('T')[0],
      sent_date: new Date().toISOString().split('T')[0],
      promised_due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: 'MEDIUM',
    });
    setRowForm(defaultRowForm);
    setFormErrors({});
    setEditingRowIndex(null);
    setViewMode('create');

    if (params.id) {
      navigate('/job-order/new', { replace: true });
    }

    try {
      const noRes = await api.get('/job-orders/generate-number').catch(() => api.get('/work-orders/generate-number'));
      if (noRes?.data?.job_order_number || noRes?.data?.work_order_number) {
        setOrderNumber(noRes.data.job_order_number || noRes.data.work_order_number);
      }
    } catch (err) {
      console.warn('Failed to fetch new order number:', err);
    }
  };

  // Load prerequisites
  useEffect(() => {
    fetchPrerequisites();
  }, []);

  // Only load orders list when in list view mode, debounced for search & filter
  useEffect(() => {
    if (viewMode === 'list') {
      const timer = setTimeout(() => {
        fetchOrdersList();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [viewMode, search, karigarFilter]);

  // Reset to page 1 whenever search query or artisan filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, karigarFilter]);

  // Filter & paginate orders for list view
  const filteredOrders = useMemo(() => {
    if (!search || !search.trim()) return orders;
    const q = search.toLowerCase().trim();
    return orders.filter((wo) => {
      const orderNum = (wo.work_order_number || '').toLowerCase();
      const jobNum = (wo.job_number || '').toLowerCase();
      const cust = (wo.customer_name || wo.client?.full_name || wo.client?.name || '').toLowerCase();
      const artisan = (wo.karigar_name || '').toLowerCase();
      const prod = (wo.product_name || '').toLowerCase();
      const itemsMatch = Array.isArray(wo.items) && wo.items.some((itm) =>
        (itm.design_no || '').toLowerCase().includes(q) ||
        (itm.product_name || '').toLowerCase().includes(q)
      );
      return orderNum.includes(q) || jobNum.includes(q) || cust.includes(q) || artisan.includes(q) || prod.includes(q) || itemsMatch;
    });
  }, [orders, search]);

  const totalOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (targetId) {
      loadOrderDetails(targetId);
    } else {
      const queryDesignNo = searchParams.get('design_no');
      if (queryDesignNo && viewMode === 'create') {
        handleDesignNumberChange(queryDesignNo);
        setShowRowModal(true);
      }
    }
  }, [targetId, searchParams]);

  const fetchPrerequisites = async () => {
    try {
      const [kRes, noRes, prodRes, cRes, stampsRes] = await Promise.all([
        api.get('/karigars'),
        api.get('/job-orders/generate-number').catch(() => api.get('/work-orders/generate-number')),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/clients').catch(() => ({ data: { clients: [] } })),
        api.get('/stamps').catch(() => ({ data: [] })),
      ]);
      const kList = kRes.data.data || [];
      setKarigars(kList);
      const pList = Array.isArray(prodRes?.data) ? prodRes.data : (prodRes?.data?.data || []);
      setInventoryProducts(pList);
      const cList = cRes?.data?.clients || cRes?.data?.data || (Array.isArray(cRes?.data) ? cRes.data : []);
      setClientsList(cList);
      const sList = stampsRes?.data?.data || (Array.isArray(stampsRes?.data) ? stampsRes.data : []);
      if (sList.length > 0) setStampsList(sList);
      if ((noRes?.data?.job_order_number || noRes?.data?.work_order_number) && !targetId) {
        setOrderNumber(noRes.data.job_order_number || noRes.data.work_order_number);
      }
    } catch (err) {
      console.warn('Prerequisites fetch warning:', err);
    }
  };

  const fetchOrdersList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/work-orders', {
        params: { search, karigar_id: karigarFilter },
      });
      setOrders(res.data.data || []);
    } catch (err) {
      console.error('Failed to load orders list:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/work-orders/${id}`);
      if (res.data?.status === 'success') {
        const order = res.data.data;
        setSelectedOrder(order);
        setOrderNumber(order.work_order_number);
        setWorkerId(order.karigar_id || '');
        setCustomerName(order.customer_name || order.client?.full_name || order.client?.name || '');

        // Populate items with full 21-column schema
        let details = order.pricing_details || {};
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch (e) {
            details = {};
          }
        }

        let rawItems = [];
        if (Array.isArray(details.items) && details.items.length > 0) {
          rawItems = details.items;
        } else if (Array.isArray(order.items) && order.items.length > 0) {
          rawItems = order.items;
        } else if (Array.isArray(order.items_list) && order.items_list.length > 0) {
          rawItems = order.items_list;
        } else if (order.specifications && typeof order.specifications === 'object') {
          rawItems = [order.specifications];
        }

        const normalizedItems = normalizeWorkOrderItems(rawItems, order, jobItems);
        setJobItems(normalizedItems);

        // Populate worker allocation & material tracking - guaranteed up-to-date!
        const alloc = details.worker_allocation || {};
        const issued = alloc.gold_issued !== undefined && alloc.gold_issued !== null && alloc.gold_issued !== ''
          ? alloc.gold_issued
          : (parseFloat(order.allotted_weight) > 0 ? String(order.allotted_weight) : '100');

        const used = alloc.gold_used !== undefined && alloc.gold_used !== null && alloc.gold_used !== ''
          ? alloc.gold_used
          : (parseFloat(order.completed_weight) > 0 ? String(order.completed_weight) : '50');

        setGoldIssued(String(issued));
        setGoldUsed(String(used));

        if (details.timeline) {
          setTimeline({
            estimated_start_date: details.timeline.estimated_start_date || order.allotted_date || '',
            sent_date: details.timeline.sent_date || order.allotted_date || '',
            promised_due_date: details.timeline.promised_due_date || order.delivery_date || '',
            priority: details.timeline.priority || order.priority || 'MEDIUM',
          });
        }

        if (details.crafting_instructions || order.notes) {
          setCraftingInstructions(details.crafting_instructions || order.notes);
        }

        if (Array.isArray(details.documents)) {
          setDocuments(details.documents);
        }

        setViewMode('details');
      }
    } catch (err) {
      console.error('Failed to load work order details:', err);
      toast.error('Failed to load work order details.');
    } finally {
      setLoading(false);
    }
  };

  // Open Add Job Modal
  const handleOpenAddRowModal = () => {
    const year = new Date().getFullYear();
    const autoWoNo = orderNumber || `WO-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    setRowForm({
      ...defaultRowForm,
      work_order_no: autoWoNo,
      form_no: autoWoNo,
      design_number: '',
      product_name: '',
      gold_purity: '',
      setting_type: settingStyles[0]?.name || 'Open setting',
      diamond_weight: '',
      diamond_wt_from: '',
      diamond_wt_to: '',
      stamp_and_no: '',
      gold_weight: '',
      gold_wt_from: '',
      gold_wt_to: '',
      need_pcs: 1,
      no_of_diamonds: 0,
      no_of_colour_stones: 0,
      total_gross_wt: '',
      total_gold_wt: '',
      total_dia_cts: '',
      remark: '-',
      ordered_date: timeline.estimated_start_date || new Date().toISOString().split('T')[0],
      delivery_date: timeline.promised_due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
    setFormErrors({});
    setEditingRowIndex(null);
    setShowRowModal(true);
  };

  // Open Edit Job Modal
  const handleOpenEditRowModal = (itemOrIndex) => {
    let item;
    let actualIndex;
    if (typeof itemOrIndex === 'number') {
      item = jobItems[itemOrIndex];
      actualIndex = itemOrIndex;
    } else {
      item = itemOrIndex;
      actualIndex = jobItems.findIndex((j) => j.id === item?.id);
    }
    if (!item) return;
    const goldWt = parseFloat(item.gold_weight ?? item.total_weight) || 0;
    const diaWt = parseFloat(item.diamond_weight) || 0;
    const pcs = parseInt(item.need_pcs ?? item.qty, 10) || 1;
    const woNo = item.work_order_no || item.form_no || `WO-${new Date().getFullYear()}-0001-01`;
    const gFrom = item.gold_wt_from !== undefined && item.gold_wt_from !== null && item.gold_wt_from !== '' ? String(item.gold_wt_from) : (item.from_wt !== undefined && item.from_wt !== null && item.from_wt !== '' ? String(item.from_wt) : '');
    const gTo = item.gold_wt_to !== undefined && item.gold_wt_to !== null && item.gold_wt_to !== '' ? String(item.gold_wt_to) : (item.to_wt !== undefined && item.to_wt !== null && item.to_wt !== '' ? String(item.to_wt) : '');
    const dFrom = item.diamond_wt_from !== undefined && item.diamond_wt_from !== null && item.diamond_wt_from !== '' ? String(item.diamond_wt_from) : (item.from_cts !== undefined && item.from_cts !== null && item.from_cts !== '' ? String(item.from_cts) : '');
    const dTo = item.diamond_wt_to !== undefined && item.diamond_wt_to !== null && item.diamond_wt_to !== '' ? String(item.diamond_wt_to) : (item.to_cts !== undefined && item.to_cts !== null && item.to_cts !== '' ? String(item.to_cts) : '');
    const calcGold = (goldWt * pcs).toFixed(3);

    setRowForm({
      ...defaultRowForm,
      ...item,
      work_order_no: woNo,
      form_no: woNo,
      reference_image: item.reference_image || item.image || '',
      image: item.reference_image || item.image || '',
      product_name: item.product_name || item.variant || 'Necklace',
      gold_purity: item.gold_purity || item.gold_priory || item.purity || '',
      gold_stamp: item.gold_stamp || item.stamp || '',
      setting_type: item.setting_type || 'Prong',
      gold_weight: goldWt.toFixed(3),
      gold_wt_from: gFrom,
      gold_wt_to: gTo,
      from_wt: gFrom,
      to_wt: gTo,
      diamond_weight: diaWt > 0 ? diaWt.toFixed(3) : (item.diamond_weight || ''),
      diamond_wt_from: dFrom,
      diamond_wt_to: dTo,
      from_cts: dFrom,
      to_cts: dTo,
      diamond_stamp: item.diamond_stamp || '',
      stamp_and_no: item.stamp_and_no || item.stamp_details || (item.diamond_stamp ? `${item.diamond_stamp}-${item.no_of_diamonds || 0}` : ''),
      need_pcs: pcs,
      no_of_diamonds: item.no_of_diamonds ?? 0,
      no_of_colour_stones: item.no_of_colour_stones ?? 0,
      total_gold_wt: calcGold,
      total_gross_wt: calcGold,
      total_dia_cts: (diaWt * pcs).toFixed(3),
    });
    setFormErrors({});
    setEditingRowIndex(actualIndex !== -1 ? actualIndex : null);
    setShowRowModal(true);
  };

  // Save row from Modal (Add or Edit material row with all requested data columns)
  const handleSaveRowModal = (e) => {
    e?.preventDefault();
    const errors = {};

    const woNo = (rowForm.work_order_no || rowForm.form_no || orderNumber || '').trim();
    if (!woNo) {
      errors.work_order_no = 'Work Order No is required.';
    }

    if (!rowForm.design_number || !String(rowForm.design_number).trim()) {
      errors.design_number = 'Design Number is required (typing method).';
    }

    if (!rowForm.product_name || !String(rowForm.product_name).trim()) {
      errors.product_name = 'Product Name is required.';
    }

    if (!rowForm.gold_purity || !String(rowForm.gold_purity).trim()) {
      errors.gold_purity = 'Gold Purity is required (typing method, e.g. 24K / 22K / 18KT).';
    }

    if (!rowForm.setting_type) {
      errors.setting_type = 'Setting style selection is required.';
    }

    const goldWeightNum = parseFloat(rowForm.gold_weight || 0);
    const diaWeightNum = parseFloat(rowForm.diamond_weight || 0);
    const needPcsNum = parseInt(rowForm.need_pcs ?? 1, 10);
    const diaStonesNum = parseInt(rowForm.no_of_diamonds || 0, 10);
    const colourStonesNum = parseInt(rowForm.no_of_colour_stones || 0, 10);

    if (goldWeightNum < 0) {
      errors.gold_weight = 'Gold Weight cannot be negative.';
    }

    if (isNaN(needPcsNum) || needPcsNum < 1) {
      errors.need_pcs = 'Needed Pcs must be at least 1.';
    }

    if (!rowForm.reference_image && !rowForm.design_file && (!rowForm.image || rowForm.image.includes('/samples/'))) {
      errors.design_file = 'Design Upload Required: Please upload either a Reference Image or a CAD Design file for this row.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstMsg = Object.values(errors)[0];
      if (toast?.error) toast.error(firstMsg);
      return;
    }

    setFormErrors({});

    const calcTotalGrossWt = (goldWeightNum * needPcsNum).toFixed(3);
    const calcTotalDiaCts = (diaWeightNum * needPcsNum).toFixed(3);

    const cleanedRow = {
      ...rowForm,
      id: rowForm.id || Date.now(),
      product_id: rowForm.product_id || null,
      work_order_no: woNo,
      form_no: woNo,
      design_number: rowForm.design_number.trim(),
      product_name: rowForm.product_name.trim(),
      variant: rowForm.product_name.trim(),
      gold_purity: rowForm.gold_purity.trim(),
      purity: rowForm.gold_purity.trim(),
      karat: rowForm.gold_purity.trim(),
      gold_karat: rowForm.gold_purity.trim(),
      gold_stamp: rowForm.gold_stamp || '',
      setting_type: (
        settingStyles.length > 0 && settingStyles.some((s) => s.name === rowForm.setting_type)
          ? rowForm.setting_type
          : (rowForm.setting_type || settingStyles[0]?.name || 'Open setting')
      ),
      diamond_weight: diaWeightNum > 0 ? diaWeightNum.toFixed(3) : (rowForm.diamond_weight ? String(rowForm.diamond_weight) : ''),
      diamond_count: diaStonesNum >= 0 ? diaStonesNum : 0,
      diamond_stamp: rowForm.diamond_stamp || '',
      stamp_and_no: rowForm.stamp_and_no || '',
      stamp_details: rowForm.stamp_and_no || '',
      color_stone_weight: rowForm.color_stone_weight || '',
      color_stone_count: colourStonesNum >= 0 ? colourStonesNum : 0,
      color_stone_stamp: rowForm.color_stone_stamp || '',
      diamond_wt_from: rowForm.diamond_wt_from || rowForm.from_cts || '',
      diamond_wt_to: rowForm.diamond_wt_to || rowForm.to_cts || '',
      gold_weight: goldWeightNum > 0 ? goldWeightNum.toFixed(3) : (rowForm.gold_weight || ''),
      fine_gold_weight: rowForm.fine_gold_weight || (goldWeightNum > 0 ? (goldWeightNum * 0.916).toFixed(3) : ''),
      diamond_sieves: Array.isArray(rowForm.diamond_sieves) ? rowForm.diamond_sieves : [],
      gold_wt_from: rowForm.gold_wt_from || rowForm.from_wt || '',
      gold_wt_to: rowForm.gold_wt_to || rowForm.to_wt || '',
      from_wt: rowForm.gold_wt_from || rowForm.from_wt || '',
      to_wt: rowForm.gold_wt_to || rowForm.to_wt || '',
      need_pcs: needPcsNum,
      qty: needPcsNum,
      no_of_diamonds: diaStonesNum >= 0 ? diaStonesNum : 0,
      no_of_colour_stones: colourStonesNum >= 0 ? colourStonesNum : 0,
      total_gross_wt: calcTotalGrossWt,
      total_gold_wt: calcTotalGrossWt,
      total_dia_cts: calcTotalDiaCts,
      remark: rowForm.remark || '-',
      reference_image: rowForm.reference_image || rowForm.image || '',
      reference_image_name: rowForm.reference_image_name || '',
      design_file: rowForm.design_file || '',
      design_file_name: rowForm.design_file_name || '',
      image: rowForm.reference_image || rowForm.image || rowForm.design_file || '',
      work_name: rowForm.work_name || rowForm.product_name || rowForm.variant || 'Jewellery Piece',
      material_type: rowForm.material_type || `Gold (${rowForm.gold_purity.trim()})`,
    };

    try {
      if (editingRowIndex !== null) {
        setJobItems((prev) => {
          const next = [...prev];
          next[editingRowIndex] = cleanedRow;
          return next;
        });
        if (toast?.success) toast.success('Row details updated.');
      } else {
        setJobItems((prev) => [...prev, cleanedRow]);
        if (goldWeightNum > 0) {
          setGoldIssued((prev) => {
            const curr = parseFloat(prev) || 0;
            return curr === 0 ? (goldWeightNum * needPcsNum).toFixed(2) : (curr + (goldWeightNum * needPcsNum)).toFixed(2);
          });
        }
        if (toast?.success) toast.success(`New row ${cleanedRow.form_no} added to work order.`);
      }
    } catch (err) {
      console.error('Error saving row:', err);
    } finally {
      setSelectedMonth('all');
      setShowRowModal(false);
      setEditingRowIndex(null);
      setRowForm(defaultRowForm);
    }
  };

  // Remove row from table
  const handleRemoveRow = (itemOrIndex) => {
    if (typeof itemOrIndex === 'number') {
      setJobItems((prev) => prev.filter((_, idx) => idx !== itemOrIndex));
    } else {
      setJobItems((prev) => prev.filter((r) => r.id !== itemOrIndex?.id));
    }
    if (toast?.info) toast.info('Row removed.');
  };

  // Update worker tracking in database (live up to date tracking)
  const handleUpdateWorkerTracking = async () => {
    if (!selectedOrder?.id) {
      if (toast?.info) toast.info('Tracking saved to current session.');
      return;
    }
    try {
      setSubmitting(true);
      const updatedAllocation = {
        worker_id: workerId,
        worker_name: assignedWorker?.name || '',
        gold_issued: goldIssuedNum,
        gold_used: goldUsedNum,
        pending_gold: pendingGoldNum,
      };

      const currentPricing = selectedOrder.pricing_details || {};
      const payload = {
        completed_weight: goldUsedNum,
        pending_weight: pendingGoldNum,
        pricing_details: {
          ...currentPricing,
          worker_allocation: updatedAllocation,
        },
      };

      const res = await api.put(`/work-orders/${selectedOrder.id}`, payload);
      if (toast?.success) toast.success('Material tracking updated successfully in database!');
      if (res.data?.data) {
        setSelectedOrder(res.data.data);
      }
    } catch (err) {
      console.error('Failed to update worker tracking:', err);
      if (toast?.error) toast.error(err.response?.data?.message || 'Failed to update tracking.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick sync gold used with table items
  const handleSyncGoldWithTable = () => {
    if (totalGoldWeight > 0) {
      setGoldUsed(totalGoldWeight.toFixed(2));
      if (toast?.info) toast.info(`Synced Used Gold to table items: ${totalGoldWeight.toFixed(2)}g`);
    }
  };

  // Filter job items by selected month
  const displayedJobItems = jobItems.filter((row) => {
    if (selectedMonth === 'all') return true;
    const d = String(row.ordered_date || row.delivery_date || '');
    if (!d) return true;
    const parts = d.split('-');
    if (parts.length >= 2) {
      const monthPart = parts[0].length === 4 ? parts[1] : parts[1];
      return String(monthPart).padStart(2, '0') === String(selectedMonth).padStart(2, '0');
    }
    return true;
  });

  // Calculations matching all 21 user row columns (dynamically for active month view)
  const activeItemsForTotals = displayedJobItems;
  const totalNeedPcs = activeItemsForTotals.reduce((acc, row) => {
    const pd = typeof row.pricing_details === 'string' ? JSON.parse(row.pricing_details || '{}') : (row.pricing_details || {});
    const pcs = parseInt(row.need_pcs || pd.need_pcs || row.required_qty || row.qty || 1, 10);
    return acc + (isNaN(pcs) || pcs < 1 ? 1 : pcs);
  }, 0) || (parseInt(selectedOrder?.required_qty, 10) || 1);
  const totalQty = totalNeedPcs;
  const totalGoldWeight = activeItemsForTotals.reduce((acc, row) => {
    const pd = typeof row.pricing_details === 'string' ? JSON.parse(row.pricing_details || '{}') : (row.pricing_details || {});
    const pcs = parseInt(row.need_pcs || pd.need_pcs || row.required_qty || row.qty || 1, 10) || 1;
    const rowGross = parseFloat(row.total_gross_wt || pd.total_gross_wt);
    if (!isNaN(rowGross) && rowGross > 0) return acc + rowGross;
    const perPiece = parseFloat(row.gold_weight || pd.gold_weight || row.allotted_weight || row.total_weight || 0) || 0;
    return acc + (perPiece * pcs);
  }, 0) || parseFloat(selectedOrder?.allotted_weight || 0);
  const totalOldWeight = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.old_weight || 0) || 0), 0);
  const totalWastage = activeItemsForTotals.reduce((acc, row) => {
    const pcs = parseInt(row.need_pcs || row.qty || 1, 10) || 1;
    return acc + ((parseFloat(row.wastage || 0) || 0) * pcs);
  }, 0);
  const totalWastageWeight = totalWastage;
  const totalConsWt = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.cons_wt || 0) || 0), 0);
  const totalGrossWt = totalGoldWeight;
  const totalDiaCts = activeItemsForTotals.reduce((acc, row) => {
    const pd = typeof row.pricing_details === 'string' ? JSON.parse(row.pricing_details || '{}') : (row.pricing_details || {});
    const pcs = parseInt(row.need_pcs || pd.need_pcs || row.required_qty || row.qty || 1, 10) || 1;
    const rowDia = parseFloat(row.total_dia_cts || pd.total_dia_cts);
    if (!isNaN(rowDia) && rowDia > 0) return acc + rowDia;
    const perPieceDia = parseFloat(row.diamond_weight || pd.diamond_weight || 0) || 0;
    return acc + (perPieceDia * pcs);
  }, 0);
  const totalCarats = totalDiaCts;
  const totalCts = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.total_cts || 0) || 0), 0);
  const avgPercentage = totalGoldWeight > 0 ? `${((totalWastage / totalGoldWeight) * 100).toFixed(2)}%` : '4.6%';
  const totalStonesCount = activeItemsForTotals.reduce((acc, row) => {
    const pd = typeof row.pricing_details === 'string' ? JSON.parse(row.pricing_details || '{}') : (row.pricing_details || {});
    const pcs = parseInt(row.need_pcs || pd.need_pcs || row.required_qty || row.qty || 1, 10) || 1;
    const diaCount = parseInt(row.no_of_diamonds || pd.no_of_diamonds || row.diamond_count || (row.stone_details?.diamond_count) || (pd.stone_details?.diamond_count) || 0, 10) || 0;
    const stoneCount = parseInt(row.no_of_colour_stones || pd.no_of_colour_stones || row.color_stone_count || (row.stone_details?.color_stone_count) || 0, 10) || 0;
    return acc + ((diaCount + stoneCount) * pcs);
  }, 0);

  // Worker gold balance calculation
  const goldIssuedNum = parseFloat(goldIssued) || 0;
  const goldUsedNum = parseFloat(goldUsed) || 0;
  const pendingGoldNum = Math.max(0, goldIssuedNum - goldUsedNum);

  // Financial Breakdown calculations
  const goldValue = Math.round(totalGoldWeight * goldRate22k);
  const makingCharges = Math.round(totalGoldWeight * 650);
  const stoneCharges = totalStonesCount > 0 ? (totalStonesCount * 250) : 0;
  const otherCharges = jobItems.length > 0 ? 1625 : 0;
  const totalAmount = jobItems.length > 0 ? (goldValue + makingCharges + stoneCharges + otherCharges) : 0;

  // Submit Work Order (Create)
  const handleSaveWorkOrder = async (opts = {}) => {
    // 1. Validate at least 1 job item added
    if (jobItems.length === 0) {
      toast.error('Material Row Required: Please add at least one material row details before creating the work order.');
      return;
    }

    // 2. Validate Artisan / Karigar assignment
    if (!workerId || !String(workerId).trim()) {
      toast.error('Artisan Assignment Required: Please select an Assigned Artisan / Karigar before creating the work order.');
      return;
    }

    // 3. Validate Delivery Due Date selection
    if (!timeline.promised_due_date || !String(timeline.promised_due_date).trim()) {
      toast.error('Date Selection Required: Please select a Promised Due Date for the work order.');
      return;
    }

    // 4. Validate Priority selection
    if (!timeline.priority || !String(timeline.priority).trim()) {
      toast.error('Priority Selection Required: Please select an Order Priority.');
      return;
    }

    // 5. Validate Reference Image or CAD Design upload on all row items
    for (let i = 0; i < jobItems.length; i++) {
      const item = jobItems[i];
      const hasImg = item.reference_image || (item.image && !item.image.includes('/samples/'));
      const hasCad = item.design_file;
      if (!hasImg && !hasCad) {
        toast.error(`Design Image/CAD File Required: Row #${i + 1} (${item.design_number || 'Item'}) requires either a Reference Image or a CAD Design file to be uploaded.`);
        return;
      }
    }

    if (submitting || isSubmittingRef.current) {
      return;
    }

    try {
      isSubmittingRef.current = true;
      setSubmitting(true);

      const assignedWorker = karigars.find((k) => String(k.id) === String(workerId));

      const firstItem = jobItems[0];
      const detectedPurity = firstItem?.gold_purity || firstItem?.purity || firstItem?.karat || '24K';

      const payload = {
        work_order_number: orderNumber,
        product_name: jobItems.length > 1
          ? `${jobItems[0].variant} + ${jobItems.length - 1} More Items`
          : jobItems[0].variant,
        karigar_id: workerId || null,
        karigar_name: assignedWorker?.name || null,
        customer_name: customerName.trim() || null,
        allotted_date: timeline.estimated_start_date,
        delivery_date: timeline.promised_due_date,
        allotted_weight: 0,
        expected_return_weight: totalGoldWeight,
        allow_shortage: Boolean(opts.allowShortage),
        priority: timeline.priority,
        material_type: jobItems[0]?.material_type || `Gold (${detectedPurity})`,
        gold_purity: detectedPurity,
        purity: detectedPurity,
        karat: detectedPurity,
        gold_karat: detectedPurity,
        image_url: jobItems[0]?.reference_image || jobItems[0]?.design_file || jobItems[0]?.image || null,
        notes: craftingInstructions,
        items: jobItems.map((it) => ({
          ...it,
          gold_purity: it.gold_purity || it.purity || it.karat || detectedPurity,
          purity: it.gold_purity || it.purity || it.karat || detectedPurity,
          karat: it.gold_purity || it.purity || it.karat || detectedPurity,
          gold_karat: it.gold_purity || it.purity || it.karat || detectedPurity,
        })),
        worker_allocation: {
          worker_id: workerId,
          worker_name: assignedWorker?.name || '',
          gold_issued: goldIssuedNum,
          gold_used: goldUsedNum,
          pending_gold: pendingGoldNum,
        },
        timeline,
        crafting_instructions: craftingInstructions,
        material_breakdown: {
          gold_value: goldValue,
          making_charges: makingCharges,
          stone_charges: stoneCharges,
          other_charges: otherCharges,
          total_amount: totalAmount,
        },
        job_summary: {
          allocated_gold: totalGoldWeight,
          stone_count: totalStonesCount,
          total_carats: totalCarats,
          est_wastage: totalWastageWeight,
          est_material_cost: totalAmount,
        },
        documents,
      };

      const res = await api.post('/work-orders', payload);
      toast.success(`Work Order ${orderNumber} created successfully with ${jobItems.length} jobs!`);

      // Switch to list or detail view immediately without duplicate loading screen
      if (res.data?.data?.id) {
        const createdOrder = res.data.data;
        setSelectedOrder(createdOrder);
        setOrderNumber(createdOrder.work_order_number || orderNumber);
        setWorkerId(createdOrder.karigar_id || '');
        setCustomerName(createdOrder.customer_name || createdOrder.client?.name || '');
        setViewMode('details');
        const normalized = normalizeWorkOrderItems(
          createdOrder.items && createdOrder.items.length > 0 ? createdOrder.items : jobItems,
          createdOrder,
          jobItems
        );
        setJobItems(normalized);

        // Fetch full fresh order details from server
        loadOrderDetails(createdOrder.id);
      } else {
        fetchOrdersList();
        setViewMode('list');
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.error_type === 'INSUFFICIENT_DIAMOND_STOCK' || resp?.data?.error_type === 'INSUFFICIENT_DIAMOND_STOCK') {
        const stockData = resp.error_type === 'INSUFFICIENT_DIAMOND_STOCK' ? resp : resp.data;
        setInsufficientStockData({
          required_carats: stockData.required_carats ?? 0,
          available_carats: stockData.available_carats ?? 0,
          shortage_carats: stockData.shortage_carats ?? 0,
          required_count: stockData.required_count ?? 0,
          available_count: stockData.available_count ?? 0,
          shortage_count: stockData.shortage_count ?? 0,
          stamp_details: stockData.stamp_details ?? '',
          message: stockData.message || 'Low stock in vault.',
        });
        return;
      }

      let errMsg = resp?.message || err?.userMessage || err?.message;
      if (resp?.errors && typeof resp.errors === 'object') {
        const firstErr = Object.values(resp.errors).flat()[0];
        if (firstErr) errMsg = firstErr;
      }
      if (!errMsg) errMsg = 'Failed to create work order.';

      const isStockIssue = /insufficient|stock|balance|vault|out of stock/i.test(errMsg);
      toast.error(errMsg, isStockIssue ? 'Stock Not Available' : 'Order Creation Notice');
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Confirm creation after reviewing low stock disclaimer
  const handleConfirmCreateWithShortage = () => {
    setInsufficientStockData(null);
    setTimeout(() => {
      handleSaveWorkOrder({ allowShortage: true });
    }, 150);
  };

  return (
    <div className="w-full min-h-screen bg-white font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800 antialiased -m-6 p-8">

      {/* Global Hidden File Inputs for Design File and Reference Image */}
      <input
        type="file"
        ref={designFileInputRef}
        accept="image/*,.pdf,.dwg,.dxf,.stl,.obj"
        onChange={handleDesignFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={refImageInputRef}
        accept="image/*"
        onChange={handleReferenceImageUpload}
        className="hidden"
      />

      {/* Top Navigation Mode Toggles */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartNewWorkOrder}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${viewMode === 'create' && !selectedOrder
              ? 'bg-[#9e1b27] text-white shadow-2xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
          >
            <i className="fa-solid fa-plus text-[10px] mr-1.5"></i>
            Create New Work Order
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              fetchOrdersList();
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${viewMode === 'list'
              ? 'bg-[#9e1b27] text-white shadow-2xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
          >
            <i className="fa-solid fa-table-list text-[10px] mr-1.5"></i>
            View Work Orders (Rows)
          </button>

          {selectedOrder && (
            <button
              type="button"
              onClick={() => setViewMode('details')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${viewMode === 'details'
                ? 'bg-[#9e1b27] text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
            >
              <i className="fa-solid fa-file-invoice text-[10px] mr-1.5"></i>
              {selectedOrder.work_order_number} Details
            </button>
          )}
        </div>

        <Link
          to="/job-creation"
          className="text-xs font-bold text-[#9e1b27] hover:underline flex items-center gap-1.5"
        >
          <i className="fa-solid fa-arrow-left text-[10px]"></i>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: WORK ORDERS LIST (Displayed in rows, click any to view full page) */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Work Orders Directory
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Each work order row below can contain multiple jobs / pieces. Click any row to inspect full details.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search order #, artisan, design..."
                  className="w-full pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg outline-hidden focus:border-[#9e1b27]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleStartNewWorkOrder}
                className="px-4 py-2 bg-[#9e1b27] hover:bg-[#83141f] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Create New Work Order</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f7f8fa] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3 px-3 text-center w-12 whitespace-nowrap">S.NO</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">WORK ORDER #</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[150px]">CUSTOMER</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[150px]">ARTISAN / WORKER</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">JOBS / PIECES IN ORDER</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">TOTAL GOLD WT</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">DELIVERY DUE</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap min-w-[100px]">PRIORITY</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap min-w-[130px]">STAGE / STATUS</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap min-w-[90px]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin text-[#9e1b27] text-lg mr-2"></i>
                        Loading work orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-gray-400">
                        {search
                          ? `No work orders matching "${search}".`
                          : 'No work orders found. Click "+ Create New Work Order" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((wo, idx) => {
                      const jobsCount = Array.isArray(wo.items) ? wo.items.length : 1;
                      return (
                        <tr
                          key={wo.id}
                          onClick={() => loadOrderDetails(wo.id)}
                          className="hover:bg-[#fcf8f8] transition-colors cursor-pointer group"
                        >
                          {/* S.No */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-gray-400 text-xs whitespace-nowrap">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>

                          {/* Order Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#9e1b27] whitespace-nowrap">
                            {wo.work_order_number}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-900 truncate block max-w-[150px]" title={wo.customer_name || wo.client?.full_name || wo.client?.name || ''}>
                              {wo.customer_name || wo.client?.full_name || wo.client?.name || 'Internal Showroom'}
                            </span>
                          </td>

                          {/* Artisan */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-red-50 text-[#9e1b27] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {(wo.karigar_name || 'A')[0]}
                              </div>
                              <span className="font-semibold text-gray-900">
                                {wo.karigar_name || 'Unassigned'}
                              </span>
                            </div>
                          </td>

                          {/* Jobs in order */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[11px] shrink-0">
                                {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
                              </span>
                              <span className="text-gray-600 truncate max-w-[160px]" title={wo.product_name}>
                                {wo.product_name}
                              </span>
                            </div>
                          </td>

                          {/* Total Gold Wt */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                            {Number(wo.allotted_weight).toFixed(3)}g
                          </td>

                          {/* Delivery Due */}
                          <td className={`py-3.5 px-4 whitespace-nowrap ${wo.is_delayed ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                            {wo.delivery_date ? new Date(wo.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${wo.priority === 'HIGH' || wo.priority === 'High'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                              }`}>
                              {wo.priority || 'Normal'}
                            </span>
                          </td>

                          {/* Stage */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 capitalize">
                              {(wo.current_stage || wo.status).replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => loadOrderDetails(wo.id)}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded text-xs font-semibold"
                            >
                              View Details &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalOrders > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalOrders}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(num) => {
                  setItemsPerPage(num);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2 & 3: CREATE NEW WORK ORDER / WORK ORDER DETAILS (EXACT UI DESIGN)  */}
      {/* ========================================================================= */}
      {(viewMode === 'create' || viewMode === 'details') && (
        <div className="space-y-6">

          {/* 1. Header with Title and Add Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold text-[#881337] tracking-tight leading-tight">
                {viewMode === 'details' ? 'Work Order Details' : 'Create New Work Order'}
              </h1>
              <p className="text-xs text-[#6b7280] font-normal mt-0.5">
                {viewMode === 'details' ? `Work Order #${orderNumber || selectedOrder?.work_order_number || ''}` : (orderNumber ? `Drafting Job #${orderNumber}` : 'Drafting New Work Order')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {(viewMode === 'details' || jobItems.length > 0) ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const title = `Work Order — ${orderNumber || selectedOrder?.work_order_number || 'JO'}`;
                      printElement('print-work-order-portal', title, { orientation: 'landscape' });
                    }}
                    className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Print Work Order Voucher (Landscape format)"
                  >
                    <i className="fa-solid fa-print"></i>
                    <span>Print</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* WORK ASSIGNMENT HEADER CARD: Assigned once to this artisan with multiple materials */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">

            {/* Artisan Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#b01622] border border-rose-200/80 font-extrabold text-lg flex items-center justify-center shrink-0 shadow-2xs font-mono">
                  {assignedWorker?.name ? assignedWorker.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b01622] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/80">
                      Assigned Artisan
                    </span>
                    <span className="text-xs text-stone-500 font-mono font-semibold">
                      Artisan #{workerId || '—'}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mt-0.5">
                    {assignedWorker?.name || 'Select Artisan for this Work Order'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {assignedWorker?.specialization || 'Master Jeweller'} • {assignedWorker?.phone || 'Internal Karigar Unit'}
                  </p>
                  {assignedWorker && assignedWorker.is_available === false && (
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                      <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                      <span>Busy: {assignedWorker.current_assigned_order?.work_order_number || 'Active Order'}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewMode === 'details' && (
                <div className="flex items-center gap-4 text-xs bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/60">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Customer</span>
                    <span className="font-bold text-stone-800 truncate block max-w-[150px]" title={customerName || selectedOrder?.customer_name || ''}>
                      {customerName || selectedOrder?.customer_name || selectedOrder?.client?.full_name || selectedOrder?.client?.name || 'Internal Showroom'}
                    </span>
                  </div>
                  <div className="border-l border-stone-200 pl-3">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Promised Due</span>
                    <span className="font-mono font-bold text-[#b01622]">
                      {timeline.promised_due_date || selectedOrder?.delivery_date || '—'}
                    </span>
                  </div>
                  <div className="border-l border-stone-200 pl-3">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Priority</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${timeline.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                      {timeline.priority || 'MEDIUM'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Assignment Controls Grid (Create Mode) */}
            {viewMode === 'create' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Assigned Artisan / Karigar <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={workerId}
                    required
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">-- Select Artisan / Karigar --</option>
                    {karigars.map((k) => {
                      const hasActiveJob = k.is_available === false;
                      return (
                        <option
                          key={k.id}
                          value={k.id}
                        >
                          {k.name} {hasActiveJob ? `— (Active: ${k.current_assigned_order?.work_order_number || 'In Progress'})` : `(${k.specialization || 'Artisan'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Client ID / Code <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={customerName}
                    required
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">-- Select Client Code / ID --</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.client_code || c.full_name}>
                        {c.client_code ? `${c.client_code} — ${c.full_name}` : c.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Promised Due Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={timeline.promised_due_date}
                    onChange={(e) => setTimeline({ ...timeline, promised_due_date: e.target.value })}
                    className="w-full text-xs font-semibold font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Order Priority <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={timeline.priority}
                    required
                    onChange={(e) => setTimeline({ ...timeline, priority: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
              </div>
            )}

          </div>

          {/* Section Header: Materials & Components Issued */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>Materials & Components Issued to Artisan</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#881337]/10 text-[#881337]">
                  {jobItems.length} {jobItems.length === 1 ? 'Material' : 'Materials'}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                {jobItems.length === 0
                  ? 'No material rows allocated yet. Click "+ Add Row" below to input specifications.'
                  : jobItems.length === 1
                    ? `1 material row allocated in this work order.${assignedWorker?.name ? ` Assigned to ${assignedWorker.name}.` : ''}`
                    : `${jobItems.length} material rows allocated in this work order.${assignedWorker?.name ? ` Assigned to ${assignedWorker.name}.` : ''}`}
              </p>
            </div>
          </div>

          {/* 2. Multi-Job Items Table (Only displayed after adding a job) */}
          {jobItems.length === 0 ? (
            <div className="bg-[#fcfbf9] border border-dashed border-[#e2d5be] rounded-2xl p-10 text-center flex flex-col items-center justify-center my-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-[#881337] flex items-center justify-center text-xl mb-3 shadow-2xs">
                <i className="fa-solid fa-gem"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">No Material Rows Added Yet</h3>
              <p className="text-xs text-stone-500 mb-4 max-w-sm">
                Click "+ Add Row" above to input material, dates, image, setting type, design number, and weights. Row details will display here once added.
              </p>
              {viewMode === 'create' && (
                <button
                  type="button"
                  onClick={handleOpenAddRowModal}
                  className="px-5 py-2.5 bg-[#881337] hover:bg-[#70102d] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  <span>Add Row</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Centered Add Row + link right above the table matching Image 1 */}
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={handleOpenAddRowModal}
                  className="text-xs font-bold text-[#b01622] hover:text-[#70102d] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Add Row +</span>
                </button>
              </div>

              {/* Exact Table Layout with 17 Requested Columns */}
              <div className="border border-[#d8c8b0] rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto w-full pb-2 scrollbar-thin scrollbar-thumb-stone-300">
                  <table className="w-full text-left text-xs border-collapse min-w-[1800px]">
                    <thead>
                      <tr className="bg-[#eedfce] text-[#3b3228] font-bold text-[10px] tracking-wider uppercase border-b border-[#ddccb4]">
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[50px]">S.NO</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">WORK ORDER NO</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px]">DESIGN NO</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[125px]">PRODUCT NAME</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[90px]">REF IMAGE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[100px]">CAD DESIGN</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px]">GOLD PURITY</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[105px]">SETTING</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[105px]">NET GOLD WT (G)</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[90px]">NEEDED PCS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[125px]">NO OF DIAMONDS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[115px]">DIAMOND WT (CTS)</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[150px]">DIAMOND DETAILS (STAMP / PCS / WT)</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[130px]">TOTAL GROSS WT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[135px]">TOTAL DIAMOND CTS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[120px]">REMARKS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[85px]">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {displayedJobItems.length === 0 ? (
                        <tr>
                          <td colSpan="17" className="py-8 text-center text-stone-500 bg-stone-50/50">
                            <p className="text-xs font-semibold">No materials found for the selected month.</p>
                            <button
                              type="button"
                              onClick={() => setSelectedMonth('all')}
                              className="mt-2 text-xs font-bold text-[#881337] underline hover:text-[#9e1b27] cursor-pointer"
                            >
                              Show All Months ({jobItems.length} {jobItems.length === 1 ? 'row' : 'rows'})
                            </button>
                          </td>
                        </tr>
                      ) : (
                        displayedJobItems.map((row, idx) => {
                          const pd = typeof row.pricing_details === 'string' ? JSON.parse(row.pricing_details || '{}') : (row.pricing_details || {});
                          const goldWtNum = parseFloat(row.gold_weight || pd.gold_weight || row.allotted_weight || row.total_weight || 0) || 0;
                          const diaWtNum = parseFloat(row.diamond_weight || pd.diamond_weight || 0) || 0;
                          const pcsNum = parseInt(row.need_pcs || pd.need_pcs || row.required_qty || row.qty || 1, 10) || 1;
                          const diaStonesNum = parseInt(row.no_of_diamonds || pd.no_of_diamonds || row.diamond_count || (row.stone_details?.diamond_count) || (pd.stone_details?.diamond_count) || 0, 10) || 0;
                          const colourStones = parseInt(row.no_of_colour_stones || pd.no_of_colour_stones || row.color_stone_count || (row.stone_details?.color_stone_count) || 0, 10) || 0;
                          const diaGrams = diaWtNum * 0.2;
                          const cstoneWt = parseFloat(row.color_stone_weight || pd.color_stone_weight || 0) || 0;
                          const grossWt = row.total_gross_wt || pd.total_gross_wt || ((goldWtNum + diaGrams + cstoneWt) * pcsNum).toFixed(3);
                          const diaCts = row.total_dia_cts || pd.total_dia_cts || (diaWtNum * pcsNum).toFixed(3);
                          const purityVal = row.gold_purity || pd.gold_purity || row.gold_priory || pd.gold_priory || row.purity || pd.purity || row.karat || pd.karat || (row.gold_karat ? `${row.gold_karat}K` : '') || selectedOrder?.gold_purity || selectedOrder?.purity || selectedOrder?.material_type || '22K (916)';
                          const settingVal = row.setting_type || pd.setting_type || 'Prong';
                          const designVal = row.design_number || pd.design_number || row.design_no || selectedOrder?.design_code || 'DG-4587';
                          const prodNameVal = row.product_name || pd.product_name || row.variant || pd.variant || selectedOrder?.product_name || 'Jewellery Piece';

                          return (
                            <tr key={row.id || idx} className="hover:bg-amber-50/20 transition-colors">

                              {/* 1. S.No (Auto generate) */}
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-stone-500">
                                {idx + 1}
                              </td>

                              {/* 2. Work Order No (Unique) */}
                              <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-xs text-[#881337]">
                                <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                                  {row.work_order_no || row.form_no || `WO-${new Date().getFullYear()}-0001-${idx + 1}`}
                                </span>
                              </td>

                              {/* 3. Design No (Typing method) */}
                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-gray-900 text-xs font-mono">
                                {designVal}
                              </td>

                              {/* 4. Product Name */}
                              <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-gray-800 text-xs">
                                {prodNameVal}
                              </td>

                              {/* 5. Reference Image Upload */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div
                                  onClick={() => viewMode === 'create' && handleOpenEditRowModal(idx)}
                                  className={`w-9 h-9 mx-auto rounded-md overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center ${viewMode === 'create' ? 'cursor-pointer hover:opacity-85' : ''
                                    }`}
                                  title={row.reference_image_name || 'Click to edit row'}
                                >
                                  {resolveItemImage(row) ? (
                                    <img
                                      src={resolveItemImage(row)}
                                      alt="Reference"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <i className="fa-solid fa-image text-stone-300 text-xs"></i>
                                  )}
                                </div>
                              </td>

                              {/* 6. CAD Design Upload */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {row.design_file ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDocument({ url: row.design_file, name: row.design_file_name || 'CAD Design File', type: row.design_file_type })}
                                    className="w-8 h-8 mx-auto rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center hover:bg-indigo-100 transition-colors cursor-pointer"
                                    title={`Preview CAD: ${row.design_file_name || 'Attached File'}`}
                                  >
                                    <i className="fa-solid fa-compass-drafting text-xs"></i>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => viewMode === 'create' && handleOpenEditRowModal(idx)}
                                    className="w-8 h-8 mx-auto rounded-lg bg-stone-50 border border-stone-200 text-stone-400 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
                                    title="Upload CAD Design File"
                                  >
                                    <i className="fa-solid fa-upload text-[10px]"></i>
                                  </button>
                                )}
                              </td>

                              {/* 7. Gold Purity & Stamp */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs font-bold text-amber-800">
                                <div>{purityVal}</div>
                                {row.gold_stamp && <div className="text-[10px] text-amber-600 font-mono font-semibold">{row.gold_stamp}</div>}
                              </td>

                              {/* 8. Setting */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-stone-700 font-medium">
                                <span className="px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200">
                                  {settingVal}
                                </span>
                              </td>

                              {/* 9. Net Gold Wt (G) */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-900 font-bold">
                                {goldWtNum > 0 ? `${formatWeight(goldWtNum)}g` : '-'}
                              </td>

                              {/* 10. Needed Pcs */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono font-bold text-xs text-gray-900">
                                {pcsNum}
                              </td>

                              {/* 11. No of Diamonds */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono font-bold text-xs text-emerald-800">
                                {diaStonesNum}
                              </td>

                              {/* 12. Diamond Wt (Carats) */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-emerald-800 font-bold">
                                {diaWtNum > 0 ? `${diaWtNum.toFixed(3)}ct` : '-'}
                              </td>

                              {/* 13. Diamond Details (Stamp / Pcs / Wt) */}
                              <td className="py-2.5 px-3 text-center">
                                {renderDiamondDetails(row, idx)}
                              </td>

                              {/* 14. Total Gross Wt (Total Gold Wt x Needed Pcs) */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-xs text-[#881337]">
                                {formatWeight(grossWt)}g
                              </td>

                              {/* 15. Total Diamond Cts (Needed Pcs x Diamond Wt) */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-xs text-emerald-700">
                                {formatWeight(diaCts)}ct
                              </td>

                              {/* 16. Remarks */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-500">
                                {row.remark || '-'}
                              </td>

                              {/* 17. Actions */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRowModal(row)}
                                    className="w-7 h-7 rounded-md hover:bg-stone-100 text-stone-500 hover:text-[#881337] flex items-center justify-center transition-colors cursor-pointer"
                                    title="Edit row details"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                                  </button>
                                  {viewMode === 'create' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRow(row)}
                                      className="w-7 h-7 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Remove row"
                                    >
                                      <i className="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                  )}
                                </div>
                              </td>

                            </tr>
                          );
                        }))}
                    </tbody>

                    {/* Total Footer Row */}
                    <tfoot>
                      <tr className="bg-[#fcfbf9] font-bold border-t-2 border-stone-200 text-xs text-gray-900">
                        <td colSpan="8" className="py-3 px-3 uppercase tracking-wider font-black text-xs text-gray-900">
                          TOTAL
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs text-gray-900">
                          {totalGoldWeight.toFixed(3)}g
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-xs text-[#b01622]">
                          {totalNeedPcs}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-xs text-emerald-800">
                          {totalStonesCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs text-emerald-800">
                          {totalCarats.toFixed(3)}ct
                        </td>
                        <td className="py-3 px-3 text-center text-gray-400 font-normal">-</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs text-[#881337]">
                          {totalGoldWeight.toFixed(3)}g
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs text-emerald-700">
                          {totalCarats.toFixed(3)}ct
                        </td>
                        <td colSpan="2" className="py-3 px-3 text-center text-gray-400 font-normal">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. Bottom Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column (8 cols): Worker Tracking, Timeline, Crafting Instructions, Material Breakdown */}
            <div className="lg:col-span-8 space-y-6">


              {/* Box 2: Production Timeline */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-red-50 text-[#881337] flex items-center justify-center text-xs">
                    <i className="fa-solid fa-calendar-days"></i>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Production Timeline
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 block mb-1">
                      Estimated Start Date
                    </label>
                    {viewMode === 'details' ? (
                      <div className="p-2 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 bg-gray-50">
                        {timeline.estimated_start_date || '—'}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={timeline.estimated_start_date}
                        onChange={(e) => setTimeline({ ...timeline, estimated_start_date: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono outline-hidden focus:border-[#881337]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-gray-500 block mb-1">
                      Sent Date
                    </label>
                    {viewMode === 'details' ? (
                      <div className="p-2 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 bg-gray-50">
                        {timeline.sent_date || '—'}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={timeline.sent_date}
                        onChange={(e) => setTimeline({ ...timeline, sent_date: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono outline-hidden focus:border-[#881337]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-gray-500 block mb-1">
                      Promised Due Date
                    </label>
                    {viewMode === 'details' ? (
                      <div className="p-2 border border-gray-200 rounded-lg text-xs font-mono font-bold text-[#881337] bg-gray-50">
                        {timeline.promised_due_date || '—'}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={timeline.promised_due_date}
                        onChange={(e) => setTimeline({ ...timeline, promised_due_date: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono outline-hidden focus:border-[#881337]"
                      />
                    )}
                  </div>
                </div>

                {/* Priority Level Selectors */}
                <div>
                  <span className="text-[11px] font-medium text-gray-500 block mb-1.5">
                    Priority Level
                  </span>
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    {['LOW', 'MEDIUM', 'HIGH'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        disabled={viewMode === 'details'}
                        onClick={() => setTimeline({ ...timeline, priority: lvl })}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${timeline.priority === lvl
                          ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                          : 'text-gray-500 hover:text-gray-900'
                          }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Box 3: Crafting Instructions */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-red-50 text-[#881337] flex items-center justify-center text-xs">
                    <i className="fa-solid fa-pen-ruler"></i>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Crafting Instructions
                  </h3>
                </div>

                {viewMode === 'details' ? (
                  <div className="p-3 bg-stone-50 rounded-lg border border-gray-200 text-xs text-gray-700 whitespace-pre-wrap">
                    {craftingInstructions}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={craftingInstructions}
                    onChange={(e) => setCraftingInstructions(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-gray-200 focus:border-[#881337] outline-hidden text-gray-700 resize-none"
                    placeholder="Specify intricate design nuances, finish preferences (matte vs high polish), or specific stone placement details for the artisan..."
                  ></textarea>
                )}
              </div>

              {/* Reference Image & CAD Design Live Preview Panels */}
              {(() => {
                const totalJobs = jobItems.length;
                const safeRefIdx = totalJobs > 0 ? ((refSliderIndex % totalJobs) + totalJobs) % totalJobs : 0;
                const safeCadIdx = totalJobs > 0 ? ((cadSliderIndex % totalJobs) + totalJobs) % totalJobs : 0;
                const activeRefJob = totalJobs > 0 ? jobItems[safeRefIdx] : selectedOrder;
                const activeCadJob = totalJobs > 0 ? jobItems[safeCadIdx] : selectedOrder;

                const refImgUrl = resolveItemImage(activeRefJob) || normalizeImageUrl(activeRefJob?.reference_image || activeRefJob?.image || selectedOrder?.reference_image);
                const cadFileUrl = activeCadJob?.design_file || selectedOrder?.design_file;
                const cadFileName = activeCadJob?.design_file_name || selectedOrder?.design_file_name || 'CAD Drawing';
                const isCadPdf = cadFileUrl && String(cadFileUrl).toLowerCase().endsWith('.pdf');

                const handlePrevRef = (e) => {
                  if (e) e.stopPropagation();
                  if (totalJobs <= 1) return;
                  setRefSliderIndex((prev) => (prev - 1 + totalJobs) % totalJobs);
                };
                const handleNextRef = (e) => {
                  if (e) e.stopPropagation();
                  if (totalJobs <= 1) return;
                  setRefSliderIndex((prev) => (prev + 1) % totalJobs);
                };
                const handlePrevCad = (e) => {
                  if (e) e.stopPropagation();
                  if (totalJobs <= 1) return;
                  setCadSliderIndex((prev) => (prev - 1 + totalJobs) % totalJobs);
                };
                const handleNextCad = (e) => {
                  if (e) e.stopPropagation();
                  if (totalJobs <= 1) return;
                  setCadSliderIndex((prev) => (prev + 1) % totalJobs);
                };

                return (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-gray-800 tracking-wider uppercase flex items-center gap-1.5">
                          <i className="fa-solid fa-images text-[#881337]"></i>
                          Design &amp; Reference Previews
                        </h3>
                        {totalJobs > 1 && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 font-semibold px-2 py-0.5 rounded-full border border-stone-200">
                            {totalJobs} Jobs in Order
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono font-bold">
                        <span className="text-amber-800">Gold: {totalGoldWeight.toFixed(3)} g</span>
                        <span className="text-blue-800">Dia: {totalCarats.toFixed(3)} ct ({totalStonesCount} pcs)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reference Image Preview with Slider Controls & Enlarged Frame */}
                      <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/60 flex flex-col justify-between min-h-[300px] relative group transition-all hover:border-stone-300">
                        {/* Header bar inside card */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10.5px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fa-solid fa-camera text-[#881337]"></i>
                              Reference Image
                            </span>
                            {totalJobs > 1 && (
                              <span className="text-[10px] font-bold bg-[#881337]/10 text-[#881337] px-2 py-0.5 rounded-full border border-[#881337]/20">
                                Job {safeRefIdx + 1} of {totalJobs}{activeRefJob?.design_number ? ` • ${activeRefJob.design_number}` : ''}
                              </span>
                            )}
                          </div>
                          {totalJobs > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handlePrevRef}
                                className="w-6 h-6 rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 hover:text-[#881337] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                                title="Previous Job Image"
                              >
                                <i className="fa-solid fa-chevron-left text-[9px]"></i>
                              </button>
                              <span className="text-[10px] font-mono font-bold text-stone-600 px-1 select-none">
                                {safeRefIdx + 1}/{totalJobs}
                              </span>
                              <button
                                type="button"
                                onClick={handleNextRef}
                                className="w-6 h-6 rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 hover:text-[#881337] flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                                title="Next Job Image"
                              >
                                <i className="fa-solid fa-chevron-right text-[9px]"></i>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Image Canvas with Floating Nav Arrows */}
                        <div className="relative flex-1 flex flex-col items-center justify-center min-h-[230px] rounded-lg bg-white border border-stone-200/80 p-2 overflow-hidden shadow-2xs">
                          {/* Floating Left Arrow */}
                          {totalJobs > 1 && (
                            <button
                              type="button"
                              onClick={handlePrevRef}
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-800 hover:text-[#881337] shadow-md border border-stone-300 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                              title="Previous Job Image"
                            >
                              <i className="fa-solid fa-chevron-left text-xs"></i>
                            </button>
                          )}

                          {refImgUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <img
                                src={refImgUrl}
                                alt={`Job #${safeRefIdx + 1} Reference`}
                                onClick={() => setPreviewDoc({
                                  url: refImgUrl,
                                  name: activeRefJob?.design_number ? `Reference - ${activeRefJob.design_number}` : `Job #${safeRefIdx + 1} Reference Image`,
                                  type: 'image'
                                })}
                                className="max-h-64 sm:max-h-72 w-auto max-w-full object-contain rounded-md transition-transform hover:scale-[1.02] cursor-zoom-in"
                                title="Click to view enlarged full preview"
                              />
                              {activeRefJob?.design_number && (
                                <span className="text-[10px] font-mono text-stone-500 font-semibold mt-1.5 text-center">
                                  {activeRefJob.design_number} {activeRefJob.product_name ? `• ${activeRefJob.product_name}` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-10 text-stone-400">
                              <i className="fa-regular fa-image text-4xl mb-2 text-stone-300"></i>
                              <p className="text-xs font-medium">No Reference Image</p>
                              {activeRefJob?.design_number && (
                                <p className="text-[10px] font-mono text-stone-400 mt-0.5">{activeRefJob.design_number}</p>
                              )}
                            </div>
                          )}

                          {/* Floating Right Arrow */}
                          {totalJobs > 1 && (
                            <button
                              type="button"
                              onClick={handleNextRef}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-800 hover:text-[#881337] shadow-md border border-stone-300 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                              title="Next Job Image"
                            >
                              <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                          )}
                        </div>

                        {/* Bottom Indicators / Pagination Dots */}
                        {totalJobs > 1 && (
                          <div className="flex items-center justify-center gap-1.5 mt-2.5">
                            {jobItems.map((job, idx) => (
                              <button
                                key={job.id || idx}
                                type="button"
                                onClick={() => setRefSliderIndex(idx)}
                                className={`h-2 rounded-full transition-all cursor-pointer ${idx === safeRefIdx ? 'w-6 bg-[#881337]' : 'w-2 bg-stone-300 hover:bg-stone-400'}`}
                                title={`Job #${idx + 1}${job.design_number ? ` (${job.design_number})` : ''}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* CAD Design Preview with Slider Controls & Enlarged Frame */}
                      <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/60 flex flex-col justify-between min-h-[300px] relative group transition-all hover:border-stone-300">
                        {/* Header bar inside card */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10.5px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fa-solid fa-compass-drafting text-indigo-700"></i>
                              CAD Design
                            </span>
                            {totalJobs > 1 && (
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                                Job {safeCadIdx + 1} of {totalJobs}{activeCadJob?.design_number ? ` • ${activeCadJob.design_number}` : ''}
                              </span>
                            )}
                          </div>
                          {totalJobs > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handlePrevCad}
                                className="w-6 h-6 rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 hover:text-indigo-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                                title="Previous Job CAD"
                              >
                                <i className="fa-solid fa-chevron-left text-[9px]"></i>
                              </button>
                              <span className="text-[10px] font-mono font-bold text-stone-600 px-1 select-none">
                                {safeCadIdx + 1}/{totalJobs}
                              </span>
                              <button
                                type="button"
                                onClick={handleNextCad}
                                className="w-6 h-6 rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 hover:text-indigo-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                                title="Next Job CAD"
                              >
                                <i className="fa-solid fa-chevron-right text-[9px]"></i>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* CAD Canvas with Floating Nav Arrows */}
                        <div className="relative flex-1 flex flex-col items-center justify-center min-h-[230px] rounded-lg bg-white border border-stone-200/80 p-2 overflow-hidden shadow-2xs">
                          {/* Floating Left Arrow */}
                          {totalJobs > 1 && (
                            <button
                              type="button"
                              onClick={handlePrevCad}
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-800 hover:text-indigo-700 shadow-md border border-stone-300 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                              title="Previous Job CAD"
                            >
                              <i className="fa-solid fa-chevron-left text-xs"></i>
                            </button>
                          )}

                          {cadFileUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              {isCadPdf ? (
                                <div className="text-center py-6 text-indigo-700 flex flex-col items-center">
                                  <i className="fa-solid fa-file-pdf text-5xl mb-2 text-red-500"></i>
                                  <p className="text-xs font-bold text-gray-800">{cadFileName}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewDoc({
                                        url: cadFileUrl,
                                        name: cadFileName,
                                        type: 'pdf'
                                      })}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                                    >
                                      Preview PDF &rarr;
                                    </button>
                                    <a
                                      href={cadFileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 underline"
                                    >
                                      Open New Tab
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={normalizeImageUrl(cadFileUrl)}
                                  alt={`Job #${safeCadIdx + 1} CAD`}
                                  onClick={() => setPreviewDoc({
                                    url: normalizeImageUrl(cadFileUrl),
                                    name: activeCadJob?.design_number ? `CAD - ${activeCadJob.design_number}` : `Job #${safeCadIdx + 1} CAD Design`,
                                    type: 'image'
                                  })}
                                  className="max-h-64 sm:max-h-72 w-auto max-w-full object-contain rounded-md transition-transform hover:scale-[1.02] cursor-zoom-in"
                                  title="Click to view enlarged full preview"
                                />
                              )}
                              {activeCadJob?.design_number && (
                                <span className="text-[10px] font-mono text-stone-500 font-semibold mt-1.5 text-center">
                                  {activeCadJob.design_number} {activeCadJob.product_name ? `• ${activeCadJob.product_name}` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-10 text-stone-400">
                              <i className="fa-solid fa-file-lines text-4xl mb-2 text-stone-300"></i>
                              <p className="text-xs font-medium">No CAD Design File</p>
                              {activeCadJob?.design_number && (
                                <p className="text-[10px] font-mono text-stone-400 mt-0.5">{activeCadJob.design_number}</p>
                              )}
                            </div>
                          )}

                          {/* Floating Right Arrow */}
                          {totalJobs > 1 && (
                            <button
                              type="button"
                              onClick={handleNextCad}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-800 hover:text-indigo-700 shadow-md border border-stone-300 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
                              title="Next Job CAD"
                            >
                              <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                          )}
                        </div>

                        {/* Bottom Indicators / Pagination Dots */}
                        {totalJobs > 1 && (
                          <div className="flex items-center justify-center gap-1.5 mt-2.5">
                            {jobItems.map((job, idx) => (
                              <button
                                key={job.id || idx}
                                type="button"
                                onClick={() => setCadSliderIndex(idx)}
                                className={`h-2 rounded-full transition-all cursor-pointer ${idx === safeCadIdx ? 'w-6 bg-indigo-700' : 'w-2 bg-stone-300 hover:bg-stone-400'}`}
                                title={`Job #${idx + 1}${job.design_number ? ` (${job.design_number})` : ''}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Right Column: Weight Summary & Order Documents */}
            <div className="lg:col-span-4 space-y-6">

              {/* Order Total Weight Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs relative overflow-hidden">
                <h3 className="text-base font-bold text-[#881337] mb-3 flex items-center justify-between">
                  <span>Work Order Weight Summary</span>
                  <span className="text-xs font-normal text-stone-500 font-sans">{jobItems.length} {jobItems.length === 1 ? 'Job' : 'Jobs'}</span>
                </h3>

                <div className="space-y-3 text-xs mb-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-200/60">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <i className="fa-solid fa-coins text-amber-600"></i>
                      Total Gold Weight
                    </span>
                    <span className="font-mono font-black text-amber-950 text-sm">{totalGoldWeight.toFixed(3)} g</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200/60">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <i className="fa-solid fa-gem text-blue-600"></i>
                      Total Diamond Carats
                    </span>
                    <span className="font-mono font-black text-blue-950 text-sm">{totalCarats.toFixed(3)} ct</span>
                  </div>

                  <div className="flex items-center justify-between px-2 text-stone-600">
                    <span>Total Diamonds Count</span>
                    <span className="font-mono font-bold text-stone-900">{totalStonesCount} Pcs</span>
                  </div>

                  <div className="flex items-center justify-between px-2 text-stone-600">
                    <span>Total Quantity Needed</span>
                    <span className="font-mono font-bold text-stone-900">{totalNeedPcs} Units</span>
                  </div>
                </div>
              </div>

              {/* WORKFLOW STEP Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
                  WORKFLOW STEP
                </span>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#881337] text-white font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200"></div>
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200"></div>
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Job drafting is the first stage. Once assigned, stock will be blocked from the main vault.
                </p>
              </div>

              {/* DOCUMENTS Card dynamically reflecting uploaded files */}
              <div className="bg-white rounded-2xl border border-[#ebd8cd] p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider block">
                    DOCUMENTS {activeDocuments.length > 0 && `(${activeDocuments.length})`}
                  </span>
                </div>
                <div className="w-full h-px bg-[#ead8ce] mt-2.5 mb-4"></div>

                {activeDocuments.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/50 p-3.5">
                    <p className="text-xs font-semibold text-gray-500">- No doc added -</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {activeDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleOpenDocument(doc)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenDocument(doc)}
                        className="flex items-center justify-between group py-1 px-1 -mx-1 rounded-lg hover:bg-amber-50/70 transition-all cursor-pointer select-none"
                        title={`Click to open ${doc.name}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
                          {doc.type === 'image' ? (
                            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                              <svg
                                className="w-5.5 h-5.5 text-[#f59e0b] group-hover:scale-110 transition-transform"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          ) : doc.type === 'pdf' ? (
                            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                              <svg
                                className="w-5.5 h-5.5 text-[#f59e0b] group-hover:scale-110 transition-transform"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <text x="6" y="16.5" fontSize="6.5" fontWeight="bold" fill="#f59e0b" stroke="none">PDF</text>
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                              <svg
                                className="w-5.5 h-5.5 text-[#f59e0b] group-hover:scale-110 transition-transform"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-normal text-gray-800 group-hover:text-amber-800 transition-colors block truncate">
                              {doc.name}
                            </span>
                            {doc.source && (
                              <span className="text-[10px] text-gray-500 font-medium block truncate -mt-0.5">
                                {doc.source}
                              </span>
                            )}
                          </div>
                        </div>
                        <i className="fa-solid fa-eye text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit / Action Buttons */}
              {viewMode === 'create' ? (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSaveWorkOrder}
                    className="w-full py-3 px-4 bg-[#881337] hover:bg-[#70102d] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Saving Work Order...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Create & Issue Work Order</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel & Back to List
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      fetchOrdersList();
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-arrow-left text-xs"></i>
                    <span>Back to Work Orders List</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* POPUP MODAL: Add / Edit Job Row Details */}
      {showRowModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRowModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-100"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 my-8 relative max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header (Scrollable with modal body) */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#881337] flex items-center justify-center text-sm font-bold shadow-2xs">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingRowIndex !== null ? 'Edit Row Details' : 'Add Row Details'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Input row specifications: work order no, design no, product name, gold purity, setting style, diamond & gold weights, pcs, and remarks.
                  </p>
                </div>
              </div>

              {/* Top X Close Button */}
              <button
                type="button"
                onClick={() => setShowRowModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body / Form containing ONLY the specified input fields */}
            <form onSubmit={handleSaveRowModal} className="space-y-4">

              {/* 1. SECTION: Work Order No, Design No & Product Name */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3 bg-white">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  Work Order Number, Design & Product Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Work Order No (Unique code, auto-generated or manual typing) */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      WORK ORDER NO (UNIQUE) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rowForm.work_order_no || rowForm.form_no || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRowForm((prev) => ({ ...prev, work_order_no: val, form_no: val }));
                        if (formErrors.work_order_no) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.work_order_no;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. WO-2026-0001-01"
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-bold outline-hidden transition-all ${formErrors.work_order_no
                        ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                        : 'border border-gray-200 focus:border-[#881337] bg-white text-[#881337]'
                        }`}
                    />
                    {formErrors.work_order_no ? (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.work_order_no}
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-stone-400 font-medium block mt-0.5">
                        * Auto-generated or type manually (must be unique)
                      </span>
                    )}
                  </div>

                  {/* Design No - Typing method */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      DESIGN NO (TYPING METHOD) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      list="inventory-design-options"
                      required
                      value={rowForm.design_number || ''}
                      onChange={(e) => handleDesignNumberChange(e.target.value)}
                      placeholder="e.g. DG-4587"
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-bold outline-hidden transition-all ${formErrors.design_number
                        ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                        : 'border border-gray-200 focus:border-[#881337] bg-white text-gray-900'
                        }`}
                    />
                    <datalist id="inventory-design-options">
                      {inventoryProducts.map((p) => {
                        const dCode = (p.design_no || '').trim();
                        const pCode = (p.product_code || '').trim();
                        const pName = p.name || p.product_name || '';
                        const pWt = p.attributes?.gross_wt || p.opening_stock_weight || '';
                        return (
                          <React.Fragment key={p.id}>
                            {dCode && (
                              <option value={dCode}>
                                {pName ? `${pName} (${dCode})${pWt ? ` - ${pWt}g` : ''}` : dCode}
                              </option>
                            )}
                            {pCode && pCode !== dCode && (
                              <option value={pCode}>
                                {pName ? `${pName} [${pCode}]${pWt ? ` - ${pWt}g` : ''}` : pCode}
                              </option>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </datalist>
                    {formErrors.design_number && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.design_number}
                      </span>
                    )}
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      PRODUCT NAME <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rowForm.product_name || ''}
                      onChange={(e) => updateRowFormAndCalculate('product_name', e.target.value)}
                      placeholder="e.g. Peacock Choker Necklace"
                      className={`w-full text-xs rounded-lg p-2.5 font-bold outline-hidden transition-all ${formErrors.product_name
                        ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                        : 'border border-gray-200 focus:border-[#881337] bg-white text-gray-900'
                        }`}
                    />
                    {formErrors.product_name && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.product_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. SECTION: Gold Purity & Setting Style */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3 bg-white">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  Gold Purity &amp; Setting Style
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Gold Purity - Linked to Masters / Standard Karats */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      GOLD PURITY <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      list="gold-purity-master-options"
                      required
                      value={rowForm.gold_purity || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        let autoStamp = '';
                        if (val.includes('24') || val.includes('999')) autoStamp = '999';
                        else if (val.includes('22') || val.includes('916')) autoStamp = '916';
                        else if (val.includes('18') || val.includes('750')) autoStamp = '750';
                        else if (val.includes('14') || val.includes('585')) autoStamp = '585';
                        setRowForm(prev => ({
                          ...prev,
                          gold_purity: val,
                          gold_stamp: autoStamp || prev.gold_stamp,
                        }));
                      }}
                      placeholder="e.g. 22K (916) Hallmark Gold"
                      className={`w-full text-xs rounded-lg p-2.5 font-bold outline-hidden transition-all ${formErrors.gold_purity
                        ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                        : 'border border-gray-200 focus:border-[#881337] bg-white text-amber-900'
                        }`}
                    />
                    <datalist id="gold-purity-master-options">
                      <option value="24K (999) Pure Gold" />
                      <option value="22K (916) Hallmark Gold" />
                      <option value="18K (750) Gold" />
                      <option value="14K (585) Gold" />
                      <option value="10K (417) Gold" />
                    </datalist>
                    {formErrors.gold_purity && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.gold_purity}
                      </span>
                    )}
                  </div>

                  {/* Setting - Dropdown for selecting setting style */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                        SETTING <span className="text-red-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowStylesModal(true)}
                        className="text-[10px] font-bold text-[#881337] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Manage Setting Styles Master list"
                      >
                        <i className="fa-solid fa-plus text-[8px]"></i>
                        <span>Manage Styles</span>
                      </button>
                    </div>
                    <select
                      value={
                        settingStyles.length > 0
                          ? (settingStyles.some((s) => s.name === rowForm.setting_type) ? rowForm.setting_type : settingStyles[0].name)
                          : (rowForm.setting_type || 'Open setting')
                      }
                      onChange={(e) => updateRowFormAndCalculate('setting_type', e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 outline-hidden transition-all bg-white font-medium ${formErrors.setting_type ? 'border-2 border-red-500 bg-red-50/20' : 'border border-gray-200 focus:border-[#881337]'
                        }`}
                    >
                      {settingStyles.length > 0 ? (
                        <>
                          {settingStyles.map((s) => (
                            <option key={s.id || s.name} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                          {rowForm.setting_type && !settingStyles.some((s) => s.name === rowForm.setting_type) && (
                            <option value={rowForm.setting_type}>{rowForm.setting_type}</option>
                          )}
                        </>
                      ) : (
                        <>
                          <option value="Open setting">Open setting</option>
                          <option value="Close Setting">Close Setting</option>
                          <option value="Prong">Prong</option>
                          <option value="Bezel">Bezel</option>
                          <option value="Channel">Channel</option>
                          <option value="Pave Setting">Pave Setting</option>
                          <option value="Bar Setting">Bar Setting</option>
                          <option value="Flush Setting">Flush Setting</option>
                          <option value="Tension Setting">Tension Setting</option>
                          <option value="Invisible Setting">Invisible Setting</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. SECTION: Reference Image Upload & CAD Design Upload */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3 bg-white">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  Reference Image & CAD Design Uploads
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* BOX 1: Upload Reference Image */}
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-camera text-[#881337]"></i>
                        Reference Image Upload
                      </span>
                      {rowForm.reference_image && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowForm((prev) => ({
                              ...prev,
                              reference_image: '',
                              reference_image_name: '',
                              reference_image_type: '',
                              image: prev.design_file || '',
                            }));
                          }}
                          className="text-[10px] text-red-600 hover:underline cursor-pointer font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </label>

                    <div
                      onClick={() => refImageInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-300 hover:border-[#881337] rounded-xl p-3 text-center cursor-pointer transition-colors bg-stone-50/60 hover:bg-rose-50/20 group min-h-[105px] flex flex-col items-center justify-center relative"
                    >
                      {rowForm.reference_image ? (
                        <div className="flex items-center gap-3 w-full text-left">
                          <img
                            src={normalizeImageUrl(rowForm.reference_image)}
                            alt="Reference preview"
                            className="w-14 h-14 object-cover rounded-lg border border-stone-200 shadow-2xs bg-white shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              const fallback = e.target.parentElement?.querySelector('.ref-img-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="ref-img-fallback hidden w-14 h-14 rounded-lg border border-stone-200 bg-rose-50 text-[#881337] items-center justify-center shrink-0">
                            <i className="fa-solid fa-image text-lg"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-gray-800 block truncate">
                              {rowForm.reference_image_name || 'Reference Image Attached'}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-circle-check text-[9px]"></i> Attached for row
                            </span>
                            <span className="text-[10px] text-stone-400 block mt-0.5 group-hover:text-[#881337] transition-colors">
                              Click to change / replace
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1">
                          <div className="w-8 h-8 rounded-full bg-rose-50 text-[#881337] flex items-center justify-center text-xs mx-auto mb-1 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                          </div>
                          <p className="text-xs font-bold text-gray-700">Upload Reference Image</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">JPG, PNG, WebP photo or select Design No</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOX 2: Upload CAD Design File */}
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-compass-drafting text-indigo-700"></i>
                        CAD Design Upload Column
                      </span>
                      {rowForm.design_file && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowForm((prev) => ({ ...prev, design_file: '', design_file_name: '' }));
                          }}
                          className="text-[10px] text-red-600 hover:underline cursor-pointer font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </label>

                    <div
                      onClick={() => designFileInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-300 hover:border-indigo-600 rounded-xl p-3 text-center cursor-pointer transition-colors bg-stone-50/60 hover:bg-indigo-50/30 group min-h-[105px] flex flex-col items-center justify-center"
                    >
                      {rowForm.design_file ? (
                        <div className="flex items-center gap-3 w-full text-left">
                          <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shrink-0 font-bold">
                            <i className="fa-solid fa-file-code"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-gray-800 block truncate">
                              {rowForm.design_file_name || 'CAD Design Attached'}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold block flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-circle-check text-[9px]"></i> Attached for row
                            </span>
                            <span className="text-[10px] text-stone-400 block mt-0.5">Click to change CAD file</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs mx-auto mb-1 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-file-arrow-up"></i>
                          </div>
                          <p className="text-xs font-bold text-gray-700">Upload CAD Design File</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">3DM, STL, OBJ, PDF, Drawings</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SECTION: Product Creation Quantity & Order Specifications */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3 bg-white">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block flex items-center gap-1.5">
                  <i className="fa-solid fa-layer-group text-xs"></i>
                  Product Creation Quantity &amp; Order Specifications
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="flex flex-col justify-end">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide flex items-center gap-1">
                      NEEDED PCS (PRODUCT QUANTITY) <span className="text-red-600 ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={rowForm.need_pcs ?? 1}
                      onFocus={(e) => {
                        try { e.target.select(); } catch (_) { }
                        setTimeout(() => { try { e.target.select(); } catch (_) { } }, 15);
                      }}
                      onChange={(e) => {
                        const v = normalizeNumericInput(e.target.value, rowForm.need_pcs);
                        const parsed = parseInt(v, 10);
                        updateRowFormAndCalculate('need_pcs', isNaN(parsed) || parsed < 1 ? 1 : parsed);
                      }}
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-bold outline-hidden transition-all ${formErrors.need_pcs ? 'border-2 border-red-500 bg-red-50/20' : 'border border-gray-200 focus:border-[#881337] bg-white'
                        }`}
                    />
                    {formErrors.need_pcs && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1">{formErrors.need_pcs}</span>
                    )}
                  </div>
                  <div className="sm:col-span-2 text-xs text-stone-500 self-center font-medium">
                    Total product items/units to be manufactured / created for this order row.
                  </div>
                </div>
              </div>

              {/* 5. SECTION: Gold Weight Specifications */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-coins text-amber-600 text-xs"></i>
                    Gold Weight Specifications
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    (Weight optional for custom or open-ended jobs)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  {/* Gold Net Weight (G) - Non-mandatory */}
                  <div className="flex flex-col justify-end">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide min-h-[20px] flex items-end">
                      Gold Net Wt (g) <span className="text-[10px] text-stone-400 font-normal ml-1 lowercase">(optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.gold_weight || ''}
                      onFocus={handleNumericFocus}
                      onChange={(e) => updateRowFormAndCalculate('gold_weight', normalizeNumericInput(e.target.value, rowForm.gold_weight))}
                      placeholder="e.g. 10.000"
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-bold outline-hidden transition-all text-gray-900 ${formErrors.gold_weight
                        ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                        : 'border border-gray-200 focus:border-[#881337] bg-white'
                        }`}
                    />
                    {formErrors.gold_weight && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.gold_weight}
                      </span>
                    )}
                  </div>

                  {/* Fine Gold Weight (G) - Auto-calculated from Net Wt × Purity %, also editable */}
                  <div className="flex flex-col justify-end">
                    <label className="text-[11px] font-bold text-amber-900 block mb-1 uppercase tracking-wide min-h-[20px] flex items-end justify-between">
                      <span>Fine Gold Wt (g)</span>
                      <span className="text-[9.5px] font-normal text-amber-700">Net Wt × Purity%</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.fine_gold_weight || ''}
                      onFocus={handleNumericFocus}
                      onChange={(e) => updateRowFormAndCalculate('fine_gold_weight', normalizeNumericInput(e.target.value, rowForm.fine_gold_weight))}
                      placeholder="e.g. 9.160"
                      className="w-full text-xs border border-amber-300 bg-amber-50/30 rounded-lg p-2.5 font-mono font-black text-amber-950 outline-hidden focus:border-amber-600 focus:bg-white"
                    />
                  </div>

                  {/* Gold Purity Live Indicator */}
                  <div className="flex flex-col justify-end">
                    <label className="text-[11px] font-bold text-stone-600 block mb-1 uppercase tracking-wide min-h-[20px] flex items-end">
                      Gold Purity Standard
                    </label>
                    <div className="w-full text-xs border border-stone-200 bg-stone-50 rounded-lg p-2.5 font-bold text-stone-800 flex items-center justify-between">
                      <span className="truncate">{rowForm.gold_purity || '22K (91.6% Pure)'}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">
                        {rowForm.gold_purity?.includes('24') ? '99.9%' : (rowForm.gold_purity?.includes('18') ? '75.0%' : (rowForm.gold_purity?.includes('14') ? '58.5%' : '91.6%'))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. SECTION: Diamond Specifications (Dynamic Multi-Type / Sieves Table) */}
              <div className="border border-purple-200/80 rounded-xl p-3.5 space-y-3 bg-purple-50/15">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-purple-900 tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-gem text-purple-600 text-xs"></i>
                    Diamond Specifications (Multiple Diamond Types &amp; Sieves)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddDiamondSieve}
                    className="text-[11px] font-bold text-white bg-purple-700 hover:bg-purple-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i> Add Diamond Type
                  </button>
                </div>

                {Array.isArray(rowForm.diamond_sieves) && rowForm.diamond_sieves.length > 0 ? (
                  <div className="border border-purple-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-purple-100/75 text-purple-950 font-bold border-b border-purple-200">
                        <tr>
                          <th className="p-2 pl-3">Diamond Stamp</th>
                          <th className="p-2 w-32 text-center">Pieces (Count)</th>
                          <th className="p-2 w-36 text-right">Carats (Cts / Wt)</th>
                          <th className="p-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100">
                        {rowForm.diamond_sieves.map((sieve, sIdx) => (
                          <tr key={sIdx} className="hover:bg-purple-50/30">
                            <td className="p-2 pl-3">
                              <input
                                type="text"
                                value={sieve.stamp || ''}
                                onChange={(e) => handleUpdateDiamondSieve(sIdx, 'stamp', e.target.value)}
                                placeholder="Diamond Stamp (e.g. +1, +2, -2)"
                                className="w-full px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs font-mono font-bold text-purple-900 bg-white focus:border-purple-600 outline-hidden"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={sieve.count ?? ''}
                                onChange={(e) => handleUpdateDiamondSieve(sIdx, 'count', e.target.value)}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs font-mono font-bold text-center bg-white focus:border-purple-600 outline-hidden"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={sieve.weight ?? ''}
                                onChange={(e) => handleUpdateDiamondSieve(sIdx, 'weight', e.target.value)}
                                placeholder="0.000"
                                className="w-full px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs font-mono font-black text-right text-purple-900 bg-white focus:border-purple-600 outline-hidden"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDiamondSieve(sIdx)}
                                className="text-stone-400 hover:text-red-600 font-bold text-xs p-1 cursor-pointer transition-colors"
                                title="Remove diamond type row"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-purple-50/70 border-t border-purple-200 font-bold text-[11px] text-purple-950">
                        <tr>
                          <td className="p-2 pl-3 uppercase tracking-wide text-purple-900 font-extrabold">
                            Total Diamonds ({rowForm.diamond_sieves.length} {rowForm.diamond_sieves.length === 1 ? 'type' : 'types'})
                          </td>
                          <td className="p-2 text-center font-mono font-black text-purple-900">
                            {rowForm.no_of_diamonds || 0} pcs
                          </td>
                          <td className="p-2 text-right font-mono font-black text-purple-900">
                            {parseFloat(rowForm.diamond_weight || 0).toFixed(3)} cts
                          </td>
                          <td className="p-2 text-center text-[10px] text-stone-500 font-normal">
                            Per Piece Totals
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="border border-dashed border-purple-300 rounded-xl p-4 bg-white/70 text-center space-y-2">
                    <i className="fa-regular fa-gem text-2xl text-purple-300"></i>
                    <p className="text-xs text-stone-600 font-medium">No diamond types added to this work item.</p>
                    <button
                      type="button"
                      onClick={handleAddDiamondSieve}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                    >
                      + Click here to add a diamond stamp
                    </button>
                  </div>
                )}

                {/* Optional Colour Stones */}
                <div className="pt-2 border-t border-purple-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col justify-end">
                    <label className="text-[10.5px] font-bold text-stone-600 block mb-1 uppercase tracking-wide">
                      Colour Stones (Pcs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rowForm.no_of_colour_stones || ''}
                      onFocus={handleNumericFocus}
                      onChange={(e) => updateRowFormAndCalculate('no_of_colour_stones', normalizeNumericInput(e.target.value, rowForm.no_of_colour_stones))}
                      placeholder="0"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 font-mono outline-hidden focus:border-[#881337] bg-white"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-[10.5px] font-bold text-stone-600 block mb-1 uppercase tracking-wide">
                      Colour Stones Weight (Cts)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={rowForm.color_stone_weight || ''}
                      onFocus={handleNumericFocus}
                      onChange={(e) => updateRowFormAndCalculate('color_stone_weight', normalizeNumericInput(e.target.value, rowForm.color_stone_weight))}
                      placeholder="0.000"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 font-mono outline-hidden focus:border-[#881337] bg-white"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-[10.5px] font-bold text-stone-600 block mb-1 uppercase tracking-wide">
                      Colour Stone Remarks / Type
                    </label>
                    <input
                      type="text"
                      value={rowForm.color_stone_stamp || ''}
                      onChange={(e) => setRowForm({ ...rowForm, color_stone_stamp: e.target.value })}
                      placeholder="e.g. Ruby, Emerald"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 outline-hidden focus:border-[#881337] bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 7. SECTION: Auto Calculated Totals */}
              <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  Auto Calculated Row Totals (For {rowForm.need_pcs || 1} {parseInt(rowForm.need_pcs, 10) === 1 ? 'Unit' : 'Units'})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      Total Gold Net Wt (g)
                    </label>
                    <div className="text-sm font-black font-mono text-[#881337] mt-0.5">
                      {rowForm.total_gold_wt || rowForm.total_gross_wt || '0.000'} g
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {rowForm.gold_weight || 0}g × {rowForm.need_pcs || 1} pcs
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      Total Fine Gold Wt (g)
                    </label>
                    <div className="text-sm font-black font-mono text-amber-700 mt-0.5">
                      {((parseFloat(rowForm.fine_gold_weight) || 0) * (parseInt(rowForm.need_pcs, 10) || 1)).toFixed(3)} g
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {rowForm.fine_gold_weight || 0}g × {rowForm.need_pcs || 1} pcs
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-2xs">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      Total Diamond Cts (ct)
                    </label>
                    <div className="text-sm font-black font-mono text-purple-700 mt-0.5">
                      {rowForm.total_dia_cts || '0.000'} cts
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {rowForm.diamond_weight || 0} cts × {rowForm.need_pcs || 1} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. SECTION: Remarks */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200">
                <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                  REMARKS
                </label>
                <input
                  type="text"
                  value={rowForm.remark || ''}
                  onChange={(e) => setRowForm({ ...rowForm, remark: e.target.value })}
                  placeholder="Enter remarks for this work order row"
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-hidden focus:border-[#881337]"
                />
              </div>

              {/* Modal Actions (Scrollable naturally with modal body) */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowRowModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#881337] hover:bg-[#70102d] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>{editingRowIndex !== null ? 'Update Row Details' : '+ Add Row'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Low Stock Disclaimer Notice */}
      {insufficientStockData && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInsufficientStockData(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 relative animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shadow-2xs shrink-0">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                    Vault Stock Notice — Low Stock Alert
                  </h3>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    Vault stock is currently below the requirement for this order.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInsufficientStockData(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Shortage Summary Cards */}
            <div className="my-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Weight Shortage */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Diamond Weight (Cts)
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-stone-500 font-medium">Required:</span>
                    <span className="font-mono font-bold text-gray-900">{insufficientStockData.required_carats} ct</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-stone-500 font-medium">In Vault:</span>
                    <span className="font-mono font-semibold text-stone-700">{insufficientStockData.available_carats} ct</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1.5 mt-1 border-t border-amber-200/80">
                    <span className="text-xs font-bold text-rose-700">Shortage:</span>
                    <span className="font-mono font-extrabold text-rose-700 text-sm">+{insufficientStockData.shortage_carats} ct</span>
                  </div>
                </div>

                {/* Count Shortage */}
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    Total Diamonds (Pcs)
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-stone-500 font-medium">Required:</span>
                    <span className="font-mono font-bold text-gray-900">{insufficientStockData.required_count} pcs</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-stone-500 font-medium">In Vault:</span>
                    <span className="font-mono font-semibold text-stone-700">
                      {insufficientStockData.available_count > 0
                        ? `${insufficientStockData.available_count} pcs`
                        : (insufficientStockData.available_carats > 0 ? `${insufficientStockData.available_carats} ct (Parcel)` : '0 pcs')
                      }
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1.5 mt-1 border-t border-purple-200/80">
                    <span className="text-xs font-bold text-rose-700">Shortage:</span>
                    <span className="font-mono font-extrabold text-rose-700 text-sm">+{insufficientStockData.shortage_count} pcs</span>
                  </div>
                </div>
              </div>

              {insufficientStockData.stamp_details && (
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-600 flex items-center gap-1.5">
                    <i className="fa-solid fa-stamp text-purple-600"></i> Stamp &amp; Sizes:
                  </span>
                  <span className="font-mono font-bold text-purple-900">{insufficientStockData.stamp_details}</span>
                </div>
              )}

              {/* Disclaimer Notice Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs flex items-start gap-3">
                <i className="fa-solid fa-circle-info text-amber-600 text-base mt-0.5 shrink-0"></i>
                <div className="space-y-1">
                  <span className="font-bold text-amber-900 block text-[12.5px]">
                    Material Allocation Notice:
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-amber-900/90">
                    Vault has <strong>{insufficientStockData.shortage_carats > 0 ? `${insufficientStockData.shortage_carats} ct` : `${insufficientStockData.shortage_count} pcs`}</strong> low stock. You can still proceed to create this Work Order now. Materials will <strong>not</strong> be automatically alloted or debited from the vault.
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed pt-0.5">
                    After creating the work order, you can purchase the required stock via <strong>Purchase Entry</strong>, and then allot the material from the vault to the artisan using the <strong>Material Allocation Hub</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInsufficientStockData(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel / Review Items
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateWithShortage}
                className="px-4 py-2 bg-[#881337] hover:bg-[#70102d] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-check text-xs"></i>
                <span>OK, Create Work Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
                  {previewDoc.type === 'pdf' ? (
                    <i className="fa-solid fa-file-pdf text-lg"></i>
                  ) : (
                    <i className="fa-solid fa-image text-lg"></i>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 leading-none">{previewDoc.name}</h3>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {previewDoc.type === 'pdf' ? 'CAD / Design Specification Document' : 'Master Reference Craft Visual'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-stone-50 rounded-lg flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-gray-500"></i>
                  <span>Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDoc(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-base"></i>
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-6 bg-stone-100/50 flex items-center justify-center overflow-auto max-h-[calc(90vh-120px)]">
              {previewDoc.type === 'pdf' && previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded-xl border border-gray-200 bg-white shadow-xs"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-md border border-stone-200 bg-white"
                  />
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-info text-amber-500 text-[11px]"></i>
                    <span>Previewing {previewDoc.name}</span>
                  </div>
                </div>
              )}
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
          updateFormField('setting_type', newStyleName);
          fetchSettingStyles();
        }}
        onRefresh={fetchSettingStyles}
      />

      {/* Portal-based Print Container for Clean Single-Page Landscape Printing */}
      {typeof document !== 'undefined' && createPortal(
        <div id="print-work-order-portal" className="hidden font-['Inter',sans-serif] text-xs text-gray-900 bg-white">
          <style>{`
            @page {
              size: landscape;
              margin: 4mm !important;
            }
            @media screen {
              #print-work-order-portal {
                display: none !important;
              }
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
              }
              #app, #root {
                display: none !important;
              }
              #print-work-order-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 2mm 3mm !important;
                box-sizing: border-box !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #print-work-order-portal * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #print-work-order-portal table th, #print-work-order-portal table td {
                white-space: nowrap !important;
              }
            }
          `}</style>
          <div className="p-2 space-y-2">
            <WorkOrderPrintHeader
              title="WORK ORDER"
              number={orderNumber || selectedOrder?.work_order_number || (jobItems[0]?.work_order_no || jobItems[0]?.form_no || 'JO-2026-0001')}
              issuedDate={timeline.estimated_start_date || selectedOrder?.allotted_date || (jobItems[0]?.ordered_date) || new Date().toISOString().split('T')[0]}
            />

            <WorkOrderPrintMetadata items={[
              { label: 'Created Date', value: timeline.estimated_start_date || selectedOrder?.allotted_date || (jobItems[0]?.ordered_date) || new Date().toISOString().split('T')[0] },
              { label: 'Delivery Due Date', value: timeline.promised_due_date || selectedOrder?.delivery_date || (jobItems[0]?.delivery_date) || '—', valueClassName: 'text-[#881337]' },
              { label: 'Order Priority', value: (timeline.priority || selectedOrder?.priority || 'MEDIUM').toUpperCase(), valueClassName: 'text-amber-800' },
              { label: 'Customer Name', value: customerName || selectedOrder?.customer_name || selectedOrder?.client?.name || 'Internal Showroom' },
              { label: 'Assigned Artisan', value: assignedWorker?.name || selectedOrder?.karigar?.name || 'Unassigned' },
            ]} />

            {/* Print Table in 2-Row Structured Format (No horizontal scrolling / clipping) */}
            <div className="w-full space-y-2 my-1">
              {jobItems.map((r, i) => {
                const pd = typeof r.pricing_details === 'string' ? JSON.parse(r.pricing_details || '{}') : (r.pricing_details || {});
                const diaWtVal = (r.diamond_weight && r.diamond_weight !== 'VS1' && r.diamond_weight !== 'VVS2') ? r.diamond_weight : (pd.diamond_weight || '');
                const diaWtNum = parseFloat(diaWtVal) || 0;
                const pcsNum = parseInt(r.need_pcs || pd.need_pcs || r.required_qty || r.qty || 1, 10) || 1;
                const diaGrams = diaWtNum * 0.2;
                const goldWtNum = parseFloat(r.gold_weight || pd.gold_weight || r.allotted_weight || r.total_weight || 0) || 0;
                const cstoneWt = parseFloat(r.color_stone_weight || pd.color_stone_weight || 0) || 0;
                const grossSingle = goldWtNum + diaGrams + cstoneWt;
                const actualTotalGross = grossSingle > 0 ? (grossSingle * pcsNum) : (goldWtNum * pcsNum);
                const grossWtFormatted = actualTotalGross > 0
                  ? actualTotalGross.toFixed(3)
                  : ((r.total_gross_wt && !isNaN(parseFloat(r.total_gross_wt))) ? Number(r.total_gross_wt).toFixed(3) : (goldWtNum > 0 ? (goldWtNum * pcsNum).toFixed(3) : '—'));
                const diaCtsFormatted = (r.total_dia_cts && !isNaN(parseFloat(r.total_dia_cts)) && parseFloat(r.total_dia_cts) > 0 && parseFloat(r.total_dia_cts) !== 0.66)
                  ? Number(r.total_dia_cts).toFixed(3)
                  : (diaWtNum > 0 ? (diaWtNum * pcsNum).toFixed(3) : '—');
                const formNo = r.form_no || r.work_order_no || orderNumber || selectedOrder?.work_order_number || `JO-${new Date().getFullYear()}-0001`;
                const goldPurity = r.gold_purity || pd.gold_purity || r.gold_priory || pd.gold_priory || r.purity || pd.purity || (r.gold_karat ? `${r.gold_karat}K` : '') || selectedOrder?.gold_purity || selectedOrder?.purity || selectedOrder?.material_type || '22K (916)';
                const diaCount = parseInt(r.no_of_diamonds || pd.no_of_diamonds || r.diamond_count || pd.diamond_count || (r.stone_details?.diamond_count) || 0, 10) || 0;

                return (
                  <div key={r.id || i} className="border border-[#d8c8b0] rounded-lg bg-white overflow-hidden shadow-2xs space-y-1 p-1.5">
                    {/* Part 1: Design & Gold Fabrication */}
                    <div className="w-full border border-[#d8c8b0] rounded overflow-hidden">
                      <div className="bg-[#eedfce]/70 px-2 py-0.5 text-[7.5px] font-black text-[#881337] uppercase tracking-wider border-b border-[#d8c8b0] flex items-center justify-between">
                        <span>Item #{i + 1} — Part 1: Design &amp; Gold Fabrication</span>
                        <span className="font-mono text-stone-500">Row 1 of 2</span>
                      </div>
                      <table className="w-full text-left text-[8.5px] border-collapse">
                        <thead>
                          <tr className="bg-[#eedfce] text-[#881337] font-bold border-b border-[#d8c8b0] text-[7.5px] uppercase">
                            <th className="py-1 px-1.5 border border-[#d8c8b0] text-center w-7">S.No</th>
                            <th className="py-1 px-2 border border-[#d8c8b0]">Design</th>
                            <th className="py-1 px-1.5 border border-[#d8c8b0] text-center w-8">Image</th>
                            <th className="py-1 px-2 border border-[#d8c8b0]">Form No</th>
                            <th className="py-1 px-2 border border-[#d8c8b0]">Gold Purity</th>
                            <th className="py-1 px-2 border border-[#d8c8b0]">Gold Stamp</th>
                            <th className="py-1 px-2 border border-[#d8c8b0]">Setting</th>
                            <th className="py-1 px-2 border border-[#d8c8b0] text-right">Gold Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-stone-200">
                            <td className="py-1.5 px-1.5 border border-stone-200 text-center font-bold">{i + 1}</td>
                            <td className="py-1.5 px-2 border border-stone-200 font-mono font-bold">
                              <div>{r.design_number || r.design_no || '—'}</div>
                              {r.product_name && <div className="text-[7.5px] text-stone-500 font-normal">{r.product_name}</div>}
                            </td>
                            <td className="py-1.5 px-1.5 border border-stone-200 text-center">
                              {resolveItemImage(r) ? (
                                <img src={resolveItemImage(r)} alt="Thumb" className="w-6 h-6 object-cover mx-auto rounded border border-stone-200" onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <span className="text-[9px] text-stone-300">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 font-mono font-bold text-[#881337]">
                              {formNo}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 font-bold text-amber-900">
                              {goldPurity}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 font-mono font-bold text-amber-900">
                              {r.gold_stamp || '—'}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200">{r.setting_type || 'Prong'}</td>
                            <td className="py-1.5 px-2 border border-stone-200 text-right font-mono font-bold">
                              {goldWtNum > 0 ? `${goldWtNum.toFixed(3)}g` : '—'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Part 2: Diamonds, Stones, Weights & Quantities */}
                    <div className="w-full border border-[#d8c8b0] rounded overflow-hidden">
                      <div className="bg-[#f5eade]/70 px-2 py-0.5 text-[7.5px] font-black text-[#881337] uppercase tracking-wider border-b border-[#d8c8b0] flex items-center justify-between">
                        <span>Item #{i + 1} — Part 2: Diamonds, Stones &amp; Total Weights Breakdown</span>
                        <span className="font-mono text-stone-500">Row 2 of 2</span>
                      </div>
                      <table className="w-full text-left text-[8.5px] border-collapse">
                        <thead>
                          <tr className="bg-[#f5eade] text-[#881337] font-bold border-b border-[#d8c8b0] text-[7.5px] uppercase">
                            <th className="py-1 px-2 border border-[#d8c8b0] text-right">Diamond Weight</th>
                            <th className="py-1 px-2 border border-[#d8c8b0] text-center min-w-[130px]">Diamond Details (Stamp / Pcs / Wt)</th>
                            <th className="py-1 px-2 border border-[#d8c8b0] text-center">No of Diamonds</th>
                            <th className="py-1 px-2 border border-[#d8c8b0] text-right">Total Dia Cts</th>
                            <th className="py-1 px-2 border border-[#d8c8b0] text-center">Need Pcs</th>
                            <th className="py-1 px-2 border border-[#d8c8b0] text-right">Total Gross Wt</th>
                            <th className="py-1 px-2 border border-[#d8c8b0]">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-stone-200 bg-stone-50/40">
                            <td className="py-1.5 px-2 border border-stone-200 text-right font-mono font-medium">
                              {diaWtNum > 0 ? `${diaWtNum.toFixed(3)}ct` : (r.diamond_details || '—')}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 text-center">
                              {renderDiamondDetails(r, i)}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 text-center font-bold text-emerald-800">
                              {diaCount}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 text-right font-mono font-bold text-emerald-700">
                              {diaCtsFormatted !== '—' ? `${diaCtsFormatted}ct` : '—'}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 text-center font-bold">
                              {pcsNum}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 text-right font-mono font-bold text-[#881337]">
                              {grossWtFormatted !== '—' ? `${grossWtFormatted}g` : '—'}
                            </td>
                            <td className="py-1.5 px-2 border border-stone-200 text-gray-600">
                              {r.remark && r.remark !== '-' ? r.remark : '—'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Part 3: Reference Image & CAD Design Image Side-by-Side (Enlarged for Karigar Crafting Specs) */}
                    <div className="w-full border border-[#d8c8b0] rounded-lg bg-white p-2.5 mt-2">
                      <div className="bg-[#eedfce]/80 px-2.5 py-1 text-[8.5px] font-black text-[#881337] uppercase tracking-wider border-b border-[#d8c8b0] flex items-center justify-between mb-2 rounded-t">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-shapes text-[#881337]"></i>
                          Job #{i + 1} Visual Reference &amp; CAD Design Drawing — Crafting Specs for Karigar
                        </span>
                        <span className="font-mono text-stone-600 font-bold">{r.design_number || 'Design Model'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3.5 items-center justify-center">
                        {/* Reference Image - Enlarged for artisan visual clarity */}
                        <div className="flex flex-col items-center justify-center border border-stone-200 rounded-lg p-2.5 bg-stone-50/50 min-h-[270px]">
                          <span className="text-[8.5px] font-bold text-stone-700 uppercase mb-2 flex items-center gap-1.5 self-start">
                            <i className="fa-solid fa-camera text-[#881337]"></i> Reference Image
                          </span>
                          {(resolveItemImage(r) || normalizeImageUrl(r.reference_image || r.image)) ? (
                            <img
                              src={resolveItemImage(r) || normalizeImageUrl(r.reference_image || r.image)}
                              alt={`Job #${i + 1} Reference`}
                              className="max-h-[280px] min-h-[220px] w-auto max-w-full object-contain rounded-md border border-stone-300 bg-white p-1.5 shadow-2xs"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-stone-400 py-14">
                              <i className="fa-solid fa-image text-3xl text-stone-300 mb-1.5"></i>
                              <span className="text-[9px] italic">No Reference Image Attached</span>
                            </div>
                          )}
                        </div>

                        {/* CAD Design Image - Enlarged for artisan dimensions and prong details */}
                        <div className="flex flex-col items-center justify-center border border-stone-200 rounded-lg p-2.5 bg-stone-50/50 min-h-[270px]">
                          <span className="text-[8.5px] font-bold text-stone-700 uppercase mb-2 flex items-center gap-1.5 self-start">
                            <i className="fa-solid fa-drafting-compass text-indigo-700"></i> CAD Design Drawing
                          </span>
                          {r.design_file ? (
                            r.design_file.toLowerCase().includes('.pdf') ? (
                              <div className="flex flex-col items-center justify-center text-stone-600 py-14">
                                <i className="fa-solid fa-file-pdf text-4xl text-red-600 mb-2"></i>
                                <span className="text-[9px] font-bold">{r.design_file_name || 'CAD PDF Document Attached'}</span>
                              </div>
                            ) : (
                              <img
                                src={normalizeImageUrl(r.design_file)}
                                alt={`Job #${i + 1} CAD Design`}
                                className="max-h-[280px] min-h-[220px] w-auto max-w-full object-contain rounded-md border border-stone-300 bg-white p-1.5 shadow-2xs"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center text-stone-400 py-14">
                              <i className="fa-solid fa-compass-drafting text-3xl text-stone-300 mb-1.5"></i>
                              <span className="text-[9px] italic">No CAD Design Attached</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Page Break for multi-job work orders so next job starts cleanly on next page */}
                    {i < jobItems.length - 1 && (
                      <div className="print-page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page', height: '0', margin: '0', padding: '0' }} />
                    )}
                  </div>
                );
              })}

              {/* Total Summary Row */}
              <div className="w-full border border-[#d8c8b0] rounded-lg bg-[#eedfce] p-2 text-xs font-bold text-[#3b3228] flex items-center justify-between">
                <span>TOTAL SUMMARY ({jobItems.length} {jobItems.length === 1 ? 'Item' : 'Items'})</span>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span>Gold: {totalGoldWeight.toFixed(3)}g</span>
                  <span>Gross Wt: {totalGoldWeight.toFixed(3)}g</span>
                  <span>Need Pcs: {totalNeedPcs}</span>
                  <span>Diamonds: {totalStonesCount} pcs</span>
                  <span>Dia Cts: {totalDiaCts.toFixed(3)}ct</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
