import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { cleanProductName } from '../../utils/formatters';

const checkItems = [
  { key: 'purity', label: 'Gold Purity Testing', expected: '22K (916)', note: 'Purity 22K confirmed' },
  { key: 'weight', label: 'Weight Verification', expected: '20.000 gm', note: 'Weight matches' },
  { key: 'diamond', label: 'Diamond / Stone Check', expected: 'VVS1 / G - Good', note: 'All stones OK' },
  { key: 'polish', label: 'Polish / Finish', expected: 'High Standard', note: 'Good finish' },
  { key: 'quality', label: 'Overall Quality', expected: 'As per Standard', note: 'Approved' },
];

const displayDate = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB');
  } catch {
    return value;
  }
};

export default function QualityCheckDetails() {
  const { showToast, showConfirm, showPrompt } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [ongoingOrders, setOngoingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryParams = new URLSearchParams(location.search);
  const queryOrderId = queryParams.get('order_id');
  const queryItemId = queryParams.get('item_id');
  const queryPieceId = queryParams.get('piece_id');
  const queryPieceNumber = queryParams.get('piece_number');

  const [selectedPieceNumber, setSelectedPieceNumber] = useState(queryPieceNumber || null);

  // Editable Product Inspection Data (Finished Gross Weight, Diamond Wt/Count, Wastage)
  const [qcFinishedWeight, setQcFinishedWeight] = useState('');
  const [qcDiamondWeight, setQcDiamondWeight] = useState('');
  const [qcDiamondCount, setQcDiamondCount] = useState('');
  const [qcWastageWeight, setQcWastageWeight] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const listResponse = await api.get('/work-orders', { params: { tab: 'quality_check' } });
        const list = listResponse.data?.data || [];

        const qcOnlyList = list.filter((item) => {
          const status = (item.status || '').toLowerCase();
          const stage = (item.current_stage || '').toLowerCase();
          return (
            status === 'pending_approval' ||
            ['work_completed', 'sent_for_approval', 'quality_check', 'completed_approval', 'submitted'].includes(stage) ||
            Boolean(item.karigar_submitted_at) ||
            Number(item.completed_weight || 0) > 0 ||
            Number(item.qc_pending_qty || 0) > 0
          );
        });

        const finalOrdersList = qcOnlyList;
        setOngoingOrders(finalOrdersList);

        if (queryOrderId) {
          try {
            const response = await api.get(`/work-orders/${queryOrderId}`);
            if (mounted) {
              const nextOrder = response.data?.data || null;
              setOrder(nextOrder);
              setSelectedPieceId(queryPieceId || null);
              setSelectedPieceNumber(queryPieceNumber || null);
              if (nextOrder?.items && nextOrder.items.length > 0) {
                const matchedItem = queryItemId
                  ? nextOrder.items.find((it) => String(it.id) === String(queryItemId))
                  : null;
                const pendingQcItem =
                  matchedItem ||
                  nextOrder.items.find((it) => Number(it.qc_pending_qty || 0) > 0) ||
                  nextOrder.items[0];
                setSelectedJobId(pendingQcItem?.id || null);
              } else {
                setSelectedJobId(null);
              }
              setNotes(nextOrder?.quality_notes || '');
              const saved = nextOrder?.checklist || {};
              setStatuses(
                Object.fromEntries(
                  checkItems.map((item) => [
                    item.key,
                    saved[item.key] === false
                      ? 'Pending'
                      : item.key === 'weight' && !saved[item.key]
                      ? 'Pending'
                      : 'Accept',
                  ])
                )
              );
            }
          } catch (err) {
            console.error('Failed to load specific order for QC:', err);
            if (mounted) setOrder(null);
          }
        } else {
          setOrder(null);
          setSelectedPieceId(null);
          setSelectedPieceNumber(null);
        }
      } catch (error) {
        console.error('Failed to load quality check orders:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [location.search, queryOrderId, queryItemId, queryPieceId, queryPieceNumber]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Real-time synchronization: poll order details so Workbench wastage updates refresh QC Inspect Summary automatically
  useEffect(() => {
    if (!queryOrderId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/work-orders/${queryOrderId}`);
        if (res.data?.data) {
          setOrder(res.data.data);
        }
      } catch (err) {
        // silent sync catch
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [queryOrderId]);

  // Flatten every product/piece sent for QC into an individual row
  const allProductRows = useMemo(() => {
    const rows = [];

    ongoingOrders.forEach((wo) => {
      const receivedPieces = wo.received_pieces || wo.receivedPieces || [];
      const pieceRows = receivedPieces.filter((piece) => {
        const status = String(piece.qc_status || piece.status || '').toLowerCase();
        return (
          ['pending', 'qc_pending'].includes(status) ||
          piece.status === 'pending_approval' ||
          piece.current_stage === 'quality_check' ||
          (!piece.received_at && (piece.qc_status === null || piece.qc_status === 'pending'))
        );
      });

      if (pieceRows.length > 0) {
        pieceRows.forEach((piece, idx) => {
          rows.push({
            rowKey: `wo_${wo.id}_piece_${piece.id || idx}`,
            orderId: wo.id,
            itemId: piece.work_order_item_id || wo.items?.[0]?.id || null,
            pieceId: piece.id,
            productNo: `#${piece.piece_number || idx + 1}`,
            work_order: wo,
            item: wo.items?.find((it) => String(it.id) === String(piece.work_order_item_id)) || wo.items?.[0] || null,
            work_order_number: wo.work_order_number,
            job_order_number: wo.job_order?.job_order_number || wo.job_number || null,
            product_name: piece.product_name || wo.product_name || 'Jewelry Piece',
            design_no: piece.design_no || wo.design_code || '—',
            karat: piece.gold_karat || wo.karat || '22K',
            artisan_name: wo.karigar?.name || wo.karigar_name || 'In-House',
            allotted_weight: Number(piece.allotted_weight || wo.allotted_weight || 0),
            completed_weight: Number(piece.gross_weight || piece.completed_weight || wo.completed_weight || 0),
            qc_pending_qty: 1,
            piece_number: piece.piece_number || idx + 1,
            status: piece.status || wo.status,
            current_stage: piece.current_stage || wo.current_stage,
            is_returned: Boolean(
              piece.qc_submission_data?.is_resubmitted ||
              piece.qc_submission_data?.is_returned ||
              piece.qc_status === 'rejected' ||
              piece.status === 'rework' ||
              piece.status === 'returned' ||
              (piece.return_count && Number(piece.return_count) > 0)
            ),
            rework_reason: piece.qc_notes || piece.qc_submission_data?.return_reason || null,
            thumbnail: wo.reference_image || wo.image_url || wo.design_image || null,
          });
        });
        return;
      }

      if (wo.items && wo.items.length > 0) {
        const pendingItems = wo.items.filter(
          (it) => Number(it.qc_pending_qty || 0) > 0 || it.status === 'pending_approval' || it.current_stage === 'quality_check'
        );

        pendingItems.forEach((item) => {
          const count = Math.max(1, Number(item.qc_pending_qty || 1));
          const unitAllotted = Number(item.allotted_weight || 0) / count;
          const unitCompleted = Number(item.completed_weight || 0) / count;
          for (let p = 1; p <= count; p++) {
            rows.push({
              rowKey: `wo_${wo.id}_item_${item.id}_pc_${p}`,
              orderId: wo.id,
              itemId: item.id,
              pieceId: null,
              productNo: `#${p}`,
              work_order: wo,
              item: item,
              work_order_number: wo.work_order_number,
              job_order_number: wo.job_order?.job_order_number || wo.job_number || null,
              product_name: item.product_name || wo.product_name || 'Jewelry Piece',
              design_no: item.design_no || wo.design_code || '—',
              karat: wo.karat || item.karat || '22K',
              artisan_name: wo.karigar?.name || wo.karigar_name || 'In-House',
              allotted_weight: unitAllotted,
              completed_weight: unitCompleted,
              qc_pending_qty: 1,
              piece_number: p,
              submitted_date: wo.karigar_submitted_at || wo.updated_at,
              status: wo.status,
              current_stage: wo.current_stage,
              is_returned: Boolean(wo.is_returned || (wo.return_count || 0) > 0),
              thumbnail: wo.reference_image || wo.image_url || wo.design_image || null,
            });
          }
        });
      } else {
        const isQcPending =
          Number(wo.qc_pending_qty || 0) > 0 ||
          wo.status === 'pending_approval' ||
          wo.current_stage === 'quality_check';
        if (isQcPending) {
          const count = Math.max(1, Number(wo.qc_pending_qty || 1));
          const unitAllotted = Number(wo.allotted_weight || 0) / count;
          const unitCompleted = Number(wo.completed_weight || 0) / count;
          for (let p = 1; p <= count; p++) {
            rows.push({
              rowKey: `wo_${wo.id}_root_pc_${p}`,
              orderId: wo.id,
              itemId: null,
              pieceId: null,
              productNo: `#${p}`,
              work_order: wo,
              item: null,
              work_order_number: wo.work_order_number,
              job_order_number: wo.job_order?.job_order_number || wo.job_number || null,
              product_name: wo.product_name || 'Jewelry Piece',
              design_no: wo.design_code || '—',
              karat: wo.karat || '22K',
              artisan_name: wo.karigar?.name || wo.karigar_name || 'In-House',
              allotted_weight: unitAllotted,
              completed_weight: unitCompleted,
              qc_pending_qty: 1,
              piece_number: p,
              submitted_date: wo.karigar_submitted_at || wo.updated_at,
              status: wo.status,
              current_stage: wo.current_stage,
              is_returned: Boolean(wo.is_returned || (wo.return_count || 0) > 0),
              thumbnail: wo.reference_image || wo.image_url || wo.design_image || null,
            });
          }
        }
      }
    });
    return rows;
  }, [ongoingOrders]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return allProductRows;
    return allProductRows.filter((p) => {
      return (
        p.work_order_number?.toLowerCase().includes(term) ||
        p.product_name?.toLowerCase().includes(term) ||
        p.design_no?.toLowerCase().includes(term) ||
        p.artisan_name?.toLowerCase().includes(term) ||
        p.job_order_number?.toLowerCase().includes(term)
      );
    });
  }, [allProductRows, searchTerm]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectProductRow = (row) => {
    const params = new URLSearchParams({ order_id: String(row.orderId) });
    if (row.itemId) params.set('item_id', String(row.itemId));
    if (row.pieceId) params.set('piece_id', String(row.pieceId));
    navigate(`/job-order/quality-check?${params.toString()}`);
  };

  const handleBackToList = () => {
    setOrder(null);
    setSelectedJobId(null);
    navigate('/job-order/quality-check');
  };

  const [imageError, setImageError] = useState(false);

  // Active details when inspecting an order/item
  const orderId = order?.id;
  const activeJob = order?.items?.find((it) => it.id === selectedJobId) || order?.items?.[0] || null;
  const activePiece = order?.received_pieces?.find((piece) => String(piece.id) === String(selectedPieceId))
    || order?.receivedPieces?.find((piece) => String(piece.id) === String(selectedPieceId))
    || null;
  const jobId = activeJob?.design_no || order?.design_code || order?.work_order_number || (order?.id ? `WO-${order.id}` : '');
  const clientId = order?.client?.client_code || (order?.client_id ? `CL-${order.client_id}` : 'CL-1001');
  const clientName = order?.customer_name || order?.client?.full_name || order?.client?.name || 'Client';
  const karigarName = order?.karigar?.name || order?.karigar_name || 'In-House Artisan';
  
  const receivedWeight = Number(activePiece?.gross_weight ?? activePiece?.completed_weight ?? activeJob?.completed_weight ?? order?.completed_weight ?? activeJob?.allotted_weight ?? order?.allotted_weight ?? 0);
  const allottedWeight = Number(activePiece?.allotted_weight ?? activeJob?.allotted_weight ?? order?.allotted_weight ?? receivedWeight);

  // Pre-fill editable QC inspection values:
  // Priority 1: Actual finished weight and diamond weight from Workbench
  // Priority 2: Work Order specifications if moved directly to QC without workbench
  const pieceQcData = activePiece?.qc_submission_data || {};
  const isFromWorkbench = Boolean(
    (activePiece?.gross_weight && Number(activePiece.gross_weight) > 0) ||
    (activePiece?.completed_weight && Number(activePiece.completed_weight) > 0) ||
    (pieceQcData.completed_weight && Number(pieceQcData.completed_weight) > 0) ||
    (pieceQcData.gross_weight && Number(pieceQcData.gross_weight) > 0) ||
    (activeJob?.completed_weight && Number(activeJob.completed_weight) > 0) ||
    (order?.completed_weight && Number(order.completed_weight) > 0)
  );

  useEffect(() => {
    if (!order) return;

    // 1. Finished Gross Weight
    const benchGross = activePiece?.gross_weight
      ?? activePiece?.completed_weight
      ?? pieceQcData.completed_weight
      ?? pieceQcData.gross_weight
      ?? activeJob?.completed_weight
      ?? order?.completed_weight;

    const fallbackGross = activeJob?.allotted_weight
      ?? order?.expected_weight
      ?? order?.allotted_weight
      ?? order?.pricing_details?.total_gross_wt
      ?? order?.pricing_details?.gold_weight
      ?? '';

    const initialGross = (benchGross !== undefined && benchGross !== null && Number(benchGross) > 0)
      ? String(Number(benchGross).toFixed(3))
      : (fallbackGross ? String(Number(fallbackGross).toFixed(3)) : '');

    // 2. Diamond Weight (ct)
    const benchDiaWt = activePiece?.diamond_weight
      ?? pieceQcData.diamond_weight
      ?? activeJob?.pricing_details?.diamond_weight
      ?? order?.diamond_weight;

    const fallbackDiaWt = order?.pricing_details?.diamond_weight
      ?? order?.pricing_details?.total_dia_cts
      ?? '';

    const initialDiaWt = (benchDiaWt !== undefined && benchDiaWt !== null && benchDiaWt !== '')
      ? String(benchDiaWt)
      : (fallbackDiaWt ? String(fallbackDiaWt) : '');

    // 3. Diamond Count (pcs)
    const benchDiaCount = activePiece?.diamond_count
      ?? pieceQcData.diamond_count
      ?? activeJob?.pricing_details?.diamond_count
      ?? order?.diamond_count;

    const fallbackDiaCount = order?.pricing_details?.diamond_count
      ?? order?.pricing_details?.no_of_diamonds
      ?? '';

    const initialDiaCount = (benchDiaCount !== undefined && benchDiaCount !== null && benchDiaCount !== '')
      ? String(benchDiaCount)
      : (fallbackDiaCount ? String(fallbackDiaCount) : '');

    // 4. Gold Wastage (g)
    const benchWastage = pieceQcData.wastage_weight
      ?? pieceQcData.gold_wastage
      ?? activeJob?.pricing_details?.wastage_weight
      ?? activeJob?.pricing_details?.gold_wastage
      ?? order?.wastage_weight;

    const fallbackWastage = order?.pricing_details?.wastage_weight
      ?? order?.pricing_details?.gold_wastage
      ?? '';

    const initialWastage = (benchWastage !== undefined && benchWastage !== null && benchWastage !== '')
      ? String(benchWastage)
      : (fallbackWastage ? String(fallbackWastage) : '');

    setQcFinishedWeight(initialGross);
    setQcDiamondWeight(initialDiaWt);
    setQcDiamondCount(initialDiaCount);
    setQcWastageWeight(initialWastage);
  }, [order?.id, selectedJobId, selectedPieceId]);

  const numFinishedGross = parseFloat(qcFinishedWeight) || 0;
  const numDiaWt = parseFloat(qcDiamondWeight) || 0;
  const numDiaCount = parseInt(qcDiamondCount, 10) || 0;
  const numWastage = parseFloat(qcWastageWeight) || 0;
  const calculatedNetGold = Math.max(0, numFinishedGross - (numDiaWt * 0.2));

  // Legacy fallback compatibility
  const reconciliation = {
    purity: activePiece?.gold_karat || activePiece?.purity || activeJob?.purity || order?.purity || order?.karat || '22K',
    touch: (activePiece?.purity && Number(activePiece.purity) > 1) ? Number(activePiece.purity) : (Number(order?.touch) || 91.6),
    recorded_wastage_weight: numWastage,
  };

  const wastage = numWastage;
  const wastagePercent = Number(order?.wastage_allowed_percent ?? (numFinishedGross > 0 ? ((wastage / numFinishedGross) * 100) : 0));

  useEffect(() => {
    setImageError(false);
  }, [order?.id, selectedJobId]);

  const handleApprove = async () => {
    if (!orderId) return;
    const pendingQc = selectedPieceId ? 1 : (activeJob ? Number(activeJob.qc_pending_qty || 1) : Number(order?.qc_pending_qty || 1));
    const confirmed = await showConfirm({
      title: 'Approve Quality Check',
      message: `Confirm passing QC for ${pendingQc} piece(s) of "${activeJob?.product_name || order?.product_name || 'Jewelry Piece'}"? Approved units will advance to Ready & Certification.`,
      icon: 'fa-solid fa-circle-check',
      confirmText: `Approve ${pendingQc} pc(s) & Pass QC`,
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      await api.post(`/work-orders/${orderId}/qc-action`, {
        work_order_item_id: activeJob?.id || null,
        piece_id: selectedPieceId || null,
        action: 'pass',
        quantity: pendingQc,
        actual_weight: numFinishedGross > 0 ? numFinishedGross : null,
        gross_weight: numFinishedGross > 0 ? numFinishedGross : null,
        completed_weight: numFinishedGross > 0 ? numFinishedGross : null,
        diamond_weight: numDiaWt,
        diamond_count: numDiaCount,
        wastage_weight: numWastage,
        gold_wastage: numWastage,
        quality_notes: notes || 'Quality check approved.',
      });
      showToast(`${pendingQc} piece(s) approved! Moved to Ready / Certification.`, 'success');
      navigate('/job-order/ready');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to approve quality check.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRemarks = async () => {
    if (!orderId) return;
    try {
      setSaving(true);
      await api.post(`/work-orders/${orderId}/qc-action`, {
        work_order_item_id: activeJob?.id || null,
        piece_id: selectedPieceId || null,
        action: 'update_remarks',
        actual_weight: numFinishedGross > 0 ? numFinishedGross : null,
        gross_weight: numFinishedGross > 0 ? numFinishedGross : null,
        completed_weight: numFinishedGross > 0 ? numFinishedGross : null,
        diamond_weight: numDiaWt,
        diamond_count: numDiaCount,
        wastage_weight: numWastage,
        gold_wastage: numWastage,
        notes: notes,
        remarks: notes,
      });
      showToast('QC inspection details and weights saved successfully!', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save QC remarks.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRework = async () => {
    if (!orderId) return;
    const pendingQc = selectedPieceId ? 1 : (activeJob ? Number(activeJob.qc_pending_qty || 1) : 1);
    let reason = notes;
    if (!reason || !reason.trim()) {
      reason = await showPrompt({
        title: 'Return to Artisan for Rework',
        message: 'Enter reason for returning to artisan (e.g. Solder defect, loose stone, polish uneven):',
        placeholder: 'Enter reason for return...',
        icon: 'fa-solid fa-rotate-left',
        confirmText: 'Submit Rework',
      });
      if (!reason || !reason.trim()) return;
      setNotes(reason);
    } else {
      const confirmed = await showConfirm({
        title: 'Return to Artisan for Rework',
        message: `Return piece to artisan for rework with reason: "${reason.trim()}"?`,
        icon: 'fa-solid fa-rotate-left',
        confirmText: 'Submit Rework',
      });
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      await api.post(`/work-orders/${orderId}/qc-action`, {
        work_order_item_id: activeJob?.id || null,
        piece_id: selectedPieceId || null,
        action: 'rework',
        quantity: pendingQc,
        reason: reason.trim(),
        returned_weight: receivedWeight,
      });
      showToast(`${pendingQc} piece(s) returned to artisan for rework.`, 'info');
      navigate('/job-order/in-progress');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send piece for rework.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const subNavLinks = [
    { label: 'Work In Progress', path: '/job-order/in-progress' },
    { label: 'Delay / Job Details', path: '/job-order/delay' },
    { label: 'Quality Check', path: '/job-order/quality-check', active: true },
    { label: 'Ready', path: '/job-order/ready' },
    { label: 'Certification', path: '/job-order/certification' },
    { label: 'Hallmarking', path: '/job-order/hallmarking' },
    { label: 'History', path: '/job-order/history' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading Quality Check...</span>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-5 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[#1c1917]">
      {/* 1. BREADCRUMB & TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-stone-500 font-medium mb-1">
            <span>Manufacturing</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Job Orders</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span>Reception</span>
            <i className="fa-solid fa-chevron-right text-[8px] text-stone-400"></i>
            <span className="text-stone-800 font-semibold">Quality Check</span>
          </div>

          {/* Main Title & Search Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Quality Check {order ? `- ${jobId}` : ''}
            </h1>



            {!order && (
              <div className="relative w-full sm:w-80">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search Work Order, Product, Artisan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-[#b01622] shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action / Back Buttons */}
        <div className="flex items-center gap-2">
          {order && (
            <button
              type="button"
              onClick={handleBackToList}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-[11px] text-stone-600"></i>
              <span>Back to QC Products List</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS */}
      <div className="border-b border-[#ebd0cb]">
        <div className="flex items-center gap-10 overflow-x-auto no-scrollbar">
          {subNavLinks.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`pb-3 text-[14px] font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                tab.active
                  ? 'text-[#5c2725] border-[#b01622]'
                  : 'text-[#6e2d27] hover:text-[#b01622] border-transparent'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. MAIN CONTENT: PRODUCTS SENT FOR QC TABLE OR DETAIL QC WORKBENCH */}
      {!order ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check text-[#b01622]"></i>
                Products Pending Quality Check ({filteredProducts.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Click any product row to open the detailed Quality Check inspection workbench.
              </p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <i className="fa-solid fa-clipboard-check text-4xl text-stone-300 mb-2 block"></i>
              <p className="font-semibold text-base text-stone-700">No Items Pending Quality Check</p>
              <p className="text-xs text-stone-400 mt-1">Submitted items from artisans will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.NO</th>
                    <th className="py-3 px-4">WORK ORDER NO</th>
                    <th className="py-3 px-4 text-center">PRODUCT NO.</th>
                    <th className="py-3 px-4">PRODUCT &amp; DESIGN</th>
                    <th className="py-3 px-4">ARTISAN / KARIGAR</th>
                    <th className="py-3 px-4 text-right">ALLOTTED WT</th>
                    <th className="py-3 px-4 text-right">SUBMITTED WT</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">QC QTY</th>
                    <th className="py-3 px-4">SUBMITTED ON</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedProducts.map((row, idx) => (
                    <tr
                      key={row.rowKey}
                      onClick={() => handleSelectProductRow(row)}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-400 text-xs">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#b01622] group-hover:underline">
                          {row.work_order_number}
                        </span>
                        {row.job_order_number && (
                          <span className="font-mono text-[10px] text-stone-400 block">
                            {row.job_order_number}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-700">
                        {row.productNo}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {row.thumbnail ? (
                            <img
                              src={row.thumbnail}
                              alt={row.product_name}
                              className="w-9 h-9 rounded-md object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 text-amber-700">
                              <i className="fa-solid fa-gem text-xs"></i>
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-stone-900 block leading-tight">
                              {cleanProductName(row.product_name, row.design_no)}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-stone-500">
                                {row.design_no}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                {row.karat}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {row.artisan_name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {row.allotted_weight.toFixed(3)}g
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {row.completed_weight.toFixed(3)}g
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap inline-flex items-center justify-center">
                          {row.qc_pending_qty} pc{row.qc_pending_qty > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 text-[11px]">
                        {displayDate(row.submitted_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.is_returned ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Resubmitted
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Pending QC
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProductRow(row);
                          }}
                          className="px-3 py-1.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap inline-flex items-center gap-1.5"
                        >
                          <span>Inspect &amp; QC</span>
                          <i className="fa-solid fa-chevron-right text-[9px]"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100 mt-4">
              <div className="text-xs text-stone-500 font-medium">
                Showing <span className="font-bold text-stone-800">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-stone-800">
                  {Math.min(startIndex + itemsPerPage, totalItems)}
                </span>{' '}
                of <span className="font-bold text-stone-800">{totalItems}</span> entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        acc.push(
                          <span key={`dots-${p}`} className="px-1 text-stone-400 text-xs font-bold">
                            ...
                          </span>
                        );
                      }
                      acc.push(
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            p === safePage
                              ? 'bg-[#b01622] text-white shadow-2xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                      return acc;
                    }, [])}
                </div>

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>Next</span>
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SPECIFIC PRODUCT QUALITY CHECK INSPECTION FORM */
        <div className="space-y-6">
          {/* MULTI-ITEM SELECTOR (IF WORK ORDER CONTAINS MULTIPLE CHILD PRODUCTS) */}
          {order?.items && order.items.length > 1 && (
            <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-3 flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5 mr-1">
                <i className="fa-solid fa-layer-group text-[#b01622]"></i>
                <span>Products in this Work Order:</span>
              </span>
              {order.items.map((it) => {
                const isSelected = it.id === selectedJobId;
                const pendingCount = Number(it.qc_pending_qty || 0);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelectedJobId(it.id);
                      navigate(`/job-order/quality-check?order_id=${order.id}&item_id=${it.id}`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#b01622] text-white shadow-xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>{it.product_name} ({it.design_no || 'Item'})</span>
                    {pendingCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {pendingCount} QC
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TOP INFO BAR */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Job ID</span>
              <span className="text-sm font-bold text-stone-900 block">{jobId}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Client ID</span>
              <span className="text-sm font-bold text-stone-900 block">{clientId}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Client Name</span>
              <span className="text-sm font-bold text-stone-900 block truncate" title={clientName}>
                {clientName}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Assigned Karigar</span>
              <span className="text-sm font-bold text-stone-900 block truncate" title={karigarName}>
                {karigarName}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Work Completed</span>
              <span className="text-sm font-bold text-stone-900 block">
                {displayDate(order?.karigar_submitted_at || order?.updated_at)}
              </span>
            </div>
          </div>

          {/* MAIN QC WORKBENCH LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: QC Check Points + Remarks */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-4">
                <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center justify-between">
                  <span>Quality Check Points</span>
                  <span className="text-xs font-normal text-stone-500">
                    Product:{' '}
                    <strong className="text-stone-800">
                      {activeJob?.product_name || order?.product_name}
                    </strong>
                  </span>
                </h2>

                <div className="overflow-x-auto bg-stone-50/70 rounded-xl border border-stone-200 p-1">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-stone-200 text-[10.5px] font-bold text-stone-500 uppercase tracking-wider bg-stone-100/80">
                        <th className="py-2.5 px-3 text-center w-12">S.NO</th>
                        <th className="py-2.5 px-3">CHECK POINT</th>
                        <th className="py-2.5 px-3">STANDARD</th>
                        <th className="py-2.5 px-3">RESULT</th>
                        <th className="py-2.5 px-3">REMARKS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {checkItems.map((item, idx) => {
                        const statusVal = statuses[item.key] || 'Accept';
                        let expectedText = item.expected;
                        if (item.key === 'purity') {
                          expectedText = activeJob?.gold_purity || order?.gold_purity || activeJob?.purity || order?.purity || (activeJob?.gold_karat ? `${activeJob.gold_karat}K` : '22K (916)');
                        } else if (item.key === 'weight') {
                          expectedText = allottedWeight > 0 ? `${allottedWeight.toFixed(3)} gm` : (activeJob?.gold_weight ? `${Number(activeJob.gold_weight).toFixed(3)} gm` : `${receivedWeight.toFixed(3)} gm`);
                        } else if (item.key === 'diamond') {
                          const diaCt = activeJob?.diamond_weight || order?.diamond_weight;
                          const diaCnt = activeJob?.diamond_count || order?.diamond_count || activeJob?.no_of_diamonds;
                          expectedText = diaCt && diaCt !== '—' ? `${diaCnt || 1} Pcs / ${diaCt} Ct` : (activeJob?.diamond_details || order?.stone_details?.clarity ? `${order.stone_details?.clarity || 'VVS'} / ${order.stone_details?.color || 'G'}` : 'As per work order');
                        } else if (item.key === 'polish') {
                          expectedText = activeJob?.setting_type ? `${activeJob.setting_type} / High Finish` : 'Standard High Polish';
                        }

                        return (
                          <tr key={item.key} className="hover:bg-white transition-colors">
                            <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-3 font-medium text-stone-900">{item.label}</td>
                            <td className="py-3.5 px-3 text-stone-700 font-semibold">{expectedText}</td>
                            <td className="py-3.5 px-3">
                              <select
                                value={statusVal}
                                onChange={(event) =>
                                  setStatuses((current) => ({
                                    ...current,
                                    [item.key]: event.target.value,
                                  }))
                                }
                                className={`bg-white border font-semibold text-xs rounded-lg px-3 py-1 cursor-pointer focus:outline-hidden ${
                                  statusVal === 'Pending'
                                    ? 'border-amber-300 text-amber-800'
                                    : 'border-[#b01622] text-[#b01622]'
                                }`}
                              >
                                <option value="Accept">Accept</option>
                                <option value="Pending">Pending</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-3 text-stone-600">{item.note}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Work Order Instructions & Remarks Verification Box */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <i className="fa-solid fa-clipboard-check text-amber-800"></i>
                    Work Order Crafting Remarks &amp; Instructions
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={statuses.wo_remarks_verified === 'Accept'}
                      onChange={(e) => setStatuses(prev => ({ ...prev, wo_remarks_verified: e.target.checked ? 'Accept' : 'Pending' }))}
                      className="accent-emerald-700 w-4 h-4 cursor-pointer"
                    />
                    <span>Verified All Work Order Remarks</span>
                  </label>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200/70 text-xs text-stone-800 font-mono leading-relaxed">
                  {order?.crafting_instructions || activeJob?.remark || order?.remarks || 'Craft according to standard approved showroom CAD design and specified metal purity.'}
                </div>
              </div>

              {/* Remarks Card */}
              <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900 block">Inspection Notes / Remarks</label>
                  <button
                    type="button"
                    onClick={handleSaveRemarks}
                    disabled={saving}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-900 text-white text-[11px] font-bold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <i className="fa-solid fa-floppy-disk text-[10px]"></i>
                    <span>Save Remarks</span>
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows="3"
                  placeholder="Item quality is good. Approved for next stage."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:border-[#b01622] resize-none"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Reference Image + Summary Card */}
            <div className="lg:col-span-5 space-y-6">
              {/* Reference Image Section */}
              <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-image text-[#b01622]"></i>
                    <span>Product Reference Image</span>
                  </h3>
                  <span className="text-[10px] text-stone-500 font-mono font-bold">
                    {activeJob?.design_no || order?.design_code || 'Reference Design'}
                  </span>
                </div>
                {(() => {
                  const rawImg = activeJob?.image_url || activeJob?.design_image || order?.reference_image || order?.image_url || order?.design_image || order?.product_design?.image_url || order?.product?.image_url;
                  let imgSrc = null;
                  if (rawImg && typeof rawImg === 'string') {
                    const s = rawImg.trim();
                    if (s && s !== 'null' && s !== 'undefined') {
                      imgSrc = (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('/')) ? s : `/${s}`;
                    }
                  }
                  if (imgSrc && !imageError) {
                    return (
                      <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50 max-h-56 flex items-center justify-center p-2 shadow-2xs">
                        <img
                          src={imgSrc}
                          alt={activeJob?.product_name || order?.product_name || 'Jewellery Reference'}
                          onError={() => setImageError(true)}
                          className="max-h-48 w-auto object-contain rounded-lg transition-transform hover:scale-105"
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="py-8 bg-stone-50/90 rounded-xl border border-dashed border-stone-200 text-center text-stone-400 flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
                        <i className="fa-solid fa-gem text-sm"></i>
                      </div>
                      <span className="text-xs font-semibold text-stone-700">No reference image available</span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {activeJob?.product_name || order?.product_name || 'Jewelry Piece'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-stone-900 tracking-tight">Inspection Summary</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isFromWorkbench 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {isFromWorkbench ? 'From Workbench' : 'From Work Order'}
                  </span>
                </div>

                <div className="bg-stone-50/70 rounded-xl border border-stone-200 p-4 space-y-4 text-xs">
                  {/* Actual Finished Weight (Gross Wt) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                      Actual Finished Weight (g) <span className="text-[#b01622]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={qcFinishedWeight}
                        onChange={(e) => setQcFinishedWeight(e.target.value)}
                        placeholder="0.000"
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-stone-400">g</span>
                    </div>
                  </div>

                  {/* Diamond Weight & Diamond Count */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                        Diamond Wt (ct)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={qcDiamondWeight}
                          onChange={(e) => setQcDiamondWeight(e.target.value)}
                          placeholder="0.000"
                          className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-semibold text-stone-400">ct</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                        Diamond Pcs
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={qcDiamondCount}
                          onChange={(e) => setQcDiamondCount(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-semibold text-stone-400">pcs</span>
                      </div>
                    </div>
                  </div>

                  {/* Gold Wastage */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                      Gold Wastage (g)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={qcWastageWeight}
                        onChange={(e) => setQcWastageWeight(e.target.value)}
                        placeholder="0.000"
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-amber-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-stone-400">g</span>
                    </div>
                  </div>

                  {/* Calculated Net Gold Weight */}
                  <div className="flex justify-between items-center py-2 px-3 bg-amber-50/70 border border-amber-200/80 rounded-lg">
                    <span className="text-[11px] font-bold text-amber-900">Calculated Net Gold Wt:</span>
                    <span className="font-mono font-bold text-sm text-amber-950">
                      {calculatedNetGold.toFixed(3)}g
                    </span>
                  </div>

                  {/* Save weights button */}
                  <button
                    type="button"
                    onClick={handleSaveRemarks}
                    disabled={saving}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-floppy-disk text-xs text-stone-600"></i>
                    <span>Save / Update Weights &amp; Wastage</span>
                  </button>

                  {/* Status, Verified By, Verification Date */}
                  <div className="pt-2 border-t border-stone-200/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">QC Status</span>
                      {order?.status === 'completed' || order?.approved_at ? (
                        <span className="px-2.5 py-0.5 rounded bg-[#E6F4EA] text-[#137333] font-semibold text-[11px]">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded bg-[#EBF5FF] text-[#1E429F] border border-[#BFDBFE] font-semibold text-[11px]">
                          Pending Verification
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Verified By</span>
                      <span className="font-bold text-gray-900 text-xs">
                        {order?.approved_by_user?.name || order?.verified_by || 'Floor Manager'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Verification Date</span>
                      <span className="font-medium text-gray-900 text-xs">
                        {order?.approved_at
                          ? new Date(order.approved_at).toLocaleString('en-GB')
                          : new Date().toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-3">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="w-full py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-circle-check text-xs"></i>
                    <span>Approve Quality Check &amp; Proceed</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRework}
                    disabled={saving}
                    className="w-full py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-50 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-rotate-left text-xs"></i>
                    <span>Return to Artisan for Rework</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}