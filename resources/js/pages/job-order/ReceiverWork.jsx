import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import JewelleryTagCard, { buildPrintableTagsHtml, isMetalPurityStamp } from '../../components/JewelleryTagCard';
import { WorkOrderPrintHeader, WorkOrderPrintMetadata } from '../../components/WorkOrderPrintLayout';
import { cleanProductName } from '../../utils/formatters';
import { printElement } from '../../utils/printHelper';
import * as XLSX from 'xlsx';
import Pagination from '../../components/Pagination';
import { normalizeNumericInput, handleNumericFocus } from '../../utils/numberInputUtils';

export default function ReceiverWork() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();

  const [orders, setOrders] = useState([]);
  const [readyPieces, setReadyPieces] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [receivingPrefill, setReceivingPrefill] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);



  // View state: 'list' (rows table) vs 'detail' (unified receiving workflow page)
  const [viewMode, setViewMode] = useState('list');

  // Primary Tab in Receive Page: 'ready' (available to receive only) vs 'history' (receiving history)
  const [primaryTab, setPrimaryTab] = useState('ready');
  const [historyViewType, setHistoryViewType] = useState('orders'); // 'orders' or 'pieces'
  const [allReceivedPieces, setAllReceivedPieces] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [listPage, setListPage] = useState(1);
  const [receivedHistoryPage, setReceivedHistoryPage] = useState(1);
  const [detailTagsPage, setDetailTagsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailItemsPerPage, setDetailItemsPerPage] = useState(5);

  // Search input for WO lookup in list view
  const [woSearchInput, setWoSearchInput] = useState('');

  // Search filter for Individual Tags table
  const [tagSearchTerm, setTagSearchTerm] = useState('');

  // Selected piece for print previews
  const [selectedPieceForVoucher, setSelectedPieceForVoucher] = useState(null);
  const [selectedPieceForTag, setSelectedPieceForTag] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagCopies, setTagCopies] = useState(1);
  const [isVoucherEnabled, setIsVoucherEnabled] = useState(false);

  // Physical Piece Receiving Form State
  const [pieceForm, setPieceForm] = useState({
    gross_weight: '',
    old_weight: '',
    color_stone_weight: '',
    color_stone_count: '',
    silver_weight: '',
    diamond_weight: '',
    diamond_count: '',
    diamond_details: '',
    touch: '91.60',
    gold_karat: '22K',
    making_charge_type: 'per_gram', // per_gram, percentage, fixed
    making_charge: '450',
    total_making_charge: '',
    given_metal: '',
    given_cash: '',
    wastage_weight: '',
    karigar_gold_weight: '',
    description: '',
    huid: '',
    certificate_no: '',
    receive_date: new Date().toISOString().split('T')[0],
    completion_image: '',
    completion_image_preview: '',
  });

  const updatePieceField = (field, val) => {
    const numericFields = [
      'gross_weight', 'old_weight', 'diamond_weight', 'diamond_count',
      'color_stone_weight', 'color_stone_count', 'silver_weight', 'touch',
      'making_charge', 'given_metal', 'given_cash', 'wastage_weight', 'karigar_gold_weight'
    ];
    const sanitized = numericFields.includes(field)
      ? normalizeNumericInput(val, pieceForm[field])
      : val;
    setPieceForm((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleCompletionImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast?.('Please upload a valid image file (JPG, PNG, or WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Image file size must be less than 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setPieceForm((prev) => ({
        ...prev,
        completion_image: base64,
        completion_image_preview: base64,
      }));
      showToast?.('Completion image loaded for this piece.', 'success');
    };
    reader.onerror = () => {
      showToast?.('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Masters Gold Karats State
  const [karatMasters, setKaratMasters] = useState([]);

  const fetchKarats = async () => {
    try {
      const res = await api.get('/karats');
      const list = res.data || [];
      const goldKarats = list.filter((k) => {
        const name = (k.name || '').toLowerCase().trim();
        const desc = (k.description || '').toLowerCase();
        return name.includes('k') || name.includes('karat') || desc.includes('gold') || desc.includes('karat') || desc.includes('hallmark');
      });
      setKaratMasters(goldKarats.length > 0 ? goldKarats : list);
    } catch (e) {
      console.warn('Failed to load karat master items:', e);
    }
  };

  // Fetch all orders eligible for receiving & all received piece tags for history
  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      fetchKarats();
      const [ordersRes, readyRes, tagsRes] = await Promise.all([
        api.get('/work-orders'),
        api.get('/work-orders/ready-pieces').catch(() => ({ data: { data: [] } })),
        api.get('/work-orders/tags').catch(() => ({ data: { data: [] } })),
      ]);
      const allOrders = ordersRes.data.data || [];
      const readyPieces = readyRes.data.data || [];
      const allTags = tagsRes.data.data || [];

      const readyRows = readyPieces.map((piece) => ({
        ...piece,
        id: piece.piece_id || piece.id,
        piece_id: piece.piece_id || piece.id,
        work_order_id: piece.work_order_id,
        work_order_number: piece.work_order_number,
        product_name: piece.product_name || 'Jewellery Piece',
        design_no: piece.design_no || '—',
        image_url: piece.image_url || piece.product?.thumbnail_url || piece.product?.image_url || '',
        artisan_name: piece.artisan_name || 'In-House Artisan',
        gross_weight: Number(piece.gross_weight || 0),
        net_gold_weight: Number(piece.net_gold_weight || 0),
        allotted_weight: Number(piece.allotted_weight || 0),
        ordered_date: piece.ordered_date || null,
        delivery_date: piece.delivery_date || null,
        work_order_item: piece.work_order_item || null,
        product: piece.product || null,
        is_piece_row: true,
      }));

      setOrders(allOrders);
      setReadyPieces(readyRows);
      setAllReceivedPieces(allTags);

      const params = new URLSearchParams(location.search);
      const queryOrderId = params.get('order_id');
      const queryPieceId = params.get('piece_id');
      const queryTab = params.get('tab');
      if (queryTab === 'history') {
        setPrimaryTab('history');
      } else if (queryTab === 'ready') {
        setPrimaryTab('ready');
      }
      if (queryOrderId) {
        await loadOrderDetails(queryOrderId, true, queryPieceId);
      }
    } catch (err) {
      console.error('Failed to fetch work orders:', err);
      showToast?.('Failed to load work orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [location.search]);

  // Dedicated WO Lookup Form Handler
  const handleSearchWO = async (e) => {
    e?.preventDefault();
    if (!woSearchInput.trim()) return;

    try {
      setLoading(true);
      const res = await api.get('/work-orders/search-receiving', {
        params: { search: woSearchInput.trim() },
      });
      const found = res.data?.data || [];
      if (found.length > 0) {
        loadOrderDetails(found[0].id, true);
      } else {
        showToast?.('No ready unreceived work orders found matching that number.', 'warning');
      }
    } catch (err) {
      console.error('Search WO error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load single work order details with automatic QC piece prefill
  const loadOrderDetails = async (id, forceDetailView = true, targetPieceId = null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const effPieceId = targetPieceId || params.get('piece_id');

      const [res, recvDataRes, piecesRes] = await Promise.all([
        api.get(`/work-orders/${id}`),
        api.get(`/work-orders/${id}/receiving-data`, {
          params: effPieceId ? { piece_id: effPieceId } : {}
        }).catch((e) => {
          console.warn('Receiving data prefill endpoint info:', e);
          return null;
        }),
        api.get(`/work-orders/${id}/pieces`).catch((e) => {
          console.warn('Failed to load physical piece history:', e);
          return null;
        }),
      ]);

      const responseOrder = res.data.data;
      const persistedPieces = piecesRes?.data?.data;
      const receivedPieces = Array.isArray(persistedPieces)
        ? persistedPieces.filter((piece) => Boolean(piece.received_at))
        : (responseOrder.received_pieces || responseOrder.receivedPieces || []).filter((piece) => Boolean(piece.received_at));
      const o = { ...responseOrder, received_pieces: receivedPieces };
      setCurrentOrder(o);
      setSelectedOrderId(o.id);
      setReceivedHistoryPage(1);
      setDetailTagsPage(1);

      const pre = recvDataRes?.data?.data?.prefilled;
      const defaultPiece = effPieceId
        ? (receivedPieces.find((p) => String(p.id || p.piece_id) === String(effPieceId)) || receivedPieces[receivedPieces.length - 1] || null)
        : (receivedPieces.length > 0 ? receivedPieces[receivedPieces.length - 1] : null);

      if (pre) {
        setSelectedPieceId(pre.piece_id);
        setReceivingPrefill(pre);
        if (pre.is_already_received) {
          setIsVoucherEnabled(true);
          setSelectedPieceForVoucher(pre);
        } else if (defaultPiece) {
          setIsVoucherEnabled(true);
          setSelectedPieceForVoucher(defaultPiece);
        } else {
          setIsVoucherEnabled(false);
          setSelectedPieceForVoucher(null);
        }
        if (pre.product_image_url) {
          setCurrentOrder((previous) => previous ? { ...previous, product: pre.product || previous.product } : previous);
        }
        if (pre.work_order_item_id) {
          setSelectedJobId(pre.work_order_item_id);
        }

        setPieceForm({
          gross_weight: pre.gross_weight != null && Number(pre.gross_weight) > 0 ? String(pre.gross_weight) : '',
          old_weight: pre.old_weight != null && Number(pre.old_weight) > 0 ? String(pre.old_weight) : '',
          color_stone_weight: pre.color_stone_weight != null && Number(pre.color_stone_weight) > 0 ? String(pre.color_stone_weight) : '',
          color_stone_count: pre.color_stone_count != null && Number(pre.color_stone_count) > 0 ? String(pre.color_stone_count) : '',
          silver_weight: pre.silver_weight != null && Number(pre.silver_weight) > 0 ? String(pre.silver_weight) : '',
          diamond_weight: pre.diamond_weight != null && Number(pre.diamond_weight) > 0 ? String(pre.diamond_weight) : '',
          diamond_count: pre.diamond_count != null && Number(pre.diamond_count) > 0 ? String(pre.diamond_count) : '',
          diamond_details: pre.diamond_details || '',
          touch: pre.purity != null ? String(pre.purity) : '91.60',
          gold_karat: pre.gold_karat || o.karat || '',
          making_charge_type: pre.making_charge_type || 'per_gram',
          making_charge: pre.making_charge != null ? String(pre.making_charge) : (o.making_charge_per_gram != null ? String(o.making_charge_per_gram) : '450'),
          total_making_charge: '',
          given_metal: '',
          given_cash: '',
          description: pre.product_name || o.product_name || 'Gold Jewellery Piece',
          huid: pre.huid || '',
          certificate_no: pre.certificate_no || '',
          receive_date: pre.receive_date || new Date().toISOString().split('T')[0],
          completion_image: pre.image_path || pre.image || pre.completion_image || '',
          completion_image_preview: pre.image_path || pre.image || pre.completion_image || '',
        });
      } else {
        setSelectedPieceId(null);
        setReceivingPrefill(null);
        if (defaultPiece) {
          setIsVoucherEnabled(true);
          setSelectedPieceForVoucher(defaultPiece);
        } else {
          setIsVoucherEnabled(false);
          setSelectedPieceForVoucher(null);
        }

        // Auto-select first item if multi-item order
        if (o.items && o.items.length > 0) {
          const eligibleItem = o.items.find((it) => (it.ready_qty || 0) > (it.received_qty || 0)) || o.items[0];
          setSelectedJobId(eligibleItem.id);
        } else {
          setSelectedJobId(null);
        }

        setPieceForm({
          gross_weight: '',
          old_weight: '',
          color_stone_weight: '',
          color_stone_count: '',
          silver_weight: '',
          diamond_weight: '',
          diamond_count: '',
          diamond_details: '',
          touch: '',
          gold_karat: '',
          making_charge_type: 'per_gram',
          making_charge: '',
          total_making_charge: '',
          given_metal: '',
          given_cash: '',
          description: '',
          huid: '',
          certificate_no: '',
          receive_date: new Date().toISOString().split('T')[0],
          completion_image: '',
          completion_image_preview: '',
        });
      }

      if (forceDetailView) {
        setViewMode('detail');
        const navUrl = effPieceId
          ? `/job-order/receive?order_id=${id}&piece_id=${effPieceId}`
          : `/job-order/receive?order_id=${id}`;
        navigate(navUrl, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
      showToast?.('Error loading work order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Switch to list view
  const handleBackToList = () => {
    setViewMode('list');
    navigate('/job-order/receive', { replace: true });
  };

  // Switch selected item if multi-item order
  const handleSelectItem = (item) => {
    setSelectedJobId(item.id);
    setPieceForm((prev) => ({
      ...prev,
      gross_weight: item.completed_weight ? String(item.completed_weight) : prev.gross_weight,
      description: item.product_name || prev.description,
    }));
  };

  // Accurate Jewellery Weight Calculations (Section 6)
  const grossVal = Math.max(0, parseFloat(pieceForm.gross_weight) || 0);
  const oldVal = Math.max(0, parseFloat(pieceForm.old_weight) || 0);
  const diaCtVal = Math.max(0, parseFloat(pieceForm.diamond_weight) || 0);
  const diaGrams = diaCtVal * 0.2; // 1 carat = 0.2 grams
  const stoneCtVal = Math.max(0, parseFloat(pieceForm.color_stone_weight) || 0);
  const stoneGrams = stoneCtVal * 0.2; // 1 carat = 0.2 grams
  const diaCountVal = parseInt(pieceForm.diamond_count, 10) || 0;
  const stoneCountVal = parseInt(pieceForm.color_stone_count, 10) || 0;

  // Low-weight jewellery protection (e.g. 0.something gram jewellery):
  // If stone/diamond deduction exceeds gross weight and count is 0, preserve full gross weight
  const stoneDeduction = diaGrams + stoneGrams + oldVal;
  const hasStonesExceedingGross = grossVal > 0 && stoneDeduction >= grossVal;

  const calculatedNetWeight = (hasStonesExceedingGross && diaCountVal === 0 && stoneCountVal === 0)
    ? Math.max(0.001, parseFloat((grossVal - oldVal).toFixed(3)))
    : Math.max(0, parseFloat((grossVal - diaGrams - stoneGrams - oldVal).toFixed(3)));

  const touchVal = Math.min(100, Math.max(0, parseFloat(pieceForm.touch) || 91.60));
  const calculatedPure24k = parseFloat(((calculatedNetWeight * touchVal) / 100).toFixed(3));

  // Making Charge Calculation
  const mcTypeVal = pieceForm.making_charge_type || 'per_gram';
  const mcRateVal = Math.max(0, parseFloat(pieceForm.making_charge) || 0);
  let calculatedTotalMC = 0;
  if (mcTypeVal === 'per_gram') {
    calculatedTotalMC = parseFloat((mcRateVal * calculatedNetWeight).toFixed(2));
  } else if (mcTypeVal === 'percentage') {
    // 7200 baseline gold rate
    calculatedTotalMC = parseFloat(((mcRateVal / 100) * (calculatedNetWeight * 7200)).toFixed(2));
  } else {
    calculatedTotalMC = mcRateVal;
  }

  // Authoritative Single Action: Receive Work Order (Section 2, 5, 10)
  const handleReceiveWorkOrder = async (e) => {
    if (e) e.preventDefault();
    if (!currentOrder) return;

    const remainingReceivable = (currentOrder.ready_qty || 0) - (currentOrder.received_qty || 0);
    if (!selectedPieceId && remainingReceivable <= 0 && !['ready', 'fully_ready'].includes(currentOrder.current_stage)) {
      showToast?.('No remaining ready pieces to receive for this work order.', 'warning');
      return;
    }
    if (receivingPrefill?.is_already_received) {
      showToast?.('This physical piece has already been received.', 'warning');
      return;
    }

    if (grossVal <= 0) {
      showToast?.('Please enter a valid Gross Weight greater than 0 (e.g. 14.500g).', 'error');
      return;
    }

    if (calculatedNetWeight <= 0) {
      showToast?.('Calculated Net Gold Weight must be greater than 0. Please verify that Gross Weight is greater than Stone/Old Weight.', 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirm Receive Work Order',
      message: `Physically receive 1 piece (Gross: ${grossVal.toFixed(3)}g, Net: ${calculatedNetWeight.toFixed(3)}g)? A unique Receive Work Order Number (RWO) and Tag Number will be atomically generated.`,
      icon: 'fa-solid fa-box-archive',
      confirmText: 'Receive Work Order',
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      const diaCount = parseInt(pieceForm.diamond_count, 10) || 0;
      const diaComps = Array.isArray(currentOrder?.product?.attributes?.components)
        ? currentOrder.product.attributes.components.filter((c) => {
          const n = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
          return c.is_diamond || n.includes('diamond') || n.includes('dia');
        })
        : [];
      const diaCompStamp = diaComps.find((c) => c.stamp && !isMetalPurityStamp(c.stamp))?.stamp;

      const rawOrderDiaStamp =
        currentOrder?.product?.attributes?.diamond_stamp ||
        currentOrder?.product?.diamond_stamp ||
        currentOrder?.diamond_stamp ||
        diaCompStamp ||
        pieceForm.diamond_stamp ||
        '';

      const validDiaStamp = rawOrderDiaStamp && !isMetalPurityStamp(rawOrderDiaStamp) ? rawOrderDiaStamp : '';
      const cleanOrderStamp = String(validDiaStamp).replace(/^\++/, '').trim();
      const formattedOrderStamp = cleanOrderStamp
        ? (cleanOrderStamp.startsWith('-') ? cleanOrderStamp : `+${cleanOrderStamp}`)
        : '+0';

      const diaDetails = (diaCtVal <= 0 && diaCount <= 0)
        ? 'Dia-0.00/+0/0'
        : (pieceForm.diamond_details || `Dia-${diaCtVal.toFixed(2)}/${formattedOrderStamp}/${diaCount}`);

      const payload = {
        piece_id: selectedPieceId || null,
        work_order_item_id: selectedJobId || null,
        gross_weight: grossVal,
        net_gold_weight: calculatedNetWeight,
        old_weight: oldVal,
        purity: touchVal,
        gold_karat: pieceForm.gold_karat || '22K',
        pure_24k_weight: calculatedPure24k,
        color_stone_weight: stoneCtVal,
        color_stone_count: parseInt(pieceForm.color_stone_count, 10) || 0,
        silver_weight: Math.max(0, parseFloat(pieceForm.silver_weight) || 0),
        diamond_weight: diaCtVal,
        diamond_count: diaCount,
        diamond_stamp: formattedOrderStamp,
        diamond_details: diaDetails,
        making_charge_type: mcTypeVal,
        making_charge_per_gram: mcRateVal,
        total_making_charge: calculatedTotalMC,
        given_metal_qty: Math.max(0, parseFloat(pieceForm.given_metal) || 0),
        given_cash: Math.max(0, parseFloat(pieceForm.given_cash) || 0),
        wastage_weight: Math.max(0, parseFloat(pieceForm.wastage_weight) || 0),
        karigar_gold_weight: Math.max(0, parseFloat(pieceForm.karigar_gold_weight) || 0),
        description: pieceForm.description || currentOrder.product_name,
        huid: null,
        certificate_no: null,
        image: pieceForm.completion_image || null,
        completion_image: pieceForm.completion_image || null,
        delivery_date: pieceForm.receive_date || new Date().toISOString().split('T')[0],
      };

      const res = await api.post(`/work-orders/${currentOrder.id}/receive-piece`, payload);
      const receivedPiece = res.data?.piece || res.data?.data?.received_piece;
      const printablePiece = receivedPiece ? {
        ...receivedPiece,
        product: receivingPrefill?.product || currentOrder?.items?.find((item) => String(item.id) === String(selectedJobId))?.product || currentOrder?.product,
        item: receivingPrefill?.work_order_item || currentOrder?.items?.find((item) => String(item.id) === String(selectedJobId)) || null,
        work_order: currentOrder,
        image_path: receivedPiece.image_path || pieceForm.completion_image || '',
        completion_image: receivedPiece.image_path || pieceForm.completion_image || '',
        image_url: receivedPiece.image_path || pieceForm.completion_image || '',
        ordered_date: receivingPrefill?.ordered_date || currentOrder?.allotted_date || currentOrder?.job_order?.order_date || null,
        delivery_date: receivingPrefill?.delivery_date || receivingPrefill?.work_order_item?.delivery_date || currentOrder?.delivery_date || null,
        allotted_weight: receivingPrefill?.allotted_weight ?? null,
      } : null;
      const rwoNo = receivedPiece?.receive_order_number || res.data?.receive_order_number;
      const tagNo = receivedPiece?.tag_number || res.data?.tag_number;

      showToast?.(`Piece successfully received! Assigned RWO: ${rwoNo} and Tag: ${tagNo}.`, 'success');

      // Auto-open printable voucher modal and pre-set tag
      if (printablePiece) {
        setSelectedPieceForVoucher(printablePiece);
        setSelectedPieceForTag(printablePiece);
        setTagCopies(1);
        setIsVoucherEnabled(true);
        setIsVoucherModalOpen(true);
        setSelectedPieceId(receivedPiece.id);
        setReceivingPrefill((previous) => ({
          ...previous,
          piece_id: receivedPiece.id,
          piece_number: receivedPiece.piece_number,
          tag_number: receivedPiece.tag_number,
          receive_order_number: receivedPiece.receive_order_number,
          is_already_received: true,
        }));
      }

      if (res.data?.order) setCurrentOrder(res.data.order);
      await fetchWorkOrders();
    } catch (err) {
      console.error('Receive Work Order error:', err);
      showToast?.(err.response?.data?.message || 'Failed to receive work order', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper for dynamic persisted lifecycle state (Section 3)
  const getLifecycleStatus = (wo) => {
    if (!wo) return { label: 'Ready for Receiving', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    const pieceRow = wo.is_piece_row || wo.piece_id || wo.piece_number != null;
    const req = wo.required_qty || 1;
    const ready = wo.ready_qty || 0;
    const rec = wo.received_qty || 0;
    const fin = wo.finalized_qty || 0;

    if (pieceRow) {
      return { label: 'Ready for Receiving', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }

    if (fin >= req || wo.status === 'completed') {
      return { label: 'Completed', bg: 'bg-stone-900 text-white border-stone-800' };
    }
    if (rec >= req) {
      if (wo.certification_status === 'pending') {
        return { label: 'Awaiting Certification', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      }
      if (wo.hallmarking_status === 'pending') {
        return { label: 'Awaiting Hallmarking', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      }
      return { label: 'Received / Awaiting Final Posting', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
    }
    if (rec > 0) {
      return { label: `Partially Received (${rec}/${req})`, bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    }
    if (ready > rec) {
      return { label: 'Ready for Receiving', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    return { label: (wo.current_stage || wo.status || 'Active').replace(/_/g, ' ').toUpperCase(), bg: 'bg-amber-50 text-amber-800 border-amber-200' };
  };

  // Current active job/item if multi-item order
  const activeItem = currentOrder?.items?.find((i) => i.id === selectedJobId) || currentOrder?.items?.[0] || null;
  const designRefCode = activeItem?.design_no || currentOrder?.design_code || `DES-${currentOrder?.id || '001'}`;
  const artisanName = currentOrder?.karigar?.name || currentOrder?.karigar_name || 'Master Artisan';
  const customerName = currentOrder?.client?.name || currentOrder?.customer_name || 'Retail Client';
  const orderNumber = currentOrder?.work_order_number || `WO-${currentOrder?.id}`;

  const readyOrders = readyPieces;

  // History Orders: orders that have received items or are completed
  const historyOrders = orders.filter((o) => {
    const rec = Number(o.received_qty || 0);
    const st = String(o.status || '').toLowerCase();
    const stage = String(o.current_stage || '').toLowerCase();
    return rec > 0 || st === 'completed' || st === 'final_received' || stage === 'final_received';
  });

  // Filtered ready orders in list view
  const filteredReadyOrders = readyOrders.filter((o) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (o.work_order_number || '').toLowerCase().includes(s) ||
      (o.piece_number ? `piece ${o.piece_number}` : '').toLowerCase().includes(s) ||
      (o.karigar_name || o.karigar?.name || '').toLowerCase().includes(s) ||
      (o.product_name || '').toLowerCase().includes(s) ||
      (o.design_no || o.design_code || '').toLowerCase().includes(s);

    if (statusFilter === 'all') return matchSearch;
    if (statusFilter === 'partially_received') return matchSearch && !o.is_piece_row && (o.received_qty || 0) > 0;
    if (statusFilter === 'fully_ready') return matchSearch && (o.is_piece_row || (o.ready_qty || 0) >= (o.required_qty || 1));
    return matchSearch;
  });

  // Filtered history orders
  const filteredHistoryOrders = historyOrders.filter((o) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (o.work_order_number || '').toLowerCase().includes(s) ||
      (o.karigar_name || o.karigar?.name || '').toLowerCase().includes(s) ||
      (o.product_name || '').toLowerCase().includes(s) ||
      (o.design_code || '').toLowerCase().includes(s);

    if (historyStatusFilter === 'all') return matchSearch;
    if (historyStatusFilter === 'completed') return matchSearch && (o.status === 'completed' || (o.finalized_qty || 0) >= (o.required_qty || 1) || (o.received_qty || 0) >= (o.required_qty || 1));
    if (historyStatusFilter === 'partially_received') return matchSearch && (o.received_qty || 0) > 0 && (o.received_qty || 0) < (o.required_qty || 1);
    return matchSearch;
  });

  // Filtered history pieces (individual tags)
  const filteredHistoryPieces = allReceivedPieces.filter((p) => {
    const s = searchTerm.toLowerCase();
    if (!s) return true;
    return (
      (p.tag_number || '').toLowerCase().includes(s) ||
      (p.receive_order_number || '').toLowerCase().includes(s) ||
      (p.design_no || '').toLowerCase().includes(s) ||
      (p.product_name || '').toLowerCase().includes(s) ||
      (p.karigar?.name || p.karigar_name || '').toLowerCase().includes(s) ||
      (p.work_order?.work_order_number || '').toLowerCase().includes(s)
    );
  });

  // Filtered individual tags in detail view
  const receivedPiecesList = (currentOrder?.received_pieces || currentOrder?.receivedPieces || []).filter((piece) => Boolean(piece.received_at));

  // Weight & Stone Summaries for Section A & Section B (Requirement 2)
  const allottedGrossWeight = Number(currentOrder?.allotted_weight || 0) + Number(currentOrder?.additional_allocated_weight || 0);
  const completedGrossWeight = receivedPiecesList.reduce((sum, p) => sum + Number(p.gross_weight || 0), 0);

  let allottedDiaCount = 0;
  let allottedColorCount = 0;
  if (currentOrder?.items && Array.isArray(currentOrder.items)) {
    currentOrder.items.forEach((item) => {
      const diaPcs = Number(item.total_dia_pcs || item.diamond_count || item.dia_count || 0);
      const colPcs = Number(item.stone_count || item.color_stone_count || 0);
      allottedDiaCount += diaPcs;
      allottedColorCount += colPcs;
    });
  }
  if (allottedDiaCount === 0 && Number(currentOrder?.total_dia_pcs || 0) > 0) {
    allottedDiaCount = Number(currentOrder.total_dia_pcs);
  }
  const totalAllottedStones = allottedDiaCount + allottedColorCount;

  const receivedDiaCount = receivedPiecesList.reduce((sum, p) => sum + Number(p.diamond_count || 0), 0);
  const receivedColorCount = receivedPiecesList.reduce((sum, p) => sum + Number(p.color_stone_count || 0), 0);
  const totalReceivedStones = receivedDiaCount + receivedColorCount;

  const filteredTagsList = receivedPiecesList.filter((p) => {
    if (!p.tag_number) return false;
    if (!tagSearchTerm.trim()) return true;
    const q = tagSearchTerm.toLowerCase();
    return (
      (p.tag_number || '').toLowerCase().includes(q) ||
      (p.receive_order_number || '').toLowerCase().includes(q) ||
      (p.design_no || '').toLowerCase().includes(q)
    );
  });
  const receivedHistoryPages = Math.max(1, Math.ceil(receivedPiecesList.length / detailItemsPerPage));
  const safeReceivedHistoryPage = Math.min(receivedHistoryPage, receivedHistoryPages);
  const paginatedReceivedPieces = receivedPiecesList.slice((safeReceivedHistoryPage - 1) * detailItemsPerPage, safeReceivedHistoryPage * detailItemsPerPage);
  const detailTagsPages = Math.max(1, Math.ceil(filteredTagsList.length / detailItemsPerPage));
  const safeDetailTagsPage = Math.min(detailTagsPage, detailTagsPages);
  const paginatedDetailTags = filteredTagsList.slice((safeDetailTagsPage - 1) * detailItemsPerPage, safeDetailTagsPage * detailItemsPerPage);

  const handleDownloadExcel = (specificPiece = null) => {
    let pieces = [];
    if (specificPiece && (specificPiece.id || specificPiece.piece_id || specificPiece.receive_order_number || specificPiece.piece_number || specificPiece.tag_number)) {
      pieces = [specificPiece];
    } else if (selectedPieceForVoucher && (selectedPieceForVoucher.id || selectedPieceForVoucher.piece_id || selectedPieceForVoucher.receive_order_number || selectedPieceForVoucher.piece_number)) {
      pieces = [selectedPieceForVoucher];
    } else if (Array.isArray(receivedPiecesList) && receivedPiecesList.length > 0) {
      pieces = receivedPiecesList;
    }

    if (!pieces || pieces.length === 0) {
      showToast('No received piece data available to download.', 'warning');
      return;
    }

    const rows = pieces.map((piece, idx) => {
      const displayVal = (val, fallback = '—') => (val == null || val === '' ? fallback : val);
      const numVal = (val, decimals = 3) => (val == null || val === '' ? '0.000' : Number(val).toFixed(decimals));

      return {
        'S.No': idx + 1,
        'Receive Order No': displayVal(piece.receive_order_number || piece.id),
        'Work Order / Job': `${piece.work_order?.work_order_number || orderNumber} · ${piece.work_order_item_id || piece.item?.id || '—'}`,
        'Piece / Tag': `#${piece.piece_number || '—'} · ${piece.tag_number || '—'}`,
        'Product Name': displayVal(piece.product_name || piece.item?.product_name || piece.product?.name),
        'Design No': displayVal(piece.design_no || piece.item?.design_no),
        'Ordered Date': displayVal(piece.ordered_date || piece.work_order?.allotted_date || piece.work_order?.job_order?.order_date),
        'Received Date': piece.received_at ? new Date(piece.received_at).toLocaleDateString('en-IN') : '—',
        'Artisan': displayVal(piece.artisan_name || piece.karigar?.name || artisanName),
        'Customer': displayVal(customerName),
        'Total Gross Wt (g)': numVal(piece.gross_weight, 3),
        'Old Wt (g)': numVal(piece.old_weight, 3),
        'Colour Stone Wt (ct)': numVal(piece.color_stone_weight, 3),
        'Colour Stone Pcs': piece.color_stone_count == null ? 0 : Number(piece.color_stone_count),
        'Diamond Wt (ct)': numVal(piece.diamond_weight, 3),
        'Diamond Pcs': piece.diamond_count == null ? 0 : Number(piece.diamond_count),
        'Silver Wt (g)': numVal(piece.silver_weight, 3),
        'Net Gold Wt (g)': numVal(piece.net_gold_weight, 3),
        'Purity / Touch': piece.purity == null || piece.purity === '' ? '—' : `${Number(piece.purity).toFixed(2)}%${piece.gold_karat ? ` (${piece.gold_karat})` : ''}`,
        'Pure 24K Wt (g)': numVal(piece.pure_24k_weight, 3),
        'Making Charge Rate (Rs)': piece.making_charge_per_gram == null ? '0.00' : Number(piece.making_charge_per_gram).toFixed(2),
        'Total Making Charge (Rs)': piece.total_making_charge == null ? '0.00' : Number(piece.total_making_charge).toFixed(2),
        'Total Stones': Number(piece.diamond_count || 0) + Number(piece.color_stone_count || 0),
        'Allotted Wt (g)': numVal(piece.allotted_weight, 3),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Receive Orders');
    const safeOrder = (orderNumber || 'RWO').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pieceSuffix = pieces.length === 1 && (pieces[0].piece_number || pieces[0].piece_id) ? `_Piece_${pieces[0].piece_number || pieces[0].piece_id}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Receive_Order_${safeOrder}${pieceSuffix}_${dateStr}.xlsx`);
    showToast('Receive Order Excel document downloaded successfully', 'success');
  };

  // Loading spinner
  if (loading && !currentOrder && viewMode === 'detail') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading Receive Work Order Hub...</span>
      </div>
    );
  }

  if (loading && viewMode === 'list') {
    return (
      <div className="w-full min-h-[60vh] pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
              <span>Manufacturing</span>
              <i className="fa-solid fa-chevron-right text-[9px] text-stone-300"></i>
              <span>Job Orders</span>
              <i className="fa-solid fa-chevron-right text-[9px] text-stone-300"></i>
              <span className="text-[#b01622] font-bold">Receive Work Order</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3">
              Receive Work Orders
              <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-500">
                <i className="fa-solid fa-circle-notch fa-spin text-[#b01622]"></i> Loading records
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500" aria-label="Loading receiving data">
            <i className="fa-solid fa-box-open text-[#b01622]"></i>
            <i className="fa-solid fa-clock-rotate-left text-emerald-700"></i>
            <i className="fa-solid fa-tags text-purple-700"></i>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-8">
          <div className="h-9 rounded-lg bg-stone-100 animate-pulse mb-4"></div>
          <div className="h-14 rounded-xl bg-stone-50 animate-pulse mb-3"></div>
          <div className="h-14 rounded-xl bg-stone-50 animate-pulse mb-3"></div>
          <div className="h-14 rounded-xl bg-stone-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 1: ROWS LIST VIEW
  // ==========================================
  if (viewMode === 'list') {
    // Select active dataset based on primary tab and history view type
    const activeDataset = primaryTab === 'ready'
      ? filteredReadyOrders
      : historyViewType === 'orders'
        ? filteredHistoryOrders
        : filteredHistoryPieces;

    const totalPages = Math.ceil(activeDataset.length / itemsPerPage) || 1;
    const paginatedItems = activeDataset.slice((listPage - 1) * itemsPerPage, listPage * itemsPerPage);

    return (
      <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
        {/* 1. BREADCRUMB & HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
              <span>Manufacturing</span>
              <i className="fa-solid fa-chevron-right text-[9px] text-stone-300"></i>
              <span>Job Orders</span>
              <i className="fa-solid fa-chevron-right text-[9px] text-stone-300"></i>
              <span className="text-[#b01622] font-bold">Receive Work Order</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <span>Receive Work Orders</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${primaryTab === 'ready'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-stone-100 text-stone-700 border-stone-200'
                }`}>
                {primaryTab === 'ready' ? `${readyOrders.length} Ready to Receive` : `${historyOrders.length} Received in History`}
              </span>
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Physical jewelry receiving vault. Only items QC passed &amp; ready are available to receive. Track full receiving history below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchWorkOrders()}
              className="px-3.5 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-arrows-rotate text-stone-500"></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>



        {/* 3. DEDICATED WO LOOKUP FORM */}
        <form onSubmit={handleSearchWO} className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold shrink-0">
              <i className="fa-solid fa-barcode"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Work Order Receiving Lookup</div>
              <div className="text-[11px] text-stone-500">Enter Work Order Number to fetch ready unreceived pieces for individual tag generation</div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={woSearchInput}
              onChange={(e) => setWoSearchInput(e.target.value)}
              placeholder="e.g. WO-TEST-001 or WO-2026-0001"
              className="px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:border-[#b01622] w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
              <span>Fetch &amp; Receive</span>
            </button>
          </div>
        </form>

        {/* 4. PRIMARY VIEW TABS SWITCHER: READY FOR RECEIVING vs RECEIVING HISTORY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPrimaryTab('ready');
                setListPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${primaryTab === 'ready'
                ? 'bg-[#b01622] text-white shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                }`}
            >
              <i className="fa-solid fa-box-open"></i>
              <span>Ready for Receiving</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${primaryTab === 'ready' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                }`}>
                {readyOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPrimaryTab('history');
                setListPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${primaryTab === 'history'
                ? 'bg-[#b01622] text-white shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                }`}
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>Receiving History</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${primaryTab === 'history' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'
                }`}>
                {historyOrders.length}
              </span>
            </button>
          </div>

          {/* Sub-Filters / Sub-Toggles depending on Primary Tab */}
          <div className="flex items-center gap-2 flex-wrap">
            {primaryTab === 'ready' ? (
              [
                { id: 'all', label: `All Available (${readyOrders.length})` },
                { id: 'partially_received', label: `Partially Received (${readyOrders.filter(o => !o.is_piece_row && (o.received_qty || 0) > 0).length})` },
                { id: 'fully_ready', label: `Fully Ready (${readyOrders.filter(o => o.is_piece_row || (o.ready_qty || 0) >= (o.required_qty || 1)).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setListPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${statusFilter === tab.id
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                    }`}
                >
                  {tab.label}
                </button>
              ))
            ) : (
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryViewType('orders');
                    setListPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${historyViewType === 'orders'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                    }`}
                >
                  <i className="fa-solid fa-folder-open text-[10px] mr-1.5"></i>
                  <span>Received Orders ({historyOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryViewType('pieces');
                    setListPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${historyViewType === 'pieces'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                    }`}
                >
                  <i className="fa-solid fa-tags text-[10px] mr-1.5"></i>
                  <span>Received Pieces &amp; Tags ({allReceivedPieces.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5. SEARCH BAR */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-96">
            <i className="fa-solid fa-magnifying-glass text-stone-400 text-xs ml-2"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setListPage(1);
              }}
              placeholder={
                primaryTab === 'ready'
                  ? 'Filter ready orders by WO#, Artisan, Product...'
                  : historyViewType === 'pieces'
                    ? 'Filter history pieces by Tag#, Voucher (RO#), WO#, Artisan, Product...'
                    : 'Filter history orders by WO#, Artisan, Product...'
              }
              className="w-full text-xs bg-transparent border-none outline-hidden text-stone-800 placeholder-stone-400 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-stone-400 hover:text-stone-600 text-xs px-2"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="text-xs text-stone-500 font-medium">
            Showing <span className="font-bold text-stone-800">{activeDataset.length}</span> {primaryTab === 'ready' ? 'ready order(s)' : historyViewType === 'pieces' ? 'tag(s)' : 'order(s)'}
          </div>
        </div>

        {/* 6. MAIN CONTENT TABLES */}
        {primaryTab === 'ready' ? (
          /* ========================================================= */
          /* READY FOR RECEIVING TABLE (ONLY READY ITEMS WITH RECEIVABLE > 0) */
          /* ========================================================= */
          <div className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbf7f2] border-b border-stone-200 text-[#785b3a] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Work Order</th>
                    <th className="py-3 px-4">Artisan</th>
                    <th className="py-3 px-4">Product / Design</th>
                    <th className="py-3 px-4 text-center">Piece</th>
                    <th className="py-3 px-4 text-right">Gross Wt (g)</th>
                    <th className="py-3 px-4 text-right">Net Gold Wt (g)</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap min-w-[140px]">Receive</th>
                    <th className="py-3 px-4">Lifecycle Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-stone-400 text-xs">
                        <i className="fa-solid fa-circle-check text-4xl text-emerald-400 mb-2 block"></i>
                        <span className="font-bold text-stone-700 text-sm block">No Products Currently Available for Receiving</span>
                        <span className="text-stone-500 block mt-1 max-w-md mx-auto">
                          Only products that have passed Quality Check (QC) and are Ready appear here. Work orders in progress or fully received are filtered out.
                        </span>
                        <div className="mt-4 flex items-center justify-center gap-3">
                          <Link
                            to="/job-order/quality-check"
                            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors"
                          >
                            Go to Quality Check
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPrimaryTab('history')}
                            className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white font-bold rounded-xl text-xs transition-colors"
                          >
                            View Receiving History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((order) => {
                      const st = getLifecycleStatus(order);
                      return (
                        <tr
                          key={order.piece_id || order.id}
                          onClick={() => loadOrderDetails(order.work_order_id || order.id, true, order.piece_id || order.id)}
                          className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4 font-mono font-black text-[#b01622]">
                            {order.work_order_number || `WO-${order.work_order_id || order.id}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{order.artisan_name || order.karigar?.name || order.karigar_name || 'Artisan'}</div>
                            <div className="text-[10px] text-stone-400">Bench Goldsmith</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-800">{order.product_name || 'Jewellery Work'}</div>
                            <div className="text-[10.5px] font-mono text-stone-500">{order.design_no || order.design_code || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-700">
                            P{order.piece_number || 1}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-800">
                            {order.gross_weight != null ? Number(order.gross_weight).toFixed(3) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-800">
                            {order.net_gold_weight != null ? Number(order.net_gold_weight).toFixed(3) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-mono font-bold px-3 py-1 rounded-lg text-xs bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap inline-flex items-center justify-center">
                              Receive one piece
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border inline-block ${st.bg}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadOrderDetails(order.work_order_id || order.id, true, order.piece_id || order.id);
                              }}
                              className="px-3.5 py-1.5 bg-[#b01622] hover:bg-[#8f1019] text-white font-bold rounded-xl text-xs transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <i className="fa-solid fa-box-archive text-[10px]"></i>
                              <span>Receive Piece {order.piece_number || 1}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Ready */}
            {activeDataset.length > 0 && (
              <Pagination
                currentPage={listPage}
                totalPages={totalPages}
                totalItems={activeDataset.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setListPage(page)}
                onItemsPerPageChange={(num) => {
                  setItemsPerPage(num);
                  setListPage(1);
                }}
              />
            )}
          </div>
        ) : historyViewType === 'orders' ? (
          /* ========================================================= */
          /* RECEIVING HISTORY: RECEIVED WORK ORDERS VIEW */
          /* ========================================================= */
          <div className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Work Order</th>
                    <th className="py-3 px-4">Artisan</th>
                    <th className="py-3 px-4">Product / Design</th>
                    <th className="py-3 px-4 text-center">Required</th>
                    <th className="py-3 px-4 text-center">Received</th>
                    <th className="py-3 px-4 text-center">Remaining</th>
                    <th className="py-3 px-4">Lifecycle Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-stone-400 text-xs">
                        <i className="fa-solid fa-clock-rotate-left text-4xl text-stone-300 mb-2 block"></i>
                        <span className="font-bold text-stone-700 text-sm block">No Receiving History Records Found</span>
                        <span className="text-stone-500 block mt-1">Orders that have been received will be archived here.</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((order) => {
                      const st = getLifecycleStatus(order);
                      const remaining = Math.max(0, (order.required_qty || 1) - (order.received_qty || 0));
                      const receivable = Math.max(0, (order.ready_qty || 0) - (order.received_qty || 0));
                      return (
                        <tr
                          key={order.id}
                          onClick={() => loadOrderDetails(order.id, true)}
                          className="hover:bg-stone-50/70 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4 font-mono font-black text-[#b01622]">
                            {order.work_order_number || `WO-${order.id}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{order.karigar?.name || order.karigar_name || 'Artisan'}</div>
                            <div className="text-[10px] text-stone-400">Bench Goldsmith</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-800">{order.product_name || 'Jewellery Work'}</div>
                            <div className="text-[10.5px] font-mono text-stone-500">{order.design_code || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-700">
                            {order.required_qty || order.quantity || 1}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-800">
                            {order.received_qty || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${remaining > 0 ? 'text-amber-800 bg-amber-50' : 'text-emerald-800 bg-emerald-50'}`}>
                              {remaining === 0 ? 'Fully Received' : `${remaining} Remaining`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border inline-block ${st.bg}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => loadOrderDetails(order.id, true)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <i className="fa-solid fa-eye text-[10px]"></i>
                                <span>Details</span>
                              </button>
                              {receivable > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrimaryTab('ready');
                                    setStatusFilter('all');
                                    setSearchTerm(order.work_order_number || '');
                                    setListPage(1);
                                  }}
                                  className="px-3 py-1.5 bg-[#b01622] hover:bg-[#8f1019] text-white font-bold rounded-xl text-xs transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <i className="fa-solid fa-list-check text-[10px]"></i>
                                  <span>View {receivable} ready pieces</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for History Orders */}
            {activeDataset.length > 0 && (
              <Pagination
                currentPage={listPage}
                totalPages={totalPages}
                totalItems={activeDataset.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setListPage(page)}
                onItemsPerPageChange={(num) => {
                  setItemsPerPage(num);
                  setListPage(1);
                }}
              />
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* RECEIVING HISTORY: INDIVIDUAL RECEIVED PIECES & TAGS LOG */
          /* ========================================================= */
          <div className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Receive Order (RO#)</th>
                    <th className="py-3 px-4">Tag Number</th>
                    <th className="py-3 px-4">Work Order</th>
                    <th className="py-3 px-4">Artisan</th>
                    <th className="py-3 px-4">Product / Design</th>
                    <th className="py-3 px-4 text-center">Date</th>
                    <th className="py-3 px-4 text-right">Gross Wt</th>
                    <th className="py-3 px-4 text-right">Net Wt</th>
                    <th className="py-3 px-4 text-center">Touch / Karat</th>
                    <th className="py-3 px-4 text-center">Certification</th>
                    <th className="py-3 px-4 text-center">Hallmarking</th>
                    <th className="py-3 px-4 text-center">Making Charge</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-16 text-center text-stone-400 text-xs">
                        <i className="fa-solid fa-tags text-4xl text-stone-300 mb-2 block"></i>
                        <span className="font-bold text-stone-700 text-sm block">No Received Tags Found</span>
                        <span className="text-stone-500 block mt-1">Individual received pieces and voucher numbers will appear here.</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((piece) => {
                      const netWt = Number(piece.net_gold_weight || 0).toFixed(3);
                      const gross = Number(piece.gross_weight || 0).toFixed(3);
                      const isCertCompleted = piece.certification_status === 'completed';
                      const isCertSkipped = piece.certification_status === 'skipped' || piece.certification_status === 'not_required';
                      const isHallCompleted = piece.hallmarking_status === 'completed';
                      const isHallSkipped = piece.hallmarking_status === 'skipped' || piece.hallmarking_status === 'not_required';

                      return (
                        <tr key={piece.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                            {piece.receive_order_number || `RO-${piece.id}`}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                            <span className="bg-stone-100 border border-stone-300 px-2 py-0.5 rounded text-[11px]">
                              {piece.tag_number || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#b01622]">
                            {piece.work_order?.work_order_number || `WO-${piece.work_order_id}`}
                          </td>
                          <td className="py-3.5 px-4 text-stone-800 font-semibold">
                            {piece.karigar?.name || piece.karigar_name || 'Artisan'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{piece.product_name || piece.description || 'Jewellery'}</div>
                            <div className="text-[10px] font-mono text-stone-500">{piece.design_no || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-stone-600 font-mono text-[11px]">
                            {piece.received_at ? new Date(piece.received_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                            {gross}g
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                            {netWt}g
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200 text-[10px]">
                              {piece.gold_karat || '22K'} ({piece.purity || '91.6'}%)
                            </span>
                          </td>
                          {/* Certification */}
                          <td className="py-3.5 px-4 text-center">
                            {isCertSkipped ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200">
                                Skipped
                              </span>
                            ) : isCertCompleted ? (
                              <span className="font-mono font-bold text-stone-900 text-[11px]">
                                {piece.certificate_no || 'Completed'}
                              </span>
                            ) : (
                              <span className="text-stone-400 font-bold">-</span>
                            )}
                          </td>
                          {/* Hallmarking */}
                          <td className="py-3.5 px-4 text-center">
                            {isHallSkipped ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200">
                                Skipped
                              </span>
                            ) : isHallCompleted ? (
                              <span className="font-mono font-bold text-stone-900 text-[11px]">
                                {piece.huid || 'Completed'}
                              </span>
                            ) : (
                              <span className="text-stone-400 font-bold">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-stone-800">
                            ₹{Number(piece.total_making_charge || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Print Voucher"
                                onClick={() => {
                                  setSelectedPieceForVoucher(piece);
                                  setIsVoucherModalOpen(true);
                                }}
                                className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-file-invoice text-xs"></i>
                              </button>
                              <button
                                type="button"
                                title="Print Tag"
                                onClick={() => {
                                  setSelectedPieceForTag(piece);
                                  setIsTagModalOpen(true);
                                }}
                                className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-tag text-xs"></i>
                              </button>
                              <button
                                type="button"
                                title="View Work Order"
                                onClick={() => loadOrderDetails(piece.work_order_id, true)}
                                className="w-7 h-7 rounded-lg bg-[#b01622]/10 hover:bg-[#b01622]/20 text-[#b01622] flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
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

            {/* Pagination for History Pieces */}
            {activeDataset.length > 0 && (
              <Pagination
                currentPage={listPage}
                totalPages={totalPages}
                totalItems={activeDataset.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setListPage(page)}
                onItemsPerPageChange={(num) => {
                  setItemsPerPage(num);
                  setListPage(1);
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 2: DETAIL RECEIVING PAGE
  // ==========================================
  const currentBadge = getLifecycleStatus(currentOrder);
  const totalOrderedQty = Number(activeItem?.required_qty || currentOrder?.required_qty || 1);
  const receivedQty = Number(activeItem?.received_qty ?? currentOrder?.received_qty ?? 0);
  const readyQty = Number(activeItem?.ready_qty ?? currentOrder?.ready_qty ?? 0);
  const isFullyReceived = receivedQty >= totalOrderedQty;

  const receivableCount = selectedPieceId
    ? (receivingPrefill?.is_already_received ? 0 : 1)
    : Math.max(0, readyQty - receivedQty);

  const receivingBadgeText = (() => {
    if (selectedPieceId) {
      if (receivingPrefill?.is_already_received) {
        return `Piece #${receivingPrefill?.piece_number || '1'} of ${totalOrderedQty} · Received`;
      }
      return `Receiving Piece #${receivingPrefill?.piece_number || Math.min(receivedQty + 1, totalOrderedQty)} of ${totalOrderedQty}`;
    }
    if (isFullyReceived) {
      return `All Pieces Received (${receivedQty} of ${totalOrderedQty})`;
    }
    if (receivableCount <= 0) {
      return `Awaiting QC (${receivedQty} of ${totalOrderedQty} Received)`;
    }
    return `Receiving Piece #${Math.min(receivedQty + 1, totalOrderedQty)} of ${totalOrderedQty}`;
  })();

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-1">
            <button
              type="button"
              onClick={handleBackToList}
              className="text-stone-500 hover:text-[#b01622] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <i className="fa-solid fa-arrow-left text-[10px]"></i>
              <span>Back to Rows</span>
            </button>
            <span>•</span>
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <span>Job Orders</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-300"></i>
            <span className="text-stone-600 font-medium">Receive Work Order</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Receive Work Order #{orderNumber}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${currentBadge.bg}`}>
              <i className="fa-solid fa-circle-dot text-[9px]"></i>
              <span>{currentBadge.label}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/job-order/in-progress?order_id=${selectedOrderId || currentOrder?.id}`}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-spinner text-[#b01622] text-xs"></i>
            <span>Work in Progress</span>
          </Link>
          <Link
            to={`/job-order/history?order_id=${selectedOrderId || currentOrder?.id}`}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-award text-amber-700 text-xs"></i>
            <span>History / Certification / Hallmarking</span>
          </Link>
          <button
            type="button"
            onClick={() => handleDownloadExcel()}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            title="Download Receive Order details as Excel document"
          >
            <i className="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
            <span>Download Excel</span>
          </button>
          {(() => {
            const hasPrintableVoucher = Boolean(isVoucherEnabled || selectedPieceForVoucher || receivedPiecesList.length > 0);
            return (
              <button
                type="button"
                disabled={!hasPrintableVoucher}
                onClick={() => {
                  if (!hasPrintableVoucher) return;
                  const latestPiece = selectedPieceForVoucher || (receivedPiecesList.length > 0 ? receivedPiecesList[receivedPiecesList.length - 1] : null);
                  if (latestPiece) {
                    setSelectedPieceForVoucher(latestPiece);
                    setIsVoucherModalOpen(true);
                  } else {
                    showToast?.('No received piece voucher available yet. Please receive a work order piece first.', 'warning');
                  }
                }}
                className={`px-4 py-2 border text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 ${hasPrintableVoucher
                  ? 'bg-white border-stone-300 hover:border-stone-400 text-stone-800 cursor-pointer hover:shadow-xs'
                  : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                  }`}
                title={hasPrintableVoucher ? 'Print Receive Order Voucher' : 'Print Voucher is disabled until you receive a work order piece'}
              >
                <i className="fa-solid fa-print text-sm"></i>
                <span>Print Voucher</span>
              </button>
            );
          })()}
        </div>
      </div>



      {/* 1. WORK ORDER & ARTISAN INFORMATION CARDS AT THE TOP (Section 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Artisan */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0 border border-red-100">
            <i className="fa-solid fa-user-gear"></i>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Assigned Artisan</span>
            <h3 className="text-sm font-black text-gray-900 truncate mt-0.5">{artisanName}</h3>
            <p className="text-[11px] text-stone-500 truncate">Senior Bench Goldsmith • Studio A</p>
          </div>
        </div>

        {/* Card 2: Customer / Client */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center text-lg shrink-0 border border-amber-100">
            <i className="fa-solid fa-user-tag"></i>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Customer Name</span>
            <h3 className="text-sm font-black text-gray-900 truncate mt-0.5">{customerName}</h3>
            <p className="text-[11px] text-stone-500 truncate">{currentOrder?.client?.phone || 'Retail Customer Account'}</p>
          </div>
        </div>

        {/* Card 3: Design Reference & Product */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-stone-50 text-stone-600 flex items-center justify-center text-lg shrink-0 border border-stone-200">
            <i className="fa-solid fa-barcode"></i>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Design SKU / Product</span>
            <h3 className="text-sm font-black text-stone-900 font-mono truncate mt-0.5">{designRefCode}</h3>
            <p className="text-[11px] text-stone-500 truncate">{currentOrder?.product_name || 'Jewellery Master Item'}</p>
          </div>
        </div>

        {/* Card 4: Ordered & Delivery Dates */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-lg shrink-0 border border-blue-100">
            <i className="fa-regular fa-calendar-check"></i>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Ordered / Delivery Date</span>
            <h3 className="text-sm font-black text-gray-900 truncate mt-0.5">
              Due: {currentOrder?.delivery_date ? new Date(currentOrder.delivery_date).toLocaleDateString('en-GB') : '—'}
            </h3>
            <p className="text-[11px] text-stone-500 truncate">
              Assigned: {currentOrder?.allotted_date ? new Date(currentOrder.allotted_date).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT-SPECIFIC JOB SUMMARY (Section 7) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#b01622] mb-1">
              <i className="fa-solid fa-list-check"></i>
              <span>Product-Specific Job Summary</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {activeItem?.product_name || currentOrder?.product_name || 'Jewellery Item'} ({designRefCode})
            </h2>
          </div>

          {/* Multi-Job Item Selector if more than 1 item */}
          {!selectedPieceId && currentOrder?.items && currentOrder.items.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">Select Job Item:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentOrder.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => handleSelectItem(it)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedJobId === it.id
                      ? 'bg-[#b01622] text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                  >
                    {it.design_no} ({it.required_qty} pcs)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 6-Metric Quantity & Progress Reconciliation Strip (Section 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Ordered</span>
            <span className="text-xl font-black text-stone-900 mt-0.5 block">{selectedPieceId ? `#${receivingPrefill?.piece_number || '—'}` : (activeItem?.required_qty || currentOrder?.required_qty || 1)}</span>
            <span className="text-[10px] text-stone-400">{selectedPieceId ? `Piece ID ${selectedPieceId}` : 'Pcs ordered'}</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">WIP Completed</span>
            <span className="text-xl font-black text-stone-800 mt-0.5 block">{selectedPieceId ? '1' : (activeItem?.completed_qty || currentOrder?.completed_qty || 0)}</span>
            <span className="text-[10px] text-stone-400">Produced by artisan</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">QC Approved</span>
            <span className="text-xl font-black text-emerald-800 mt-0.5 block">{selectedPieceId ? (receivingPrefill?.is_already_received ? 'Received' : 'Ready') : (activeItem?.ready_qty || currentOrder?.ready_qty || 0)}</span>
            <span className="text-[10px] text-emerald-600">Passed quality check</span>
          </div>

          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Previously Received</span>
            <span className="text-xl font-black text-blue-800 mt-0.5 block">{selectedPieceId ? (receivingPrefill?.is_already_received ? '1' : '0') : (activeItem?.received_qty || currentOrder?.received_qty || 0)}</span>
            <span className="text-[10px] text-blue-600">Physically tagged</span>
          </div>

          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
            <span className="text-[10px] font-bold text-[#b01622] uppercase tracking-wider block">Remaining Receivable</span>
            <span className="text-xl font-black text-[#b01622] mt-0.5 block">{selectedPieceId ? (receivableCount ? '1' : '0') : receivableCount}</span>
            <span className="text-[10px] text-rose-500 font-bold">Ready to receive</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Receiving Now</span>
            <span className="text-xl font-black text-amber-950 mt-0.5 block">
              {receivableCount > 0 ? '01 Unit' : '0 Units'}
            </span>
            <span className="text-[10px] text-amber-700">Per transaction</span>
          </div>
        </div>

        {/* Specification Summary Line */}
        <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200 text-xs flex flex-wrap items-center justify-between gap-3 text-stone-600">
          <div>
            Allocated Weight: <strong className="font-mono text-stone-900">{Number(activeItem?.allotted_weight || currentOrder?.allotted_weight || 0).toFixed(3)}g</strong>
          </div>
          <div>
            Touch / Standard: <strong className="font-mono text-stone-900">{currentOrder?.purity || '91.60% (22K)'}</strong>
          </div>
          <div>
            Diamond Allocation: <strong className="font-mono text-stone-900">{Number(currentOrder?.diamond_weight || 0).toFixed(3)} ct ({currentOrder?.diamond_count || 0} stones)</strong>
          </div>
          <div>
            Making Charge Basis: <strong className="text-stone-900">₹{currentOrder?.making_charge_per_gram || '450'}/g</strong>
          </div>
        </div>
      </div>

      {/* 3. RECEIVE WORK ORDER FORM (Section 4, 5, 6) */}
      <div className="bg-gradient-to-br from-amber-50/50 via-white to-red-50/20 rounded-3xl border-2 border-amber-200/90 shadow-md p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#b01622] text-white flex items-center justify-center text-sm font-bold shadow-2xs">
                <i className="fa-solid fa-gem"></i>
              </span>
              <h3 className="text-base font-bold text-gray-900">
                {receivingPrefill?.is_already_received || isFullyReceived ? 'All Pieces Received' : 'Receive Work Order Form'}
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Physically receive 1 jewellery product per transaction. Validates exact formulas, generates unique RWO # and Tag #, and initiates printable workflows.
            </p>
          </div>
          <div>
            <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black font-mono shadow-2xs ${isFullyReceived || receivingPrefill?.is_already_received
              ? 'bg-stone-900 text-emerald-400'
              : 'bg-stone-900 text-amber-300'
              }`}>
              {receivingBadgeText}
            </span>
          </div>
        </div>

        {receivingPrefill?.is_already_received && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            Piece {receivingPrefill.piece_number} has been received. Tag {receivingPrefill.tag_number || '—'} and Receive Order {receivingPrefill.receive_order_number || '—'} are saved.
          </div>
        )}

        {!selectedPieceId && isFullyReceived && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-medium">
            <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
            <span>All {totalOrderedQty} ordered piece(s) for this work order have been fully received and physically tagged.</span>
          </div>
        )}

        {receivingPrefill && !receivingPrefill.is_already_received && (
          <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                #{receivingPrefill.piece_number}
              </span>
              <div>
                <span className="font-bold text-emerald-950">QC Verified Individual Piece Data Loaded</span>
                <span className="text-emerald-700 block text-[11px] font-medium">
                  Design: <strong>{receivingPrefill.design_no}</strong> | Gross: <strong>{Number(receivingPrefill.gross_weight).toFixed(3)}g</strong> | Net: <strong>{Number(receivingPrefill.net_gold_weight).toFixed(3)}g</strong> | Purity: <strong>{receivingPrefill.purity}% ({receivingPrefill.gold_karat})</strong>
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[10.5px] border border-emerald-300 shrink-0">
              <i className="fa-solid fa-check-circle mr-1 text-emerald-600"></i> Persisted QC Measurements Prefilled
            </span>
          </div>
        )}

        <form onSubmit={handleReceiveWorkOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Design No (Auto-fetched) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Design No</label>
              <input
                type="text"
                readOnly
                value={designRefCode}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-mono font-bold text-stone-800 cursor-not-allowed"
              />
            </div>

            {/* Ordered Date (Auto-fetched) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Ordered Date</label>
              <input
                type="text"
                readOnly
                value={currentOrder?.allotted_date ? new Date(currentOrder.allotted_date).toLocaleDateString('en-GB') : '—'}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-medium text-stone-800 cursor-not-allowed"
              />
            </div>

            {/* Assigned Delivery Date (Auto-fetched) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Assigned Delivery Date</label>
              <input
                type="text"
                readOnly
                value={currentOrder?.delivery_date ? new Date(currentOrder.delivery_date).toLocaleDateString('en-GB') : '—'}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-medium text-stone-800 cursor-not-allowed"
              />
            </div>

            {/* Delivery Date (Actual Receiving Date) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Actual Receiving Date <span className="text-[#b01622]">*</span>
              </label>
              <input
                type="date"
                required
                value={pieceForm.receive_date}
                onChange={(e) => updatePieceField('receive_date', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium focus:outline-hidden focus:border-[#b01622]"
              />
            </div>

            {/* Product Description */}
            <div className="sm:col-span-2">
              <label className="font-bold text-stone-700 block mb-1">Product Description</label>
              <input
                type="text"
                value={pieceForm.description}
                onChange={(e) => updatePieceField('description', e.target.value)}
                placeholder="Product name or description"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-hidden focus:border-[#b01622]"
              />
            </div>

            {/* Quantity (Fixed 1 Unit) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Receive Quantity</label>
              <input
                type="text"
                readOnly
                value="1 Piece"
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-bold text-stone-800 cursor-not-allowed text-center"
              />
            </div>

            {/* Assigned Weight (Read-only allocation) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Assigned Weight (g)</label>
              <input
                type="text"
                readOnly
                value={`${Number(activeItem?.allotted_weight || currentOrder?.allotted_weight || 0).toFixed(3)} g`}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-mono font-bold text-stone-800 cursor-not-allowed text-right"
              />
            </div>

            {/* Total / Gross Weight */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Total / Gross Weight (g) <span className="text-[#b01622]">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={pieceForm.gross_weight}
                onChange={(e) => updatePieceField('gross_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="e.g. 14.500"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Old Weight */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Old Weight (g)</label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.old_weight}
                onChange={(e) => updatePieceField('old_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.000"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Diamond Weight (cts) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Diamond Weight (cts)</label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.diamond_weight}
                onChange={(e) => updatePieceField('diamond_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="e.g. 0.500"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Number of Diamonds */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Number of Diamonds</label>
              <input
                type="number"
                value={pieceForm.diamond_count}
                onChange={(e) => updatePieceField('diamond_count', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Colour Stone Weight (cts) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Colour Stone Wt (cts / g)</label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.color_stone_weight}
                onChange={(e) => updatePieceField('color_stone_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.000"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Colour Stone Count */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Colour Stone Count</label>
              <input
                type="number"
                value={pieceForm.color_stone_count}
                onChange={(e) => updatePieceField('color_stone_count', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Silver Weight (g) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Silver (g)</label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.silver_weight}
                onChange={(e) => updatePieceField('silver_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.000"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Gold Karat */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Gold Karat</label>
              <select
                value={pieceForm.gold_karat}
                onChange={(e) => updatePieceField('gold_karat', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              >
                {karatMasters.length > 0 ? (
                  karatMasters.map((k) => {
                    const formatted = (k.name || '').toUpperCase().trim();
                    const desc = k.description ? ` (${k.description})` : (k.code ? ` (${k.code})` : '');
                    return (
                      <option key={k.id} value={formatted}>
                        {formatted}{desc}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="22K">22K (916 Hallmark)</option>
                    <option value="18K">18K (750 Hallmark)</option>
                    <option value="14K">14K (585 Hallmark)</option>
                    <option value="24K">24K (999 Pure)</option>
                  </>
                )}
                {/* Preserve existing saved value if valid and not duplicate */}
                {pieceForm.gold_karat && !karatMasters.some((k) => (k.name || '').toUpperCase().trim() === (pieceForm.gold_karat || '').toUpperCase().trim()) && (
                  <option value={pieceForm.gold_karat}>{pieceForm.gold_karat}</option>
                )}
              </select>
            </div>

            {/* Purity / Touch (%) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Purity / Touch (%) <span className="text-[#b01622]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={pieceForm.touch}
                onChange={(e) => updatePieceField('touch', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="91.60"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Net Gold Weight (Dynamic Real-time Formula Card) */}
            <div className={`p-2.5 rounded-xl border ${hasStonesExceedingGross ? 'bg-amber-100/90 border-amber-400' : 'bg-amber-100/80 border-amber-300'}`}>
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                Calculated Net Weight (g)
              </span>
              <span className="text-base font-black text-amber-950 font-mono block mt-0.5 text-right">
                {calculatedNetWeight.toFixed(3)} g
              </span>
              <span className="text-[9px] text-amber-800 block text-right">
                {hasStonesExceedingGross ? 'Low-weight piece (Total - Old Wt)' : 'Total - Stones - Old Wt'}
              </span>
            </div>

            {/* Pure 24K Calculation (Dynamic Real-time Formula Card) */}
            <div className="bg-emerald-100/80 p-2.5 rounded-xl border border-emerald-300">
              <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">
                Pure 24K Gold Weight (g)
              </span>
              <span className="text-base font-black text-emerald-950 font-mono block mt-0.5 text-right">
                {calculatedPure24k.toFixed(3)} g
              </span>
              <span className="text-[9px] text-emerald-800 block text-right">Net Wt × (Touch / 100)</span>
            </div>

            {/* Making Charge Type */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Making Charge Type</label>
              <select
                value={pieceForm.making_charge_type}
                onChange={(e) => updatePieceField('making_charge_type', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-bold text-stone-800 focus:outline-hidden focus:border-[#b01622]"
              >
                <option value="per_gram">Per Gram (₹/g)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Charge (₹)</option>
              </select>
            </div>

            {/* Making Charge Rate */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                MC Rate {pieceForm.making_charge_type === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={pieceForm.making_charge}
                onChange={(e) => updatePieceField('making_charge', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="450"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Total MC (Dynamic Real-time Calculation) */}
            <div className="bg-stone-100 p-2.5 rounded-xl border border-stone-300">
              <span className="text-[10px] font-black text-stone-700 uppercase tracking-wider block">
                Total Making Charge (₹)
              </span>
              <span className="text-base font-black text-stone-900 font-mono block mt-0.5 text-right">
                ₹ {calculatedTotalMC.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-stone-500 block text-right">Rate applied to basis</span>
            </div>

            {/* Given Metal */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Given Metal (g)</label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.given_metal}
                onChange={(e) => updatePieceField('given_metal', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.000"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Given Cash */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Given Cash (₹)</label>
              <input
                type="number"
                step="0.01"
                value={pieceForm.given_cash}
                onChange={(e) => updatePieceField('given_cash', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
              />
            </div>

            {/* Approved Wastage (g) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Approved Wastage (g)
              </label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.wastage_weight}
                onChange={(e) => updatePieceField('wastage_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.000"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
                title="Approved manufacturing wastage for this piece"
              />
            </div>

            {/* Karigar Supplied Gold (g) */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Karigar Supplied Gold (g)
              </label>
              <input
                type="number"
                step="0.001"
                value={pieceForm.karigar_gold_weight}
                onChange={(e) => updatePieceField('karigar_gold_weight', e.target.value)}
                onFocus={handleNumericFocus}
                placeholder="0.000"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622] text-right"
                title="Additional gold supplied by Karigar from their own material"
              />
            </div>

            {/* Product Completion Image Upload (Requirement 1) */}
            <div className="md:col-span-2 p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-camera text-[#b01622]"></i>
                  <span>Product Completion Image (Received from Artisan)</span>
                </label>
                {pieceForm.completion_image && (
                  <button
                    type="button"
                    onClick={() => {
                      updatePieceField('completion_image', '');
                      updatePieceField('completion_image_preview', '');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                    <span>Remove Image</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {pieceForm.completion_image_preview ? (
                  <div className="relative group shrink-0">
                    <img
                      src={pieceForm.completion_image_preview}
                      alt="Completion preview"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-400 shadow-xs bg-white"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                      Preview
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 bg-stone-100/50 flex flex-col items-center justify-center text-stone-400 shrink-0">
                    <i className="fa-regular fa-image text-xl mb-1"></i>
                    <span className="text-[9px] font-medium">No Image</span>
                  </div>
                )}

                <div className="flex-1 w-full space-y-1">
                  <input
                    type="file"
                    id="completion-image-file-input"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleCompletionImageUpload}
                    className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#b01622] file:text-white hover:file:bg-[#8f1019] file:cursor-pointer cursor-pointer border border-stone-200 rounded-xl p-1 bg-white"
                  />
                  <p className="text-[10px] text-stone-400">
                    Upload physical finished product image (JPG, PNG, WEBP max 5MB). Persisted to receipt &amp; printed on official receive vouchers.
                  </p>
                </div>
              </div>
            </div>

            {/* Certification & Hallmarking Notice */}
            <div className="md:col-span-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
              <i className="fa-solid fa-circle-info text-amber-700 text-sm"></i>
              <div>
                <span className="font-bold">Certification &amp; Hallmarking (Stage Gates):</span>
                <span className="text-amber-800 ml-1">Processed after receiving in their respective stages. The generated tag initializes with pending (<code className="font-bold text-stone-700">-</code>) until completed or explicitly skipped.</span>
              </div>
            </div>
          </div>

          {/* 4. PRIMARY RECEIVE WORK ORDER ACTION BUTTON (Section 2, 10) */}
          <div className="pt-4 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-stone-600">
              QC Ready Receivable:{' '}
              <strong className="text-emerald-800 font-bold">{receivableCount} piece(s) remaining</strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {(isVoucherEnabled || selectedPieceForVoucher || receivedPiecesList.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    const targetPiece = selectedPieceForVoucher || (receivedPiecesList.length > 0 ? receivedPiecesList[receivedPiecesList.length - 1] : null);
                    if (targetPiece) {
                      setSelectedPieceForVoucher(targetPiece);
                      setIsVoucherModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-3.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  title="Print Receive Order Voucher"
                >
                  <i className="fa-solid fa-file-invoice text-[#b01622]"></i>
                  <span>Print Voucher</span>
                </button>
              )}

              <button
                type="submit"
                disabled={saving || receivableCount <= 0 || !selectedPieceId || receivingPrefill?.is_already_received || isFullyReceived}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#b01622] hover:bg-[#8f1019] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-900/25 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <i className="fa-solid fa-box-archive text-sm"></i>
                <span>{saving ? 'Processing Reception...' : (receivingPrefill?.is_already_received || isFullyReceived) ? 'Already Received' : selectedPieceId ? 'Receive This Piece' : 'Receive Work Order'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 4.5. PERSISTED WEIGHT & STONE SUMMARIES (Requirement 2) */}
      {currentOrder && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section A: Weight Summary */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-scale-balanced"></i>
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">Section A: Weight Summary</h4>
              </div>
              <span className="text-[10.5px] font-bold text-stone-400">WO #{orderNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80">
                <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-tight">Allotted Weight</span>
                <span className="text-base font-black text-amber-950 font-mono block mt-1">
                  {allottedGrossWeight.toFixed(3)} <span className="text-xs font-sans font-bold">g</span>
                </span>
                <span className="text-[9.5px] text-amber-700 block mt-0.5">Total job allocation</span>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80">
                <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-tight">Completed / Received</span>
                <span className="text-base font-black text-emerald-950 font-mono block mt-1">
                  {completedGrossWeight.toFixed(3)} <span className="text-xs font-sans font-bold">g</span>
                </span>
                <span className="text-[9.5px] text-emerald-700 block mt-0.5">Persisted receipts ({receivedPiecesList.length} pcs)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 pt-1 border-t border-stone-100">
              <span>Balance Weight Pending to Receive:</span>
              <span className="font-mono font-black text-stone-900">{Math.max(0, allottedGrossWeight - completedGrossWeight).toFixed(3)} g</span>
            </div>
          </div>

          {/* Section B: Stone Summary */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-gem"></i>
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">Section B: Stone Summary</h4>
              </div>
              <span className="text-[10px] font-bold text-stone-400">Diamonds &amp; Colour Stones</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200/80">
                <span className="text-[10px] font-bold text-blue-800 block uppercase tracking-tight">Allotted Stones Count</span>
                <span className="text-base font-black text-blue-950 font-mono block mt-1">
                  {totalAllottedStones} <span className="text-xs font-sans font-bold">pcs</span>
                </span>
                <div className="text-[9.5px] text-blue-700 mt-0.5 space-x-1.5">
                  <span>Dia: <strong>{allottedDiaCount}</strong></span>
                  <span>•</span>
                  <span>Color: <strong>{allottedColorCount}</strong></span>
                </div>
              </div>

              <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-200/80">
                <span className="text-[10px] font-bold text-purple-800 block uppercase tracking-tight">Received Stones Count</span>
                <span className="text-base font-black text-purple-950 font-mono block mt-1">
                  {totalReceivedStones} <span className="text-xs font-sans font-bold">pcs</span>
                </span>
                <div className="text-[9.5px] text-purple-700 mt-0.5 space-x-1.5">
                  <span>Dia: <strong>{receivedDiaCount}</strong></span>
                  <span>•</span>
                  <span>Color: <strong>{receivedColorCount}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 pt-1 border-t border-stone-100">
              <span>Stones Remaining to Receive:</span>
              <span className="font-mono font-black text-stone-900">{Math.max(0, totalAllottedStones - totalReceivedStones)} pcs</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. RECEIVING HISTORY (Section 12) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </span>
            <h3 className="text-sm font-bold text-gray-900">
              Receiving History ({receivedPiecesList.length} Pieces Received)
            </h3>
          </div>
          <span className="text-xs font-bold text-stone-500">
            Original Work Order #{orderNumber}
          </span>
        </div>

        {receivedPiecesList.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
            <i className="fa-solid fa-box-open text-2xl text-stone-300 mb-2 block"></i>
            <span>No physical pieces have been received yet for this work order. Use the form above to receive individual pieces.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbf7f2] border-b border-stone-200 text-[#785b3a] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">RWO #</th>
                    <th className="py-2.5 px-3">Tag #</th>
                    <th className="py-2.5 px-3">Design #</th>
                    <th className="py-2.5 px-3">Artisan</th>
                    <th className="py-2.5 px-3">Receiving Date</th>
                    <th className="py-2.5 px-3 text-right">Gross Wt</th>
                    <th className="py-2.5 px-3 text-right">Old Wt</th>
                    <th className="py-2.5 px-3 text-right">Net Wt</th>
                    <th className="py-2.5 px-3 text-right">Pure 24K</th>
                    <th className="py-2.5 px-3 text-right">Total MC</th>
                    <th className="py-2.5 px-3 text-center">Posting</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedReceivedPieces.map((pc) => (
                    <tr key={pc.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                        {pc.receive_order_number || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-[#b01622]">{pc.tag_number || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-stone-700">{pc.design_no || designRefCode}</td>
                      <td className="py-2.5 px-3 text-stone-700 font-semibold">{artisanName}</td>
                      <td className="py-2.5 px-3 text-stone-500">
                        {pc.received_at ? new Date(pc.received_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                        {Number(pc.gross_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                        {Number(pc.old_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                        {Number(pc.net_gold_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                        {Number(pc.pure_24k_weight || 0).toFixed(3)}g
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-700">
                        ₹{Number(pc.total_making_charge || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.is_inventory_posted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                          {pc.is_inventory_posted ? 'Posted' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPieceForVoucher(pc);
                              setIsVoucherModalOpen(true);
                            }}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-[10.5px] transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Print Official Receiving Voucher"
                          >
                            <i className="fa-solid fa-file-invoice text-stone-600 text-[10px]"></i>
                            <span>Voucher</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPieceForTag(pc);
                              setIsTagModalOpen(true);
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-[#b01622] font-bold rounded-lg text-[10.5px] transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Print Jewellery Barcode Tag"
                          >
                            <i className="fa-solid fa-tags text-[10px]"></i>
                            <span>Tag</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {receivedPiecesList.length > 0 && (
              <Pagination
                currentPage={safeReceivedHistoryPage}
                totalPages={receivedHistoryPages}
                totalItems={receivedPiecesList.length}
                itemsPerPage={detailItemsPerPage}
                onPageChange={(page) => setReceivedHistoryPage(page)}
                onItemsPerPageChange={(num) => {
                  setDetailItemsPerPage(num);
                  setReceivedHistoryPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* 6. INDIVIDUAL TAGS TABLE AT THE BOTTOM (Section 9.4) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">
              <i className="fa-solid fa-tags"></i>
            </span>
            <h3 className="text-sm font-bold text-gray-900">
              Individual Physical Tags ({filteredTagsList.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagSearchTerm}
              onChange={(e) => {
                setTagSearchTerm(e.target.value);
                setDetailTagsPage(1);
              }}
              placeholder="Search by Tag # or RWO #..."
              className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:border-[#b01622] w-56"
            />
            <Link
              to={`/job-order/tag-printing?wo=${orderNumber}`}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              <span>Batch Tag Printing</span>
            </Link>
          </div>
        </div>

        {filteredTagsList.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
            <span>No tags found matching the search.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbf7f2] border-b border-stone-200 text-[#785b3a] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Tag Number</th>
                    <th className="py-2.5 px-3">Receive WO #</th>
                    <th className="py-2.5 px-3">Design #</th>
                    <th className="py-2.5 px-3">Product Description</th>
                    <th className="py-2.5 px-3 text-center">Gold Karat</th>
                    <th className="py-2.5 px-3 text-right">G.wt</th>
                    <th className="py-2.5 px-3">Diamond Details</th>
                    <th className="py-2.5 px-3 text-right">Total Dia Wt</th>
                    <th className="py-2.5 px-3 text-center">Certification</th>
                    <th className="py-2.5 px-3 text-center">Hallmarking</th>
                    <th className="py-2.5 px-3">Receiving Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedDetailTags.map((pc) => {
                    const certStatus = (pc.certification_status || '').toLowerCase();
                    const isCertCompleted = certStatus === 'completed';
                    const isCertSkipped = certStatus === 'skipped' || certStatus === 'not_required';

                    const hallStatus = (pc.hallmarking_status || '').toLowerCase();
                    const isHallCompleted = hallStatus === 'completed';
                    const isHallSkipped = hallStatus === 'skipped' || hallStatus === 'not_required';

                    return (
                      <tr key={pc.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-black text-[#b01622]">{pc.tag_number}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-800">
                          {pc.receive_order_number || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-700">{pc.design_no || designRefCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-stone-800">{pc.product_name || currentOrder?.product_name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-900">{pc.gold_karat || '22K'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                          {Number(pc.gross_weight || 0).toFixed(3)}g
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-700">
                          {pc.diamond_details || (pc.diamond_weight > 0 ? `Dia-${Number(pc.diamond_weight).toFixed(2)}/+7/${pc.diamond_count || 1}` : '—')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-700">
                          {Number(pc.diamond_weight || 0).toFixed(3)} ct
                        </td>
                        {/* Certification Column */}
                        <td className="py-2.5 px-3 text-center">
                          {isCertSkipped ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200">
                              Skipped
                            </span>
                          ) : isCertCompleted ? (
                            <span className="font-mono font-bold text-stone-900 text-[11px]">
                              {pc.certificate_no || 'Completed'}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-bold">-</span>
                          )}
                        </td>
                        {/* Hallmarking Column */}
                        <td className="py-2.5 px-3 text-center">
                          {isHallSkipped ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200">
                              Skipped
                            </span>
                          ) : isHallCompleted ? (
                            <span className="font-mono font-bold text-stone-900 text-[11px]">
                              {pc.huid || 'Completed'}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500">
                          {pc.received_at ? new Date(pc.received_at).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPieceForTag(pc);
                              setIsTagModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white font-bold rounded-lg text-[10.5px] transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Print Physical Tag"
                          >
                            <i className="fa-solid fa-print text-[10px]"></i>
                            <span>Print Tag</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredTagsList.length > 0 && (
              <Pagination
                currentPage={safeDetailTagsPage}
                totalPages={detailTagsPages}
                totalItems={filteredTagsList.length}
                itemsPerPage={detailItemsPerPage}
                onPageChange={(page) => setDetailTagsPage(page)}
                onItemsPerPageChange={(num) => {
                  setDetailItemsPerPage(num);
                  setDetailTagsPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* 7. PRINTABLE RECEIVING VOUCHER MODAL (Section 10.1) */}
      {isVoucherModalOpen && selectedPieceForVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
            {/* Control Bar */}
            <div className="px-6 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-invoice text-[#b01622] text-base"></i>
                <h3 className="font-bold text-gray-900 text-sm">
                  Receive Order — {selectedPieceForVoucher.receive_order_number || '—'} · Piece #{selectedPieceForVoucher.piece_number || '—'}
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadExcel(selectedPieceForVoucher)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  title="Download as Excel document"
                >
                  <i className="fa-solid fa-file-excel"></i>
                  <span>Download Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => printElement('receiving-voucher-sheet', `Receive Order — ${selectedPieceForVoucher?.receive_order_number || ''}`, { orientation: 'landscape' })}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>Print Receive Order</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedPieceForVoucher.tag_number}
                  onClick={() => {
                    if (!selectedPieceForVoucher.tag_number) return;
                    setSelectedPieceForTag(selectedPieceForVoucher);
                    setIsTagModalOpen(true);
                  }}
                  className="px-4 py-2 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-tag"></i>
                  <span>Print Tag</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-stone-100/60 flex justify-center">
              <div
                id="receiving-voucher-sheet"
                className="bg-white border border-stone-200 p-4 w-full text-gray-900 text-xs font-['Inter',sans-serif] space-y-3 relative"
                style={{ maxWidth: '1120px' }}
              >
                <WorkOrderPrintHeader
                  title="RECEIVE ORDER"
                  number={selectedPieceForVoucher.receive_order_number}
                  issuedDate={selectedPieceForVoucher.received_at ? new Date(selectedPieceForVoucher.received_at).toLocaleDateString('en-CA') : null}
                />

                <WorkOrderPrintMetadata items={[
                  { label: 'Design No.', value: selectedPieceForVoucher.design_no || selectedPieceForVoucher.item?.design_no },
                  { label: 'Ordered Date', value: selectedPieceForVoucher.ordered_date || selectedPieceForVoucher.work_order?.allotted_date || selectedPieceForVoucher.work_order?.job_order?.order_date },
                  { label: 'Delivery Date', value: selectedPieceForVoucher.delivery_date || selectedPieceForVoucher.item?.delivery_date || selectedPieceForVoucher.work_order?.delivery_date },
                  { label: 'Work Order / Job', value: `${selectedPieceForVoucher.work_order?.work_order_number || orderNumber} · ${selectedPieceForVoucher.work_order_item_id || selectedPieceForVoucher.item?.id || '—'}` },
                  { label: 'Individual Piece / Tag', value: `#${selectedPieceForVoucher.piece_number || '—'} · ${selectedPieceForVoucher.tag_number || '—'}` },
                ]} />

                {(() => {
                  const piece = selectedPieceForVoucher;
                  const completionImage = piece.image_path || piece.completion_image || piece.image || '';
                  const productImage = completionImage || '/placeholder-jewelry.png';
                  const displayWeight = (value, unit = 'g') => value == null || value === '' ? '—' : `${Number(value).toFixed(3)} ${unit}`;
                  const displayCount = (value) => value == null || value === '' ? '—' : String(Number(value));
                  const metricRows = [
                    { label: 'Product Name', value: piece.product_name || piece.item?.product_name || piece.product?.name || '—' },
                    { label: 'Quantity', value: '1 piece' },
                    { label: 'Total Weight', value: displayWeight(piece.gross_weight) },
                    { label: 'Old Weight', value: displayWeight(piece.old_weight) },
                    { label: 'Colour Stone Weight', value: displayWeight(piece.color_stone_weight, 'ct') },
                    { label: 'Number of Colour Stones', value: displayCount(piece.color_stone_count) },
                    { label: 'Diamond Weight', value: displayWeight(piece.diamond_weight, 'ct') },
                    { label: 'Number of Diamonds', value: displayCount(piece.diamond_count) },
                    { label: 'Silver Weight', value: displayWeight(piece.silver_weight) },
                    { label: 'Net Gold Weight', value: displayWeight(piece.net_gold_weight), emphasis: 'text-[#881337]' },
                    { label: 'Purity / Touch', value: piece.purity == null || piece.purity === '' ? '—' : `${Number(piece.purity).toFixed(2)}%${piece.gold_karat ? ` (${piece.gold_karat})` : ''}` },
                    { label: 'Pure 24K Gold Equivalent Weight', value: displayWeight(piece.pure_24k_weight) },
                    { label: 'Making Charge Rate (MC)', value: piece.making_charge_per_gram == null ? '—' : `₹${Number(piece.making_charge_per_gram).toFixed(2)} / ${piece.making_charge_type || 'g'}` },
                    { label: 'Total Making Charge (Total MC)', value: piece.total_making_charge == null ? '—' : `₹${Number(piece.total_making_charge).toFixed(2)}` },
                    { label: 'Total Number of Stones', value: piece.diamond_count == null && piece.color_stone_count == null ? '—' : String(Number(piece.diamond_count || 0) + Number(piece.color_stone_count || 0)) },
                    { label: 'Allotted Weight (piece share)', value: displayWeight(piece.allotted_weight) },
                  ];

                  return (
                    <div className="space-y-3">
                      {/* Product Completion Image Section */}
                      {completionImage ? (
                        <div className="border border-[#d8c8b0] rounded-xl p-3 bg-[#fcfaf7] flex items-center gap-4 my-2 text-xs">
                          <img
                            src={completionImage}
                            alt="Product Completion Image"
                            className="w-20 h-20 object-contain rounded-lg border border-[#d8c8b0] bg-white shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#881337] block">
                              Product Completion Image
                            </span>
                            <p className="text-xs font-semibold text-stone-800 mt-1">
                              Verified physical piece received from artisan ({piece.artisan_name || piece.karigar?.name || 'Artisan'}).
                            </p>
                            <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">
                              Piece #{piece.piece_number || '1'} · Tag: {piece.tag_number || '—'} · RWO: {piece.receive_order_number || '—'}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="w-full space-y-2.5 my-2">
                        {/* Table 1 / Row 1: Primary Piece & Gold Metrics (9 individual columns) */}
                        <div className="w-full border border-[#d8c8b0] rounded-lg bg-white shadow-2xs overflow-hidden">
                          <div className="bg-[#eedfce]/70 px-2.5 py-1 text-[8px] font-black text-[#881337] uppercase tracking-wider border-b border-[#d8c8b0] flex items-center justify-between">
                            <span>Part 1: Primary Piece &amp; Gold Metrics</span>
                            <span className="font-mono text-stone-500">Row 1 of 2</span>
                          </div>
                          <table className="w-full text-left text-[8.5px] border-collapse">
                            <thead>
                              <tr className="bg-[#eedfce] text-[#881337] font-bold border-b border-[#d8c8b0] text-[7.5px] uppercase tracking-wider">
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-center w-7">S.No</th>
                                <th className="py-1 px-2 border border-[#d8c8b0] min-w-[110px]">Product / Design</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-center w-8">Image</th>
                                <th className="py-1 px-2 border border-[#d8c8b0] min-w-[100px]">Piece / Tag / Qty</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Total Wt</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Old Wt</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Net Gold Wt</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-center whitespace-nowrap">Purity / Touch</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Pure 24K Wt</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-stone-200 hover:bg-stone-50/50">
                                <td className="py-1.5 px-1.5 border border-stone-200 text-center font-bold">1</td>
                                <td className="py-1.5 px-2 border border-stone-200 font-mono font-bold whitespace-normal">
                                  <span className="block truncate max-w-[130px]">{metricRows[0].value}</span>
                                  <span className="block text-[7.5px] text-stone-500 font-normal">{piece.design_no || piece.item?.design_no || '—'}</span>
                                </td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-center">
                                  <img
                                    src={productImage || '/placeholder-jewelry.png'}
                                    alt={piece.product_name || 'Product'}
                                    className="w-6 h-6 object-contain mx-auto border border-stone-200 rounded bg-white"
                                    onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder-jewelry.png'; }}
                                  />
                                </td>
                                <td className="py-1.5 px-2 border border-stone-200 font-mono text-[#881337] whitespace-normal leading-tight">
                                  <span className="font-bold">#{piece.piece_number || '—'} · Qty 1</span>
                                  <span className="block text-[7.5px] text-stone-600 font-medium">{piece.tag_number || '—'}</span>
                                </td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono font-bold">{metricRows[2].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono">{metricRows[3].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono font-bold text-[#881337] bg-rose-50/40">{metricRows[9].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-center font-medium">{metricRows[10].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono">{metricRows[11].value}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Table 2 / Row 2: Stones, Diamonds, Silver, MC & Allotment (9 individual columns) */}
                        <div className="w-full border border-[#d8c8b0] rounded-lg bg-white shadow-2xs overflow-hidden">
                          <div className="bg-[#f5eade]/70 px-2.5 py-1 text-[8px] font-black text-[#881337] uppercase tracking-wider border-b border-[#d8c8b0] flex items-center justify-between">
                            <span>Part 2: Stones, Diamonds, Silver &amp; Making Charges Breakdown</span>
                            <span className="font-mono text-stone-500">Row 2 of 2</span>
                          </div>
                          <table className="w-full text-left text-[8.5px] border-collapse">
                            <thead>
                              <tr className="bg-[#f5eade] text-[#881337] font-bold border-b border-[#d8c8b0] text-[7.5px] uppercase tracking-wider">
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Colour Stone (ct)</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-center whitespace-nowrap">Colour Pcs</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Diamond (ct)</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-center whitespace-nowrap">Diamond Pcs</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Silver Wt</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">MC Rate</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Total MC</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-center whitespace-nowrap">Total Stones</th>
                                <th className="py-1 px-1.5 border border-[#d8c8b0] text-right whitespace-nowrap">Allotted Wt</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-stone-200 bg-stone-50/40 hover:bg-stone-50/70">
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono font-medium">{metricRows[4].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-center font-mono">{metricRows[5].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono font-medium">{metricRows[6].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-center font-mono">{metricRows[7].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono">{metricRows[8].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono font-medium">{metricRows[12].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono font-bold text-[#881337]">{metricRows[13].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-center font-mono font-bold">{metricRows[14].value}</td>
                                <td className="py-1.5 px-1.5 border border-stone-200 text-right font-mono">{metricRows[15].value}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. FOLDABLE PHYSICAL JEWELLERY TAG MODAL (Section 9.3) */}
      {isTagModalOpen && selectedPieceForTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm border border-red-100">
                  <i className="fa-solid fa-tags"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                    Jewellery Tag Printing — {selectedPieceForTag.tag_number || selectedPieceForTag.barcode || '—'}
                  </h3>
                  <p className="text-[10px] text-stone-500 font-mono">
                    {selectedPieceForTag.product_name || selectedPieceForTag.design_no || 'Received Jewellery Piece'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1 rounded-xl border border-stone-200 text-xs">
                  <span className="text-[10.5px] text-stone-500 font-semibold">Copies:</span>
                  <select
                    value={tagCopies}
                    onChange={(e) => setTagCopies(Number(e.target.value))}
                    className="bg-white border border-stone-300 rounded-lg px-2 py-0.5 text-xs font-bold text-stone-800 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'tag' : 'tags'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
                    if (!printWindow) return;
                    const items = Array.from({ length: Math.max(1, tagCopies) }, () => selectedPieceForTag);
                    const html = buildPrintableTagsHtml(items, `Jewellery Tag — ${selectedPieceForTag.tag_number || ''}`);
                    printWindow.document.open();
                    printWindow.document.write(html);
                    printWindow.document.close();
                  }}
                  className="px-3.5 py-1.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-print text-xs"></i>
                  <span>Print {tagCopies > 1 ? `${tagCopies} Tags` : 'Tag'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>

            {/* Tag Preview Area matching exact physical specification */}
            <div className="p-6 bg-stone-100/70 flex flex-col items-center justify-center gap-3 overflow-x-auto">
              <JewelleryTagCard piece={selectedPieceForTag} id="foldable-tag-sheet" />
              <span className="text-[11px] text-stone-400 text-center">
                Dotted line indicates physical fold crease before barcode label. Tag dimensions: 125mm × 33mm.
              </span>
            </div>

            {/* Data Mapping Summary Table */}
            <div className="p-4 bg-white border-t border-stone-200 text-xs space-y-2">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                Tag Specifications Summary
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Tag Number</span>
                  <span className="font-mono font-bold text-stone-900">{selectedPieceForTag.tag_number || '—'}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Design No</span>
                  <span className="font-mono font-bold text-stone-900">{selectedPieceForTag.design_no || selectedPieceForTag.item?.design_no || selectedPieceForTag.work_order?.design_code || '—'}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Gross Weight</span>
                  <span className="font-mono font-bold text-[#b01622]">
                    {selectedPieceForTag.gross_weight != null ? `${Number(selectedPieceForTag.gross_weight).toFixed(3)}g` : '—'}
                  </span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Purity / Karat</span>
                  <span className="font-bold text-stone-900">{selectedPieceForTag.gold_karat || '22K'}</span>
                </div>
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-100">
                <span>Receive Order: <strong>{selectedPieceForTag.receive_order_number || '—'}</strong></span>
                <span>Work Order: <strong>{selectedPieceForTag.work_order?.work_order_number || orderNumber}</strong></span>
                <span>Net Gold: <strong>{selectedPieceForTag.net_gold_weight != null ? `${Number(selectedPieceForTag.net_gold_weight).toFixed(3)}g` : (selectedPieceForTag.net_weight != null ? `${Number(selectedPieceForTag.net_weight).toFixed(3)}g` : '—')}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper for diamond wt display fallback
function selectedPieceTagDia(pc) {
  return pc?.diamond_weight || 0.09;
}
